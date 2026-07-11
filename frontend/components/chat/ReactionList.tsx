import React from "react";
import { Reaction } from "@/types";

interface ReactionListProps {
  reactions: Reaction[];
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
  isOwnMessage: boolean;
}

export default function ReactionList({
  reactions,
  currentUserId,
  onToggleReaction,
  isOwnMessage,
}: ReactionListProps) {
  if (!reactions || reactions.length === 0) return null;

  // Group by emoji
  const grouped = reactions.reduce((acc, curr) => {
    if (!acc[curr.emoji]) {
      acc[curr.emoji] = { count: 0, hasReacted: false };
    }
    acc[curr.emoji].count += 1;
    if (curr.userId === currentUserId) {
      acc[curr.emoji].hasReacted = true;
    }
    return acc;
  }, {} as Record<string, { count: number; hasReacted: boolean }>);

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      {Object.entries(grouped).map(([emoji, { count, hasReacted }]) => (
        <button
          key={emoji}
          onClick={(e) => {
            e.stopPropagation();
            onToggleReaction(emoji);
          }}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
            hasReacted
              ? "bg-signal-blue/20 border-signal-blue text-signal-blue"
              : "bg-signal-hover border-signal-border text-signal-secondary hover:bg-signal-active"
          }`}
          style={{ animation: "authEnter 0.2s ease-out" }}
        >
          <span>{emoji}</span>
          <span>{count}</span>
        </button>
      ))}
    </div>
  );
}
