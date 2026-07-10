"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { mockConversations, mockMessages } from "@/data/mockData";
import { Conversation, Message } from "@/types";

/**
 * Application entry point.
 *
 * Owns the single piece of UI state: which conversation is currently selected.
 * All child components receive the selected conversation and its messages
 * as props — no global state management required for Milestone 1.
 *
 * In Milestone 3, this will be replaced by data fetched from the backend API.
 */
export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
