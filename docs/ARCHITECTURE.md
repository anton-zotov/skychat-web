# SkyChat Architecture

## Overview

The frontend is organized around domain modules under `src/domains`, a small shared layer under `src/shared`, and a thin application shell in `src/App.tsx`.

The current direction of the refactor is:

- `App.tsx` coordinates cross-domain concerns such as auth session state, app-level routing, modal visibility, unread counters, and top-level layout.
- `src/domains/*` owns feature behavior and feature UI.
- `src/shared/*` owns reusable UI primitives, helpers, hooks, constants, and shared types.

This keeps business logic close to the feature that owns it and prevents `App.tsx` from becoming a second monolith.

## Directory Roles

- `src/App.tsx`
  Top-level composition root. It wires together auth, routing, notifications, presence, and the main shell layout.
- `src/domains/app`
  App-shell-only components and hooks that are not part of a product feature themselves.
- `src/domains/auth`
  Login and loading entry states.
- `src/domains/chat`
  Chat list, chat window, composer, message rendering, and chat creation behavior.
- `src/domains/call`
  Call UI plus Firestore/WebRTC call orchestration.
- `src/domains/media`
  GIF picker and upload/image transformation flows.
- `src/domains/notification`
  Notification permission/subscription logic.
- `src/domains/settings`
  Settings UI and privacy updates.
- `src/shared/ui`
  Reusable primitives such as `Button`, `Avatar`, `AppLogo`, `StatusBadge`, `ErrorBoundary`, and skeletons.
- `src/shared/hooks`
  Cross-cutting reusable hooks like `useTheme`.
- `src/shared/helpers`
  Low-level helpers such as emoji and file-type utilities.

## Main Runtime Flow

1. `App.tsx` reads the auth session with `useAuthState`.
2. Unauthenticated users see `LoginScreen`; loading users see `LoadingScreen`.
3. Authenticated users get the shell:
   - `SideDrawer`
   - `ChatSidebar`
   - `ChatWindow` or `EmptyChatState`
   - modal overlays like `NewChatModal`, `SettingsModal`, and `CallWindow`
4. `useChatRouting` syncs `selectedChatId` with `/chat/:id`.
5. `useUnreadNotifications` tracks unread totals, updates the favicon/title/app badge, and emits browser notifications for new messages.

## State Ownership

Use this as the default rule when moving code:

- Keep state in `App.tsx` only if multiple domains need it or it affects top-level layout.
- Keep state in a domain component if the behavior is feature-local.
- Move repeated cross-cutting behavior into `shared` only after at least two consumers need it.

Examples:

- `selectedChatId`, drawer visibility, active call, and modal visibility belong to the app shell.
- reply state, message search state, staged uploads, and message context menus belong to chat/media components.
- theme handling belongs in `shared/hooks/useTheme.ts`.

## Current App Shell Extractions

The latest cleanup moved the following responsibilities out of `App.tsx`:

- `useChatRouting`
  Encapsulates URL-to-chat synchronization and mobile sidebar behavior.
- `useUnreadNotifications`
  Encapsulates unread totals, favicon/title updates, badge updates, and browser notification side effects.
- `SideDrawer`
  Encapsulates drawer rendering and account/settings/logout actions.
- `ChatSidebar`
  Encapsulates chat-list header/search/new-chat affordances.
- `EmptyChatState`
  Encapsulates the no-chat-selected state.

This makes `App.tsx` the composition layer rather than the implementation layer.

## Data Boundaries

- Firestore reads/writes currently happen close to the features that use them.
- Service files under `src/domains/*/services` should be preferred for reusable mutations or multi-step workflows.
- Presentational components under `shared/ui` should not directly know about app-wide workflows.

When adding new behavior:

- Put Firestore mutation orchestration in a domain service if the same workflow could be triggered from more than one component.
- Keep pure formatting or detection logic in `shared/helpers`.
- Prefer passing typed props into UI components rather than importing unrelated services into them.

## Refactor Guidelines

- Do not add new large inline components to `App.tsx`.
- If a component grows beyond a few focused concerns, extract its local logic first into a hook within the same domain.
- If a feature needs app-shell coordination, add a small app hook/component under `src/domains/app` rather than expanding `App.tsx`.
- Preserve test-facing behavior and `data-testid` values while extracting.

## Known Follow-Up Opportunities

- `ChatWindow`, `MessageBubble`, and `MessageInput` still carry substantial UI and interaction logic and are the next best extraction candidates for feature-local hooks.
- `src/domains/notification/hooks/useNotifications.ts` overlaps conceptually with the new app-shell unread notification hook and could be consolidated.
- Some services still mix naming from the pre-refactor structure; standardizing those APIs would make feature boundaries easier to reason about.
