import { Conversation, Message } from "@/types";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import GlobalSearchModal from "@/components/sidebar/GlobalSearchModal";
import { useState, useEffect } from "react";

interface AppLayoutProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  selectedConversation: Conversation | null;
  messages: Message[];
  onSelectConversation: (id: string) => void;
  onBack: () => void;
  onSendMessage: (conversationId: string, content: string, contentType?: "text" | "image" | "file" | "voice", replyTo?: Message) => Promise<void>;
  loadingConversations: boolean;
  loadingMessages: boolean;
  conversationsError: string | null;
  /** Called when the user selects someone from the New Chat search panel. */
  onNewChat: (userId: string, displayName: string) => void;
  /** Called when the user creates a new group. */
  onNewGroup: (name: string, memberIds: string[]) => void;
  /** Users currently typing in the active conversation. */
  typers: { userId: string; displayName: string }[];
  /** Forwarded to MessageComposer — fires when user starts typing. */
  onTypingStart: () => void;
  /** Forwarded to MessageComposer — fires when user stops typing or sends. */
  onTypingStop: () => void;
}

/**
 * Root two-pane layout that splits the screen into:
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │  Sidebar (280–320 px, fixed)  │  Chat Window (flex-1)   │
 * └──────────────────────────────────────────────────────────┘
 *
 * Responsive behaviour:
 * - Mobile (< md): only ONE pane is visible at a time.
 *   - Sidebar visible when no conversation is selected.
 *   - Chat window visible when a conversation is selected.
 * - Desktop (≥ md): both panes always visible side by side.
 */
export default function AppLayout({
  conversations,
  selectedConversationId,
  selectedConversation,
  messages,
  onSelectConversation,
  onBack,
  onSendMessage,
  loadingConversations,
  loadingMessages,
  conversationsError,
  onNewChat,
  onNewGroup,
  typers,
  onTypingStart,
  onTypingStop,
}: AppLayoutProps) {
  const conversationOpen = selectedConversationId !== null;
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <div
        className={`
          ${conversationOpen ? "hidden md:flex" : "flex"}
          flex-col w-80 min-w-[280px] h-full flex-shrink-0
        `}
      >
        <Sidebar
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={onSelectConversation}
          isLoading={loadingConversations}
          error={conversationsError}
          onNewChat={onNewChat}
          onNewGroup={onNewGroup}
          onOpenGlobalSearch={() => setGlobalSearchOpen(true)}
        />
      </div>

      {/* ── Chat Window ──────────────────────────────────── */}
      <div
        className={`
          ${conversationOpen ? "flex" : "hidden md:flex"}
          flex-col flex-1 h-full overflow-hidden
        `}
      >
        <ChatWindow
          conversation={selectedConversation}
          messages={messages}
          onBack={onBack}
          onSendMessage={onSendMessage}
          isLoadingMessages={loadingMessages}
          typers={typers}
          onTypingStart={onTypingStart}
          onTypingStop={onTypingStop}
        />
      </div>

      <GlobalSearchModal 
        isOpen={globalSearchOpen} 
        onClose={() => setGlobalSearchOpen(false)} 
      />
    </div>
  );
}
