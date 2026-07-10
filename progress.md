# Signal Clone — Engineering Progress Log

## Overall Progress
**Completion:** ~65%

## Milestones
- [x] **Milestone 1:** Project setup & repository scaffold
- [x] **Milestone 2:** Backend database schema & ORM models
- [x] **Milestone 3:** Core REST APIs (Auth, Users, Contacts, Conversations, Messages)
- [x] **Milestone 4:** WebSocket real-time engine
- [x] **Milestone 5:** Backend verification & testing
- [x] **Milestone 6:** Frontend UI scaffolding (Next.js + Tailwind + Chat shell)
- [x] **Milestone 7:** Frontend authentication UI flow (6 screens, fully functional)
- [x] **Milestone 8:** Frontend Auth API integration (REST calls for login/register/OTP)
- [ ] **Milestone 9:** Frontend Chat API integration (REST calls for messages/conversations)
- [ ] **Milestone 10:** Real-time chat integration (WebSocket client)
- [ ] **Milestone 11:** Deployment

## Recently Completed Work
- Implemented full FastAPI backend.
- Designed 6 SQLite tables via SQLAlchemy + Alembic.
- Created mock JWT authentication.
- Built WebSocket ConnectionManager for real-time presence, typing, and read receipts.
- Passed all backend API verification tests.
- **[Milestone 6]** Scaffolded Next.js 15 frontend with Tailwind CSS v4 (App Router).
- Built 21 reusable components: Sidebar, ConversationList, ChatHeader, MessageBubble, MessageComposer, Avatar, StatusIcon, EmptyState, and more.
- Implemented responsive desktop layout (split pane: sidebar + chat).
- Added mobile support: sidebar/chat toggle on small screens with back button.
- Seeded 6 conversations and 35+ realistic messages as dummy data.
- **[Milestone 7]** Built complete authentication UI flow:
  - 6 screens: Welcome, Login, Register, OTP Verification, Display Name, Avatar
  - 5 shared sub-components: AuthFlow, AuthContainer, SignalLogo, AuthBackButton, AuthInput
  - OTP screen: 6 auto-advancing inputs, paste support, 30s resend countdown, mock code `123456`
  - Avatar screen: colour swatches, drag-and-drop file upload, image preview, skip option
  - Full client-side form validation with accessible error messages
  - Smooth entrance animations (`@keyframes authEnter`)
  - Zero API calls — pure mock state navigation
- Fixed hydration mismatches: deterministic BASE_TIME, pinned `"en-GB"` locale + UTC timezone
- **[Milestone 8]** Connected Auth UI to FastAPI backend:
  - Built generic API client wrapper (`lib/api.ts`) with typed errors.
  - Implemented `AuthService` (`lib/authService.ts`) mapped to backend Pydantic schemas.
  - Created global `AuthContext` to manage `user`, `token`, loading state, and session restore.
  - Wired `page.tsx` for protected routing (shows AuthFlow for guests, Chat UI for authenticated users).
  - Wired `LoginScreen`, `RegisterScreen`, `OtpScreen`, `DisplayNameScreen`, and `AvatarScreen` to execute real API calls with loading spinners and inline error handling.
  - Added real user avatar and Logout button to `SidebarHeader`.
- Production build verified: `✓ Compiled successfully` — zero TypeScript errors, zero lint errors

## Component Status
| Component | Status | Details |
|---|---|---|
| **Database** | ✅ Complete | 6 tables, seeded with 5 users & mock data |
| **API** | ✅ Complete | 17 endpoints verified via Swagger / Test script |
| **Authentication** | ✅ Complete | JWT + bcrypt implemented and verified |
| **WebSocket** | ✅ Complete | Multiplexed connection, broadcasting working |
| **Frontend Shell (Chat UI)** | ✅ Complete | Next.js 15 + Tailwind CSS v4, 21 components |
| **Frontend Auth UI** | ✅ Complete | 6-screen auth flow, 11 new components, real API integration |
| **Frontend Chat API Integration** | ❌ Pending | REST calls for fetching conversations/messages not yet connected |
| **WebSocket Client** | ❌ Pending | Real-time client not yet implemented |
| **Testing** | ⚠️ Partial | Backend manually tested, no unit tests yet |
| **Deployment** | ❌ Pending | Nothing deployed yet |

## GitHub Status
- **Latest Commit:** `Complete backend scaffold and authentication`
- **Branch:** `main` (Behind — Milestones 6+7 not yet committed)
- **Suggested commit:** `feat(frontend): implement Milestone 2 — authentication UI flow`

## Current Blockers
- None. Ready for Chat API integration milestone.

## Next Milestone
**Milestone 9: Frontend Chat API Integration** — Replace mock conversations and messages with real API data (`/api/conversations`).

## TODO Checklist
- [x] Initialize Next.js project in `frontend/`.
- [x] Create layout and UI components replicating Signal Messenger.
- [x] Add TailwindCSS for styling.
- [x] Implement Chat UI with dummy data.
- [x] Add authentication screens (Login, Register, OTP, DisplayName, Avatar).
- [x] Implement JWT storage and auth context.
- [ ] Replace dummy chat data with `fetch` calls to backend `/api/conversations`.
- [ ] Implement WebSocket client for real-time updates.
- [ ] Write `README.md`.
- [ ] Deploy frontend & backend.
