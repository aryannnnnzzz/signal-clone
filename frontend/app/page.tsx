"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import AuthFlow from "@/components/auth/AuthFlow";
import { mockConversations, mockMessages } from "@/data/mockData";
import { Conversation, Message } from "@/types";

/**
 * Application entry point.
 *
 * Auth state is mock — no tokens, no API calls.
 *
 * Flow:
 *   1. Renders <AuthFlow> until the user completes onboarding.
 *   2. Once onComplete fires, switches to the existing <AppLayout>.
 *
 * This keeps Milestone 2 (auth UI) and Milestone 1 (chat UI) completely
 * decoupled. AppLayout is not modified at all.
 */
export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isAuthenticated) {
    return <AuthFlow onComplete={() => setIsAuthenticated(true)} />;
  }

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
