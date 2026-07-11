/**
 * User service — typed wrappers for the /api/users and /api/conversations/dm endpoints.
 *
 * Used by the New Chat flow (user search + DM creation).
 */

import { apiRequest } from "./api";
import type { Conversation } from "@/types";

// ─── Backend shapes ──────────────────────────────────────────────────────────

export interface SearchedUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_online: boolean;
  phone_number: string | null;
  last_seen_at: string | null;
  created_at: string;
}

/** Minimal shape of ConversationOut returned by POST /api/conversations/dm */
interface BackendDmOut {
  id: string;
  type: string;
  group_name: string | null;
  group_avatar_url: string | null;
  created_at: string;
  updated_at: string;
  members: Array<{
    id: string;
    user_id: string;
    role: string;
    joined_at: string;
    last_read_at: string | null;
    user: SearchedUser;
  }>;
}

// ─── Service functions ───────────────────────────────────────────────────────

/**
 * GET /api/users/search?q=<query>
 *
 * Returns up to 20 users whose username or display_name contains the query
 * string (case-insensitive). Backend excludes no one — the caller should
 * filter out the current user if desired.
 */
export async function searchUsers(query: string): Promise<SearchedUser[]> {
  if (!query.trim()) return [];
  return apiRequest<SearchedUser[]>(
    `/api/users/search?q=${encodeURIComponent(query.trim())}`
  );
}

/**
 * POST /api/conversations/dm
 *
 * Idempotent — the backend calls get_or_create_dm() so calling this twice
 * with the same user_id returns the existing conversation.
 *
 * Maps the ConversationOut response to the frontend Conversation type.
 * The returned conversation has no lastMessage (brand-new DM) and
 * unreadCount=0.
 */
export async function createOrGetDm(
  otherUserId: string,
  currentUserId: string
): Promise<Conversation> {
  const raw = await apiRequest<BackendDmOut>("/api/conversations/dm", {
    method: "POST",
    body: { user_id: otherUserId },
  });

  // Derive the name from the other member's display_name
  const otherMember = raw.members.find((m) => m.user_id !== currentUserId);
  const name = otherMember?.user.display_name ?? "Unknown";
  const isOnline = otherMember?.user.is_online ?? false;

  return {
    id: raw.id,
    type: "dm",
    name,
    avatarUrl: raw.group_avatar_url ?? undefined,
    lastMessage: undefined,
    lastMessageAt: raw.updated_at,
    lastMessageIsOwn: undefined,
    unreadCount: 0,
    isOnline,
  };
}

/**
 * POST /api/conversations/group
 *
 * Creates a new group conversation.
 */
export async function createGroup(
  name: string,
  memberIds: string[],
): Promise<Conversation> {
  const raw = await apiRequest<BackendDmOut>("/api/conversations/group", {
    method: "POST",
    body: { name, member_ids: memberIds },
  });

  return {
    id: raw.id,
    type: "group",
    name: raw.group_name ?? "Group",
    avatarUrl: raw.group_avatar_url ?? undefined,
    lastMessage: undefined,
    lastMessageAt: raw.updated_at,
    lastMessageIsOwn: undefined,
    unreadCount: 0,
    memberCount: raw.members.length,
  };
}
