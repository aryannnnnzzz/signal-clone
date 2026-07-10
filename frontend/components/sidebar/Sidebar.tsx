"use client";

import { useState } from "react";
import { Conversation } from "@/types";
import SidebarHeader from "./SidebarHeader";
import SearchBar from "./SearchBar";
import ConversationList from "./ConversationList";

interface SidebarProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Left sidebar containing the conversation header, search field,
 * and scrollable conversation list.
 *
 * Owns `searchQuery` state locally — no need to lift it since
 * the filtering logic lives here.
 */
export default function Sidebar({
  conversations,
  selectedId,
  onSelect,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered =
    searchQuery.trim() === ""
      ? conversations
      : conversations.filter(
          (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase()) ??
              false)
        );

  return (
    <aside
      className="flex flex-col w-80 min-w-[280px] h-full bg-signal-sidebar border-r border-signal-border flex-shrink-0"
      aria-label="Conversations sidebar"
    >
      <SidebarHeader />
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <ConversationList
        conversations={filtered}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </aside>
  );
}
