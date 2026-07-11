/**
 * Chat service — typed wrappers around the FastAPI conversation and message
 * endpoints, plus the backend→frontend type mapping logic.
 *
 * All functions call `apiRequest` from `./api` so JWT injection, error
 * handling, and base-URL config are handled in one place.
 *
 * Mapping rules (backend snake_case → frontend camelCase):
 *
 * ConversationListItem → Conversation
 *   - type "dm"    → name = other member's display_name
 *   - type "group" → name = group_name
 *   - isOnline     → other member's is_online (DM only)
 *   - memberCount  → members.length (group only)
 *   - lastMessage  → last_message.content
 *   - lastMessageAt→ last_message.created_at ?? updated_at
 *   - lastMessageIsOwn → last_message.sender_id === currentUserId
 *
 * MessageOut → Message
 *   - senderId   → sender_id
 *   - senderName → sender.display_name (fallback: "Unknown")
 *   - contentType→ content_type
 *   - createdAt  → created_at
 *   - isOwn      → sender_id === currentUserId
 *   - status     → derived from statuses array (see deriveMessageStatus)
 */

import { apiRequest } from "./api";
import type { Conversation, Message, MessageStatus } from "@/types";

// ─── Backend response shapes ────────────────────────────────────────────────

interface BackendUserOut {
  id: string;
  username: string;
  display_name: string;
  phone_number: string | null;
  avatar_url: string | null;
  is_online: boolean;
  last_seen_at: string | null;
  created_at: string;
}

interface BackendMessageStatusOut {
  id: string;
  user_id: string;
  status: string;
  timestamp: string;
}

interface BackendMessageOut {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender: BackendUserOut | null;
  content_type: string;
  content: string;
  reply_to_id: string | null;
  reply_to: {
    id: string;
    sender_id: string | null;
    sender: BackendUserOut | null;
    content_type: string;
    content: string;
  } | null;
  created_at: string;
  statuses: BackendMessageStatusOut[];
}

interface BackendMemberOut {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at: string | null;
  user: BackendUserOut;
}

interface BackendConversationListItem {
  id: string;
  type: string;
  group_name: string | null;
  group_avatar_url: string | null;
  created_at: string;
  updated_at: string;
  members: BackendMemberOut[];
  last_message: BackendMessageOut | null;
  unread_count: number;
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

/**
 * Derive a MessageStatus from the backend statuses array.
 *
 * Rules (for own messages only — received messages are always "read"):
 *   - No statuses present → "sent"
 *   - Any status === "read" → "read"
 *   - Any status === "delivered" → "delivered"
 *   - Otherwise → "sent"
 */
function deriveMessageStatus(
  statuses: BackendMessageStatusOut[],
  isOwn: boolean
): MessageStatus {
  if (!isOwn) return "read";
  if (statuses.length === 0) return "sent";
  if (statuses.some((s) => s.status === "read")) return "read";
  if (statuses.some((s) => s.status === "delivered")) return "delivered";
  return "sent";
}

/**
 * Map a backend MessageOut to the frontend Message type.
 *
 * @param raw           - Raw response from the backend
 * @param currentUserId - The logged-in user's id (used to set isOwn)
 */
function mapMessage(raw: BackendMessageOut, currentUserId: string): Message {
  const isOwn = raw.sender_id === currentUserId;
  let replyTo = undefined;
  
  if (raw.reply_to) {
    replyTo = {
      id: raw.reply_to.id,
      senderName: raw.reply_to.sender?.display_name ?? "Unknown",
      content: raw.reply_to.content,
      contentType: raw.reply_to.content_type as Message["contentType"]
    };
  }

  return {
    id: raw.id,
    conversationId: raw.conversation_id,
    senderId: raw.sender_id ?? "",
    senderName: raw.sender?.display_name ?? "Unknown",
    content: raw.content,
    contentType: raw.content_type as Message["contentType"],
    status: deriveMessageStatus(raw.statuses, isOwn),
    createdAt: raw.created_at,
    isOwn,
    replyTo,
  };
}

/**
 * Map a backend ConversationListItem to the frontend Conversation type.
 *
 * @param raw           - Raw response from the backend
 * @param currentUserId - The logged-in user's id (used to find the "other" DM member)
 */
function mapConversation(
  raw: BackendConversationListItem,
  currentUserId: string
): Conversation {
  const isDm = raw.type === "dm";

  // For DMs, find the member who is NOT the current user
  const otherMember = isDm
    ? raw.members.find((m) => m.user_id !== currentUserId)
    : null;

  const name = isDm
    ? (otherMember?.user.display_name ?? "Unknown")
    : (raw.group_name ?? "Group");

  const isOnline = isDm ? (otherMember?.user.is_online ?? false) : undefined;
  const memberCount = !isDm ? raw.members.length : undefined;

  const lastMsg = raw.last_message;
  let lastMessage = lastMsg?.content ?? undefined;
  
  if (lastMsg?.content_type === "image" || lastMsg?.content_type === "file") {
    try {
      const parsed = JSON.parse(lastMsg.content);
      lastMessage = parsed.text 
        ? (lastMsg.content_type === "image" ? `📷 ${parsed.text}` : `📎 ${parsed.text}`)
        : (lastMsg.content_type === "image" ? "📷 Image" : "📎 Attachment");
    } catch {
      lastMessage = lastMsg.content_type === "image" ? "📷 Image" : "📎 Attachment";
    }
  }

  const lastMessageAt = lastMsg?.created_at ?? raw.updated_at;
  const lastMessageIsOwn = lastMsg
    ? lastMsg.sender_id === currentUserId
    : undefined;

  return {
    id: raw.id,
    type: raw.type as Conversation["type"],
    name,
    avatarUrl: raw.group_avatar_url ?? undefined,
    lastMessage,
    lastMessageAt,
    lastMessageIsOwn,
    unreadCount: raw.unread_count,
    isOnline,
    memberCount,
  };
}

// ─── Service functions ──────────────────────────────────────────────────────

/**
 * GET /api/conversations
 *
 * Returns the full conversation list for the authenticated user,
 * sorted by most recent activity (backend handles ordering).
 */
export async function fetchConversations(
  currentUserId: string
): Promise<Conversation[]> {
  const raw = await apiRequest<BackendConversationListItem[]>(
    "/api/conversations"
  );
  return raw.map((item) => mapConversation(item, currentUserId));
}

/**
 * GET /api/conversations/{conversationId}/messages?limit=50
 *
 * Fetches the most recent 50 messages for a conversation.
 * The backend returns them oldest-first (ascending created_at).
 */
export async function fetchMessages(
  conversationId: string,
  currentUserId: string
): Promise<Message[]> {
  const raw = await apiRequest<BackendMessageOut[]>(
    `/api/conversations/${conversationId}/messages?limit=50`
  );
  return raw.map((msg) => mapMessage(msg, currentUserId));
}

/**
 * POST /api/conversations/{conversationId}/messages
 *
 * Sends a text message. Returns the persisted MessageOut, mapped to Message.
 */
export async function postMessage(
  conversationId: string,
  content: string,
  currentUserId: string,
  contentType: "text" | "image" | "file" = "text",
  replyToId?: string
): Promise<Message> {
  const raw = await apiRequest<BackendMessageOut>(
    `/api/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: { content, content_type: contentType, reply_to_id: replyToId },
    }
  );
  return mapMessage(raw, currentUserId);
}
