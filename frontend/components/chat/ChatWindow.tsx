import { Conversation, Message } from "@/types";
import ChatHeader from "./ChatHeader";
import MessageArea from "./MessageArea";
import MessageComposer from "./MessageComposer";
import EmptyState from "@/components/ui/EmptyState";
import { Loader2 } from "lucide-react";

interface ChatWindowProps {
  conversation: Conversation | null;
  messages: Message[];
  onBack: () => void;
  onSendMessage: (conversationId: string, content: string) => Promise<void>;
  isLoadingMessages: boolean;
  /** Users currently typing in the active conversation. */
  typers: { userId: string; displayName: string }[];
  /** Forwarded to MessageComposer — fires when user starts typing. */
  onTypingStart: () => void;
  /** Forwarded to MessageComposer — fires when user stops typing or sends. */
  onTypingStop: () => void;
}

/**
 * Right-side chat pane.
 *
 * When `conversation` is null, renders the `EmptyState` prompt.
 * When a conversation is active, composes:
 *   ChatHeader → MessageArea (or loader) → MessageComposer
 *
 * The `onBack` callback is forwarded to `ChatHeader` for the
 * mobile back-button that returns to the sidebar.
 */
export default function ChatWindow({
  conversation,
  messages,
  onBack,
  onSendMessage,
  isLoadingMessages,
  typers,
  onTypingStart,
  onTypingStop,
}: ChatWindowProps) {
  if (!conversation) {
    return <EmptyState />;
  }

  const handleSend = async (content: string) => {
    await onSendMessage(conversation.id, content);
  };

  return (
    <main className="flex flex-col flex-1 h-full overflow-hidden bg-signal-chat">
      <ChatHeader conversation={conversation} onBack={onBack} />

      {/* ── Message area or loader ─────────────────────── */}
      {isLoadingMessages ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-signal-muted">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-[13px]">Loading messages…</span>
          </div>
        </div>
      ) : (
        <MessageArea
          messages={messages}
          conversationType={conversation.type}
          typers={typers}
        />
      )}

      <MessageComposer
        onSend={handleSend}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
      />
    </main>
  );
}
