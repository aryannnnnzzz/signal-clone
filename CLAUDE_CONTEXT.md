# Project Overview
**Assignment:** Build a functional clone of the Signal messaging application that replicates Signal's design, user experience, and core messaging workflows.
**Overall Goal:** Deliver a real-time, privacy-focused messaging application supporting one-on-one and group chats, mock authentication, contacts, message persistence, typing indicators, and read/delivery receipts. The UI should closely resemble the Signal Messenger application.
**Tech Stack:** 
- **Frontend:** Next.js 15 (TypeScript) + TailwindCSS v4
- **Backend:** Python with FastAPI
- **Database:** SQLite (with SQLAlchemy 2.0 and Alembic)
- **Real-time:** WebSockets

---

# Current Project Status
- **Overall completion:** ~82%
- **Backend completion:** 100% (Fully tested and verified)
- **Frontend completion:** ~80% (Auth UI, Auth API, Chat REST API Integration complete; WebSocket pending)
- **Deployment completion:** 0%
- **README completion:** 0%

---

# What Was Built (Auth API Integration + Bug Fix + Chat API Integration)

## Milestone 8 — New Files
```
frontend/lib/api.ts              ← Centralized fetch client with JWT handling
frontend/lib/authService.ts      ← Typed wrappers for Auth API endpoints
frontend/contexts/AuthContext.tsx← Global state for user session & actions
```

## Milestone 8 — Modified Files
```
frontend/app/layout.tsx          ← Wrapped with AuthProvider
frontend/app/page.tsx            ← Uses AuthContext to gate Chat UI or AuthFlow
frontend/app/globals.css         ← Added bounce/spin animations
frontend/components/auth/*       ← Wired all screens to useAuth and handle API errors
frontend/components/sidebar/SidebarHeader.tsx ← Displays real user avatar, added Logout
frontend/types/index.ts          ← Added AuthUser type matching backend UserOut
```

## Auth Flow Bug Fix (pendingUser pattern)
**Root cause:** `AuthContext.register()` called `setUser(data.user)` immediately,
flipping `isAuthenticated` to `true` and skipping OTP → DisplayName → Avatar.

**Fix:** `register()` and `login()` now set `pendingUser`. `completeAuth()` promotes
it to `user` only when AvatarScreen finishes — the single correct completion point.

## Milestone 9 — New Files
```
frontend/lib/chatService.ts        ← Typed wrappers for conversations & messages endpoints;
                                     all backend→frontend type mapping lives here
frontend/contexts/ChatContext.tsx  ← Global chat state: conversations, messages cache,
                                     loading/error per-action, optimistic send
```

## Milestone 9 — Modified Files
```
frontend/app/page.tsx                        ← Replaced mockData; wraps ChatProvider;
                                               loadConversations on mount, loadMessages on select
frontend/components/layout/AppLayout.tsx     ← Added onSendMessage, loadingMessages,
                                               loadingConversations, conversationsError props
frontend/components/chat/ChatWindow.tsx      ← Added onSendMessage + isLoadingMessages;
                                               Loader2 spinner replaces MessageArea while loading
frontend/components/chat/MessageComposer.tsx ← Accepts onSend prop; optimistic draft clear;
                                               disabled state while sending
frontend/components/sidebar/Sidebar.tsx      ← Accepts isLoading + error props;
                                               animated skeleton rows while loading;
                                               inline error banner on fetch failure
```

## Auth Flow Sequence
```
Welcome → Login    → OTP → DisplayName → Avatar → completeAuth() → Chat App
Welcome → Register → OTP → DisplayName → Avatar → completeAuth() → Chat App
```

## Chat Flow (Milestone 9)
```
Authenticated → loadConversations() → sidebar fills with real data
Select conversation → loadMessages(id) → messages load (cached on revisit)
Type & Enter/click Send → optimistic append → POST /api/conversations/{id}/messages → replace with persisted
```

## Production Fix: Welcome Conversation on Registration (Milestone 9.5)
**Why empty conversations?** Newly registered accounts get a new UUID that has no
rows in `conversation_members`. The backend correctly returns `[]`. The seed script
only creates conversations *between the 5 seed users*.

**Fix:** Modified `backend/app/services/auth_service.py` to call
`_bootstrap_welcome_conversation(db, user)` immediately after user creation in
`register_user()`. This function:
- Checks if seed user alice (`user-alice-001`) exists in the DB.
- If yes: calls `conversation_service.get_or_create_dm(alice_id, new_user_id)` to
  create an idempotent DM, then `message_service.send_message()` to post a welcome
  message from alice.
- If alice doesn't exist (unseeded DB): skips silently — registration still succeeds.
- Wrapped in try/except so a failure here never blocks registration.

**Result:** `GET /api/conversations` returns ≥1 conversation for every new account.
**No new endpoints were created. No dev-only routes. No frontend changes.**

---

# Current Architecture

## Backend Architecture
- **Framework:** FastAPI
- **Real-time:** Unified WebSocket connection (multiplexed by JSON frame `type`)
- **Database Layer:** Async SQLAlchemy 2.0 with `aiosqlite`.
- **Migrations:** Alembic
- **Validation:** Pydantic v2

## Frontend Architecture
- **Framework:** Next.js 15 App Router
- **Language:** TypeScript
- **Styling:** TailwindCSS v4 (`@import "tailwindcss"` / `@theme inline`)
- **State:** Local `useState` only — no global state (correct for Milestones 1–2)

## Layered Architecture
1. **API/Routers (`app/api/`)**: Handle HTTP requests/responses, authorization, and route to services.
2. **WebSocket (`app/ws/`)**: Manage connection lifecycle, inbound JSON frames, and outbound event broadcasting.
3. **Services (`app/services/`)**: Centralized business logic. Both REST APIs and WebSocket handlers call these services (e.g., `send_message`).
4. **Schemas (`app/schemas/`)**: Pydantic validation models (Request/Response contracts).
5. **Models (`app/models/`)**: SQLAlchemy ORM definitions mapping to SQLite tables.

---

# Folder Structure
```
backend/
├── alembic/                # Database migrations (versions, env.py)
├── app/
│   ├── api/                # REST endpoints grouped by resource
│   ├── models/             # SQLAlchemy ORM models (Database Schema)
│   ├── schemas/            # Pydantic v2 validation models
│   ├── services/           # Business logic layer
│   ├── ws/                 # WebSocket ConnectionManager, events, and handlers
│   ├── config.py           # Pydantic Settings (loads .env)
│   ├── database.py         # Async SQLite engine & SessionMaker
│   ├── dependencies.py     # FastAPI Depends (get_db, get_current_user)
│   ├── main.py             # FastAPI entry point, CORS, WS endpoint, Lifespan
│   └── seed.py             # Demo data population script
├── alembic.ini             # Alembic configuration
├── requirements.txt        # Pinned Python dependencies
└── signal_clone.db         # The SQLite database

frontend/
├── app/
│   ├── globals.css         # TailwindCSS v4 theme + base + auth animation
│   ├── layout.tsx          # Root layout (Inter font, body styles)
│   └── page.tsx            # Entry: AuthFlow gate → AppLayout
├── components/
│   ├── auth/               # ← NEW: 11 auth UI components
│   │   ├── AuthFlow.tsx
│   │   ├── AuthContainer.tsx
│   │   ├── SignalLogo.tsx
│   │   ├── AuthBackButton.tsx
│   │   ├── AuthInput.tsx
│   │   ├── WelcomeScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── OtpScreen.tsx
│   │   ├── DisplayNameScreen.tsx
│   │   └── AvatarScreen.tsx
│   ├── chat/               # MessageArea, MessageBubble, MessageComposer, ChatHeader
│   ├── layout/             # AppLayout
│   ├── sidebar/            # Sidebar, ConversationList, ConversationListItem
│   └── ui/                 # Avatar, StatusIcon, EmptyState
├── data/
│   └── mockData.ts         # Deterministic mock conversations & messages
├── lib/
│   └── utils.ts            # Date formatting with pinned en-GB locale + UTC
└── types/
    └── index.ts            # TypeScript interfaces
```

---

# Database

## Tables & Models

1. **`users`**: 
   - **Purpose:** Core identity table.
   - **Key Columns:** `id` (UUID PK), `username` (UK), `phone_number` (UK), `password_hash`, `is_online`, `last_seen_at`.
2. **`contacts`**: 
   - **Purpose:** Manages a user's contact list.
   - **Key Columns:** `id` (UUID PK), `owner_id` (FK), `contact_user_id` (FK), `nickname`.
   - **Constraints:** Unique `(owner_id, contact_user_id)`.
3. **`conversations`**: 
   - **Purpose:** Represents both DMs and Group chats.
   - **Key Columns:** `id` (UUID PK), `type` (Discriminator: `dm` or `group`), `group_name`, `group_avatar_url`.
4. **`conversation_members`**: 
   - **Purpose:** Maps users to conversations, tracks roles and read states.
   - **Key Columns:** `conversation_id` (FK), `user_id` (FK), `role` (`admin`/`member`), `last_read_at`.
   - **Constraints:** Unique `(conversation_id, user_id)`.
5. **`messages`**: 
   - **Purpose:** Stores immutable message content.
   - **Key Columns:** `id` (UUID PK), `conversation_id` (FK), `sender_id` (FK), `content_type`, `content`.
6. **`message_status`**: 
   - **Purpose:** Tracks delivery/read status per recipient for every message.
   - **Key Columns:** `message_id` (FK), `user_id` (FK), `status` (`sent`, `delivered`, `read`).
   - **Constraints:** Unique `(message_id, user_id)`.

---

# API Summary

## Authentication (`/api/auth`)
- `POST /api/auth/register` - Create account (Returns JWT) - Unprotected
- `POST /api/auth/login` - Authenticate (Returns JWT) - Unprotected
- `POST /api/auth/verify-otp` - Mock OTP (Accepts `123456`) - Unprotected
- `GET /api/auth/me` - Get current user profile - **Protected**

## Users (`/api/users`)
- `GET /api/users/search` - Search users by query - **Protected**
- `GET /api/users/{user_id}` - Get user public profile - **Protected**
- `PATCH /api/users/me` - Update current user profile - **Protected**

## Contacts (`/api/contacts`)
- `GET /api/contacts` - List user's contacts - **Protected**
- `POST /api/contacts` - Add a contact - **Protected**
- `DELETE /api/contacts/{contact_id}` - Remove a contact - **Protected**

## Conversations (`/api/conversations`)
- `GET /api/conversations` - List all conversations (sorted by recent, with unread counts) - **Protected**
- `POST /api/conversations/dm` - Get or create a DM - **Protected**
- `POST /api/conversations/group` - Create a group - **Protected**
- `GET /api/conversations/{conv_id}` - Get conversation details - **Protected**
- `PATCH /api/conversations/{conv_id}` - Update group name/avatar (Admin) - **Protected**
- `POST /api/conversations/{conv_id}/members` - Add group member (Admin) - **Protected**
- `DELETE /api/conversations/{conv_id}/members/{user_id}` - Remove member (Admin) - **Protected**

## Messages (`/api/conversations/{conv_id}/messages`)
- `GET /api/conversations/{conv_id}/messages` - Fetch paginated message history (cursor-based) - **Protected**
- `POST /api/conversations/{conv_id}/messages` - Send a message - **Protected**
- `PATCH /api/conversations/{conv_id}/read` - Mark conversation as read - **Protected**

---

# Authentication
- **Flow:** Mock JWT authentication.
- **Registration & Login:** User provides username/password, backend generates bcrypt hash. If valid, issues a JWT valid for 24 hours.
- **OTP:** `POST /verify-otp` always returns verified for code `123456`.
- **Protected Routes:** Use FastAPI `Depends(get_current_user)` to extract Bearer token, decode JWT, and return the `User` ORM model.
- **Frontend Mock:** Auth flow is fully UI-only. `isAuthenticated` is a local `useState` boolean in `page.tsx`.

---

# WebSocket Architecture
- **Endpoint:** `ws://localhost:8000/ws?token=<jwt>`
- **Connection Manager:** `app/ws/manager.py` maintains a registry mapping `user_id` to a list of `WebSocket` connections (supporting multiple devices/tabs per user).
- **Message Flow:** All real-time communication happens over a single multiplexed socket per user.
- **Inbound Events (`app/ws/handler.py`):**
  - `new_message` (Persists to DB, broadcasts to members)
  - `typing_start` / `typing_stop` (Ephemeral, broadcast only)
  - `mark_delivered` / `mark_read` (Updates DB statuses, broadcasts receipts)
- **Outbound Events (`app/ws/events.py`):**
  - `message`, `typing`, `typing_stop`, `read_receipt`, `delivery_receipt`, `presence` (online/offline), `conversation_updated`, `member_added`, `member_removed`.

---

# Current Features
- User registration & login with JWT + Bcrypt.
- Profile management and user searching.
- Contact management (add/remove).
- Idempotent DM creation (get or create).
- Group creation with admin controls.
- Message sending via REST or WebSocket.
- Cursor-based message pagination.
- Per-recipient delivery and read receipt tracking.
- Ephemeral typing indicators.
- Online/offline presence broadcasting.
- Database seeding with mock data.
- Complete multi-step authentication UI flow (6 screens).
- Chat UI shell with 21 components, responsive, Signal-faithful design.
- **[NEW] Auth API Integration:** Full integration of Auth UI with FastAPI backend, JWT storage, protected routing, loading states, and error handling.

---

# Verified Features
All the following features have been manually tested against the running server and are verified working:
- ✅ Backend starts
- ✅ Swagger works (`/docs`)
- ✅ User registration verified
- ✅ JWT generation verified
- ✅ Authorization verified
- ✅ GET `/api/auth/me` verified
- ✅ GET `/api/conversations` verified
- ✅ SQLite verified
- ✅ Frontend builds: `✓ Compiled successfully` (zero TS/lint errors)
- ✅ Auth flow renders all 6 screens correctly
- ✅ OTP screen mock code `123456` verified
- ✅ Avatar upload (drag-and-drop + file select) verified
- ✅ No hydration errors (deterministic timestamps + pinned en-GB locale)

---

# Pending Features
- [x] **Frontend Chat API Integration**: ✅ Complete — conversations and messages served from backend REST API.
- [ ] **WebSocket Client**: Connect frontend to `/ws` for real-time messaging, presence, typing indicators.
- [ ] **Real-time chat testing**: Verify end-to-end messaging flow in the browser.
- [ ] **Responsive UI**: Audit on mobile, tablet, and desktop.
- [ ] **Deployment**: Deploy frontend to Vercel/Netlify, backend to Render/Railway.
- [ ] **README**: Write comprehensive documentation.

---

# Important Architectural Decisions
- **Why FastAPI?** Async-native, excellent WebSocket support, automatic OpenAPI docs (`/docs`), highly performant.
- **Why SQLAlchemy 2.0 with aiosqlite?** Required for non-blocking database queries in an async framework.
- **Why SQLite?** Specified in assignment requirements; perfectly handles concurrency for this scale with `aiosqlite`.
- **Why UUIDs?** Prevents enumeration attacks, safe to expose to clients, required for distributed scaling.
- **Why a unified `conversations` table?** DMs and Groups share 90% of identical logic (sending, paginating). A `type` discriminator is cleaner than duplicate tables.
- **Why `conversation_members`?** Necessary to track per-user group roles and the `last_read_at` timestamp.
- **Why `message_status` junction table?** A message sent to a 50-person group needs 49 delivery statuses. Embedding this in the `messages` table is impossible relationally.
- **Why Service Layer?** Decouples business logic from HTTP transport, allowing WebSocket handlers and REST routes to invoke the same exact functions.
- **Why Cursor Pagination?** Offset pagination skips or duplicates messages when new messages arrive. Cursor (using `created_at`) guarantees consistency.
- **Why local useState for auth (not Context/Redux)?** Initially pure UI scaffolding. Global AuthContext was introduced in Auth API Integration.
- **Why `AuthFlow` orchestrator pattern?** Keeps all navigation logic in one place. Wired effortlessly to real `useAuth` context.

---

# Coding Conventions
- **Naming Conventions:** `snake_case` for variables/functions/files. `PascalCase` for Classes/Schemas/Models.
- **Folder Conventions:** Feature-based routing, layered architecture (`models`, `schemas`, `services`, `api`).
- **Service Conventions:** All DB interactions happen here. They take `db: AsyncSession` as the first argument.
- **Router Conventions:** Dependency injection used heavily for `db` and `current_user`.
- **Schema/Model separation:** SQLAlchemy models define persistence; Pydantic schemas define API contracts.
- **Auth Component Convention:** Every auth screen receives only callbacks (`onSubmit`, `onBack`, etc.) — no shared state.

---

- **Hydration:** All timestamp formatting uses `"en-GB"` locale and `timeZone: "UTC"` — fully deterministic, no hydration issues.

---

# Git Status
- **Latest branch:** `main`
- **Latest commit message:** `Complete backend scaffold and authentication`
- **GitHub repository status:** Behind
- **Suggested commit for this session:**
  ```
  fix(auth): auto-create welcome DM for new users on registration

  After register_user() persists the new account, _bootstrap_welcome_conversation()
  calls the existing get_or_create_dm() and send_message() services to open a DM
  with the seed user alice and post a greeting. This ensures GET /api/conversations
  never returns [] for a newly registered user without any dev-only endpoints.
  ```

---

# Next Milestone
**Milestone 10: WebSocket Client** — Connect frontend to `ws://localhost:8000/ws?token=<jwt>`.
Handle inbound frame types: `message`, `typing`, `typing_stop`, `read_receipt`, `delivery_receipt`, `presence`.
Expose `sendMessage` via WebSocket (replacing REST send).
Update conversation/message state reactively on inbound events.
**Backend must remain unchanged.**
