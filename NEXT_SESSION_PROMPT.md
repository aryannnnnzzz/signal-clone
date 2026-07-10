You are a Senior Full-Stack Engineer. We are building a clone of the Signal messaging application.

Please follow these exact instructions to safely resume development:

---

## 1. Read these files FIRST (in order)

1. `CLAUDE_CONTEXT.md` — comprehensive architecture, API schemas, backend rules, all decisions made so far.
2. `progress.md` — exact milestone status and TODO checklist.
3. `PROJECT_SUMMARY.md` — executive overview.

---

## 2. What has been completed

### Backend (100% — DO NOT TOUCH)
- FastAPI + SQLite + SQLAlchemy 2.0 + Alembic
- 17 REST endpoints (Auth, Users, Contacts, Conversations, Messages)
- WebSocket real-time engine (messages, typing, presence, receipts)
- Mock JWT authentication (`123456` OTP, bcrypt passwords)
- Database seeded with 5 users and demo data

### Frontend — Milestone 6: Chat UI Shell (✅ Complete)
Location: `frontend/`
- Next.js 15, App Router, TypeScript, TailwindCSS v4
- 21 components: Sidebar, ConversationList, ChatHeader, MessageBubble, MessageComposer, Avatar, StatusIcon, EmptyState, etc.
- Responsive layout (desktop split-pane + mobile toggle)

### Frontend — Milestone 7: Authentication UI (✅ Complete)
Location: `frontend/components/auth/`
- 11 auth components: AuthFlow, AuthContainer, SignalLogo, AuthBackButton, AuthInput, WelcomeScreen, LoginScreen, RegisterScreen, OtpScreen, DisplayNameScreen, AvatarScreen

Auth flow sequence:
```
Welcome → Login OR Register → OTP → DisplayName → Avatar → completeAuth() → Chat App
```

### Frontend — Milestone 8: Auth API Integration (✅ Complete)
- `AuthContext` with `pendingUser` pattern: `register()`/`login()` store `pendingUser` (not `user`) so `isAuthenticated` stays `false` during onboarding. `completeAuth()` promotes it to `user` at the Avatar step.
- `LoginScreen`, `RegisterScreen`, `OtpScreen`, `DisplayNameScreen`, `AvatarScreen` integrated with FastAPI REST.
- JWT persisted to `localStorage`, session restored on mount via `GET /api/auth/me`.

### Frontend — Milestone 9: Chat API Integration (✅ Complete)
Location: `frontend/lib/chatService.ts`, `frontend/contexts/ChatContext.tsx`

**New files:**
- `lib/chatService.ts` — typed wrappers for `GET /api/conversations`, `GET /api/conversations/{id}/messages`, `POST /api/conversations/{id}/messages`. All backend→frontend type mapping (snake_case→camelCase, DM name resolution, `isOwn` derivation, message status derivation from `statuses[]`) lives here.
- `contexts/ChatContext.tsx` — global state: `conversations`, per-conversation `messages` cache, `loadingConversations`, `loadingMessages`, `sendingMessage`, `conversationsError`, `messagesError`. Actions: `loadConversations()`, `selectConversation(id)`, `sendMessage(id, content)` (optimistic).

**Modified files:**
- `app/page.tsx` — no more `mockData`; wraps `<ChatProvider>` around authenticated UI; `loadConversations()` on mount; `selectConversation(id)` on conversation click.
- `components/layout/AppLayout.tsx` — threads `onSendMessage`, `loadingMessages`, `loadingConversations`, `conversationsError` to children.
- `components/chat/ChatWindow.tsx` — shows `Loader2` spinner while messages load; passes `onSend` to `MessageComposer`.
- `components/chat/MessageComposer.tsx` — accepts `onSend` prop; optimistic draft clear; disabled while sending.
- `components/sidebar/Sidebar.tsx` — animated skeleton rows while loading; inline error banner on fetch failure.

### Backend Fix — Milestone 9.5: Welcome Conversation on Registration (✅ Complete)
Location: `backend/app/services/auth_service.py`

**Problem:** `GET /api/conversations` returned `[]` for newly registered users because
they were never added to any `conversation_members` row.

**Fix:** Added `_bootstrap_welcome_conversation(db, new_user)` private function.
Called in `register_user()` after the user is committed. Creates a DM with seed
user alice (`user-alice-001`) using existing `get_or_create_dm()` + sends a welcome
message using existing `send_message()`. Wrapped in try/except; skips silently if
alice doesn't exist (unseeded DB).

**No new endpoints. No dev-only routes. No frontend changes.**

### Hydration fixes
- `frontend/lib/utils.ts` — all `toLocale*` calls use `"en-GB"` locale and `timeZone: "UTC"`.

---

## 3. What remains (your task)

### Milestone 10: WebSocket Client

Create `frontend/contexts/WebSocketContext.tsx`:
- Connects to `ws://localhost:8000/ws?token=<jwt>` using the token from `AuthContext`.
- Handles inbound frame types: `message`, `typing`, `typing_stop`, `read_receipt`, `delivery_receipt`, `presence`
- On `message` event: prepend to `ChatContext.messages[conversationId]` and update conversation preview.
- On `presence` event: update `isOnline` on the relevant conversation.
- Exposes `sendWsMessage(conversationId, content)` action (replaces REST send for real-time).
- Auto-reconnects on drop with exponential back-off.

---

## 4. Files that MUST NOT be modified going forward

- `backend/` — entire directory is locked **except for already-completed fixes**.
  - `backend/app/services/auth_service.py` was modified for Milestone 9.5 (welcome DM).
- `frontend/components/layout/AppLayout.tsx` — do not redesign.
- `frontend/components/sidebar/*` — do not redesign.
- `frontend/components/chat/*` — do not redesign.
- `frontend/components/ui/*` — do not redesign.
- `frontend/data/mockData.ts` — keep for reference; not used in the app.
- `frontend/lib/utils.ts` — keep `"en-GB"` locale + UTC pinning.

---

## 5. Backend API base URL
```
http://localhost:8000
ws://localhost:8000
```

### WebSocket endpoint
```
ws://localhost:8000/ws?token=<jwt>
```

### Inbound WS frame types
```json
// message
{ "type": "message", "message": { ...MessageOut } }

// typing
{ "type": "typing", "conversation_id": "uuid", "user_id": "uuid" }

// typing_stop
{ "type": "typing_stop", "conversation_id": "uuid", "user_id": "uuid" }

// read_receipt
{ "type": "read_receipt", "conversation_id": "uuid", "user_id": "uuid", "last_read_message_id": "uuid", "timestamp": "iso" }

// delivery_receipt
{ "type": "delivery_receipt", "conversation_id": "uuid", "user_id": "uuid", "message_id": "uuid", "timestamp": "iso" }

// presence
{ "type": "presence", "user_id": "uuid", "is_online": bool, "last_seen_at": "iso | null" }
```

Bearer token header format:
```
Authorization: Bearer <access_token>
```

---

## 6. Confirm before starting

Before writing any code, confirm you have read all four documentation files and understand:
1. The backend is read-only.
2. Auth and Chat REST API are fully integrated.
3. The remaining task is the WebSocket client (Milestone 10).
4. No redesigns of existing components.
