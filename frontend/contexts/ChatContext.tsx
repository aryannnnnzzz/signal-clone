"use client";

/**
 * ChatContext — global chat state for the Signal Clone frontend.
 *
 * Provides:
 *   - conversations: Conversation[]       — the sidebar list
 *   - messages: Record<string, Message[]> — per-conversation message cache
 *   - loadingConversations: bool          — true while initial list is fetching
 *   - loadingMessages: bool               — true while a conversation's messages fetch
 *   - sendingMessage: bool                — true while a send is in flight
 *   - conversationsError: string | null   — error shown in sidebar
 *   - messagesError: string | null        — error shown in chat pane
 *
 * Actions:
 *   - loadConversations()                 — fetch sidebar list (called on mount)
 *   - selectConversation(id)              — load messages for a conversation
 *   - sendMessage(conversationId, text)   — WS send + optimistic append (REST fallback)
 *   - receiveMessage(msg)                 — append incoming WS message to cache  [NEW]
 *   - updatePresence(userId, isOnline)    — update DM conversation online status [NEW]
 *
 * Design decisions:
 *   - Messages are cached per conversation so switching tabs doesn't re-fetch.
 *   - Sending is optimistic: a temporary "sending" message is appended immediately.
 *     When the server broadcasts the persisted message back (via WS `message` frame),
 *     the optimistic entry is replaced by the real one (matched by id dedup in receiveMessage).
 *     If WS is unavailable, falls back to REST POST and replaces on response.
 *   - receiveMessage deduplicates by id — prevents double-display when server echoes
 *     the sender's own message back as a `message` event.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import {
  fetchConversations,
  fetchMessages,
  postMessage,
  editMessage,
  deleteMessage,
} from "@/lib/chatService";
import { createOrGetDm, createGroup } from "@/lib/userService";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import type { Conversation, Message } from "@/types";
import type { 
  WsMessagePayload,
  WsPresencePayload,
  WsTypingPayload,
  WsReadReceiptPayload,
  WsDeliveryReceiptPayload,
  WsReactionUpdatePayload,
} from "@/contexts/WebSocketContext";

/** Per-conversation typing state — a map of userId → display name. */
export type TypingUsersMap = Record<string, Record<string, string>>;

// ─── Context shape ──────────────────────────────────────────────────────────

interface ChatContextValue {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  loadingConversations: boolean;
  loadingMessages: boolean;
  sendingMessage: boolean;
  conversationsError: string | null;
  messagesError: string | null;
  /**
   * Typing state: typingUsers[conversationId][userId] = displayName.
   * Only contains entries for users currently typing.
   */
  typingUsers: TypingUsersMap;

  loadConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    content: string,
    wsSend?: (convId: string, content: string, contentType?: "text" | "image" | "file" | "voice", replyToId?: string) => void,
    wsConnected?: boolean,
    contentType?: "text" | "image" | "file" | "voice",
    replyTo?: Message
  ) => Promise<void>;
  /** Called by WebSocketContext when a `message` frame arrives. */
  receiveMessage: (payload: WsMessagePayload, currentUserId: string) => void;
  /** Called by WebSocketContext when a `typing` or `typing_stop` frame arrives. */
  receiveTyping: (payload: WsTypingPayload, isStop: boolean) => void;
  /** Called by WebSocketContext when a `presence` frame arrives. */
  updatePresence: (userId: string, isOnline: boolean) => void;
  /** Process a read receipt from WS */
  receiveReadReceipt: (payload: WsReadReceiptPayload) => void;
  /** Process a delivery receipt from WS */
  receiveDeliveryReceipt: (payload: WsDeliveryReceiptPayload) => void;
  /** Process a reaction update from WS */
  receiveReactionUpdate: (payload: WsReactionUpdatePayload) => void;
  receiveMessageUpdate: (payload: WsMessagePayload, currentUserId: string) => void;
  receiveMessageDelete: (messageId: string) => void;
  /** Clear unread count locally for a conversation */
  markConversationAsRead: (conversationId: string) => void;
  /** Toggle reaction locally and send WS frame */
  toggleReaction: (messageId: string, emoji: string, wsSendToggle: (msgId: string, emoji: string) => void) => void;
  /**
   * Open or create a DM with another user.
   * - Calls POST /api/conversations/dm (idempotent get-or-create).
   * - Upserts the conversation into the sidebar list.
   * - Returns the conversation id so the caller can select it.
   */
  openNewChat: (otherUserId: string) => Promise<string | null>;
  openNewGroup: (name: string, memberIds: string[]) => Promise<string | null>;
  editMessageText: (conversationId: string, messageId: string, content: string) => Promise<void>;
  deleteMessageAction: (conversationId: string, messageId: string, mode: "me" | "everyone") => Promise<void>;
  /** ID of the message to highlight and scroll to */
  highlightMessageId: string | null;
  /** Jump to a specific message, loading it if necessary */
  jumpToMessage: (conversationId: string, messageId: string, createdAt: string) => Promise<void>;
  /** The currently active conversation ID (used to suppress notifications) */
  activeConversationId: string | null;
  clearActiveConversation: () => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const ChatContext = createContext<ChatContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map a raw WS MessageOut payload to the frontend Message type.
 * Mirrors the mapping in chatService.ts but accepts the WS payload shape.
 */
function mapWsMessage(raw: WsMessagePayload, currentUserId: string): Message {
  const isOwn = raw.sender_id === currentUserId;
  return {
    id: raw.id,
    conversationId: raw.conversation_id,
    senderId: raw.sender_id ?? "",
    senderName: raw.sender?.display_name ?? "Unknown",
    content: raw.content,
    contentType: raw.content_type as Message["contentType"],
    // Incoming WS messages from others are "delivered" to us; own messages
    // sent via WS echo back as confirmed so mark as "sent".
    status: isOwn ? "sent" : "delivered",
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    isDeleted: raw.is_deleted,
    isOwn,
    replyTo: raw.reply_to ? {
      id: raw.reply_to.id,
      senderName: raw.reply_to.sender?.display_name ?? "Unknown",
      content: raw.reply_to.content,
      contentType: raw.reply_to.content_type as Message["contentType"],
    } : undefined,
    reactions: raw.reactions?.map((r) => ({
      userId: r.user_id,
      emoji: r.emoji,
      createdAt: r.created_at,
    })) || [],
  };
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  // typingUsers[conversationId][userId] = displayName
  const [typingUsers, setTypingUsers] = useState<TypingUsersMap>({});
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Refs for callbacks to avoid stale closures without breaking dependencies
  const settingsRef = useRef(settings);
  const conversationsRef = useRef(conversations);
  const activeConversationIdRef = useRef(activeConversationId);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { activeConversationIdRef.current = activeConversationId; }, [activeConversationId]);

  // Safety timers: auto-remove typers if typing_stop never arrives
  // typingTimers[conversationId_userId] = setTimeout handle
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /* ── Load conversations ──────────────────────────────── */

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConversations(true);
    setConversationsError(null);
    try {
      const data = await fetchConversations(user.id);
      setConversations(data);
    } catch (err) {
      setConversationsError(
        err instanceof Error ? err.message : "Failed to load conversations."
      );
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  /* ── Load messages for a conversation ───────────────── */

  const selectConversation = useCallback(
    async (conversationId: string) => {
      if (!user) return;

      setActiveConversationId(conversationId);

      // Skip re-fetch if already cached
      if (messages[conversationId]) return;

      setLoadingMessages(true);
      setMessagesError(null);
      try {
        const data = await fetchMessages(conversationId, user.id);
        setMessages((prev) => ({ ...prev, [conversationId]: data }));
      } catch (err) {
        setMessagesError(
          err instanceof Error ? err.message : "Failed to load messages."
        );
      } finally {
        setLoadingMessages(false);
      }
    },
    [user, messages]
  );

  const jumpToMessage = useCallback(
    async (conversationId: string, messageId: string, createdAt: string) => {
      if (!user) return;

      const existingMsgs = messages[conversationId] || [];
      const found = existingMsgs.find((m) => m.id === messageId);

      if (!found) {
        // Need to load the message. We fetch 50 messages before (and including) it.
        setLoadingMessages(true);
        try {
          // Add 1ms to createdAt so the query (< before) includes the message itself
          const date = new Date(createdAt);
          date.setMilliseconds(date.getMilliseconds() + 1);
          const data = await fetchMessages(conversationId, user.id, date.toISOString());
          setMessages((prev) => ({ ...prev, [conversationId]: data }));
        } catch (err) {
          console.error("Failed to jump to message:", err);
        } finally {
          setLoadingMessages(false);
        }
      }

      setHighlightMessageId(messageId);
      // Auto-clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightMessageId((prev) => (prev === messageId ? null : prev));
      }, 3000);
    },
    [user, messages]
  );

  /* ── Receive a message from WebSocket ────────────────── */

  /**
   * Called by WebSocketContext whenever a `message` frame arrives.
   *
   * Deduplicates by id to handle the server echoing the sender's own message:
   *   - If an optimistic entry exists with the same content + same conversation,
   *     replace it (by checking for `optimistic-` prefix IDs).
   *   - If an entry with the same real id already exists, skip it.
   */
  const receiveMessage = useCallback(
    (payload: WsMessagePayload, currentUserId: string) => {
      const msg = mapWsMessage(payload, currentUserId);
      const convId = msg.conversationId;

      setMessages((prev) => {
        const existing = prev[convId] ?? [];

        // 1. Already have a real message with this id → deduplicate
        if (existing.some((m) => m.id === msg.id)) {
          return prev;
        }

        // 2. Replace optimistic entry (own message echoed back from server):
        //    Find the most recent optimistic entry in this conversation that
        //    matches the content. Replace the first match found.
        if (msg.isOwn) {
          const optimisticIdx = existing.findIndex(
            (m) =>
              m.id.startsWith("optimistic-") &&
              m.content === msg.content
          );
          if (optimisticIdx !== -1) {
            const updated = [...existing];
            updated[optimisticIdx] = msg;
            return { ...prev, [convId]: updated };
          }
        }

        // 3. New message from another user — append
        return { ...prev, [convId]: [...existing, msg] };
      });

      // Update conversation sidebar preview
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          return {
            ...c,
            lastMessage: msg.content,
            lastMessageAt: msg.createdAt,
            lastMessageIsOwn: msg.isOwn,
            // Only bump unread count for messages from others
            unreadCount: msg.isOwn ? 0 : c.unreadCount + 1,
          };
        })
      );

      // Browser Notification Logic
      if (!msg.isOwn && settingsRef.current.browserNotifications && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const isViewing = activeConversationIdRef.current === convId && document.hasFocus();
        
        if (!isViewing) {
          const conv = conversationsRef.current.find(c => c.id === convId);
          const title = conv?.type === "group" 
            ? `${msg.senderName} • ${conv.name}` 
            : msg.senderName;
            
          let body = msg.content;
          if (msg.contentType === "image") {
            try {
              const parsed = JSON.parse(msg.content);
              body = parsed.text ? `📷 ${parsed.text}` : "📷 Image";
            } catch {
              body = "📷 Image";
            }
          } else if (msg.contentType === "file") {
            try {
              const parsed = JSON.parse(msg.content);
              body = parsed.text ? `📎 ${parsed.text}` : "📎 File";
            } catch {
              body = "📎 File";
            }
          } else if (msg.contentType === "voice") {
            body = "🎤 Voice Message";
          }

          const notif = new Notification(title, {
            body,
            icon: conv?.avatarUrl || "/favicon.ico",
            silent: !settingsRef.current.notificationSounds,
          });

          notif.onclick = () => {
            window.focus();
            selectConversation(convId);
            jumpToMessage(convId, msg.id, msg.createdAt);
            notif.close();
          };
        }
      }
    },
    [selectConversation, jumpToMessage]
  );

  /* ── Receive a typing indicator from WebSocket ───────── */

  const receiveTyping = useCallback(
    (payload: WsTypingPayload, isStop: boolean) => {
      const { conversation_id: convId, user_id: userId, display_name: displayName } = payload;
      const timerKey = `${convId}_${userId}`;

      // Always clear any existing safety timer for this user
      if (typingTimersRef.current[timerKey]) {
        clearTimeout(typingTimersRef.current[timerKey]);
        delete typingTimersRef.current[timerKey];
      }

      if (isStop) {
        // Remove user from typing state
        setTypingUsers((prev) => {
          const convTypers = { ...(prev[convId] ?? {}) };
          delete convTypers[userId];
          if (Object.keys(convTypers).length === 0) {
            const next = { ...prev };
            delete next[convId];
            return next;
          }
          return { ...prev, [convId]: convTypers };
        });
      } else {
        // Add / refresh user in typing state
        const name = displayName ?? "Someone";
        console.log("[DEBUG] Updating typingUsers:", { convId, userId, name });
        setTypingUsers((prev) => ({
          ...prev,
          [convId]: { ...(prev[convId] ?? {}), [userId]: name },
        }));

        // Schedule safety auto-remove after 3 seconds
        typingTimersRef.current[timerKey] = setTimeout(() => {
          delete typingTimersRef.current[timerKey];
          setTypingUsers((prev) => {
            const convTypers = { ...(prev[convId] ?? {}) };
            delete convTypers[userId];
            if (Object.keys(convTypers).length === 0) {
              const next = { ...prev };
              delete next[convId];
              return next;
            }
            return { ...prev, [convId]: convTypers };
          });
        }, 3_000);
      }
    },
    []
  );

  /* ── Update presence (DM online indicator) ───────────── */

  const updatePresence = useCallback((userId: string, isOnline: boolean) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.type !== "dm") return c;
        return c;
      })
    );
    void userId;
    void isOnline;
  }, []);

  /* ── Receive read and delivery receipts ────────────────── */

  const receiveReadReceipt = useCallback((payload: WsReadReceiptPayload) => {
    const { conversation_id, timestamp } = payload;
    setMessages((prev) => {
      const existing = prev[conversation_id];
      if (!existing) return prev;

      let updated = false;
      const newMessages = existing.map((msg) => {
        if (msg.isOwn && msg.status !== "read" && msg.createdAt <= timestamp) {
          updated = true;
          return { ...msg, status: "read" as const };
        }
        return msg;
      });

      return updated ? { ...prev, [conversation_id]: newMessages } : prev;
    });
  }, []);

  const receiveMessageUpdate = useCallback(
    (payload: WsMessagePayload, currentUserId: string) => {
      const mapped = mapWsMessage(payload, currentUserId);
      setMessages((prev) => {
        const convMessages = prev[mapped.conversationId] || [];
        return {
          ...prev,
          [mapped.conversationId]: convMessages.map((m) =>
            m.id === mapped.id ? mapped : m
          ),
        };
      });
      // Update last message in conversations list if it was the last message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === mapped.conversationId && c.lastMessageAt === mapped.createdAt) {
            return {
              ...c,
              lastMessage: mapped.isDeleted ? "This message was deleted." : mapped.content,
            };
          }
          return c;
        })
      );
    },
    []
  );

  const receiveMessageDelete = useCallback(
    (messageId: string) => {
      setMessages((prev) => {
        const next = { ...prev };
        for (const convId of Object.keys(next)) {
          next[convId] = next[convId].filter((m) => m.id !== messageId);
        }
        return next;
      });
    },
    []
  );

  const receiveDeliveryReceipt = useCallback((payload: WsDeliveryReceiptPayload) => {
    const { message_ids } = payload;
    setMessages((prev) => {
      let anyUpdated = false;
      const next = { ...prev };

      for (const [convId, msgs] of Object.entries(prev)) {
        let convUpdated = false;
        const newMsgs = msgs.map((msg) => {
          if (msg.isOwn && message_ids.includes(msg.id) && msg.status === "sent") {
            convUpdated = true;
            return { ...msg, status: "delivered" as const };
          }
          return msg;
        });

        if (convUpdated) {
          anyUpdated = true;
          next[convId] = newMsgs;
        }
      }

      return anyUpdated ? next : prev;
    });
  }, []);

  const markConversationAsRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId && c.unreadCount > 0
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
  }, []);

  const receiveReactionUpdate = useCallback((payload: WsReactionUpdatePayload) => {
    const { conversation_id, message_id, reactions } = payload;
    setMessages((prev) => {
      const existing = prev[conversation_id];
      if (!existing) return prev;

      const newMessages = existing.map((msg) => {
        if (msg.id === message_id) {
          return {
            ...msg,
            reactions: reactions.map((r) => ({
              userId: r.user_id,
              emoji: r.emoji,
              createdAt: r.created_at,
            })),
          };
        }
        return msg;
      });

      return { ...prev, [conversation_id]: newMessages };
    });
  }, []);

  const toggleReaction = useCallback((messageId: string, emoji: string, wsSendToggle: (msgId: string, e: string) => void) => {
    if (!user) return;
    
    // Optimistic UI update
    setMessages((prev) => {
      let anyUpdated = false;
      const next = { ...prev };
      
      for (const [convId, msgs] of Object.entries(prev)) {
        const msgIdx = msgs.findIndex((m) => m.id === messageId);
        if (msgIdx !== -1) {
          anyUpdated = true;
          const msg = msgs[msgIdx];
          const existingReactions = msg.reactions || [];
          
          // Check if current user already reacted with this emoji
          const hasReacted = existingReactions.some((r) => r.userId === user.id && r.emoji === emoji);
          let newReactions;
          
          if (hasReacted) {
            // Remove reaction
            newReactions = existingReactions.filter((r) => !(r.userId === user.id && r.emoji === emoji));
          } else {
            // Add reaction
            newReactions = [...existingReactions, { userId: user.id, emoji, createdAt: new Date().toISOString() }];
          }
          
          const updatedMsgs = [...msgs];
          updatedMsgs[msgIdx] = { ...msg, reactions: newReactions };
          next[convId] = updatedMsgs;
          break; // Found the message, no need to keep searching
        }
      }
      
      return anyUpdated ? next : prev;
    });
    
    // Send to server
    wsSendToggle(messageId, emoji);
  }, [user]);

  /* ── Send a message (WS primary, REST fallback) ──────── */

  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      wsSend?: (convId: string, content: string, contentType?: "text" | "image" | "file" | "voice", replyToId?: string) => void,
      wsConnected?: boolean,
      contentType: "text" | "image" | "file" | "voice" = "text",
      replyTo?: Message
    ) => {
      if (!user || !content.trim()) return;

      // Build an optimistic message to show immediately
      const optimisticId = `optimistic-${Date.now()}`;
      const optimistic: Message = {
        id: optimisticId,
        conversationId,
        senderId: user.id,
        senderName: user.display_name,
        content: content.trim(),
        contentType: contentType,
        status: "sending",
        createdAt: new Date().toISOString(),
        isOwn: true,
        replyTo: replyTo ? {
          id: replyTo.id,
          senderName: replyTo.senderName,
          content: replyTo.content,
          contentType: replyTo.contentType,
        } : undefined,
      };

      // Append optimistic message immediately
      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), optimistic],
      }));

      /* ─ WebSocket path ────────────────────────────────────
       * Send via WS. The server persists and broadcasts a `message`
       * frame to all members including us. receiveMessage() will replace
       * the optimistic entry with the real one on arrival.
       * setSendingMessage is not set here because the response is async
       * via the WS `message` frame — no spinner needed.
       */
      if (wsConnected && wsSend) {
        wsSend(conversationId, content.trim(), contentType, replyTo?.id);
        // Update sidebar preview optimistically
        setConversations((prev) =>
          prev.map((c) => {
            let lastMessage = content.trim();
            if (contentType === "image" || contentType === "file" || contentType === "voice") {
              try {
                const parsed = JSON.parse(content.trim());
                lastMessage = parsed.text 
                  ? (contentType === "image" ? `📷 ${parsed.text}` : (contentType === "voice" ? `🎤 Voice Message` : `📎 ${parsed.text}`))
                  : (contentType === "image" ? "📷 Image" : (contentType === "voice" ? "🎤 Voice Message" : "📎 Attachment"));
              } catch {
                lastMessage = contentType === "image" ? "📷 Image" : (contentType === "voice" ? "🎤 Voice Message" : "📎 Attachment");
              }
            }

            return c.id === conversationId
              ? {
                  ...c,
                  lastMessage,
                  lastMessageAt: new Date().toISOString(),
                  lastMessageIsOwn: true,
                  unreadCount: 0,
                }
              : c;
          })
        );
        return;
      }

      /* ─ REST fallback ─────────────────────────────────────
       * Used when WS is disconnected (e.g. during reconnect window).
       * Keeps the app functional even without real-time connection.
       */
      setSendingMessage(true);
      try {
        const persisted = await postMessage(conversationId, content.trim(), user.id, contentType, replyTo?.id);

        // Replace the optimistic message with the real one from the server
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? []).map((m) =>
            m.id === optimisticId ? persisted : m
          ),
        }));

        // Update the conversation preview in the sidebar
        setConversations((prev) =>
          prev.map((c) => {
            let lastMessage = persisted.content;
            if (persisted.contentType === "image" || persisted.contentType === "file" || persisted.contentType === "voice") {
              try {
                const parsed = JSON.parse(persisted.content);
                lastMessage = parsed.text 
                  ? (persisted.contentType === "image" ? `📷 ${parsed.text}` : (persisted.contentType === "voice" ? `🎤 Voice Message` : `📎 ${parsed.text}`))
                  : (persisted.contentType === "image" ? "📷 Image" : (persisted.contentType === "voice" ? "🎤 Voice Message" : "📎 Attachment"));
              } catch {
                lastMessage = persisted.contentType === "image" ? "📷 Image" : (persisted.contentType === "voice" ? "🎤 Voice Message" : "📎 Attachment");
              }
            }
            return c.id === conversationId
              ? {
                  ...c,
                  lastMessage,
                  lastMessageAt: persisted.createdAt,
                  lastMessageIsOwn: true,
                  unreadCount: 0,
                }
              : c;
          })
        );
      } catch (err) {
        // Degrade the optimistic message to "sent" so user can see it failed.
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? []).map((m) =>
            m.id === optimisticId
              ? { ...m, status: "sent" as const }
              : m
          ),
        }));
        console.error("Failed to send message:", err);
      } finally {
        setSendingMessage(false);
      }
    },
    [user]
  );

  const openNewChat = useCallback(
    async (otherUserId: string): Promise<string | null> => {
      if (!user) return null;
      try {
        const conv = await createOrGetDm(otherUserId, user.id);
        // Upsert into sidebar: replace if exists, prepend if new
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === conv.id);
          if (idx !== -1) {
            // Already in list — existing conversation is fine
            return prev;
          }
          // New conversation — prepend to top of list
          return [conv, ...prev];
        });
        return conv.id;
      } catch (err) {
        console.error("Failed to open/create DM:", err);
        return null;
      }
    },
    [user]
  );

  const openNewGroup = useCallback(async (name: string, memberIds: string[]) => {
    try {
      const conv = await createGroup(name, memberIds);
      setConversations((prev) => [
        conv,
        ...prev.filter((c) => c.id !== conv.id),
      ]);
      await selectConversation(conv.id);
      return conv.id;
    } catch (err) {
      console.error("Failed to create group:", err);
      return null;
    }
  }, [selectConversation]);

  const editMessageText = useCallback(
    async (conversationId: string, messageId: string, content: string) => {
      if (!user) return;
      try {
        const updatedMsg = await editMessage(conversationId, messageId, content, user.id);
        setMessages((prev) => {
          const msgs = prev[conversationId] || [];
          return {
            ...prev,
            [conversationId]: msgs.map((m) => m.id === messageId ? updatedMsg : m)
          };
        });
      } catch (err) {
        console.error("Failed to edit message:", err);
      }
    },
    [user]
  );

  const deleteMessageAction = useCallback(
    async (conversationId: string, messageId: string, mode: "me" | "everyone") => {
      try {
        const res = await deleteMessage(conversationId, messageId, mode);
        if (res.success) {
          if (mode === "me") {
            receiveMessageDelete(messageId);
          } else if (mode === "everyone" && res.message) {
            setMessages((prev) => {
              const msgs = prev[conversationId] || [];
              return {
                ...prev,
                [conversationId]: msgs.map((m) => m.id === messageId ? res.message! : m)
              };
            });
          }
        }
      } catch (err) {
        console.error("Failed to delete message:", err);
      }
    },
    [receiveMessageDelete]
  );

  const clearActiveConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  /* ── Value ───────────────────────────────────────────── */

  const value = useMemo(() => ({
    conversations,
    messages,
    loadingConversations,
    loadingMessages,
    sendingMessage,
    conversationsError,
    messagesError,
    typingUsers,
    highlightMessageId,
    loadConversations,
    selectConversation,
    sendMessage,
    receiveMessage,
    receiveTyping,
    updatePresence,
    receiveReadReceipt,
    receiveDeliveryReceipt,
    receiveReactionUpdate,
    receiveMessageUpdate,
    receiveMessageDelete,
    markConversationAsRead,
    toggleReaction,
    openNewChat,
    openNewGroup,
    editMessageText,
    deleteMessageAction,
    jumpToMessage,
    activeConversationId,
    clearActiveConversation,
  }), [
    conversations,
    messages,
    loadingConversations,
    loadingMessages,
    sendingMessage,
    conversationsError,
    messagesError,
    typingUsers,
    highlightMessageId,
    loadConversations,
    selectConversation,
    sendMessage,
    receiveMessage,
    receiveTyping,
    updatePresence,
    receiveReadReceipt,
    receiveDeliveryReceipt,
    receiveReactionUpdate,
    receiveMessageUpdate,
    receiveMessageDelete,
    markConversationAsRead,
    toggleReaction,
    openNewChat,
    openNewGroup,
    editMessageText,
    deleteMessageAction,
    jumpToMessage,
    activeConversationId,
    clearActiveConversation,
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useChat — consume the chat context.
 *
 * Must be used inside <ChatProvider>.
 */
export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a <ChatProvider>");
  }
  return ctx;
}
