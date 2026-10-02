# Messenger upgrade — Friend groups, offline messages, read receipts, typing

**Date:** 2026-06-02
**Status:** Approved design (brainstorming) — pending implementation plan
**Scope:** Cross-component (Nitro-V3 client + Nitro_Render_V3 renderer + Arcturus emulator + DB). CMS untouched.

## Goal

Extend the existing (already-React) friends list & instant messenger with four features:

1. **Friend groups** — full custom: create / rename / delete named groups and assign friends to them.
2. **Offline messages** — messages to an offline friend are stored and delivered on their next login, tagged "sent while offline".
3. **Read receipts** — 2-state, WhatsApp-style: `✓` sent, `✓✓` read.
4. **Typing indicator** — "X is typing…" inside a conversation thread.

**No rewrite.** We build on the existing React components, hooks, emulator messenger classes, and renderer protocol. We reuse existing structures wherever they exist and add packets only where unavoidable.

## Non-goals (explicitly out of scope this round)

- Read-receipt privacy toggle (receipts always on).
- "Last seen / online status" text and in-conversation message search.
- 3-state receipts (no separate "delivered" step).
- Per-message IDs (we use a last-read-timestamp model instead — see §Read receipts).
- Any CMS / Prisma change.
- Group chats, bots, and StaffChat are excluded from receipts and typing.

## Current state (verified)

- **Client (Nitro-V3):** friends + messenger are already React/TSX under `src/components/friends/**`, driven by `useFriends` / `useFriendsState` / `useFriendsActions` / `useMessenger`. `MessengerFriend.categoryId` and `MessengerSettings.categories` exist in the data model but there is **no group UI**. No receipts, no typing, no offline UI.
- **Renderer (Nitro_Render_V3):** `MessengerInitParser` exposes `categories: FriendCategoryData[]`; `FriendParser` carries `categoryId`. `NewConsoleMessageParser` exposes `senderId, messageText, secondsSinceSent, extraData`. **No** category-management composers, **no** receipt/typing/messageId for the messenger. Typing exists only for *room* chat.
- **Emulator (Arcturus):** `Messenger`, `MessengerBuddy`, `Message`, `MessengerCategory` exist. `MessengerInitComposer` sends categories; `FriendsComposer` serializes `categoryId`. **No** category create/rename/delete/assign handlers and **no DB setter** for category. Instant messages are fire-and-forget (delivered only if recipient online, else dropped). `messenger_offline` table exists but is **never read/written**. No receipts, no messenger typing.
- **Build integration:** `Nitro-V3/vite.config.mjs` aliases `@nitrots/nitro-renderer` directly to local `../Nitro_Render_V3/index.ts` **source**. New renderer code is picked up live by the client dev server — no separate renderer build/publish step required.

## Protocol strategy

- **Friend-category packets:** reuse the **official Habbo header IDs** for the revision the client connects with, where the official client shipped that op. If an op never existed officially, use a free custom ID. *(Planning task: confirm the connecting revision and pull the official IDs; fall back to custom per-op.)*
- **Read receipts & typing:** never existed in the official messenger → **custom** header IDs.
- **Offline messages:** **no new packets** — replayed through the existing `FriendChatMessageComposer`.
- Header IDs are a contract: every new packet needs a constant in Arcturus `Incoming.java`/`Outgoing.java` **and** an identical-ID parser/event or composer in the renderer. The spec's §"Packet table" is the single source of truth; keep both sides in lockstep.

## Data model (owned by Arcturus; Prisma/CMS untouched)

| Table | State | Change |
|---|---|---|
| `messenger_categories(id, user_id, name)` | exists, unwritten | Add create/rename/delete persistence. Cap **20 groups/user**, name ≤ 25 chars (column limit). |
| `messenger_friendships.category` | exists, no setter | Add setter + `UPDATE` to assign a friend to a group. Deleting a group resets members to `0`. |
| `messenger_offline(id, user_id, user_from_id, message, sended_on)` | exists, unused | `INSERT` on send-to-offline; `SELECT`+`DELETE` on recipient login. Cap per-user inbox (default **200**, configurable). |
| `messenger_read_state(reader_id, peer_id, last_read)` PK(reader_id, peer_id) | **new** | Drives read receipts via last-read timestamp per conversation. |

## Feature designs

### 1. Friend groups (CRUD + assign)

**Server (Arcturus):**
- New incoming handlers in `messages/incoming/friends/`, registered in `PacketManager.registerFriends()`:
  `AddFriendCategoryEvent(name)`, `RenameFriendCategoryEvent(id, name)`, `RemoveFriendCategoryEvent(id)`, `MoveFriendToCategoryEvent(friendId, categoryId)`.
- Persistence added to `Messenger` / `MessengerCategory`; add `MessengerBuddy.setCategoryId()` + DB `UPDATE`.
- Responses reuse existing composers: `MessengerInitComposer` (refreshed categories list) and `UpdateFriendComposer` (moved friend's new `categoryId`).
- Limits enforced server-side (≤20 groups, name length, dedupe). Delete → members → category `0`.

**Renderer (Nitro_Render_V3):** new outgoing composers `AddFriendCategoryComposer`, `RenameFriendCategoryComposer`, `RemoveFriendCategoryComposer`, `MoveFriendToCategoryComposer` with the official/fallback header IDs. (Categories arrive via existing `MessengerInitParser`; add a small `FriendCategoriesEvent` only if a standalone refresh is needed.)

**Client (Nitro-V3):**
- `useFriendsState` exposes `categories`; `useFriendsActions` adds `addCategory / renameCategory / removeCategory / moveFriendToCategory` wired to the composers.
- **Layout decision:** Online/Offline remains the **primary** view. A **chip-filter row** at the top of `FriendsListView` (one chip per group, like the navigator filter chips) filters the list to a single group. Groups *filter*, they do not restructure the Online/Offline sections.
- **Group management UI:** an "manage groups" affordance in `FriendsListView` (add / rename / delete) and a per-friend assignment control (dropdown / context action) in `FriendsListGroupItemView`.

### 2. Offline messages

**Server:** in `FriendPrivateMessageEvent`, if the recipient is offline → `INSERT` into `messenger_offline` (respect inbox cap; drop oldest when full). On recipient login, after the friend list is sent (`RequestInitFriendsEvent`), replay each stored row as `FriendChatMessageComposer(fromId, message, secondsSinceSent = now - sended_on, extraData = "offline")`, then `DELETE` the delivered rows.

**Renderer:** no change — `NewConsoleMessageParser` already exposes `extraData`.

**Client:** when `extraData === "offline"`, tag the message in the thread with a subtle "📨 inviato mentre eri offline" marker (`MessengerThreadChat.offlineDelivered = true`). Sender side: the message already shows `✓` (it left the client and was stored); it flips to `✓✓` when the recipient reads it after login (via the read-receipt catch-up batch, §3).

### 3. Read receipts (2-state ✓ / ✓✓)

**Model:** per-conversation **last-read timestamp** (no per-message IDs). `✓✓` applies to every own message in the thread with `date ≤ T`.

**Packets (custom):**
- Incoming `MarkConsoleRead(peerId)` — "I've read everything from `peerId` up to now."
- Outgoing `ConsoleReadReceipt(readerId, timestamp)` — "`readerId` has read up to `timestamp`."

**Server:** on `MarkConsoleRead` → upsert `read_state(me, peer, now)`; if peer online, send them `ConsoleReadReceipt(myId, now)`. On login, send a batch of `ConsoleReadReceipt` (one per conversation with a stored read_state) so an offline-sender catches up. 1:1 only.

**Client:**
- `MessengerThreadChat` gains `status: 'SENT' | 'READ'`.
- On send → `SENT` (`✓`). On thread focus/open → send `MarkConsoleRead(peerId)`.
- On `ConsoleReadReceipt(readerId, T)` → mark all own messages to `readerId` with `date ≤ T` as `READ` (`✓✓`).
- Render `✓` / `✓✓` on own messages in `FriendsMessengerThreadGroup`.

### 4. Typing indicator

**Packets (custom, ephemeral, never stored):**
- Incoming `ConsoleTyping(peerId, isTyping)`.
- Outgoing `FriendTyping(senderId, isTyping)`.

**Server:** relay to peer if online; light cooldown to prevent flooding. 1:1 only.

**Client:** debounce the message input → `ConsoleTyping(start)` while typing, `ConsoleTyping(stop)` on idle/blur/send. On `FriendTyping(isTyping)` show a "X sta scrivendo…" row in the thread with an auto-timeout fallback.

## Edge cases

- Group deleted → members fall back to uncategorized (`0`).
- Offline inbox full → drop oldest (configurable; alternative reject documented).
- Typing & receipts: 1:1 only — never StaffChat, group chat, or bots.
- Receipts always on (no privacy toggle this round).
- Renderer and emulator header IDs must stay in lockstep (this spec is the source of truth).
- Self-messages / messages to non-friends rejected as today.

## Testing

- **Renderer (Vitest, currently 138):** one test per new parser/composer — header init + field read/write order.
- **Client (Vitest, currently 214):** `useMessenger` status transitions (SENT→READ, offline tag), category actions/reducer, rendering of `✓✓` / typing row / offline marker.
- **Emulator:** manual two-session integration — offline send→login replay, receipt round-trip (online + offline catch-up), typing relay, group CRUD + assignment + delete-fallback. (Arcturus has limited unit-test infra.)

## Build sequencing (one spec, phased plan — each phase independently shippable)

1. **Friend groups** — most self-contained (CRUD + chip-filter UI + assignment).
2. **Offline messages** — server + DB, no new packets, small client marker.
3. **Read receipts** — packets across all three components + new table.
4. **Typing indicator** — packets, smallest.

## Open items for planning

- Confirm the client's connecting revision and source the official friend-category header IDs (custom fallback per-op).
- Decide the feature branch base in each repo (current branches contain unrelated work — do **not** build on top of those).
