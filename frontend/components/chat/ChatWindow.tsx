import { Conversation, Message } from "@/types";
import ChatHeader from "./ChatHeader";
import MessageArea from "./MessageArea";
import MessageComposer from "./MessageComposer";
import EmptyState from "@/components/ui/EmptyState";

interface ChatWindowProps {
  conversation: Conversation | null;
  messages: Message[];
  onBack: () => void;
}

/**
 * Right-side chat pane.
 *
 * When `conversation` is null, renders the `EmptyState` prompt.
 * When a conversation is active, composes:
 *   ChatHeader → MessageArea → MessageComposer
 *
 * The `onBack` callback is forwarded to `ChatHeader` for the
 * mobile back-button that returns to the sidebar.
 */
export default function ChatWindow({
  conversation,
  messages,
  onBack,
}: ChatWindowProps) {
  if (!conversation) {
    return <EmptyState />;
  }

  return (
    <main className="flex flex-col flex-1 h-full overflow-hidden bg-signal-chat">
      <ChatHeader conversation={conversation} onBack={onBack} />
      <MessageArea
        messages={messages}
        conversationType={conversation.type}
      />
      <MessageComposer />
    </main>
  );
}
