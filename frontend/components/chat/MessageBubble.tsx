import { Message } from "@/types";
import StatusIcon from "@/components/ui/StatusIcon";
import { formatMessageTime } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  /**
   * When true, renders the sender's name above the bubble content.
   * Should be true only for received messages in group conversations.
   */
  showSenderName: boolean;
}

/**
 * Individual message bubble — mirrors Signal Desktop's visual design:
 *
 * Sent  (isOwn = true):
 *   - Right-aligned
 *   - Signal blue background (#2C6BED)
 *   - Bottom-right flat corner (tail)
 *   - Timestamp + read-receipt icon (white / transparent)
 *
 * Received (isOwn = false):
 *   - Left-aligned
 *   - Dark grey background (#252527)
 *   - Bottom-left flat corner (tail)
 *   - Timestamp in muted grey, no receipt
 *   - Optional sender name in Signal blue (group chats)
 */
export default function MessageBubble({
  message,
  showSenderName,
}: MessageBubbleProps) {
  const { isOwn, content, status, createdAt, senderName } = message;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-[3px]`}>
      <div
        className={`
          message-bubble relative px-3.5 py-2 rounded-[18px]
          ${isOwn
            ? "bg-signal-sent text-white rounded-br-[4px]"
            : "bg-signal-received text-signal-primary rounded-bl-[4px]"
          }
        `}
      >
        {/* Sender name — group received messages only */}
        {showSenderName && !isOwn && (
          <p className="text-signal-blue text-[12px] font-semibold mb-0.5 leading-tight">
            {senderName}
          </p>
        )}

        {/* Message text */}
        <p className="text-[14px] leading-[1.45] break-words whitespace-pre-wrap">
          {content}
        </p>

        {/* Footer: timestamp [+ status icon for own messages] */}
        <div
          className={`flex items-center gap-1 mt-1.5 ${
            isOwn ? "justify-end" : "justify-start"
          }`}
        >
          <span
            className={`text-[11px] tabular-nums ${
              isOwn ? "text-white/55" : "text-signal-muted"
            }`}
          >
            {formatMessageTime(createdAt)}
          </span>
          {isOwn && <StatusIcon status={status} size="sm" variant="onBlue" />}
        </div>
      </div>
    </div>
  );
}
