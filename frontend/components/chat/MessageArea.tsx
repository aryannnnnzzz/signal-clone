"use client";

import { useEffect, useRef } from "react";
import { ConversationType, Message } from "@/types";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { getDateLabel, isNewDay } from "@/lib/utils";

interface MessageAreaProps {
  messages: Message[];
  conversationType: ConversationType;
  /** Users currently typing in this conversation. */
  typers: { userId: string; displayName: string }[];
}

/**
 * Scrollable message feed.
 *
 * Features:
 * - Auto-scrolls to the bottom whenever `messages` changes
 * - Renders date separator pills between day boundaries
 * - Passes `showSenderName` to bubbles (only for group received msgs)
 */
export default function MessageArea({
  messages,
  conversationType,
  typers,
}: MessageAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to latest message on mount and whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-3"
      aria-label="Message feed"
      aria-live="polite"
    >
      {messages.map((message, index) => {
        const prevMessage = messages[index - 1];
        const showDateSeparator =
          index === 0 || isNewDay(prevMessage.createdAt, message.createdAt);

        const showSenderName =
          conversationType === "group" && !message.isOwn;

        return (
          <div key={message.id}>
            {/* ── Date separator ─────────────────────── */}
            {showDateSeparator && (
              <div className="flex items-center justify-center my-4">
                <span className="text-signal-muted text-[11px] bg-signal-hover px-3 py-1 rounded-full select-none">
                  {getDateLabel(message.createdAt)}
                </span>
              </div>
            )}

            <MessageBubble
              message={message}
              showSenderName={showSenderName}
            />
          </div>
        );
      })}

      {/* Invisible scroll anchor */}
      {typers.length > 0 && (
        <TypingIndicator typers={typers} />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
