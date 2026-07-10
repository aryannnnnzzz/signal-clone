"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import AuthFlow from "@/components/auth/AuthFlow";
import { useAuth } from "@/contexts/AuthContext";
import { mockConversations, mockMessages } from "@/data/mockData";
import { Conversation, Message } from "@/types";

/**
 * Application entry point.
 *
 * Routing logic:
 *   1. While session is restoring  → full-screen loading spinner
 *   2. Not authenticated           → <AuthFlow> (Milestone 2 UI, now wired to API)
 *   3. Authenticated               → <AppLayout> (existing chat shell)
 *
 * The chat shell still uses mock data (Milestone 4 will replace it with
 * real API data). Auth is now fully real.
 */
export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* ── Session restore loading state ──────────────── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-signal-chat">
        <div className="flex flex-col items-center gap-4">
          {/* Simple animated dots spinner */}
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

  /* ── Main chat UI (still using mock data for now) ── */
  const selectedConversation: Conversation | null =
    mockConversations.find((c) => c.id === selectedId) ?? null;

  const messages: Message[] = selectedId
    ? (mockMessages[selectedId] ?? [])
    : [];

  return (
    <AppLayout
      conversations={mockConversations}
      selectedConversationId={selectedId}
      selectedConversation={selectedConversation}
      messages={messages}
      onSelectConversation={setSelectedId}
      onBack={() => setSelectedId(null)}
    />
  );
}
