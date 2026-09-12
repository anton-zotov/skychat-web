# SkyChat Web capability checklist

This is the working product checklist for the web client (React + TypeScript + Vite + Firebase + Express). It is aligned with `Skychat android/CAPABILITIES.md` and `Skychat win/CAPABILITIES.md` so the same capability can be compared across clients; unchecked items that another client already ships form the parity backlog for this platform. A checked item means the capability is implemented and verified in this client. `docs/FEATURES.md` remains the detailed behavior reference; this file tracks shipped vs. planned scope.

## Foundation and identity

- [x] Google account sign-in with Firebase Authentication (popup flow, dedicated login screen)
- [x] Restore an existing signed-in session (Firebase auth-state persistence)
- [x] Sign out of Firebase
- [x] Sync the signed-in user's profile to Firestore
- [x] Show the signed-in user's profile photo and name
- [x] Read from the configured named Firestore database
- [x] Publish last-seen presence on load and every minute while open
- [ ] Add a defined retry/backoff policy for failed network operations

## App shell and navigation

- [x] Two-pane messenger layout on desktop; single-pane swap on mobile
- [x] Reflect the active chat in the URL (`/chat/:id`) with browser back/forward support
- [x] Side drawer with account info, notification controls, settings, client-build links, and sign-out
- [x] Show Android and Windows download links with published versions (`appConfig/*` documents with stable-URL fallback)
- [x] Empty-state prompt when no chat is selected
- [x] Keyboard shortcuts: `Esc` closes overlays, `Alt+1–9` and `Alt+↑/↓` switch chats, `Enter` sends, `Shift+Enter` inserts a newline
- [x] Top-level error boundary with a recovery screen

## Conversations and contacts

- [x] Display the signed-in user's realtime chat list (Firestore listeners)
- [x] Order chats by latest activity
- [x] Search chats locally with per-type matching (group name, participant name)
- [x] Display explicit group-chat titles
- [x] Resolve unnamed private chats to the other participant's profile name
- [x] Display participant profile photos for private chats
- [x] Display online indicator and last-seen text, privacy-aware and reciprocal
- [x] Display unread-message counts
- [x] Load contacts from Firestore and search them
- [x] Create one-to-one chats and reuse an existing direct chat instead of duplicating
- [x] Create group chats with an optional group title
- [ ] Support chat rename and group participant management

## Messaging

- [x] Load a selected chat's realtime message timeline
- [x] Send text messages
- [x] Update the chat preview and latest-activity timestamp after sending
- [x] Show loading, empty, and error states for a chat
- [x] Load older messages with pagination while preserving scroll position
- [x] Show a scroll-to-bottom button when not pinned to the latest message
- [ ] Show typing indicators (the Android client ships these)
- [x] Update message read state when opening a chat
- [x] Show read receipts (check marks plus a per-reader panel with read times)
- [x] Reply to a message (preview, cancel, jump-to-source highlight)
- [x] Display and manage emoji reactions (fixed set, toggle own reaction, per-emoji counts)
- [x] Copy a message
- [x] Edit own text messages and mark them as edited
- [x] Soft-delete own messages and show deleted-message state
- [x] Search messages by text or filename
- [x] Filter messages by date range
- [x] Render Markdown/GFM in message text with safe external links
- [x] Persist composer drafts per chat in `localStorage`
- [ ] Queue outgoing messages while offline and reconcile on reconnect

## Attachments and rich content

- [x] Send image messages
- [x] Send video messages
- [x] Send files
- [x] Send mixed/multiple attachments
- [x] Upload attachments to Firebase Storage with progress reporting
- [x] Stage uploads in a preview overlay and remove them before sending
- [x] Compress images before upload (except GIF/SVG)
- [x] Rotate staged image previews in 90-degree increments
- [x] Attach images pasted from the clipboard
- [x] Render image previews inline and mixed attachments as a grid
- [x] Browse a message's attachments in a full-screen viewer with swipe and arrow-key navigation
- [x] Play videos inline with controls
- [x] Show file metadata and offer generic files as download links
- [ ] Save attachments through a browser-native save flow (files currently open/download via links)
- [x] Search GIFs through server proxy endpoints (`/api/gifs/search`, `/api/gifs/trending`)
- [x] Save and show recent GIFs on the user profile
- [x] Full emoji picker plus `:shortcode` autocomplete with Russian keyword mapping

## Notifications, presence, and calls

- [x] Request browser notification permission from the drawer
- [x] Register web-push subscriptions through the service worker (VAPID key from `/api/vapidPublicKey`)
- [x] Store the push subscription on the user profile
- [x] Show local notifications for new incoming messages, deduplicated against push delivery
- [x] Display service-worker push notifications and focus/open the chat on click
- [x] Reflect unread counts in the document title, favicon badge, and app badge
- [x] Audio-only calls over WebRTC (`simple-peer`) with Firestore signaling
- [x] Incoming-call UI with accept, reject, end, and microphone mute
- [ ] Video calls
- [ ] Notification preview-detail and sound preferences (beyond the permission toggle)

## Settings and preferences

- [x] Open Settings from the side drawer
- [x] Control whether other users may see last-seen information
- [x] Control whether other users may see current online status
- [x] Save privacy choices to `users/{uid}.privacy` in Firestore
- [x] Apply privacy choices reciprocally (hiding a status also hides it from you)
- [x] Offer System, Light, and Dark theme choices with System as the default
- [x] Persist the theme choice locally and apply it immediately, tracking live system changes
- [ ] Per-scope (device vs. account) labeling and restore-defaults for device settings

## Backend and delivery

- [x] Express server endpoints: `/api/health`, `/api/vapidPublicKey`, `/api/sendPush`, `/api/gifs/search`, `/api/gifs/trending`
- [x] GIF endpoints fall back to mock data when `GIPHY_API_KEY` is not configured
- [x] Firestore and Firebase Storage security rules in the repository
- [x] Unit tests (Vitest) and Playwright visual-regression tests (strict 0-pixel-diff snapshots)
- [x] Single-service Cloud Run deployment with a GitHub Actions workflow (Workload Identity Federation)
- [ ] Add crash reporting and analytics policy
- [ ] Firestore-cost and rate-limit review beyond the existing page limiter
