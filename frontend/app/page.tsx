"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import AuthFlow from "@/components/auth/AuthFlow";
import { useAuth } from "@/contexts/AuthContext";
import { ChatProvider, useChat } from "@/contexts/ChatContext";
import {
  WebSocketProvider,
  useWebSocket,
  type WsMessagePayload,
  type WsPresencePayload,
  type WsTypingPayload,
} from "@/contexts/WebSocketContext";

/**
 * Application entry point.
 *
 * Routing logic:
 *   1. While session is restoring → full-screen loading spinner
 *   2. Not authenticated          → <AuthFlow>
 *   3. Authenticated              → <ChatProvider> → <WebSocketProvider> → <ChatApp>
 *
 * Provider nesting order (inner depends on outer):
 *   <ChatProvider>           — owns conversation + message state
 *     <WebSocketProvider>    — manages WS connection; calls ChatContext actions
 *       <ChatApp>            — reads both contexts
 *
 * ChatProvider is rendered only when authenticated so it can safely
 * call useAuth() and start loading conversations immediately.
 */
export default function Home() {
  const { isAuthenticated, isLoading, token } = useAuth();

  /* ── Session restore loading state ──────────────── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-signal-chat">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2" aria-label="Loading" role="status">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-signal-blue"
                style={{
                  animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          <p className="text-signal-muted text-[13px]">Loading…</p>
        </div>
      </div>
    );
  }

  /* ── Auth flow ───────────────────────────────────── */
  if (!isAuthenticated) {
    return <AuthFlow />;
  }

  /* ── Main chat UI with real-time WebSocket ─────────── */
  return (
    <ChatProvider>
      <WebSocketProvider token={token}>
        <ChatApp />
      </WebSocketProvider>
    </ChatProvider>
  );
}

/**
 * Inner component rendered only when authenticated.
 * Owns conversation selection state and triggers API calls via ChatContext.
 * Wires WebSocket callbacks to ChatContext actions.
 */
function ChatApp() {
  const {
    conversations,
    messages,
    loadingConversations,
    loadingMessages,
    conversationsError,
    loadConversations,
    selectConversation,
    sendMessage,
    receiveMessage,
    updatePresence,
    openNewChat,
  } = useChat();

  const { isConnected, sendWsMessage, registerCallbacks } = useWebSocket();
  const { user } = useAuth();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* ── Register WS → ChatContext callbacks on mount ── */
  useEffect(() => {
    if (!user) return;

    registerCallbacks({
      onMessage: (payload: WsMessagePayload) => {
        receiveMessage(payload, user.id);
      },
      onPresence: (payload: WsPresencePayload) => {
        updatePresence(payload.user_id, payload.is_online);
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onTyping: (_payload: WsTypingPayload, _isStop: boolean) => {
        // Typing indicators — UI not yet implemented, silently handled
      },
    });
  }, [user, registerCallbacks, receiveMessage, updatePresence]);

  /* ── Load conversations on mount ─────────────────── */
  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectConversation = async (id: string) => {
    setSelectedId(id);
    await selectConversation(id);
  };

  /**
   * Wraps ChatContext.sendMessage with the WS send function and connected state.
   * ChatContext will use WS if connected, REST POST if not.
   */
  const handleSendMessage = async (conversationId: string, content: string) => {
    await sendMessage(conversationId, content, sendWsMessage, isConnected);
  };

  /**
   * Called when the user picks someone from the NewChatPanel search.
   * 1. Calls ChatContext.openNewChat(userId) — creates/gets the DM via REST.
   * 2. Auto-selects the returned conversation id.
   */
  const handleNewChat = async (userId: string) => {
    const convId = await openNewChat(userId);
    if (convId) {
      await handleSelectConversation(convId);
    }
  };

  const selectedConversation =
    conversations.find((c) => c.id === selectedId) ?? null;

  const currentMessages = selectedId ? (messages[selectedId] ?? []) : [];

  return (
    <AppLayout
      conversations={conversations}
      selectedConversationId={selectedId}
      selectedConversation={selectedConversation}
      messages={currentMessages}
      onSelectConversation={handleSelectConversation}
      onBack={() => setSelectedId(null)}
      onSendMessage={handleSendMessage}
      loadingConversations={loadingConversations}
      loadingMessages={loadingMessages}
      conversationsError={conversationsError}
      onNewChat={handleNewChat}
    />
  );
}