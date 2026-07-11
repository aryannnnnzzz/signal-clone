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
- **Overall completion:** ~95%
- **Backend completion:** 100% (Fully tested and verified)
- **Frontend completion:** ~97% (Auth, Chat REST, WebSocket, User Search & New Chat all complete)
- **Deployment completion:** 0%
- **README completion:** 0%

---

# What Was Built (User Search & New Chat — Milestone 10.5)

## Milestone 10.5 — New Files
```
frontend/lib/userService.ts                  ← searchUsers() + createOrGetDm() wrappers;
                                               reuses existing GET /api/users/search and
                                               POST /api/conversations/dm endpoints
frontend/components/sidebar/NewChatPanel.tsx ← Debounced user search overlay inside Sidebar;
                                               300 ms debounce, auto-focus, Escape-to-close,
                                               online dot, filters out current user
```

## Milestone 10.5 — Modified Files
```
frontend/contexts/ChatContext.tsx            ← Added openNewChat(otherUserId): upserts DM into
                                               sidebar list, returns conversation id
frontend/components/sidebar/SidebarHeader.tsx← Added onNewChat prop; wired PenSquare button
frontend/components/sidebar/Sidebar.tsx      ← Added newChatOpen state; hosts NewChatPanel
frontend/components/layout/AppLayout.tsx     ← Added onNewChat prop; threads to Sidebar
frontend/app/page.tsx                        ← Added handleNewChat(): openNewChat → auto-select
```

## New Chat Flow
```
User clicks PenSquare (✏) button
  → Sidebar.setNewChatOpen(true)
    → NewChatPanel renders (absolutely over conversation list)
      → User types in search input (300 ms debounce)
        → GET /api/users/search?q=<query> → results appear
          → User clicks a result
            → NewChatPanel.onSelectUser(userId) fires
              → ChatApp.handleNewChat(userId)
                → ChatContext.openNewChat(userId)
                  → POST /api/conversations/dm { user_id }
                    → Conversation upserted into sidebar (prepend if new)
                    → Returns conversation id
                → handleSelectConversation(convId)
                  → setSelectedId(convId)
                  → ChatContext.selectConversation(convId) → loads messages
```

## Previous Milestone: WebSocket Client (Milestone 10)

## Milestone 10 — New Files
```
frontend/contexts/WebSocketContext.tsx  ← Persistent WS connection with JWT auth,
                                          exponential back-off reconnect, typed frame
                                          dispatch, and public sendWsMessage() API
```

## Milestone 10 — Modified Files
```
frontend/contexts/ChatContext.tsx       ← Added receiveMessage(), updatePresence(),
                                          sendMessage() now uses WS (REST fallback)
frontend/app/page.tsx                   ← Added <WebSocketProvider> around ChatApp;
                                          wired WS callbacks to ChatContext actions
```

## WebSocket Connection Flow
```
Token available → WebSocketProvider connects → ws://localhost:8000/ws?token=<jwt>
  → Server authenticates JWT
  → Server sends { type: "connected", data: { user_id } }
  → Frontend sets isConnected = true
  → Server delivers any undelivered messages
  → Server broadcasts presence to contacts
```

## Real-time Message Flow
```
User types → ChatApp.handleSendMessage()
  → ChatContext.sendMessage(convId, content, sendWsMessage, isConnected=true)
    → Optimistic append immediately (id: "optimistic-<timestamp>")
    → sendWsMessage(convId, content)
      → WS frame: { type: "new_message", conversation_id, content, content_type }
        → Backend: persists to SQLite via message_service.send_message()
        → Backend: broadcasts { type: "message", data: MessageOut } to all members
          → All connected clients → WebSocketContext.onmessage handler
            → Dispatches to ChatContext.receiveMessage(payload, userId)
              → Finds + replaces optimistic entry (sender) or appends (receiver)
              → Updates conversation sidebar preview
```

## Reconnect Strategy
```
Disconnect → ws.onclose fires
  → shouldReconnect=true? → schedule reconnect after backoffRef.current ms
  → backoff doubles each attempt: 1s → 2s → 4s → 8s → 16s → 30s (cap)
  → Reset to 1s on successful connection
  → Auth failure (code 4001) → no retry
  → Logout (token → null) → no retry
```

## Fallback Strategy
```
WS disconnected during reconnect window
  → ChatContext.sendMessage() detects wsConnected=false
  → Falls back to REST POST /api/conversations/{id}/messages
  → Message is still sent and persisted
```

---

# Previous Milestones

## Milestone 8 — Auth API Integration
```
frontend/lib/api.ts              ← Centralized fetch client with JWT handling
frontend/lib/authService.ts      ← Typed wrappers for Auth API endpoints
frontend/contexts/AuthContext.tsx← Global state for user session & actions
```

## Milestone 9 — Chat REST API Integration
```
frontend/lib/chatService.ts        ← Typed wrappers for conversations & messages endpoints;
                                     all backend→frontend type mapping lives here
frontend/contexts/ChatContext.tsx  ← Global chat state: conversations, messages cache,
                                     loading/error per-action, optimistic send
```

## Auth Flow Sequence
```
Welcome → Login    → OTP → DisplayName → Avatar → completeAuth() → Chat App
Welcome → Register → OTP → DisplayName → Avatar → completeAuth() → Chat App
```

## Chat Flow (Milestone 9 + 10)
```
Authenticated → WebSocket connects → loadConversations() → sidebar fills with real data
Select conversation → loadMessages(id) → messages load (cached on revisit)
Type & Enter/click Send → optimistic append → WS new_message frame → server persists
  → server broadcasts → receiveMessage() replaces optimistic with real
  (If WS down) → REST POST fallback → replace on response
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
- **State:** AuthContext (auth), ChatContext (conversations/messages), WebSocketContext (WS lifecycle)

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
│   └── page.tsx            # Entry: AuthFlow gate → ChatProvider → WebSocketProvider → ChatApp
├── components/
│   ├── auth/               # 11 auth UI components
│   ├── chat/               # MessageArea, MessageBubble, MessageComposer, ChatHeader
│   ├── layout/             # AppLayout
│   ├── sidebar/            # Sidebar, ConversationList, ConversationListItem
│   └── ui/                 # Avatar, StatusIcon, EmptyState
├── contexts/
│   ├── AuthContext.tsx     # JWT auth state & session restore
│   ├── ChatContext.tsx     # Conversations, messages, WS-aware sendMessage
│   └── WebSocketContext.tsx← NEW: persistent WS lifecycle, reconnect, frame dispatch
├── data/
│   └── mockData.ts         # Kept for reference; not used in production app
├── lib/
│   ├── api.ts              # Centralized fetch client with JWT injection
│   ├── authService.ts      # Typed wrappers for auth endpoints
│   ├── chatService.ts      # Typed wrappers for chat endpoints + type mapping
│   ├── userService.ts      # ← NEW: searchUsers() + createOrGetDm() for new chat flow
│   └── utils.ts            # Date formatting (en-GB locale + UTC, hydration-safe)
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
  - `message`, `typing`, `typing_stop`, `read_receipt`, `delivery_receipt`, `presence`, `conversation_updated`, `member_added`, `member_removed`.
- **Frontend (WebSocketContext.tsx):**
  - Connects on token availability, disconnects on logout
  - Exponential back-off: 1s → 2s → 4s → 8s → 16s → 30s cap
  - Dispatches inbound frames to ChatContext callbacks
  - `sendWsMessage(convId, content)` sends `new_message` frames

---

# Current Features
- User registration & login with JWT + Bcrypt.
- Profile management and user searching.
- Contact management (add/remove).
- Idempotent DM creation (get or create).
- Group creation with admin controls.
- Message sending via WebSocket (REST fallback when disconnected).
- Cursor-based message pagination.
- Per-recipient delivery and read receipt tracking.
- Ephemeral typing indicators.
- Online/offline presence broadcasting.
- Database seeding with mock data.
- Complete multi-step authentication UI flow (6 screens).
- Chat UI shell with 21 components, responsive, Signal-faithful design.
- **[NEW] Real-time WebSocket client:** JWT-authenticated WS connection, exponential back-off reconnect, live message delivery, optimistic UI.

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
- ✅ WebSocket connects with JWT token (verified via backend logs)
- ✅ `npm run build` clean after Milestone 10

---

# Pending Features
- [ ] **Real-time chat testing**: Verify end-to-end messaging between two browser windows (requires running backend).
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
- **Why WebSocketProvider inside ChatProvider?** WS context calls ChatContext actions. The dependent context must be inner; the dependency must be outer.
- **Why WS send with REST fallback?** Guarantees messages are always sendable even during the reconnect window. Provides graceful degradation.
- **Why exponential back-off?** Prevents thundering-herd on server restart. Capped at 30s to remain responsive.
- **Why dedup by id in receiveMessage?** The backend broadcasts the `message` event to ALL members including the sender. Without dedup, the sender would see their own message twice.

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
  feat(frontend): implement Milestone 10 — WebSocket real-time client

  Add WebSocketContext.tsx with JWT-authenticated WS connection to
  ws://localhost:8000/ws?token=<jwt>. Implements exponential back-off
  reconnect (1s→30s cap), inbound frame dispatch (message, presence,
  typing, typing_stop), and sendWsMessage() for new_message frames.

  Update ChatContext.tsx: add receiveMessage() (dedup by id, replaces
  optimistic entries from sender echo), updatePresence(), and modify
  sendMessage() to use WS as primary path with REST POST fallback when
  disconnected.

  Update page.tsx: wrap authenticated UI in <WebSocketProvider> inside
  <ChatProvider>; wire onMessage/onPresence/onTyping callbacks to
  ChatContext in ChatApp useEffect.

  Backend unchanged. npm run build: ✓ Compiled successfully.
  ```

---

# Next Milestone
**Milestone 11: Deployment** — Deploy backend to Render/Railway, frontend to Vercel/Netlify.
Or: **README** — Write comprehensive documentation.
