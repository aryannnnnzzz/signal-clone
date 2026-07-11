import { Message } from "@/types";
import StatusIcon from "@/components/ui/StatusIcon";
import { formatMessageTime } from "@/lib/utils";
import { useState } from "react";
import ImageViewer from "./ImageViewer";
import { Paperclip, Download } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  /**
   * When true, renders the sender's name above the bubble content.
   * Should be true only for received messages in group conversations.
   */
  showSenderName: boolean;
  /** Called when user clicks reply */
  onReply?: (msg: Message) => void;
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
  onReply,
}: MessageBubbleProps) {
  const { id, isOwn, content, contentType, status, createdAt, senderName, replyTo } = message;
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  let parsedContent = null;
  let text = content;
  
  if (contentType === "image" || contentType === "file") {
    try {
      parsedContent = JSON.parse(content);
      text = parsedContent.text || "";
    } catch {
      // If parsing fails, fall back to showing raw content
    }
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`message-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-signal-hover", "transition-colors", "duration-500");
      setTimeout(() => el.classList.remove("bg-signal-hover"), 1500);
    }
  };

  return (
    <div 
      id={`message-${id}`}
      className={`group flex items-center gap-2 mb-[3px] ${isOwn ? "justify-end" : "justify-start"}`}
    >
      {/* Reply Button (visible on hover) for sent messages (left of bubble) */}
      {isOwn && onReply && (
        <button
          onClick={() => onReply(message)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full text-signal-secondary hover:text-signal-primary hover:bg-signal-hover flex-shrink-0"
          aria-label="Reply"
          title="Reply"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 17 4 12 9 7" />
            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
          </svg>
        </button>
      )}

      <div
        className={`
          message-bubble relative px-3.5 py-2 rounded-[18px]
          ${isOwn
            ? "bg-signal-sent text-white rounded-br-[4px]"
            : "bg-signal-received text-signal-primary rounded-bl-[4px]"
          }
        `}
      >
        {/* Quoted Message Preview */}
        {replyTo && (
          <div 
            onClick={() => scrollToMessage(replyTo.id)}
            className={`
              mb-1.5 p-2 rounded-lg cursor-pointer transition-colors relative overflow-hidden
              ${isOwn ? "bg-black/20 hover:bg-black/30 text-white/90" : "bg-black/10 hover:bg-black/20 text-signal-primary"}
            `}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOwn ? "bg-white/50" : "bg-signal-blue"} rounded-full`} />
            <div className="pl-1.5 min-w-0">
              <div className={`text-[12px] font-semibold truncate ${isOwn ? "text-white" : "text-signal-blue"}`}>
                {replyTo.senderName}
              </div>
              <div className="text-[13px] truncate max-w-[250px] opacity-90">
                {replyTo.contentType === "text" 
                  ? replyTo.content 
                  : (replyTo.contentType === "image" ? "📷 Image" : "📎 Attachment")}
              </div>
            </div>
          </div>
        )}

        {/* Sender name — group received messages only */}
        {showSenderName && !isOwn && (
          <p className="text-signal-blue text-[12px] font-semibold mb-0.5 leading-tight">
            {senderName}
          </p>
        )}

        {/* Attachment Content */}
        {parsedContent && parsedContent.attachment && (
          <div className="mb-2">
            {contentType === "image" ? (
              <div 
                className="cursor-pointer relative group rounded overflow-hidden mt-1"
                onClick={() => setIsViewerOpen(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={`${API_BASE}${parsedContent.attachment.url}`} 
                  alt={parsedContent.attachment.name}
                  className="max-h-[300px] w-auto max-w-full rounded object-cover"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white bg-black/50 px-3 py-1.5 rounded-full text-xs backdrop-blur-md">View</span>
                </div>
              </div>
            ) : (
              <a 
                href={`${API_BASE}${parsedContent.attachment.url}`} 
                download={parsedContent.attachment.name}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-3 p-3 rounded-lg mt-1 transition-colors border
                  ${isOwn 
                    ? "bg-white/10 hover:bg-white/20 border-white/20" 
                    : "bg-signal-hover hover:bg-signal-hover-hover border-signal-border"}`}
              >
                <div className={`p-2 rounded ${isOwn ? "bg-white/20" : "bg-signal-blue/20 text-signal-blue"}`}>
                  <Paperclip size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate max-w-[200px]">{parsedContent.attachment.name}</div>
                  <div className={`text-xs ${isOwn ? "text-white/70" : "text-signal-secondary"}`}>
                    {(parsedContent.attachment.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <div className={`p-1.5 rounded-full ${isOwn ? "bg-white/20 hover:bg-white/30" : "bg-signal-sidebar hover:bg-signal-hover"}`}>
                  <Download size={16} />
                </div>
              </a>
            )}
          </div>
        )}

        {/* Message text */}
        {text && (
          <p className="text-[14px] leading-[1.45] break-words whitespace-pre-wrap">
            {text}
          </p>
        )}

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

      {/* Reply Button (visible on hover) for received messages (right of bubble) */}
      {!isOwn && onReply && (
        <button
          onClick={() => onReply(message)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full text-signal-secondary hover:text-signal-primary hover:bg-signal-hover flex-shrink-0"
          aria-label="Reply"
          title="Reply"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 17 4 12 9 7" />
            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
          </svg>
        </button>
      )}

      {isViewerOpen && parsedContent && parsedContent.attachment && contentType === "image" && (
        <ImageViewer 
          url={`${API_BASE}${parsedContent.attachment.url}`} 
          alt={parsedContent.attachment.name}
          onClose={() => setIsViewerOpen(false)} 
        />
      )}
    </div>
  );
}
