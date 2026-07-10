import { Phone, Video, Search, MoreVertical, ArrowLeft } from "lucide-react";
import { Conversation } from "@/types";
import Avatar from "@/components/ui/Avatar";

interface ChatHeaderProps {
  conversation: Conversation;
  /** Callback to close the chat and return to the conversation list (mobile) */
  onBack: () => void;
}

/**
 * Top bar of the active chat window.
 *
 * Shows:
 * - Mobile back button (hidden on md+)
 * - Contact/group avatar with online dot (DM only)
 * - Name and subtitle (Online / Last seen / N members)
 * - Action icons: Voice call, Video call, Search, More
 */
export default function ChatHeader({ conversation, onBack }: ChatHeaderProps) {
  const subtitle =
    conversation.type === "group"
      ? `${conversation.memberCount ?? 0} members`
      : conversation.isOnline
        ? "Online"
        : "Last seen recently";

  const showOnlineDot =
    conversation.type === "dm" && conversation.isOnline === true;

  return (
    <header className="flex items-center justify-between px-3 py-3 bg-signal-sidebar border-b border-signal-border flex-shrink-0 h-[60px]">
      {/* Left: back button (mobile) + avatar + name */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile-only back button */}
        <button
          onClick={onBack}
          className="md:hidden p-1.5 -ml-1 mr-0.5 rounded-full text-signal-secondary hover:text-signal-primary hover:bg-signal-hover transition-colors flex-shrink-0"
          aria-label="Back to conversations"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Avatar */}
        <div className="relative flex-shrink-0 cursor-pointer">
          <Avatar name={conversation.name} size="md" />
          {showOnlineDot && (
            <span
              className="absolute bottom-0 right-0 w-3 h-3 bg-signal-online border-2 border-signal-sidebar rounded-full"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Name + subtitle */}
        <div className="min-w-0 cursor-pointer">
          <h1 className="text-signal-primary font-semibold text-[15px] truncate leading-tight">
            {conversation.name}
          </h1>
          <p
            className={`text-[12px] truncate leading-tight ${
              showOnlineDot
                ? "text-signal-online"
                : "text-signal-secondary"
            }`}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: action icons */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          className="p-2 rounded-full text-signal-secondary hover:text-signal-primary hover:bg-signal-hover transition-colors"
          aria-label="Voice call"
          title="Voice call"
        >
          <Phone size={18} />
        </button>
        <button
          className="p-2 rounded-full text-signal-secondary hover:text-signal-primary hover:bg-signal-hover transition-colors"
          aria-label="Video call"
          title="Video call"
        >
          <Video size={18} />
        </button>
        <button
          className="p-2 rounded-full text-signal-secondary hover:text-signal-primary hover:bg-signal-hover transition-colors"
          aria-label="Search in conversation"
          title="Search in conversation"
        >
          <Search size={18} />
        </button>
        <button
          className="p-2 rounded-full text-signal-secondary hover:text-signal-primary hover:bg-signal-hover transition-colors"
          aria-label="More options"
          title="More options"
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </header>
  );
}
