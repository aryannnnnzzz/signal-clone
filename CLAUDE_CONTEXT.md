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
- **Overall completion:** ~65%
- **Backend completion:** 100% (Fully tested and verified)
- **Frontend completion:** ~60% (Auth UI, Chat UI shell, and Auth API Integration complete; Chat API pending)
- **Deployment completion:** 0%
- **README completion:** 0%

---

# What Was Built This Session (Auth API Integration + Auth Flow Bug Fix)

## New Files Created
```
frontend/lib/api.ts              ← Centralized fetch client with JWT handling
frontend/lib/authService.ts      ← Typed wrappers for Auth API endpoints
frontend/contexts/AuthContext.tsx← Global state for user session & actions
```

## Modified Files
```
frontend/app/layout.tsx          ← Wrapped with AuthProvider
frontend/app/page.tsx            ← Uses AuthContext to gate Chat UI or AuthFlow
frontend/app/globals.css         ← Added bounce/spin animations
frontend/components/auth/*       ← Wired all screens to useAuth and handle API errors
frontend/components/sidebar/SidebarHeader.tsx ← Displays real user avatar, added Logout
frontend/types/index.ts          ← Added AuthUser type matching backend UserOut
```

## Bug Fix: Auth Flow Skipping OTP/DisplayName/Avatar
**Root cause:** `AuthContext.register()` called `setUser(data.user)` immediately after
a successful `POST /api/auth/register`. Because `isAuthenticated` is derived as
`user !== null`, this instantly flipped the flag to `true` and caused `page.tsx` to
render `<AppLayout>` before the OTP → DisplayName → Avatar onboarding screens ran.

**Fix (pendingUser pattern):**
- `register()` and `login()` now set `pendingUser` (not `user`) so `isAuthenticated`
  stays `false` during the onboarding flow.
- A new `completeAuth()` action promotes `pendingUser → user`, which flips
  `isAuthenticated` to `true` and triggers navigation to the Chat UI.
- `completeAuth()` is called exclusively from `handleAvatarComplete` in `AuthFlow.tsx`,
  making the Avatar screen the single, correct completion point.
- `updateProfile()` correctly routes updates to `pendingUser` during onboarding and
  to `user` after authentication is complete.

## Auth Flow Sequence
```
Welcome → Login    → OTP → DisplayName → Avatar → completeAuth() → Chat App
Welcome → Register → OTP → DisplayName → Avatar → completeAuth() → Chat App
```

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
- [ ] **Frontend Chat API Integration**: Replace mock conversations and messages with `fetch` calls to backend endpoints.
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
  feat(frontend): implement Auth API integration (Milestone 8)
  ```

---

# Next Milestone
**Milestone 9: Frontend Chat API Integration** — Replace all mock/dummy chat data with real `fetch` calls to the FastAPI backend (`/api/conversations`). Connect the Chat UI components to the live backend.
**Backend must remain unchanged.**
