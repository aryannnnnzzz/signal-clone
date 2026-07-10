# Executive Summary: Signal Clone

## Project Overview
This project is a fully functional clone of the Signal messaging application. It aims to replicate Signal's core messaging workflows — including real-time one-on-one and group chats, read/delivery receipts, typing indicators, and a privacy-focused UI — using a modern web stack.

## Architecture Overview
The application utilises a layered, client-server architecture:
- **Backend:** A scalable API built with FastAPI, using a unified WebSocket connection for real-time bidirectional communication.
- **Database:** An async SQLite database managed via SQLAlchemy 2.0 ORM and Alembic migrations.
- **Frontend:** A Next.js 15 App Router application with TailwindCSS v4, currently rendering a complete UI shell with mock data. API integration is the next step.
- **Service Layer:** Decouples core business logic from transport protocols, ensuring both REST endpoints and WS handlers invoke identical backend behaviour.

## Tech Stack
- **Backend:** Python, FastAPI, WebSockets, Pydantic v2
- **Database:** SQLite, SQLAlchemy 2.0, aiosqlite, Alembic
- **Security:** JWT (python-jose), bcrypt
- **Frontend:** Next.js 15, React 19, TypeScript, TailwindCSS v4

## Implemented Features (Backend)
✅ **User Authentication:** Registration, Login, Mock OTP, JWT generation/validation.
✅ **Profile Management:** User search, profile updates, contact list management.
✅ **Conversations:** Idempotent DM creation, Group creation with admin privileges, member management.
✅ **Messaging:** Cursor-based pagination, message persistence.
✅ **Real-Time Engine:** WebSocket broadcasting for messages, presence (online/offline), typing indicators, and read/delivery receipts.
✅ **Demo Seed:** Database is pre-seeded with 5 users, contacts, and chat history.

## Implemented Features (Frontend — UI Shell)
✅ **Chat UI (Milestone 6):** Signal-faithful dark-mode desktop layout.
  - Sidebar with conversation list, avatar, online indicator, unread badge, timestamp, message preview
  - Chat pane with message bubbles (sent/received/group), date separators, status ticks
  - Message composer with send button
  - Empty state for no conversation selected
  - Responsive: sidebar/chat toggle on mobile with back button
  - 21 reusable components across `sidebar/`, `chat/`, `layout/`, `ui/`

✅ **Authentication UI (Milestone 7):** Complete multi-step onboarding flow.
  - **Welcome Screen:** Signal logo, tagline, Login / Create Account CTAs
  - **Login Screen:** Phone number + password, client-side validation, password show/hide
  - **Register Screen:** Phone + username + password + confirm, full validation
  - **OTP Verification Screen:** 6 auto-advancing digit inputs, paste support, 30s resend countdown, accepts mock code `123456`
  - **Display Name Screen:** Text input with 64-char counter
  - **Avatar Screen:** 8 colour swatches, drag-and-drop + click-to-upload image, preview overlay, skip option
  - Smooth `authEnter` fade+slide-up animation on every screen
  - Reusable sub-components: `AuthFlow`, `AuthContainer`, `SignalLogo`, `AuthBackButton`, `AuthInput`
  - Zero API calls — pure mock `useState` navigation
✅ **Authentication API Integration (Milestone 8):**
  - Global `AuthContext` managing session state.
  - REST integration for Login, Register, OTP verification, and Profile updates.
  - JWT persistence in `localStorage` and automatic session restore.
  - Protected routing: guests see AuthFlow, authenticated users see Chat UI.
  - Real user avatar and logout flow implemented in SidebarHeader.

✅ **Chat REST API Integration (Milestone 9):**
  - `lib/chatService.ts` — typed fetch wrappers for conversations and messages with full backend→frontend type mapping.
  - `contexts/ChatContext.tsx` — global state for conversation list, per-conversation message cache, loading and error states per action.
  - Optimistic message send: draft cleared immediately; message appended to UI; replaced by server response on success.
  - Sidebar shows animated skeleton rows while conversations load; inline error banner on failure.
  - ChatWindow shows a centered `Loader2` spinner while messages load.
  - MessageComposer wired to real send API; disabled while in flight.

✅ **Welcome Conversation on Registration (Milestone 9.5):**
  - `auth_service.register_user()` now calls `_bootstrap_welcome_conversation()` after account creation.
  - Opens a DM with seed user alice using the existing `get_or_create_dm()` service.
  - Posts a welcome message from alice using `send_message()`.
  - No new endpoints, no dev-only routes, no frontend changes.
  - Gracefully skips if database is unseeded.

## Pending Features
❌ **WebSocket Client:** Real-time messages, presence, typing indicators.
❌ **Deployment:** Host frontend on Vercel, backend on Render/Railway.
❌ **README:** Comprehensive documentation.

## Current Progress
**~82% Complete.**
The entire backend and full frontend (auth + chat REST API) are built and connected. New users immediately see a welcome DM from Alice on first login. The next phase adds real-time capabilities via WebSocket.

## Next Milestone
**Milestone 10: WebSocket Client** — Create `frontend/contexts/WebSocketContext.tsx`. Connect to `ws://localhost:8000/ws`. Handle inbound events (messages, typing, presence, receipts) and update ChatContext reactively.
