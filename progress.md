# Signal Clone — Engineering Progress Log

## Overall Progress
**Completion:** ~98%

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
- [x] **Milestone 10.5:** User Search & New Conversation Flow
- [x] **Milestone 11:** Typing Indicators
- [x] **Milestone 11.5:** Read Receipts
- [x] **Milestone 13:** Settings
- [x] **Milestone 13.5:** Settings Polish ← **JUST COMPLETED**
- [x] **Milestone 14:** Attachments (Images, Documents, Drag & Drop)
- [x] **Milestone 15:** Reply to Messages
- [ ] **Milestone 12:** Deployment

## Recently Completed Work

### **[Milestone 15]** Reply to Messages
- **Backend:** Updated `MessageOut` schema to return a populated `reply_to` nested object to the frontend.
- **Frontend Core:** Extended `Message` interface and `WsMessagePayload` to include `replyTo`.
- **Frontend Core:** Wired `replyToId` payload through `sendMessage`, `sendWsMessage`, and `postMessage`.
- **UI:** Added `replyingToMessage` state in `ChatWindow` to track active replies.
- **UI:** Added "Replying to..." contextual bar in `MessageComposer` with an `X` cancel button.
- **UI:** Added a hover-reveal Reply button (↩) to `MessageBubble`.
- **UI:** Rendered a visually distinct inset quote above message bubbles for replies.
- **UI:** Added `scrollToMessage` functionality when clicking on the quoted reply inset.
- Production build verified: `✓ Compiled successfully` — zero TypeScript errors.

### **[Milestone 14]** Attachments (Images, Documents, Drag & Drop)
- Implemented file upload input and drag-and-drop zone in `MessageComposer.tsx`.
- Added client-side image preview and document file validation.
- Wired progress bar for uploads using `axios` config `onUploadProgress`.
- Integrated `multer` on backend to handle multi-part file uploads and file storage.
- Added message bubble rendering for attachments, including image resizing and file icons.

### **[Milestone 13.5]** Settings Polish
- Implemented scale and fade animations with `isClosing` state in `SettingsModal.tsx`.
- Added a lightweight focus trap for accessibility and an Escape key listener.
- Improved the Avatar section with drag-and-drop file support and a "Remove Photo" option.
- Added loading spinners and disabled states to the "Save Profile" button.
- Refined Light Mode variables and added global `transition-colors` in `globals.css` for smooth theme switching.
- Fleshed out the About tab with the app logo, tech stack, and GitHub repository link.

### **[Milestone 13]** Settings
- Created `frontend/contexts/SettingsContext.tsx` to manage and persist user preferences in `localStorage` (`signal_preferences`).
- Created `frontend/components/settings/SettingsModal.tsx` as a multi-tab overlay with Account, Appearance, Privacy, Notifications, and About sections.
- Refactored `frontend/app/globals.css` from hardcoded `@theme inline` colors to CSS variables, enabling a clean `.light` mode override.
- Wired the Settings gear icon in `SidebarHeader.tsx` to open the modal.
- Integrated Privacy toggles into `page.tsx`: WebSocket frames for `mark_read`, `mark_delivered`, `typing_start`, and `typing_stop` are now suppressed if disabled in preferences.
- Profile changes (display name, avatar) hooked up to existing `updateProfile` API logic.
- Production build verified: `Compiled successfully` — zero TypeScript errors, zero lint errors.

### **[Milestone 11.5]** Read Receipts
- Extended `frontend/contexts/WebSocketContext.tsx`:
  - Added `WsReadReceiptPayload` and `WsDeliveryReceiptPayload` interfaces.
  - Added `sendMarkRead(conversationId)` and `sendMarkDelivered(messageIds)`.
  - Added `onReadReceipt` and `onDeliveryReceipt` to `WebSocketCallbacks`.
  - Dispatched `read_receipt` and `delivery_receipt` WS frames to the new callbacks.

- Extended `frontend/contexts/ChatContext.tsx`:
  - Added `receiveReadReceipt()` action to update own messages' status to `"read"` if sent before/at the receipt timestamp.
  - Added `receiveDeliveryReceipt()` action to update own messages' status from `"sent"` to `"delivered"`.
  - Added `markConversationAsRead()` to locally clear `unreadCount` for a conversation in the sidebar.

- Modified `frontend/app/page.tsx`:
  - Automated Delivery Receipts: Inside `onMessage`, if the message is from another user, automatically called `sendMarkDelivered([payload.id])`.
  - Automated Read Receipts: Added a `useEffect` on `selectedId` and `conversations`. If the open conversation has `unreadCount > 0`, automatically called `sendMarkRead(selectedId)` and `markConversationAsRead(selectedId)`.
  - Wired WS callbacks `onReadReceipt` and `onDeliveryReceipt` to `ChatContext`.

- Verified `npm run build` is clean (0 TS errors, 0 ESLint warnings).

### **[Milestone 11]** Typing Indicators
- No backend changes — typing_start/typing_stop WS events already fully implemented in backend.

- Created `frontend/components/chat/TypingIndicator.tsx`:
  - Renders null when no one is typing (zero overhead).
  - Handles 0/1/2/3+ concurrent typers with correct grammar.
  - Animated 3-dot bounce via `typingBounce` CSS keyframes.
  - Fully accessible: `aria-live="polite"`, `role="status"`, `aria-label`.

- Added `typingBounce` keyframe to `frontend/app/globals.css`.

- Extended `frontend/contexts/ChatContext.tsx`:
  - Added `typingUsers: TypingUsersMap` state (`Record<convId, Record<userId, displayName>>`).
  - Added `receiveTyping(payload, isStop)` action.
  - Typing start: adds user to `typingUsers`, schedules 3-second safety auto-remove timer.
  - Typing stop: removes user, cancels their timer. No memory leaks (timers in `useRef`).

- Extended `frontend/contexts/WebSocketContext.tsx`:
  - Added `sendTypingStart(conversationId)` — wraps `sendFrame({ type: 'typing_start', ... })`.
  - Added `sendTypingStop(conversationId)` — wraps `sendFrame({ type: 'typing_stop', ... })`.

- Modified `frontend/components/chat/MessageComposer.tsx`:
  - Added `onTypingStart` / `onTypingStop` props.
  - `debounceRef`: fires `onTypingStart` 400ms after first keystroke (not on every key).
  - `stopRef`: fires `onTypingStop` 1s after last keystroke.
  - `isTypingRef`: prevents duplicate typing_start sends in the same burst.
  - `handleSend`: immediately clears timers and fires `onTypingStop` before sending.
  - All timers cleaned up on unmount via `useEffect` return. Zero memory leaks.

- Threaded props: `MessageArea` → `ChatWindow` → `AppLayout` → `page.tsx`.

- Modified `frontend/app/page.tsx`:
  - Wired `onTyping` callback to call `receiveTyping(payload, isStop)`.
  - Derives `currentTypers` from `typingUsers[selectedId]`.
  - `handleTypingStart/Stop`: guards on `selectedId && isConnected`.
  - Passes `typers`, `onTypingStart`, `onTypingStop` to `AppLayout`.

- Production build verified: `Compiled successfully` — zero TypeScript errors, zero lint errors.

## Previous Work

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
| **Typing Indicators** | ✅ Complete | Debounced WS events, animated indicator, multi-user, auto-remove |
| **Read Receipts** | ✅ Complete | Automated WS read/delivery dispatch, real-time message bubble status updates |
| **Settings** | ✅ Complete | Modal overlay, local storage persistence, theme switching, privacy toggles, extensive UX polish |
| **Testing** | ⚠️ Partial | Backend manually tested, no unit tests yet |
| **Deployment** | ❌ Pending | Nothing deployed yet |

## GitHub Status
- **Latest Commit:** `feat(frontend): implement Milestone 13 — settings`
- **Branch:** `main` (Behind — Milestones 6-13.5 not yet committed)
- **Suggested commit:**
  ```
  feat(frontend): implement Milestone 13.5 — settings polish

  Add extensive UX, UI, and accessibility polish to the Settings Modal.
  - Implement exit animations (fade + scale) and backdrop blur.
  - Add lightweight focus trap, Escape key listener, and focus restoration.
  - Implement drag-and-drop and remove photo logic for Avatars.
  - Disable Save button if no changes exist; add loading spinners and error toasts.
  - Add smooth transition colors in globals.css for Light/Dark mode flipping.
  - Flesh out the About tab with Tech Stack and GitHub links.

  Compiled successfully, zero TS/lint errors.
  ```

## Current Blockers
- None. Full real-time + settings + typing indicators + read receipts implemented end-to-end.

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
- [x] Implement real-time typing indicators.
- [x] Implement Settings UI and preferences.
- [ ] Write `README.md`.
- [ ] Deploy frontend & backend.

## Next Milestone
**Milestone 12: Deployment** — Deploy backend to Render/Railway, frontend to Vercel/Netlify.
