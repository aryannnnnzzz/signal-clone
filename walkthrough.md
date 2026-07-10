# Milestone 6 Complete: Signal Clone Frontend UI Shell

## Build Result

```
▲ Next.js 15.5.20
✓ Compiled successfully in 10.8s
✓ Generating static pages (5/5)

Route (app)          Size       First Load JS
┌ ○ /               8.46 kB         111 kB
└ ○ /_not-found       995 B         103 kB
```
**Zero TypeScript errors. Zero missing imports. Zero missing exports.**

---

## Screenshots

![Initial state — Signal Desktop empty state with conversation list](initial_state_1783694326534.png)

![Active chat — Bob Martin conversation with sent/received bubbles](chat_view_1783694338889.png)

---

## Folder Structure Created

```
frontend/
├── app/
│   ├── globals.css          ← Tailwind v4 @theme tokens + Signal color system
│   ├── layout.tsx           ← Root layout, Inter font, metadata
│   └── page.tsx             ← Entry point; owns selectedConversationId state
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx    ← Split-pane shell with responsive mobile toggle
│   ├── sidebar/
│   │   ├── Sidebar.tsx      ← Container with local search state
│   │   ├── SidebarHeader.tsx← Logo, current user avatar, compose/settings icons
│   │   ├── SearchBar.tsx    ← Pill-shaped search input with clear button
│   │   ├── ConversationList.tsx   ← Scrollable nav list wrapper
│   │   └── ConversationListItem.tsx ← 2-row conversation row (name/msg/badge)
│   ├── chat/
│   │   ├── ChatWindow.tsx   ← Right pane orchestrator (empty state or chat)
│   │   ├── ChatHeader.tsx   ← Contact info + call/search/more icons + back button
│   │   ├── MessageArea.tsx  ← Scrollable feed with date separators
│   │   ├── MessageBubble.tsx← Sent (blue) / Received (grey) bubbles with tail
│   │   └── MessageComposer.tsx ← Auto-resize textarea; Send↔Mic toggle
│   └── ui/
│       ├── Avatar.tsx       ← Initials + deterministic color hash fallback
│       ├── EmptyState.tsx   ← Signal logo + prompt when no chat selected
│       └── StatusIcon.tsx   ← ✓ / ✓✓ / ✓✓(blue) delivery receipt icons
├── data/
│   └── mockData.ts          ← 6 conversations, 35+ messages (alice/bob/carol/david/eve)
├── lib/
│   └── utils.ts             ← formatSidebarTimestamp, formatMessageTime, getInitials, etc.
└── types/
    └── index.ts             ← Conversation, Message, User, MessageStatus types
```

---

## All Created Files (21 custom files)

| # | File | Purpose |
|---|------|---------|
| 1 | `app/globals.css` | Tailwind v4 `@theme` color tokens, scrollbar, base reset |
| 2 | `app/layout.tsx` | Root layout with Inter font & dark bg |
| 3 | `app/page.tsx` | Entry point; `selectedId` state |
| 4 | `types/index.ts` | All TypeScript type definitions |
| 5 | `data/mockData.ts` | Realistic dummy conversations & messages |
| 6 | `lib/utils.ts` | Timestamp formatters, initials, color hash |
| 7 | `components/layout/AppLayout.tsx` | Split-pane layout, responsive |
| 8 | `components/sidebar/Sidebar.tsx` | Sidebar container with search state |
| 9 | `components/sidebar/SidebarHeader.tsx` | Logo + avatar + action icons |
| 10 | `components/sidebar/SearchBar.tsx` | Pill-shaped search input |
| 11 | `components/sidebar/ConversationList.tsx` | Scrollable nav wrapper |
| 12 | `components/sidebar/ConversationListItem.tsx` | Conversation row |
| 13 | `components/chat/ChatWindow.tsx` | Right pane orchestrator |
| 14 | `components/chat/ChatHeader.tsx` | Chat top bar |
| 15 | `components/chat/MessageArea.tsx` | Scrollable feed + date separators |
| 16 | `components/chat/MessageBubble.tsx` | Sent/received bubbles |
| 17 | `components/chat/MessageComposer.tsx` | Input + send/mic toggle |
| 18 | `components/ui/Avatar.tsx` | Initials avatar |
| 19 | `components/ui/EmptyState.tsx` | No-chat-selected view |
| 20 | `components/ui/StatusIcon.tsx` | Delivery receipt icons |

---

## Signal Design Decisions

| Feature | Implementation |
|---------|---------------|
| **Color palette** | `@theme inline` in globals.css (Tailwind v4) with 14 Signal-exact tokens |
| **Sent bubbles** | `bg-signal-sent` (#2C6BED) with `rounded-br-[4px]` tail |
| **Received bubbles** | `bg-signal-received` (#252527) with `rounded-bl-[4px]` tail |
| **Unread badge** | Signal blue pill; shows up to 99+ |
| **Online dot** | `bg-signal-online` (#4CAF50) overlaid on avatar bottom-right |
| **Delivery ticks** | `Check` (sent), `CheckCheck` grey (delivered), `CheckCheck` blue (read) |
| **Sender name** | Rendered only for received messages in group conversations |
| **Date separators** | Muted pill labels ("Today", "Yesterday", weekday names) |
| **Mobile responsive** | Sidebar/chat toggle via Tailwind `hidden md:flex` — pure CSS |
| **Auto-resize textarea** | `scrollHeight` measured in `useEffect`; caps at 120px |
| **Send↔Mic toggle** | Controlled by `draft.trim().length > 0` |
| **Search filter** | Case-insensitive match on name + lastMessage, local to Sidebar |

---

## Verification Checklist

- [x] No TypeScript errors (`✓ Compiled successfully`)
- [x] No missing imports (grep audit confirmed all `@/` paths resolve)
- [x] No missing exports (all components export `default`)
- [x] All 12 required components built
- [x] Sent message bubbles (right-aligned, blue)
- [x] Received message bubbles (left-aligned, grey)
- [x] Empty state shown when no conversation selected
- [x] Conversation list with avatar, name, timestamp, unread badge
- [x] Search bar filters list in real-time
- [x] Chat header shows contact/group info + action icons
- [x] Date separators between day boundaries
- [x] Sender name shown in group conversations (received only)
- [x] Delivery/read receipt icons on own messages
- [x] Online indicator on DM contacts
- [x] Message composer with emoji/attach/send/mic buttons
- [x] Enter to send; Shift+Enter for newline
- [x] Mobile responsive (sidebar ↔ chat toggle)
- [x] Dev server running at `http://localhost:3000`

---

## Running the Frontend Locally

```bash
cd frontend
# Start dev server (Turbopack)
npm run dev

# OR production build
npm run build && npm start
```

Dev server: **http://localhost:3000**

---

## Suggested Git Commit Message

```
feat(frontend): Milestone 6 — Signal Desktop UI shell

- Scaffold Next.js 15.5 + Tailwind CSS v4 + TypeScript frontend
- Build 21 component files: Sidebar, ConversationList, ChatHeader,
  MessageArea, MessageBubble, MessageComposer, Avatar, StatusIcon,
  EmptyState, AppLayout and all sub-components
- Implement Signal dark theme color system via CSS @theme tokens
- Add responsive layout (mobile sidebar/chat toggle via Tailwind)
- Seed 6 conversations (4 DMs + 2 groups) with 35+ messages
- Production build verified: zero TypeScript errors

No API calls, no WebSockets, no global state management.
Dummy data only. Ready for Milestone 7 (API integration).
```
