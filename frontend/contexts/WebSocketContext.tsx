"use client";

/**
 * WebSocketContext — manages the single persistent WebSocket connection
 * for the authenticated Signal Clone session.
 *
 * Responsibilities:
 *   - Connect to ws://localhost:8000/ws?token=<jwt> when a token is available.
 *   - Authenticate via JWT query param (backend rejects missing/invalid tokens
 *     with close code 4001).
 *   - Exponential back-off reconnect on unexpected disconnect:
 *       1s → 2s → 4s → 8s → 16s → 30s (cap)
 *   - Reset back-off delay on successful connection.
 *   - Expose `sendFrame(frame)` — raw JSON send with a connected-guard.
 *   - Expose `sendWsMessage(conversationId, content)` — convenience helper
 *     that emits a `new_message` frame understood by the backend handler.
 *   - Expose `isConnected` boolean for optional UI status indicators.
 *   - Dispatch inbound frames to registered callbacks:
 *       onMessage(msg)    — `message` frame (new chat message)
 *       onPresence(event) — `presence` frame (user online/offline)
 *       onTyping(event)   — `typing` / `typing_stop` frames (future UI)
 *   - Auto-close connection and stop reconnecting when token becomes null
 *     (user logged out).
 *
 * Architecture note:
 *   WebSocketProvider must be rendered INSIDE ChatProvider because it calls
 *   ChatContext actions. ChatProvider must NOT depend on WebSocketContext.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";

// ─── Inbound frame payload types ─────────────────────────────────────────────

/** Matches backend MessageOut schema (snake_case, nested sender object). */
export interface WsMessagePayload {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_online: boolean;
  } | null;
  content_type: string;
  content: string;
  reply_to_id: string | null;
  created_at: string;
  statuses: { id: string; user_id: string; status: string; timestamp: string }[];
}

export interface WsPresencePayload {
  user_id: string;
  is_online: boolean;
  last_seen_at: string | null;
}

export interface WsTypingPayload {
  conversation_id: string;
  user_id: string;
  display_name?: string;
}

export interface WsReadReceiptPayload {
  conversation_id: string;
  user_id: string;
  message_id: string;
  timestamp: string;
}

export interface WsDeliveryReceiptPayload {
  message_ids: string[];
  user_id: string;
  timestamp: string;
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface WebSocketCallbacks {
  onMessage: (payload: WsMessagePayload) => void;
  onPresence: (payload: WsPresencePayload) => void;
  onTyping: (payload: WsTypingPayload, isStop: boolean) => void;
  onReadReceipt: (payload: WsReadReceiptPayload) => void;
  onDeliveryReceipt: (payload: WsDeliveryReceiptPayload) => void;
}

interface WebSocketContextValue {
  /** True when the WS connection is open and the server sent `connected`. */
  isConnected: boolean;
  /** Send an arbitrary JSON frame. No-op if not connected. */
  sendFrame: (frame: object) => void;
  /** Send a new_message frame for a conversation. */
  sendWsMessage: (conversationId: string, content: string) => void;
  /** Send a typing_start frame — called by MessageComposer debounce. */
  sendTypingStart: (conversationId: string) => void;
  /** Send a typing_stop frame — called after 1s inactivity or on message send. */
  sendTypingStop: (conversationId: string) => void;
  /** Send a mark_read frame for a conversation. */
  sendMarkRead: (conversationId: string) => void;
  /** Send a mark_delivered frame for specific messages. */
  sendMarkDelivered: (messageIds: string[]) => void;
  /**
   * Register callbacks to receive inbound frames.
   * Called once by ChatContext on mount. Replaces any previously registered
   * callbacks (only one consumer expected — ChatContext).
   */
  registerCallbacks: (callbacks: WebSocketCallbacks) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WS_BASE = "ws://localhost:8000/ws";
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_CAP_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;

// ─── Context ──────────────────────────────────────────────────────────────────

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface WebSocketProviderProps {
  token: string | null;
  children: ReactNode;
}

export function WebSocketProvider({ token, children }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);

  // Stable refs — mutated without triggering re-renders
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef<number>(BACKOFF_BASE_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef<boolean>(false);
  const callbacksRef = useRef<WebSocketCallbacks | null>(null);

  // Keep a stable ref to the current token so the connect closure sees the
  // latest value without re-creating the effect on every token update.
  const tokenRef = useRef<string | null>(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  /* ── Core connect function ─────────────────────────────────────────── */

  const connect = useCallback(() => {
    const currentToken = tokenRef.current;
    if (!currentToken) return;

    // Clean up any stale connection
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnect loop during manual close
      wsRef.current.close();
      wsRef.current = null;
    }

    const url = `${WS_BASE}?token=${encodeURIComponent(currentToken)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      // Connection established — reset back-off
      backoffRef.current = BACKOFF_BASE_MS;
      // isConnected will be set to true when the `connected` frame arrives
    };

    ws.onmessage = (event: MessageEvent) => {
      let frame: { type: string; data?: unknown };
      try {
        frame = JSON.parse(event.data as string) as {
          type: string;
          data?: unknown;
        };
      } catch {
        console.warn("[WS] Received non-JSON frame:", event.data);
        return;
      }

      switch (frame.type) {
        case "connected":
          setIsConnected(true);
          console.info("[WS] Connected to server");
          break;

        case "message": {
          const payload = frame.data as WsMessagePayload;
          callbacksRef.current?.onMessage(payload);
          break;
        }

        case "presence": {
          const payload = frame.data as WsPresencePayload;
          callbacksRef.current?.onPresence(payload);
          break;
        }

        case "typing": {
          const payload = frame.data as WsTypingPayload;
          callbacksRef.current?.onTyping(payload, false);
          break;
        }

        case "typing_stop": {
          const payload = frame.data as WsTypingPayload;
          callbacksRef.current?.onTyping(payload, true);
          break;
        }

        case "read_receipt": {
          const payload = frame.data as WsReadReceiptPayload;
          callbacksRef.current?.onReadReceipt(payload);
          break;
        }

        case "delivery_receipt": {
          const payload = frame.data as WsDeliveryReceiptPayload;
          callbacksRef.current?.onDeliveryReceipt(payload);
          break;
        }

        case "error":
          console.error("[WS] Server error:", frame.data);
          break;

        default:
          // Silently ignore unknown frame types (forward-compatible)
          break;
      }
    };

    ws.onerror = (err) => {
      console.warn("[WS] Connection error:", err);
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      wsRef.current = null;

      if (!shouldReconnectRef.current) {
        console.info("[WS] Connection closed — not reconnecting (logout)");
        return;
      }

      // Don't retry on auth failure
      if (event.code === 4001) {
        console.warn("[WS] Auth failure — not reconnecting");
        shouldReconnectRef.current = false;
        return;
      }

      const delay = backoffRef.current;
      console.info(`[WS] Disconnected. Reconnecting in ${delay}ms…`);
      backoffRef.current = Math.min(delay * BACKOFF_MULTIPLIER, BACKOFF_CAP_MS);

      reconnectTimerRef.current = setTimeout(() => {
        if (shouldReconnectRef.current) connect();
      }, delay);
    };
  }, []); // No deps — uses refs for all mutable values

  /* ── Connect / disconnect lifecycle ────────────────────────────────── */

  useEffect(() => {
    if (!token) {
      // Token removed (logout) — close connection, stop reconnecting
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Token present — connect
    shouldReconnectRef.current = true;
    connect();

    return () => {
      // Cleanup on unmount or before re-running with a new token
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token, connect]);

  /* ── Public API ─────────────────────────────────────────────────────── */

  const sendFrame = useCallback((frame: object) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("[WS] sendFrame called but socket is not open");
      return;
    }
    wsRef.current.send(JSON.stringify(frame));
  }, []);

  const sendWsMessage = useCallback(
    (conversationId: string, content: string) => {
      sendFrame({
        type: "new_message",
        conversation_id: conversationId,
        content,
        content_type: "text",
      });
    },
    [sendFrame]
  );

  const sendTypingStart = useCallback(
    (conversationId: string) => {
      sendFrame({ type: "typing_start", conversation_id: conversationId });
    },
    [sendFrame]
  );

  const sendTypingStop = useCallback(
    (conversationId: string) => {
      sendFrame({ type: "typing_stop", conversation_id: conversationId });
    },
    [sendFrame]
  );

  const sendMarkRead = useCallback(
    (conversationId: string) => {
      sendFrame({ type: "mark_read", conversation_id: conversationId });
    },
    [sendFrame]
  );

  const sendMarkDelivered = useCallback(
    (messageIds: string[]) => {
      sendFrame({ type: "mark_delivered", message_ids: messageIds });
    },
    [sendFrame]
  );

  const registerCallbacks = useCallback((callbacks: WebSocketCallbacks) => {
    callbacksRef.current = callbacks;
  }, []);

  /* ── Value ──────────────────────────────────────────────────────────── */

  const value: WebSocketContextValue = {
    isConnected,
    sendFrame,
    sendWsMessage,
    sendTypingStart,
    sendTypingStop,
    sendMarkRead,
    sendMarkDelivered,
    registerCallbacks,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useWebSocket — consume the WebSocket context.
 *
 * Must be used inside <WebSocketProvider>.
 */
export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error("useWebSocket must be used within a <WebSocketProvider>");
  }
  return ctx;
}
