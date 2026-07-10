"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import AuthFlow from "@/components/auth/AuthFlow";
import { useAuth } from "@/contexts/AuthContext";
import { ChatProvider, useChat } from "@/contexts/ChatContext";

/**
 * Application entry point.
 *
 * Routing logic:
 *   1. While session is restoring → full-screen loading spinner
 *   2. Not authenticated          → <AuthFlow>
 *   3. Authenticated              → <ChatProvider> → <ChatApp>
 *
 * ChatProvider is rendered only when authenticated so it can safely
 * call useAuth() and start loading conversations immediately.
 */
export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

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

  /* ── Main chat UI with real API data ─────────────── */
  return (
    <ChatProvider>
      <ChatApp />
    </ChatProvider>
  );
}

/**
 * Inner component rendered only when authenticated.
 * Owns conversation selection state and triggers API calls via ChatContext.
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
  } = useChat();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectConversation = async (id: string) => {
    setSelectedId(id);
    await selectConversation(id);
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
      onSendMessage={sendMessage}
      loadingConversations={loadingConversations}
      loadingMessages={loadingMessages}
      conversationsError={conversationsError}
    />
  );
}