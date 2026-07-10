import { Conversation } from "@/types";
import ConversationListItem from "./ConversationListItem";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Scrollable list of conversation rows.
 * Shows an inline empty state when the search filter yields no results.
 */
export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <p className="text-signal-muted text-sm">No conversations found</p>
      </div>
    );
  }

  return (
    <nav
      className="flex-1 overflow-y-auto"
      aria-label="Conversation list"
    >
      <ul role="list">
        {conversations.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            conversation={conversation}
            isSelected={conversation.id === selectedId}
            onClick={() => onSelect(conversation.id)}
          />
        ))}
      </ul>
    </nav>
  );
}
