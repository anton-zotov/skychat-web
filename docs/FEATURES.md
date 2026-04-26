# SkyChat Feature Reference

This file is the living feature reference for the application.

When functionality changes, update this document in the same change so it stays aligned with the real behavior in code.

## Product Overview

SkyChat is a Firebase-backed real-time messenger with:

- Google sign-in
- one-to-one chats
- group chats
- a built-in "Saved Messages" personal chat
- rich message composition with files, media, GIFs, emoji, reactions, replies, and edits
- browser notifications and push subscription support
- basic in-app audio calling
- privacy and theme settings

## Authentication

- Users sign in with Google via Firebase Authentication popup flow.
- Signed-out users see a dedicated login screen with a single Google login action.
- Users can sign out from the side drawer.

## App Shell And Navigation

- The app uses a two-pane messenger layout on desktop:
  chat list on the left, active conversation on the right.
- On mobile, the UI switches between the chat list and the active conversation.
- A side drawer contains account info, notifications, settings, and logout.
- The current chat is reflected in the URL as `/chat/:id`.
- Browser back/forward navigation restores the selected chat.
- If no chat is selected, the main pane shows an empty-state prompt.

## Keyboard Shortcuts

- `Escape` closes the drawer, modals, pickers, reply state, suggestions, staged uploads, or exits the active chat depending on context.
- `Alt+1` through `Alt+9` jump to chat list entries by position.
- `Alt+ArrowUp` and `Alt+ArrowDown` cycle through chats.
- In the composer, `Enter` sends and `Shift+Enter` inserts a new line.
- Emoji autocomplete supports arrow navigation, `Enter` or `Tab` to accept, and `Escape` to dismiss.
- The image viewer supports left and right arrow navigation.

## Chats And Conversation Management

- The chat list is loaded from Firebase in real time and ordered by `updatedAt`.
- Users can search chats from the main list.
- Search behavior differs by chat type:
  saved messages match saved-message labels, groups match group name, and private chats match the other participant's display name.
- A "Saved Messages" chat is auto-created for each user if missing.
- Users can create:
  private chats with one participant or group chats with multiple participants.
- When creating a private chat, the app reuses an existing direct conversation if one already exists.
- The "New Chat" modal allows optional group naming.
- The Echo Bot appears as a selectable contact.

## Presence And Privacy

- User profile presence is synced to Firestore with `lastSeen` updates on load and every minute.
- Users can optionally hide:
  last seen and online status.
- Presence visibility is reciprocal:
  if a user hides a status category, they also lose visibility into that category for others.
- "Online" is based on a recent `lastSeen` threshold.
- Echo Bot is always treated as online.

## Chat List Item Behavior

- Each chat row shows avatar, title, latest message preview, update time, and unread badge.
- Private chats show the other participant's avatar and online indicator when visibility rules allow it.
- Saved Messages uses a bookmark-style fallback icon instead of a user avatar.

## Message Timeline

- Messages are streamed live from Firebase and displayed oldest to newest.
- The app supports incremental loading by increasing the query limit when scrolling near the top.
- Scroll state is managed so loading older messages does not disrupt the user's reading position.
- A floating "scroll to bottom" button appears when the user is not pinned near the bottom.
- Opening a chat marks unread incoming messages as read.
- Opening a chat also resets that chat's unread count for the current user.

## In-Chat Search

- Each conversation has a message search mode.
- Search can filter by:
  text, filename, start date, and end date.
- Search is client-side over the currently loaded message set.

## Message Types

- Plain text messages
- Image messages
- Video messages
- File messages
- Mixed messages containing text plus one or more attachments
- Reply messages referencing another message

## Rich Text And Markdown

- Message text is rendered with `react-markdown` and `remark-gfm`.
- Links open in a new tab with safe rel attributes.
- Whitespace is preserved for multi-line messages.

## Replies

- Users can reply to a message.
- Reply previews show the original sender and a compact preview of the original content.
- Clicking a reply preview scrolls to and temporarily highlights the referenced message.
- The composer shows active reply state and allows canceling it.

## Reactions

- Users can react with a fixed reaction set:
  heart, thumbs up, laugh, surprise, cry, pray, fire, hundred, and eyes.
- Reactions can be added from:
  a context menu or inline action buttons.
- Reacting again removes the user's own reaction.
- Reaction badges display counts and visually distinguish whether the current user reacted.

## Editing, Copying, And Deleting Messages

- Users can edit their own text messages inline.
- Edited messages are marked as edited.
- Users can delete their own messages with a confirmation dialog.
- Users can copy message text to the clipboard.
- These actions are available from the message context menu.

## Read Receipts

- Outgoing messages display single or double check status.
- Clicking the outgoing read indicator opens a small read receipt panel.
- The panel lists which users have read the message and the read time.

## Media And Attachment Handling

- Users can attach multiple files at once.
- Images are compressed before upload, except for GIF and SVG files.
- Staged uploads open in a gallery-style preview overlay before sending.
- Staged image previews can be rotated in 90-degree increments.
- Users can remove staged files before sending.
- Images render inline in message bubbles.
- Multiple images render in a grid.
- Images open in a full-screen viewer with:
  close, left/right navigation, swipe gestures, and index display.
- Videos render inline with controls.
- Non-media files render as downloadable/openable file links.

## Composer Features

- Auto-resizing textarea
- draft persistence per chat via `localStorage`
- paste-to-attach for clipboard image files
- emoji picker
- GIF picker
- emoji shortcode suggestions triggered with `:query`

## Emoji Features

- The app includes a full emoji picker.
- It also supports custom emoji search suggestions while typing.
- Emoji suggestions include Russian keyword mapping in addition to standard emoji ids and names.

## GIF Features

- GIF search and trending results are loaded through server proxy endpoints.
- Users can pick GIFs directly into the conversation as image messages.
- The app stores a per-user recent GIF list in Firestore.
- The GIF picker supports:
  trending view, recent view, debounced search, and inline selection.

## Echo Bot

- Echo Bot is a built-in pseudo-user.
- If a chat includes Echo Bot, the bot sends an automatic delayed reply.
- In Saved Messages, users can trigger Echo Bot manually with `/echo <text>`.
- Echo Bot updates unread counts and can trigger push notification delivery just like human senders.

## Calls

- The app supports audio call initiation from non-saved chats.
- Incoming calls are listened for in real time from the `calls` collection.
- Call signaling is stored in Firestore.
- WebRTC peer connections are created with `simple-peer`.
- Users can:
  accept, reject, end, and mute calls.
- Remote audio is played through an `Audio` element when available.

## Notifications And Badges

- Users can request browser notification permission from the drawer.
- When permission is granted, the app requests a push subscription from the service worker.
- Push subscription data is stored on the user profile.
- The app watches chat updates and can show local notifications for new incoming messages.
- If a push subscription exists, the app avoids showing duplicate local notifications.
- The server exposes a VAPID public key endpoint and a push-send endpoint.
- The app updates:
  document title, favicon badge, and browser app badge based on unread count.

## Settings

- Privacy settings:
  show last seen and show online status.
- Appearance settings:
  light, dark, and system theme.
- Theme selection is persisted in `localStorage`.
- System theme changes are observed live when the theme mode is set to system.

## Error Handling And Loading States

- A top-level error boundary displays a recovery screen and reload action if rendering fails.
- The app includes loading states for:
  auth, chat list, contact list, GIF loading, file upload, and image compression.
- Toast notifications are used for user-facing feedback on actions like edits and notification setup.

## Server-Side Features

- Express development server wrapping Vite middleware
- `/api/health` health check
- `/api/vapidPublicKey` for push subscription setup
- `/api/sendPush` for web push delivery
- `/api/gifs/search` proxy endpoint
- `/api/gifs/trending` proxy endpoint
- GIF endpoints fall back to mock data when `GIPHY_API_KEY` is not configured

## Deployment And Operations

- The app can be deployed as a single Cloud Run service that serves both the frontend bundle and the Express API.
- The repo includes a GitHub Actions workflow that deploys to Cloud Run on pushes to `main`.
- That workflow authenticates to Google Cloud with Workload Identity Federation rather than a checked-in or long-lived service account key.

## Testing

- Playwright visual regression tests cover the real app rendered on localhost.
- Tests use strict `0`-pixel-diff snapshots for desktop and mobile Chromium.
- Backend behavior for those tests is mocked inside Playwright request/module interception.

## Known Constraints From Current Implementation

- Audio calling is audio-only, not video.
- Message search is performed over the currently loaded message set, not over the full remote history.
- Google sign-in requires the current host to be allowed in Firebase Authentication authorized domains.
- Push notifications depend on browser support, service worker availability, and valid VAPID configuration.
