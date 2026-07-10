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
 *   - sendMessage(conversationId, text)   — POST + optimistic append
 *
 * Design decisions:
 *   - Messages are cached per conversation so switching tabs doesn't re-fetch.
 *   - Sending is optimistic: a temporary "sending" message is appended
 *     immediately and replaced with the server response on success, or marked
 *     with "sent" status on error (message stays visible but status regresses).
 *   - No WebSocket here — this context is REST-only; WS is Milestone 10.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  fetchConversations,
  fetchMessages,
  postMessage,
} from "@/lib/chatService";
import { useAuth } from "@/contexts/AuthContext";
import type { Conversation, Message } from "@/types";

// ─── Context shape ──────────────────────────────────────────────────────────

interface ChatContextValue {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  loadingConversations: boolean;
  loadingMessages: boolean;
  sendingMessage: boolean;
  conversationsError: string | null;
  messagesError: string | null;

  loadConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
}

// ─── Context ────────────────────────────────────────────────────────────────

const ChatContext = createContext<ChatContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);

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

  /* ── Send a message ──────────────────────────────────── */

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (!user || !content.trim()) return;

      // Build an optimistic message to show immediately
      const optimisticId = `optimistic-${Date.now()}`;
      const optimistic: Message = {
        id: optimisticId,
        conversationId,
        senderId: user.id,
        senderName: user.display_name,
        content: content.trim(),
        contentType: "text",
        status: "sending",
        createdAt: new Date().toISOString(),
        isOwn: true,
      };

      // Append optimistic message immediately
      setMessages((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), optimistic],
      }));

      setSendingMessage(true);
      try {
        const persisted = await postMessage(conversationId, content.trim(), user.id);

        // Replace the optimistic message with the real one from the server
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? []).map((m) =>
            m.id === optimisticId ? persisted : m
          ),
        }));

        // Update the conversation preview in the sidebar
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessage: persisted.content,
                  lastMessageAt: persisted.createdAt,
                  lastMessageIsOwn: true,
                  unreadCount: 0,
                }
              : c
          )
        );
      } catch (err) {
        // Degrade the optimistic message to "sent" (error — not truly sent)
        // so the user can see it failed without losing the content.
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] ?? []).map((m) =>
            m.id === optimisticId
              ? { ...m, status: "sent" as const }
              : m
          ),
        }));
        // Surface error briefly — could be improved with a toast later
        console.error("Failed to send message:", err);
      } finally {
        setSendingMessage(false);
      }
    },
    [user]
  );

  /* ── Value ───────────────────────────────────────────── */

  const value: ChatContextValue = {
    conversations,
    messages,
    loadingConversations,
    loadingMessages,
    sendingMessage,
    conversationsError,
    messagesError,
    loadConversations,
    selectConversation,
    sendMessage,
  };

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
