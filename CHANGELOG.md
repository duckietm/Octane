# Changelog

## Octane Rebrand — nitro → octane naming (2026-09-05)

Project-wide rename of the inherited "nitro" naming to Octane, across both
the UI and the renderer.

### Renamed
- npm scope `@nitrots/*` → `@octane/*`; root renderer package is now
  `@octane/renderer`; the UI package is `octane-react`.
- All `Nitro*` classes, components, hooks, and types → `Octane*`
  (`NitroCardView` → `OctaneCardView`, `useNitroEvent` → `useOctaneEvent`,
  `NitroLogger` → `OctaneLogger`, …), including the matching file,
  directory, and CSS class names (`nitro-*` → `octane-*`; update custom
  themes accordingly — the bundled themes are already updated).
- Window globals `NitroConfig` / `NitroPlugins` / `NitroClientMode` /
  `NitroSecureApiUrl` → `Octane*`. Legacy aliases remain so existing
  external scripts and plugins keep working.
- Build env vars `NITRO_JSON_MODE` / `NITRO_SINGLE_BUNDLE` /
  `NITRO_RENDERER_DIR` → `OCTANE_*` (legacy names still accepted), and
  `.nitro-build.json` → `.octane-build.json` (legacy file still read).
- The `:nitro` chat command is now `:octane` (`:nitro` kept as an alias).

### Deliberately NOT renamed (compatibility)
- The `.nitro` asset bundle extension and all existing compiled assets.
- Wire contracts with the emulator: the `NITRO-x-y-z` ClientHello version
  string, the `/nitro-sec/*` secure asset endpoints, the `X-Nitro-*` HTTP
  headers, the `nitro-secure-assets-v1` key salt, and the
  `[NITRO_INFO_V1]` broadcast sentinel sent by the emulator's About
  command.
- Persisted browser keys (`nitro.*` in localStorage/sessionStorage) and
  `nitro.*` localization keys in UITexts configs.
- On-disk asset locations: the `Nitro-Files/` sibling folder and the
  `/nitro-assets` dev-server path.

## React 19 Modernization Phase 2 (2026-05-12)

Long-running work on the `feat/react19-modernization` branch — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design rationale.
Companion changes shipped on `feat/react19-event-bus` in
[`octane-renderer`](../octane-renderer) — see that repo's CLAUDE.md
for the renderer-side notes.

### Pattern #1: `useNitroEventState` + companions
- New `useNitroEventReducer` / `useMessageEventReducer` for the case
  where multiple event types collapse into one owned state slice.
- New `useExternalSnapshot` — typed wrapper of
  `useSyncExternalStore` pairing the renderer's
  `EventDispatcher.subscribe()` with `getXxxSnapshot()` getters.
- Pilot adoption: `useAvatarInfoWidget` now owns the figure / badges /
  group merge (three event listeners moved out of
  `InfoStandWidgetUserView`, three `CloneObject` calls dropped).
  Reducers extracted to `src/hooks/rooms/widgets/avatarInfo.reducers.ts`
  with 14 Vitest cases.
- `useInventoryFurni` refactored to call three pure reducers
  (`useInventoryFurni.reducers.ts`) instead of inlining ~250 LOC of
  merge logic in the event handlers. Module-level
  `furniMsgFragments` becomes a `useRef` — eliminates a latent bug
  where two simultaneous client instances would have trampled each
  other's fragment buffers. Empty `FurniturePostItPlacedEvent` listener
  dropped.

### Pattern #2: `useNitroQuery` adoption
- New `useNitroEventInvalidator(eventType, queryKey, accept?)` companion
  in `src/api/nitro-query/` — invalidates a query slot every time the
  renderer pushes the matching parser event. Required when the server
  refreshes data outside the request cycle (e.g. ClubGiftInfoEvent
  after a gift claim).
- Seven catalog fetches lifted out of `useCatalog` into dedicated
  TanStack queries:
    - `useGiftConfiguration` (GiftWrappingConfigurationEvent)
    - `useUserGroups` — consolidates 5 sites that each dispatched
      `CatalogGroupsComposer` independently
    - `useClubOffers(windowId)` — per-windowId, with `accept` filter
    - `useSellablePetPalette(breed)` — per-breed, with `accept` filter
    - `useMarketplaceConfiguration` — lifted out of a self-fetch in
      `MarketplacePostOfferView`
    - `useClubGifts` — paired with `useNitroEventInvalidator` for the
      server-push-after-SelectClubGift case
- `ICatalogOptions` (the "catalogOptions" bag that the various views
  stuffed their fetched data into) is now **empty and deleted**.

### Pattern #4: god-hook splits
Five new splits in this round, two patterns. The doorbell-style
(state + actions + shim, no shared singleton) for hooks whose actions
are pure-dispatch:

- **chat-input** (334 LOC → 3 files) — `useChatInputState` owns the
  5 state slices + 3 event listeners + 3 lifecycle effects;
  `useChatInputActions` owns `sendChat` with the full slash-command
  repertoire and the outgoing-translation pipeline. Single consumer
  (`ChatInputView`) keeps the original tuple via the shim.

The `useBetween` singleton-filter style for hooks where actions
mutate shared state:

- **wired-tools** (618 LOC) — 20 consumers; `useWiredToolsStore`
  internal singleton, public `useWiredToolsState` /
  `useWiredToolsActions` filter views, `useWiredTools` shim.
- **translation** (600 LOC) — 6 consumers; `useTranslationStore`
  inline + filter views.
- **notification** (493 LOC) — ~44 consumers, most of which use a
  single action (`simpleAlert` or `showConfirm`); the read-only state
  slice exposes the three queue arrays for the renderer view layer.
- **friends** (258 LOC) — 16 consumers; state slice covers the friend
  list / settings / derived online-offline split, actions slice covers
  `requestFriend` / `requestResponse` / `followFriend` /
  `updateRelationship`.

Documented skip-motivated splits: `useChatWidget`,
`useChatCommandSelector`, `useFurniturePresentWidget`,
`useAvatarInfoWidget`, `useNavigator`, `useMessenger`,
`usePetPackageWidget`, `useWordQuizWidget`. Reasons logged in commit
messages.

### Typecheck / Pixi v8 / Arcturus alignment
- Repository-wide `tsgo` (TS 7 preview) error count: **134 → 0** client,
  **24 → 0** renderer. Notable clusters: framer-motion `Variants`
  typing on Toolbar + FriendsBar (-33), `useFurniChooserState`
  retyped as `IRoomObject` + dead `getUserData` guard dropped (-10),
  React 19 `useRef<T>()` → `useRef<T>(null)` sweep on 15 sites (-15),
  `IGetImageListener` single-arg signature migration on 3 sites,
  `ColorVariantType` extended with the 5 `outline-*` bootstrap
  variants.
- Renderer-side aligned with Pixi v8 (Filter[] narrowing,
  WebGLRenderer narrowing, ImageLike cast) and TS 5.7+ ArrayBuffer
  drift (BinaryReader / BinaryWriter / WsSessionCrypto / NitroBundle).
- Cross-repo additions on `Nitro_Render_V3`:
  `RoomEnterComposer` now accepts optional `spawnX`/`spawnY` matching
  Arcturus' `RequestRoomLoadEvent` optional tail; `RoomSettingsData`
  surfaces the `allowUnderpass` field that Arcturus already emits.
  Dead `sendWhisperGroupMessage` / `ChatWhisperGroupComposer`
  reference removed.

### Vitest coverage
Bumped from 65 → 113 cases across 8 test files. New coverage:
- `dedupeBadges.test.ts` (6) — slot-preserving badge dedup.
- `catalog-favorites.helpers.test.ts` (16) — v2→v3 localStorage
  migration + per-catalog-type storage-key routing.
- `avatar-info-reducers.test.ts` (14) — three reducer bail-out
  branches + apply paths.
- `friendly-time.test.ts` (12) — `FriendlyTime` with a deterministic
  `LocalizeText` mock.

### Logic bug fixes (in scope)
- `useInventoryFurni`'s module-level `furniMsgFragments` buffer
  scoped to `useRef`.
- `RoomChatHandler.dispatchEvent(RoomSessionChatEvent)` arg order
  fix in renderer — `chatColours` and `links` slots were swapped.
- `PetBreedingMessageParser.bytesAvailable < 12` was a boolean-vs-number
  bug; replaced with the standard guard pattern.
- `useOnClickChat` was passing an extra 8th arg to `showConfirm`
  (signature only takes 7).
- `UserContainerView` was passing `userProfile.friendsCount` (number)
  to a `LocalizeText` placeholder array (expects string).

## Badge System Rework (2026-04-04)

### Bug Fixes
- **Slot 0 drag bug**: Dragging from slot 0 no longer causes badges to disappear. The root cause was `'0'` being falsy in JavaScript, which made the drop handler take the wrong code path and overwrite the target badge.
- **Badge duplication**: Fixed badges appearing in multiple slots when dragging in the InfoStand. The issue was a stale props fallback — after a drag operation, the hook updated correctly but the component fell back to old server props for empty slots, showing ghost copies.
- **Race condition**: Replaced single boolean `localChangeRef` with a counter (`pendingUpdatesRef`) to correctly handle rapid sequential drag operations without the server overwriting local state.
- **Badge deduplication**: `toFixedSlots()` now deduplicates badges, preventing the same badge from appearing in multiple slots even if the server returns duplicates.
- **Server badge dedup in InfoStand**: `RoomSessionUserBadgesEvent` handler now deduplicates badges from the server before updating the avatar info.

### Drag & Drop Visual Feedback
- **Custom drag preview**: Badge image is used as the drag ghost instead of the browser default (via `setDragImage`).
- **Source opacity**: The dragged item becomes semi-transparent (`opacity-40`) during drag.
- **Pulsing glow on drop targets**: Valid drop targets pulse with a blue glow animation (`animate-pulse-glow`).
- **Drop settle animation**: A brief scale-down animation (`animate-drop-settle`, 300ms) plays when a badge lands in a slot.
- **Remove indicator**: Dragging an active badge over the inventory area shows a red pulsing background with a trash icon overlay.
- **Grab cursor**: All draggable badge elements now show `cursor-grab` / `cursor-grabbing`.

### Sparse Slot Support
- `activeBadgeCodes` changed from compact `string[]` to fixed-size `(string | null)[]` array. Empty slots are `null` instead of being collapsed, allowing gaps between badges.
- All operations (`setBadgeAtSlot`, `removeBadge`, `reorderBadges`, `swapBadges`, `toggleBadge`) work on the fixed-size array without compaction.

### New Badge Glow (Feature)
- Unseen (newly received) badges in the inventory now pulse with a **gold glow** (`animate-pulse-glow-gold`) instead of the previous flat green background.
- The glow disappears when the badge is selected (unseen status cleared).

### Badge Received Toast Notification (Feature)
- When a new badge is received, a bubble notification appears with:
  - Badge image and localized name
  - **"Indossa" / "Wear"** button that directly equips the badge via `toggleBadge` and closes the notification
  - **"Non ora" / "Later"** link to dismiss
- Auto-fades after 8 seconds (standard bubble behavior).
- Uses the existing `NotificationBubbleType.BADGE_RECEIVED` (was defined but unused).
- New component: `NotificationBadgeReceivedBubbleView`.

### Dynamic Badge Slot Count
- Badge slot count is now fully driven by `user.badges.max.slots` config (default: 5).
  - **5 slots**: 5 badge slots + group badge in InfoStand (6 boxes total)
  - **6 slots**: 6 badge slots, group badge is replaced by the 6th slot
- Both the inventory grid and InfoStand layout adapt automatically.
- Removed all hardcoded `maxSlots = 5` references.

### InfoStand Double-Click to Remove
- Double-clicking a badge in the InfoStand removes it from active badges (own user only).

### Localization
- Added `notification.badge.received` key:
  - IT: "Nuovo Distintivo!"
  - EN: "New Badge!"
- Located in `public/nitro-assets/config/UITexts.json` and `UITexts_en.json`.

### Files Modified
| File | Changes |
|------|---------|
| `src/hooks/inventory/useInventoryBadges.ts` | Sparse slots, dedup, race condition fix, toFixedSlots |
| `src/hooks/notification/useNotification.ts` | BadgeReceivedEvent listener |
| `src/components/inventory/views/badge/InventoryBadgeView.tsx` | Visual feedback, dynamic maxSlots, fix '0' falsy |
| `src/components/inventory/views/badge/InventoryBadgeItemView.tsx` | Drag preview, opacity, cursor |
| `src/components/room/widgets/avatar-info/infostand/InfoStandBadgeSlotView.tsx` | Visual feedback, double-click remove, no stale props |
| `src/components/room/widgets/avatar-info/infostand/InfoStandWidgetUserView.tsx` | Dynamic layout, server badge dedup |
| `src/components/notification-center/views/bubble-layouts/GetBubbleLayout.tsx` | BADGE_RECEIVED routing |
| `src/components/notification-center/views/bubble-layouts/NotificationBadgeReceivedBubbleView.tsx` | New component |
| `src/layout/InfiniteGrid.tsx` | Gold glow for unseen items |
| `tailwind.config.js` | Custom keyframes and animations |

### Configuration
```json
{
  "user.badges.max.slots": 5
}
```
Set to `6` to replace the group badge slot with a 6th badge slot.
