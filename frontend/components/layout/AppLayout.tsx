import { Conversation, Message } from "@/types";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatWindow from "@/components/chat/ChatWindow";

interface AppLayoutProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  selectedConversation: Conversation | null;
  messages: Message[];
  onSelectConversation: (id: string) => void;
  onBack: () => void;
  onSendMessage: (conversationId: string, content: string) => Promise<void>;
  loadingConversations: boolean;
  loadingMessages: boolean;
  conversationsError: string | null;
  /** Called when the user selects someone from the New Chat search panel. */
  onNewChat: (userId: string, displayName: string) => void;
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
  typers,
  onTypingStart,
  onTypingStop,
}: AppLayoutProps) {
  const conversationOpen = selectedConversationId !== null;

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
    </div>
  );
}
