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

**Files:**
- `lib/chatService.ts` — typed wrappers for `GET /api/conversations`, `GET /api/conversations/{id}/messages`, `POST /api/conversations/{id}/messages`. All backend→frontend type mapping (snake_case→camelCase, DM name resolution, `isOwn` derivation, message status derivation from `statuses[]`) lives here.
- `contexts/ChatContext.tsx` — global state + `receiveMessage()` + `updatePresence()` + WS-aware `sendMessage()`.

### Backend Fix — Milestone 9.5: Welcome Conversation on Registration (✅ Complete)
Location: `backend/app/services/auth_service.py`
- Added `_bootstrap_welcome_conversation(db, new_user)`.
- Creates DM with alice + welcome message on every new registration.

### Frontend — Milestone 10: WebSocket Real-time Client (✅ Complete)
Location: `frontend/contexts/WebSocketContext.tsx`

**New file: `frontend/contexts/WebSocketContext.tsx`**
- Connects to `ws://localhost:8000/ws?token=<jwt>` using token from AuthContext.
- Authenticates via JWT query param (backend closes with code 4001 on auth failure).
- Exponential back-off reconnect: 1s → 2s → 4s → 8s → 16s → 30s (cap). Resets on success.
- Dispatches inbound frames to registered callbacks:
  - `onMessage(WsMessagePayload)` — new message from server
  - `onPresence(WsPresencePayload)` — user online/offline
  - `onTyping(WsTypingPayload, isStop)` — typing indicator (wired but no UI)
- `sendWsMessage(conversationId, content)` — emits `new_message` frame.
- `sendFrame(frame)` — raw JSON send with connected guard.
- `isConnected` — boolean for status display.
- Auto-closes on logout, no retry on code 4001.

**Modified: `frontend/contexts/ChatContext.tsx`**
- Added `receiveMessage(payload, userId)`:
  - Deduplicates by id (server echoes message back to sender too).
  - Replaces matching `optimistic-*` entry (sender gets their message replaced by real).
  - Appends new message for receivers.
  - Updates conversation preview (lastMessage, lastMessageAt, unreadCount).
- Added `updatePresence(userId, isOnline)` (stub, wired for future UI).
- Modified `sendMessage(convId, content, wsSend?, wsConnected?)`:
  - WS path: optimistic append + sendWsMessage. Response via message echo.
  - REST fallback: optimistic append + postMessage(). Used when WS disconnected.

**Modified: `frontend/app/page.tsx`**
- Added `<WebSocketProvider token={token}>` inside `<ChatProvider>`, wrapping `<ChatApp>`.
- `ChatApp` registers WS callbacks on mount via `registerCallbacks()`.
- `handleSendMessage` passes `sendWsMessage` and `isConnected` to `sendMessage`.

### Frontend — Milestone 10.5: User Search & New Conversation Flow (✅ Complete)
Location: `frontend/lib/userService.ts`, `frontend/components/sidebar/NewChatPanel.tsx`

**New files:**
- `frontend/lib/userService.ts`: `searchUsers()` and `createOrGetDm()` wrappers.
- `frontend/components/sidebar/NewChatPanel.tsx`: Overlay panel inside Sidebar for debounced user search.

**Modified:**
- `ChatContext.tsx` added `openNewChat(otherUserId)` to handle idempotently fetching/creating a DM and upserting into the sidebar list.
- `SidebarHeader.tsx` wired the PenSquare button to an `onNewChat` prop.
- `Sidebar.tsx` now hosts the `NewChatPanel` as an overlay.
- `AppLayout.tsx` and `page.tsx` threaded `onNewChat` down to the sidebar, and added `handleNewChat` in `page.tsx` to automatically select the created DM.

### Frontend — Milestone 11: Real-time Typing Indicators (✅ Complete)
Location: `frontend/components/chat/TypingIndicator.tsx`

**New file:**
- `frontend/components/chat/TypingIndicator.tsx`: Animated 3-dot pulse with contextual text. Returns null when no one is typing. Handles 0/1/2/3+ concurrent typers. Uses `typingBounce` CSS keyframe from `globals.css`.

**Modified:**
- `ChatContext.tsx`: added `typingUsers: TypingUsersMap` state and `receiveTyping(payload, isStop)` action. 3s safety auto-remove timer via `useRef` (no memory leaks).
- `WebSocketContext.tsx`: added `sendTypingStart(convId)` and `sendTypingStop(convId)` helpers.
- `MessageComposer.tsx`: added `onTypingStart`/`onTypingStop` props. `debounceRef` fires after 400ms; `stopRef` fires after 1s inactivity; `handleSend` fires stop immediately. All timers cleared on unmount.
- `MessageArea.tsx`: accepts `typers` prop, renders `<TypingIndicator>`.
- `ChatWindow.tsx`: threads `typers`, `onTypingStart`, `onTypingStop`.
- `AppLayout.tsx`: threads same three props.
- `page.tsx`: wires `onTyping` → `receiveTyping`; derives `currentTypers`; `handleTypingStart/Stop` guard on `selectedId && isConnected`.
- `globals.css`: added `@keyframes typingBounce`.

**Backend: no changes.** `typing_start`/`typing_stop` frames were already fully handled.

### Frontend — Milestone 11.5: Read & Delivery Receipts (✅ Complete)
Location: `frontend/contexts/WebSocketContext.tsx`, `frontend/contexts/ChatContext.tsx`, `frontend/app/page.tsx`

**Modified:**
- `WebSocketContext.tsx`: Added `WsReadReceiptPayload`, `WsDeliveryReceiptPayload`. Added `sendMarkRead()`, `sendMarkDelivered()`. Dispatches `read_receipt` and `delivery_receipt` WS frames to `ChatContext`.
- `ChatContext.tsx`: Added `receiveReadReceipt()` (updates own messages `<= timestamp` to 'read'), `receiveDeliveryReceipt()` (updates sent messages to 'delivered'), and `markConversationAsRead()` (locally clears `unreadCount`).
- `page.tsx`: 
  - Automated `sendMarkDelivered`: when `onMessage` receives a message from someone else, automatically emits `sendMarkDelivered`.
  - Automated `sendMarkRead`: `useEffect` monitors `selectedId` and `conversations`. If the selected conversation has unread messages, it automatically emits `sendMarkRead` and clears the local UI badge.

### Frontend — Milestone 13: Settings & Preferences (✅ Complete)
Location: `frontend/contexts/SettingsContext.tsx`, `frontend/components/settings/SettingsModal.tsx`

**New files:**
- `SettingsContext.tsx`: Manages user preferences (theme, privacy toggles) and persists them in `localStorage` under `signal_preferences`. Updates the document `classList` for Light/Dark mode.
- `SettingsModal.tsx`: A multi-tab overlay opened from the SidebarHeader gear icon. Contains Account, Appearance, Privacy, Notifications, and About sections. (Polished in Milestone 13.5 with animations, focus trap, and drag-and-drop avatars).

**Modified:**
- `globals.css`: Replaced hardcoded inline theme with CSS variables and added `.light` class support, including a 200ms `transition-colors` rule for smooth theme swapping.
- `layout.tsx`: Wrapped `AuthProvider` inside `SettingsProvider`.
- `SidebarHeader.tsx`: Wired the gear icon `onClick` to an `onSettings` callback.
- `Sidebar.tsx`: Added `settingsOpen` local state and embedded `<SettingsModal>`.
- `page.tsx`: 
  - Uses `useSettings()` to read privacy preferences.
  - Guards WS events: `sendMarkRead`, `sendMarkDelivered`, `sendTypingStart`, `sendTypingStop` are suppressed if disabled in the Settings UI.

### Provider nesting (important for future changes):
```tsx
<ChatProvider>           ← owns conversations/messages state
  <WebSocketProvider>    ← connects WS, calls ChatContext actions
    <ChatApp>            ← reads both
```

---

## 3. What remains (your task)

### Milestone 20: Read receipts and unread badges polishing

Options:
- **Backend:** Render.com (free tier, Docker or Python runtime) or Railway.app
- **Frontend:** Vercel (native Next.js support) or Netlify

Key considerations:
- Backend needs environment variables: `SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS`.
- Frontend needs `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_WS_BASE_URL` environment variables.
- Currently both are hardcoded to `localhost:8000` in `lib/api.ts` and `WebSocketContext.tsx`.
- Before deploying: extract hardcoded URLs to `NEXT_PUBLIC_*` env vars.
- SQLite database is a file — not suitable for cloud deployment without persistent storage.
  - Option A: Keep SQLite, mount a persistent disk (Render supports this).
  - Option B: Migrate to PostgreSQL (requires schema changes + new driver).

### Alternative: README
Write `README.md` covering:
- Project overview and features
- Tech stack
- Local setup (backend + frontend + seeding)
- Environment variables
- Usage guide (mock OTP `123456`, seed users)

---

## 4. Files that MUST NOT be modified going forward

- `backend/` — entire directory is locked.
  - `backend/app/services/auth_service.py` was modified for Milestone 9.5.
- `frontend/components/layout/AppLayout.tsx` — do not redesign.
- `frontend/components/sidebar/*` — do not redesign.
- `frontend/components/chat/*` — do not redesign.
- `frontend/components/ui/*` — do not redesign.
- `frontend/components/settings/SettingsModal.tsx` — complete; do not redesign.
- `frontend/data/mockData.ts` — keep for reference; not used in the app.
- `frontend/lib/utils.ts` — keep `"en-GB"` locale + UTC pinning.
- `frontend/contexts/WebSocketContext.tsx` — complete; do not redesign.
- `frontend/contexts/ChatContext.tsx` — complete; do not redesign.
- `frontend/contexts/SettingsContext.tsx` — complete; do not redesign.
- `frontend/components/chat/TypingIndicator.tsx` — complete; do not redesign.

---

## 5. Backend API base URLs (currently hardcoded)
```
REST:      http://localhost:8000
WebSocket: ws://localhost:8000
```

### WebSocket endpoint
```
ws://localhost:8000/ws?token=<jwt>
```

### Inbound WS frame types (backend → frontend)
```json
// message (wrapped in data key)
{ "type": "message", "data": { ...MessageOut } }

// typing
{ "type": "typing", "data": { "conversation_id": "uuid", "user_id": "uuid", "display_name": "str" } }

// typing_stop
{ "type": "typing_stop", "data": { "conversation_id": "uuid", "user_id": "uuid" } }

// read_receipt
{ "type": "read_receipt", "data": { "conversation_id": "uuid", "user_id": "uuid", "message_id": "uuid", "timestamp": "iso" } }

// delivery_receipt
{ "type": "delivery_receipt", "data": { "message_ids": ["uuid"], "user_id": "uuid", "timestamp": "iso" } }

// presence
{ "type": "presence", "data": { "user_id": "uuid", "is_online": bool, "last_seen_at": "iso | null" } }
```

### Outbound WS frame types (frontend → backend)
```json
{ "type": "new_message", "conversation_id": "uuid", "content": "text", "content_type": "text" }
{ "type": "typing_start", "conversation_id": "uuid" }
{ "type": "typing_stop", "conversation_id": "uuid" }
{ "type": "mark_read", "conversation_id": "uuid" }
{ "type": "mark_delivered", "message_ids": ["uuid"] }
```

---

## 6. Testing checklist for Milestone 11 (Typing Indicators)

To verify typing indicators are working:
1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Open Tab A: `http://localhost:3000` → login as `alice` (password: `password123`)
4. Open Tab B: `http://localhost:3000` → login as `bob` (password: `password123`)
5. In both tabs, open the alice↔bob DM.
6. In Tab A, start typing → Tab B should show **"Alice is typing..."** within ~400ms.
7. Stop typing in Tab A for 1 second → indicator should disappear in Tab B.
8. Type again in Tab A, then press Enter (send) → indicator disappears immediately in Tab B.
9. Switch conversation in Tab B → typing indicator from Tab A no longer shows.
10. Kill Tab A mid-type → indicator should auto-disappear in Tab B within 3 seconds (safety timer).
11. In a group chat, have alice and bob both type → the third member should see **"Alice and Bob are typing..."**.
