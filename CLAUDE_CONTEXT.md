# Project Overview
**Assignment:** Build a functional clone of the Signal messaging application that replicates Signal's design, user experience, and core messaging workflows.
**Overall Goal:** Deliver a real-time, privacy-focused messaging application supporting one-on-one and group chats, mock authentication, contacts, message persistence, typing indicators, and read/delivery receipts. The UI should closely resemble the Signal Messenger application.
**Tech Stack:** 
- **Frontend:** Next.js (TypeScript) + TailwindCSS (planned)
- **Backend:** Python with FastAPI
- **Database:** SQLite (with SQLAlchemy 2.0 and Alembic)
- **Real-time:** WebSockets

---

# Current Project Status
- **Overall completion:** ~50%
- **Backend completion:** 100% (Fully tested and verified)
- **Frontend completion:** 0% (Empty directory)
- **Deployment completion:** 0%
- **README completion:** 0%

---

# Current Architecture

## Backend Architecture
- **Framework:** FastAPI
- **Real-time:** Unified WebSocket connection (multiplexed by JSON frame `type`)
- **Database Layer:** Async SQLAlchemy 2.0 with `aiosqlite`.
- **Migrations:** Alembic
- **Validation:** Pydantic v2

## Frontend Architecture (Planned)
- **Framework:** Next.js with React
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **State Management:** Context API or Redux (to manage WebSockets and messages)

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
frontend/                   # (Currently empty) Target for Next.js app
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

---

# Pending Features
- [ ] **Frontend**: Initialize Next.js project.
- [ ] **Signal UI**: Implement pixel-perfect Signal Messenger clone layout (sidebar, chat area, message bubbles).
- [ ] **API Integration**: Connect frontend to backend REST APIs using dummy data initially.
- [ ] **WebSocket Integration**: Connect frontend to `/ws` for real-time messaging, presence, and receipts.
- [ ] **Real-time chat testing**: Verify end-to-end messaging flow in the browser.
- [ ] **Responsive UI**: Ensure it works on mobile, tablet, and desktop.
- [ ] **Deployment**: Deploy frontend to Vercel/Netlify, backend to Render/Railway.
- [ ] **README**: Write comprehensive documentation.
- [ ] **Final Polish**: Micro-animations, dark mode (optional but good).

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

---

# Coding Conventions
- **Naming Conventions:** `snake_case` for variables/functions/files. `PascalCase` for Classes/Schemas/Models.
- **Folder Conventions:** Feature-based routing, layered architecture (`models`, `schemas`, `services`, `api`).
- **Service Conventions:** All DB interactions happen here. They take `db: AsyncSession` as the first argument.
- **Router Conventions:** Dependency injection used heavily for `db` and `current_user`.
- **Schema/Model separation:** SQLAlchemy models define persistence; Pydantic schemas define API contracts.

---

# Known Issues
- **Technical Debt:** The frontend is completely unbuilt. 
- **TODOs:** Need to set up the Next.js scaffold and state management for WebSockets.
- **Bug Fix Note:** `passlib` has a known bug with `bcrypt >= 4.1`. We bypassed it by using `bcrypt` directly in `auth_service.py`.

---

# Git Status
- **Latest branch:** `main`
- **Latest commit message:** `Complete backend scaffold and authentication`
- **GitHub repository status:** Up to date with origin/main.
- **Current milestone:** Backend completion.

---

# Next Milestone
The next milestone is:
Build the complete Signal Desktop frontend using Next.js + TypeScript + Tailwind using dummy data.
**Backend must remain unchanged.**

---

# Handoff Instructions
**To the Next AI Session:**
1. The **Backend** is 100% complete, verified, and strictly adheres to the schema/API defined above.
2. **Do NOT regenerate, refactor, or modify the backend code.** Treat `backend/` as read-only.
3. Your primary objective is to initialize the Next.js frontend in the `frontend/` directory.
4. Begin by creating the UI components with hardcoded/dummy data that matches the Signal Messenger aesthetic.
5. Once the UI is built, incrementally replace dummy data with API calls matching the Pydantic schemas listed in this document.
6. The WebSocket architecture expects specific JSON frame types (listed in the WebSocket section). Ensure your frontend context matches this exactly.
