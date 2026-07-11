# Signal Clone — Engineering Progress Log

## Overall Progress
**Completion:** ~95%

## Milestones
- [x] **Milestone 1:** Project setup & repository scaffold
- [x] **Milestone 2:** Backend database schema & ORM models
- [x] **Milestone 3:** Core REST APIs (Auth, Users, Contacts, Conversations, Messages)
- [x] **Milestone 4:** WebSocket real-time engine
- [x] **Milestone 5:** Backend verification & testing
- [x] **Milestone 6:** Frontend UI scaffolding (Next.js + Tailwind + Chat shell)
- [x] **Milestone 7:** Frontend authentication UI flow (6 screens, fully functional)
- [x] **Milestone 8:** Frontend Auth API integration (REST calls for login/register/OTP)
- [x] **Milestone 9:** Frontend Chat API integration (REST calls for messages/conversations)
- [x] **Milestone 10:** Real-time chat integration (WebSocket client)
- [x] **Milestone 10.5:** User Search & New Conversation Flow ← **JUST COMPLETED**
- [ ] **Milestone 11:** Deployment

## Recently Completed Work

### **[Milestone 10.5]** User Search & New Conversation Flow
- Created `frontend/lib/userService.ts`:
  - `searchUsers(query)` → `GET /api/users/search?q=<query>` — returns `SearchedUser[]`
  - `createOrGetDm(otherUserId, currentUserId)` → `POST /api/conversations/dm` — idempotent, maps `ConversationOut` → frontend `Conversation`
  - No backend changes — both endpoints already existed.

- Created `frontend/components/sidebar/NewChatPanel.tsx`:
  - Absolutely-positioned overlay inside Sidebar (below header, above list).
  - 300 ms debounced search against `GET /api/users/search`.
  - Filters out the current user from results.
  - Shows loading spinner, empty-state hint, "no results" message, and error inline.
  - Clicking a user row calls `onSelectUser(userId, displayName)` and closes panel.
  - Keyboard: Escape closes the panel. Auto-focuses search input on open.
  - Fully accessible: `role="dialog"`, `aria-modal`, `role="listbox"`, unique ids.

- Modified `frontend/contexts/ChatContext.tsx`:
  - Added `openNewChat(otherUserId): Promise<string | null>` action.
  - Calls `createOrGetDm()` and upserts the conversation into the sidebar list:
    - If the DM already exists → returns existing id (no-op on list).
    - If it's new → prepends to top of conversation list.
  - Returns the conversation id so the caller can auto-select it.

- Modified `frontend/components/sidebar/SidebarHeader.tsx`:
  - Added `onNewChat: () => void` prop.
  - Wired the previously-dead PenSquare button to `onNewChat`.

- Modified `frontend/components/sidebar/Sidebar.tsx`:
  - Added `newChatOpen: boolean` local state.
  - Added `onNewChat: (userId, displayName) => void` prop.
  - Passes `onNewChat={() => setNewChatOpen(true)}` to `SidebarHeader`.
  - Renders `<NewChatPanel>` as absolutely-positioned overlay (z-10).
  - Added `relative` positioning to the aside so the overlay clips correctly.

- Modified `frontend/components/layout/AppLayout.tsx`:
  - Added `onNewChat: (userId, displayName) => void` prop and threaded to `<Sidebar>`.

- Modified `frontend/app/page.tsx`:
  - Destructured `openNewChat` from `useChat()`.
  - Added `handleNewChat(userId)`:
    1. Calls `openNewChat(userId)` → REST POST → gets convId.
    2. Calls `handleSelectConversation(convId)` → auto-selects + loads messages.
  - Passed `onNewChat={handleNewChat}` to `<AppLayout>`.

- Production build verified: `✓ Compiled successfully` — zero TypeScript errors, zero lint errors.

## Previous Work

### **[Milestone 10]** WebSocket Real-time Client
- Created `frontend/contexts/WebSocketContext.tsx` with JWT auth, exponential back-off reconnect.
- Updated `ChatContext`: `receiveMessage()`, `updatePresence()`, WS-primary `sendMessage()`.
- Updated `page.tsx`: `<WebSocketProvider>` + callback wiring.

### **[Milestone 9]** Chat API Integration
- `lib/chatService.ts`, `contexts/ChatContext.tsx` — REST-backed conversations & messages.

### **[Milestone 9.5]** Welcome Conversation on Registration
- `auth_service.register_user()` bootstraps a DM with alice on every new account.

### **[Milestones 6-8]** Chat UI Shell + Auth UI + Auth API Integration
- 21 chat components + 11 auth components, Signal-faithful dark-mode design.
- `AuthContext` with `pendingUser` pattern, JWT persistence, session restore.

## Component Status
| Component | Status | Details |
|---|---|---|
| **Database** | ✅ Complete | 6 tables, seeded with 5 users & mock data |
| **API** | ✅ Complete | 17 endpoints verified via Swagger / Test script |
| **Authentication** | ✅ Complete | JWT + bcrypt implemented and verified |
| **WebSocket (Backend)** | ✅ Complete | Multiplexed connection, broadcasting working |
| **Frontend Shell (Chat UI)** | ✅ Complete | Next.js 15 + Tailwind CSS v4, 21 components |
| **Frontend Auth UI** | ✅ Complete | 6-screen auth flow, 11 new components, real API integration |
| **Frontend Chat API Integration** | ✅ Complete | REST calls wired; conversations & messages from live backend |
| **WebSocket Client** | ✅ Complete | JWT auth, exponential back-off reconnect, live messaging |
| **User Search & New Chat** | ✅ Complete | Search panel, DM creation, auto-select, sidebar upsert |
| **Testing** | ⚠️ Partial | Backend manually tested, no unit tests yet |
| **Deployment** | ❌ Pending | Nothing deployed yet |

## GitHub Status
- **Latest Commit:** `Complete backend scaffold and authentication`
- **Branch:** `main` (Behind — Milestones 6-10.5 not yet committed)
- **Suggested commit:**
  ```
  feat(frontend): implement Milestone 10.5 — user search & new chat flow

  Add lib/userService.ts with searchUsers() (GET /api/users/search) and
  createOrGetDm() (POST /api/conversations/dm). No backend changes needed.

  Add NewChatPanel component: debounced search overlay inside Sidebar,
  keyboard-accessible (Escape closes, auto-focus), filters out current
  user, shows loading/empty/error states.

  Add ChatContext.openNewChat(): calls createOrGetDm(), upserts the
  conversation into the sidebar (prepend if new), returns conv id.

  Wire SidebarHeader PenSquare button → Sidebar.newChatOpen state →
  NewChatPanel. Thread onNewChat through AppLayout → Sidebar → Header.

  ChatApp.handleNewChat(): openNewChat() then auto-select conversation.

  npm run build: ✓ Compiled successfully, zero TS/lint errors.
  ```

## Current Blockers
- None. Full real-time + new chat flow implemented end-to-end.

## TODO Checklist
- [x] Initialize Next.js project in `frontend/`.
- [x] Create layout and UI components replicating Signal Messenger.
- [x] Add TailwindCSS for styling.
- [x] Implement Chat UI with dummy data.
- [x] Add authentication screens (Login, Register, OTP, DisplayName, Avatar).
- [x] Implement JWT storage and auth context.
- [x] Replace dummy chat data with `fetch` calls to backend `/api/conversations`.
- [x] Fix empty conversation list for newly registered users (welcome DM on registration).
- [x] Implement WebSocket client for real-time updates.
- [x] Implement user search and new conversation flow.
- [ ] Write `README.md`.
- [ ] Deploy frontend & backend.

## Next Milestone
**Milestone 11: Deployment** — Deploy backend to Render/Railway, frontend to Vercel/Netlify.
