export type MessageStatus = "sending" | "sent" | "delivered" | "read";
export type ConversationType = "dm" | "group";
export type ContentType = "text" | "image" | "file";

/**
 * Mirrors the backend UserOut Pydantic schema.
 * Field names use snake_case to match the JSON response directly,
 * avoiding any transform layer in the API client.
 */
export interface AuthUser {
  id: string;
  username: string;
  display_name: string;
  phone_number: string | null;
  avatar_url: string | null;
  is_online: boolean;
  last_seen_at: string | null;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  phoneNumber: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeenAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  /** Display name of the sender */
  senderName: string;
  content: string;
  contentType: ContentType;
  /** Delivery/read status — only meaningful for own messages */
  status: MessageStatus;
  createdAt: string;
  /** True when this message was sent by the current logged-in user */
  isOwn: boolean;
  /** The message this message is replying to, if any */
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
    contentType: ContentType;
  };
}

export interface Conversation {
  id: string;
  type: ConversationType;
  /** For DMs: contact display name. For groups: group name. */
  name: string;
  avatarUrl?: string;
  /** Preview text shown in the conversation list */
  lastMessage?: string;
  lastMessageAt: string;
  /** True if the last message was sent by the current user */
  lastMessageIsOwn?: boolean;
  /** Status of the last message (only used for own messages) */
  lastMessageStatus?: MessageStatus;
  unreadCount: number;
  /** Online presence indicator — only relevant for DM conversations */
  isOnline?: boolean;
  /** Total member count — only relevant for group conversations */
  memberCount?: number;
}
