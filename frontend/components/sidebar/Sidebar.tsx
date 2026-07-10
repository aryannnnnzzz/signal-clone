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
  isLoading: boolean;
  error: string | null;
}

/**
 * Left sidebar containing the conversation header, search field,
 * and scrollable conversation list.
 *
 * Owns `searchQuery` state locally — no need to lift it since
 * the filtering logic lives here.
 *
 * Shows a skeleton loader while conversations are fetching and an
 * inline error banner if the fetch fails.
 */
export default function Sidebar({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  error,
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

      {/* ── Loading state ─────────────────────────────── */}
      {isLoading && (
        <div className="flex-1 flex flex-col gap-0 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-3 animate-pulse"
            >
              {/* Avatar skeleton */}
              <div className="w-10 h-10 rounded-full bg-signal-hover flex-shrink-0" />
              {/* Text skeleton */}
              <div className="flex-1 min-w-0 space-y-2">
                <div
                  className="h-3 rounded bg-signal-hover"
                  style={{ width: `${55 + (i % 3) * 15}%` }}
                />
                <div
                  className="h-2.5 rounded bg-signal-hover"
                  style={{ width: `${40 + (i % 4) * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Error state ───────────────────────────────── */}
      {!isLoading && error && (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-[12px] leading-snug">
          <span className="font-medium">Could not load conversations.</span>
          <br />
          {error}
        </div>
      )}

      {/* ── Conversation list ─────────────────────────── */}
      {!isLoading && !error && (
        <ConversationList
          conversations={filtered}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      )}
    </aside>
  );
}
