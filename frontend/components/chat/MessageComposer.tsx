"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Smile, Paperclip, Mic, Send } from "lucide-react";

interface MessageComposerProps {
  /**
   * Called when the user sends a message.
   * The composer clears its draft immediately (optimistic) and awaits the
   * promise. Any error is handled by the caller (ChatContext).
   */
  onSend: (content: string) => Promise<void>;
  /** Called after 400 ms of typing — send a typing_start WS frame. */
  onTypingStart: () => void;
  /** Called after 1 s of inactivity or immediately on send — send typing_stop. */
  onTypingStop: () => void;
}

/**
 * Message composition bar at the bottom of the chat window.
 *
 * - Emoji button (left)
 * - Auto-resizing textarea (up to ~5 lines)
 * - Attachment clip button (right, always visible)
 * - Send button (right, shown when draft is non-empty)
 * - Mic button (right, shown when draft is empty)
 *
 * Enter sends; Shift+Enter inserts a newline.
 * The send button is disabled while a message is being sent.
 */
export default function MessageComposer({ onSend, onTypingStart, onTypingStop }: MessageComposerProps) {
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Refs for debounce timers — mutated without triggering re-renders
  // debounceRef:  fires typing_start 400 ms after first keystroke in a burst
  // stopRef:      fires typing_stop  1 s  after the last keystroke
  // isTypingRef:  tracks whether we've already sent typing_start for this burst
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Cancel all pending timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        clearInterval(debounceRef.current);
      }
      if (stopRef.current) clearTimeout(stopRef.current);
    };
  }, []);

  // Auto-resize textarea height based on content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Handle every draft change.
   * - Debounce typing_start: fire once 400 ms after first keystroke.
   * - Reset stop timer: fire typing_stop 1 s after the LAST keystroke.
   */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);

    // If draft just became empty, stop typing immediately
    if (!e.target.value.trim()) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        clearInterval(debounceRef.current);
        debounceRef.current = null;
      }
      if (stopRef.current) { clearTimeout(stopRef.current); stopRef.current = null; }
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop();
      }
      return;
    }

    // Reset the 1 s stop timer on every keystroke
    if (stopRef.current) clearTimeout(stopRef.current);
    stopRef.current = setTimeout(() => {
      stopRef.current = null;
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop();
      }
    }, 1_000);

    // Schedule typing_start if not already sent for this burst
    if (!isTypingRef.current && !debounceRef.current) {
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        isTypingRef.current = true;
        console.log("[DEBUG] MessageComposer calling onTypingStart()");
        onTypingStart();
        
        // Setup an interval to re-send typing_start every 2.5 seconds
        // so the 3-second safety timer on the receiving end doesn't expire
        // while the user is still typing a long message.
        debounceRef.current = setInterval(() => {
          onTypingStart();
        }, 2500);
      }, 400);
    }
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || isSending) return;

    // Stop typing immediately — clear timers, notify server
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      clearInterval(debounceRef.current);
      debounceRef.current = null;
    }
    if (stopRef.current) { clearTimeout(stopRef.current); stopRef.current = null; }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStop();
    }

    // Clear the draft optimistically before the await so the UI feels snappy
    setDraft("");
    setIsSending(true);
    try {
      await onSend(content);
    } finally {
      setIsSending(false);
    }
  };

  const hasDraft = draft.trim().length > 0;

  return (
    <footer className="flex items-end gap-1.5 px-3 py-3 bg-signal-sidebar border-t border-signal-border flex-shrink-0">
      {/* Emoji */}
      <button
        className="p-2 text-signal-secondary hover:text-signal-primary transition-colors flex-shrink-0 mb-[1px]"
        aria-label="Insert emoji"
        title="Emoji"
      >
        <Smile size={21} />
      </button>

      {/* Attachment */}
      <button
        className="p-2 text-signal-secondary hover:text-signal-primary transition-colors flex-shrink-0 mb-[1px]"
        aria-label="Attach file"
        title="Attach"
      >
        <Paperclip size={21} />
      </button>

      {/* Auto-resizing textarea */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Signal message"
          rows={1}
          disabled={isSending}
          className="
            w-full bg-signal-hover text-signal-primary
            placeholder-signal-muted text-[14px]
            rounded-2xl px-4 py-2.5
            outline-none resize-none overflow-hidden
            focus:ring-1 focus:ring-signal-blue/40
            transition-shadow duration-150
            leading-[1.5]
            disabled:opacity-60
          "
          aria-label="Message input"
          style={{ maxHeight: "120px", overflowY: "auto" }}
        />
      </div>

      {/* Send / Mic — toggled by draft content */}
      {hasDraft ? (
        <button
          onClick={handleSend}
          disabled={isSending}
          className="
            p-2 bg-signal-blue hover:bg-signal-blue-hover
            text-white rounded-full flex-shrink-0 mb-[1px]
            transition-colors duration-150
            disabled:opacity-60 disabled:cursor-not-allowed
          "
          aria-label="Send message"
          title="Send"
        >
          <Send size={18} />
        </button>
      ) : (
        <button
          className="p-2 text-signal-secondary hover:text-signal-primary transition-colors flex-shrink-0 mb-[1px]"
          aria-label="Voice message"
          title="Voice message"
        >
          <Mic size={21} />
        </button>
      )}
    </footer>
  );
}
