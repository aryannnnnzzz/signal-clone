import { Conversation } from "@/types";
import Avatar from "@/components/ui/Avatar";
import StatusIcon from "@/components/ui/StatusIcon";
import { formatSidebarTimestamp } from "@/lib/utils";

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Single row in the sidebar conversation list.
 *
 * Layout (matches Signal Desktop):
 * ┌──────────────────────────────────────────────┐
 * │ [Avatar]  Name                    Timestamp  │
 * │           ✓✓ Last message…    [Unread badge] │
 * └──────────────────────────────────────────────┘
 *
 * - Online dot: rendered over avatar bottom-right for DM contacts
 * - Unread badge: Signal blue pill with count
 * - Status icon: shown only for own last messages
 */
export default function ConversationListItem({
  conversation,
  isSelected,
  onClick,
}: ConversationListItemProps) {
  const showOnlineDot =
    conversation.type === "dm" && conversation.isOnline === true;

  return (
    <li>
      <button
        onClick={onClick}
        className={`
          conversation-item w-full flex items-center gap-3 px-3 py-3 text-left
          ${isSelected ? "bg-signal-active" : "hover:bg-signal-hover"}
        `}
        aria-current={isSelected ? "true" : undefined}
        aria-label={`${conversation.name}${conversation.unreadCount ? `, ${conversation.unreadCount} unread` : ""}`}
      >
        {/* ── Avatar + Online Dot ─────────────────────── */}
        <div className="relative flex-shrink-0">
          <Avatar name={conversation.name} size="md" />
          {showOnlineDot && (
            <span
              className="absolute bottom-0 right-0 w-3 h-3 bg-signal-online border-2 border-signal-sidebar rounded-full"
              aria-hidden="true"
            />
          )}
        </div>

        {/* ── Text Content ───────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Name + Timestamp */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span
              className={`text-[14px] font-medium truncate ${
                isSelected ? "text-signal-primary" : "text-signal-primary"
              }`}
            >
              {conversation.name}
            </span>
            <span className="text-signal-muted text-[11px] flex-shrink-0 tabular-nums">
              {formatSidebarTimestamp(conversation.lastMessageAt)}
            </span>
          </div>

          {/* Row 2: Status icon + last message + unread badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0">
              {/* Delivery ticks for own last messages */}
              {conversation.lastMessageIsOwn &&
                conversation.lastMessageStatus && (
                  <StatusIcon
                    status={conversation.lastMessageStatus}
                    size="sm"
                  />
                )}
              <span className="text-signal-secondary text-[13px] truncate">
                {conversation.lastMessage ?? ""}
              </span>
            </div>

            {/* Unread count badge */}
            {conversation.unreadCount > 0 && (
              <span className="flex-shrink-0 bg-signal-blue text-white text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-[5px] tabular-nums">
                {conversation.unreadCount > 99
                  ? "99+"
                  : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}
