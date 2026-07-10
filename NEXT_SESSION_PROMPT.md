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
- Mock data in `frontend/data/mockData.ts`

### Frontend — Milestone 7: Authentication UI (✅ Complete)
Location: `frontend/components/auth/`
- 11 new components:
  - `AuthFlow.tsx` — orchestrator (manages which screen is shown)
  - `AuthContainer.tsx` — shared animated card wrapper
  - `SignalLogo.tsx` — inline SVG logo
  - `AuthBackButton.tsx` — reusable back button
  - `AuthInput.tsx` — reusable input with error state + password toggle
  - `WelcomeScreen.tsx` — landing with Login/Register CTAs
  - `LoginScreen.tsx` — phone + password, client-side validation
  - `RegisterScreen.tsx` — phone + username + password + confirm
  - `OtpScreen.tsx` — 6-digit auto-advancing inputs, paste, countdown, mock code `123456`
  - `DisplayNameScreen.tsx` — name input with 64-char counter
  - `AvatarScreen.tsx` — colour swatches + drag-and-drop upload + preview

Auth flow sequence:
```
Welcome → Login OR Register → OTP → DisplayName → Avatar → Chat App
```

The auth flow is pure UI — no API calls. `page.tsx` gates the chat UI behind a mock `isAuthenticated` boolean.

### Hydration fixes
- `frontend/data/mockData.ts` — uses `BASE_TIME = "2024-01-01T12:00:00Z"` (deterministic, not `Date.now()`)
- `frontend/lib/utils.ts` — all `toLocale*` calls use `"en-GB"` locale and `timeZone: "UTC"`

---

## 3. What remains (your task)

### Milestone 8: Frontend Auth API Integration (✅ Complete)
- `AuthContext` implemented and manages session state via `localStorage`.
- `LoginScreen`, `RegisterScreen`, `OtpScreen`, `DisplayNameScreen`, and `AvatarScreen` successfully integrated with FastAPI REST endpoints.
- Protected routing set up in `app/page.tsx`.
- User avatar and Logout button integrated into `SidebarHeader`.
- Added loading spinners and error handling UI for API calls.

### Milestone 9: Frontend Chat API Integration

Replace all mock/dummy chat data with real API calls.

#### Step 1 — Replace mock conversations
- `GET /api/conversations` → replace `mockConversations`
- `GET /api/conversations/{id}/messages` → replace `mockMessages[id]`

#### Step 2 — WebSocket Client
Create `frontend/contexts/WebSocketContext.tsx`:
- Connects to `ws://localhost:8000/ws?token=<jwt>`
- Handles inbound frame types: `message`, `typing`, `typing_stop`, `read_receipt`, `delivery_receipt`, `presence`
- Exposes `sendMessage(conversationId, content)` action
- Updates conversation/message state reactively



---

## 4. Files that MUST NOT be modified

- `backend/` — entire directory is locked. Read-only.
- `frontend/components/layout/AppLayout.tsx` — do not redesign.
- `frontend/components/sidebar/*` — do not redesign.
- `frontend/components/chat/*` — do not redesign.
- `frontend/components/ui/*` — do not redesign.
- `frontend/data/mockData.ts` — keep deterministic `BASE_TIME`; replace with API data.
- `frontend/lib/utils.ts` — keep `"en-GB"` locale + UTC pinning.

---

## 5. Backend API base URL
```
http://localhost:8000
```
All endpoints are documented in `CLAUDE_CONTEXT.md` under "API Summary".

Key request/response shapes:
- `POST /api/auth/login` → `{ phone_number, password }` → `{ access_token, token_type }`
- `POST /api/auth/register` → `{ phone_number, username, password }` → `{ access_token, token_type }`
- `POST /api/auth/verify-otp` → `{ code: "123456" }` → `{ verified: true }`
- `GET /api/auth/me` → `{ id, username, display_name, phone_number, avatar_url, is_online, last_seen_at }`
- `GET /api/conversations` → array of conversation objects with unread counts
- `GET /api/conversations/{id}/messages?limit=50` → paginated messages (cursor-based)

Bearer token header format:
```
Authorization: Bearer <access_token>
```

---

## 6. Technical debt to address

- Currently none recorded for the frontend since auth flow spinners and dynamic avatar initial are completed. Backend testing coverage is partial.

---

## 7. Confirm before starting

Before writing any code, confirm you have read all four documentation files and understand:
1. The backend is read-only.
2. The auth flow is completely integrated with the backend API.
3. The remaining task is to integrate the real Chat API and WebSockets.
4. No redesigns of existing components.
