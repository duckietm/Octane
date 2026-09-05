# Architecture & Refactor Plan

> Status: **living document**, last updated 2026-05-10.
> This file describes the structural direction the codebase is moving in.
> Read it before starting a non-trivial refactor — half the value comes from
> staying consistent, not from each individual change.

## Table of contents

1. [Where the project stands today](#where-the-project-stands-today)
2. [Five structural improvements](#five-structural-improvements)
   1. [Event subscriptions as derived state](#1-event-subscriptions-as-derived-state)
   2. [Server requests as queries](#2-server-requests-as-queries)
   3. [Feature folders](#3-feature-folders)
   4. [Splitting god-hooks](#4-splitting-god-hooks)
   5. [Unified UI store](#5-unified-ui-store)
3. [Bonus: error boundaries](#bonus-error-boundaries)
4. [What's already in place](#whats-already-in-place)
5. [How to pick the next refactor PR](#how-to-pick-the-next-refactor-pr)

---

## Where the project stands today

The codebase is a React 19.2 client for the Octane renderer (Habbo-style hotel
client). Most of the architectural pressure comes from the renderer's
**event-bus + composer/parser** model: the UI talks to the server by sending
composers and listening to incoming message events. Almost every piece of
state in this app is "the latest value seen on a given event".

That model creates two kinds of friction with modern React:

1. **`useEffect` everywhere** — `react-hooks/set-state-in-effect` reports
   ~328 violations across ~280 files. Most are legitimate event-driven
   updates, but the pattern hides the intent (it reads as "imperative
   setState on mount/effect" rather than "subscribe to a stream").
2. **God-hooks** — `useCatalog` (~1100 lines), `useChat`, `useWiredTools`,
   `useInventoryFurni` all bundle data fetching, UI state, side effects,
   and computed values into a single export. Components import the whole
   thing for one field; the React Compiler skips memoization.

Two big files (`WiredCreatorToolsView.tsx` 4493→3901 lines,
`LoginView.tsx` 1700) further compound the problem: the Compiler logs
"Compilation Skipped: Existing memoization could not be preserved", which
means manual `useMemo`/`useCallback` are not even helping.

The improvements below are ordered so that each one makes the next one
easier.

---

## Five structural improvements

### 1. Event subscriptions as derived state

**Problem.** Pattern repeated hundreds of times:
```ts
const [foo, setFoo] = useState(initial);
useOctaneEvent(SomeEvent, e => setFoo(e.payload));
```
or with the message channel:
```ts
const [data, setData] = useState(null);
useMessageEvent(SomeParser, e => {
    const parser = e.getParser();
    if (!parser) return;
    setData(parser.field);
});
```

The shape of the code obscures the intent ("`foo` IS the latest event payload")
and makes the lint think we're doing imperative setState in an effect.

**Solution.** Two thin hooks (`src/hooks/events/useOctaneEventState.ts`
and `useMessageEventState.ts`):
```ts
const foo = useOctaneEventState(SomeEvent, e => e.payload, initial);
const data = useMessageEventState(SomeParser, e => e.getParser()?.field ?? null, null);
```

Internally the selector closure is held in a ref refreshed in commit phase
(`useLayoutEffect`), so a new selector identity per render does not force
re-subscription. The listener is registered once.

**Status.** Implemented + adopted in `OfferView.tsx`, `useAvatarInfoWidget`
(figure/badges/group merge), and `useInventoryFurni` (extracted pure
reducers consumed by `useMessageEvent` setters).

**Adoption.** Organic: when a contributor sees a clean
"derive-from-single-event" case, they convert it. **Do not sweep-replace.**
The majority of existing subscriptions have side effects, multi-state
updates, conditional filters, or state-machine semantics that lose
information when forced into a single selector.

**Companions** (all implemented in `src/hooks/events/`):
- `useOctaneEventReducer<S, T>(types, reducer, initial)` — multiple event
  types collapsing into one owned state slice (analogous to
  `useReducer` but driven by renderer events).
- `useMessageEventReducer<S, T>(eventTypes, reducer, initial)` — same
  shape on the server message channel; accepts a single type or an
  array of types that all feed the same reducer.
- `useExternalSnapshot<T>(subscribe, getSnapshot)` —
  `useSyncExternalStore` wrapper pairing the renderer's
  `EventDispatcher.subscribe()` with the `getXxxSnapshot()` getters
  added in renderer 2.1.0. Use this for readonly views over manager
  state. Eight pre-built consumers live in
  `src/hooks/session/useSessionSnapshots.ts` (userData / activeRoomSession
  / ignoredUsers / groupBadges / soundVolumes / roomUserList + scalar
  derivations `useIsUserIgnored`, `useGroupBadge`), each with defensive
  `typeof` guards against a stale renderer bundle.

  Shared state sources run through `useSharedHook`, which mounts the
  source in a normal React host and publishes its snapshot through a
  Zustand vanilla store. This removes the old dispatcher limitation:
  sources may safely use `useSyncExternalStore`. Every shared source is
  registered at module scope with `registerSharedHook` so normal feature
  activation does not replace the application with a Suspense fallback.
  Regression guards live in `src/hooks/session/useSessionSnapshots.test.tsx`
  and `src/state/useSharedHook.test.tsx`. CI gate:
  `yarn lint:hooks` (`eslint.hooks.config.mjs` →
  `react-hooks/rules-of-hooks: error`) wired into
  `.github/workflows/ci.yml`.

For state owned outside the listener (the `useState` + `setState(prev =>
applyX(prev, event))` pattern), keep using `useOctaneEvent` /
`useMessageEvent` and extract the reducer as a pure function for
testability. See `src/hooks/inventory/useInventoryFurni.reducers.ts` and
`src/hooks/rooms/widgets/avatarInfo.reducers.ts` for the convention.

---

### 2. Server requests as queries

**Problem.** A request/response pair against the server today looks like:
```ts
useEffect(() => {
    SendMessageComposer(new GetXComposer());
}, []);

useMessageEvent(YParser, e => {
    setData(e.getParser().data);
});
```

There is no caching, no deduplication, no retry, no loading or error state,
no devtools. Every consumer rolls its own. The same request fires
multiple times if multiple components mount it.

**Solution.** Wrap composer/parser pairs in a TanStack Query adapter
(`@tanstack/react-query` is in the same family as `@tanstack/react-virtual`
which is already a dependency):
```ts
const { data, isLoading } = useOctaneQuery({
    request: () => new GetXComposer(),
    parser: YParser,
    select: e => e.getParser().data,
});
```

**Status.** Adapter prototype written (`src/api/octane-query/createOctaneQuery.ts`).
Not wired up because `@tanstack/react-query` is **not yet installed** —
deliberately left as a `yarn add` step the team can approve.

**To enable.**
```sh
yarn add @tanstack/react-query @tanstack/react-query-devtools
```
Then mount the provider in `src/index.tsx`:
```tsx
<QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

**Migration order suggested.**
1. Read-only catalog data (`useCatalog` page fetches) — biggest win, lowest
   risk because it's mostly read.
2. Inventory tabs.
3. Navigator search results.
4. Marketplace listings.

Push messages (events the server emits without the client asking) keep
using `useMessageEventState` — they're not requests.

---

### 3. Feature folders ~~(adopted)~~ — **rejected, keep the current layout**

> **Update:** an earlier version of this document proposed a
> `src/features/<feature>/` layout (vertical slices). The pilot on the
> doorbell widget showed that the existing `src/components/<area>/` +
> `src/hooks/<area>/` split is the convention the team wants to keep.
> The pilot has been rolled back; this section is left as a record of
> the decision.

**Current convention** (the one to follow):

- **Views** live under `src/components/<area>/<feature>/*.tsx`
  (e.g. `src/components/room/widgets/doorbell/DoorbellWidgetView.tsx`).
- **Hooks** live under `src/hooks/<area>/<feature?>/*.ts`
  (e.g. `src/hooks/rooms/widgets/useDoorbellState.ts`). Multiple hooks
  for the same widget go in the same folder as siblings, not in a
  per-widget subfolder.
- **Pure helpers / constants / types** that are specific to one view
  go in sibling files next to the view (see
  `src/components/wired-tools/WiredCreatorTools.{types,constants,helpers}.ts`
  for the established pattern).
- **Cross-cutting** utilities continue to live under `src/api/` and
  `src/common/`.

Discoverability is acceptable as long as the **naming** is consistent —
`useDoorbellState` / `useDoorbellActions` / `DoorbellWidgetView` are
greppable in seconds even though they live in three separate directory
trees.

---

### 4. Splitting god-hooks

**Problem.** `useCatalog.ts` is ~1100 lines. It owns:
- Server fetch lifecycle (request/parser pairs)
- UI state (selected page, current product, filters)
- Side effects (purchases, gift composer dispatch)
- Computed values (pricing display, page tree)
- Cross-cutting helpers (currency lookup, club level checks)

Every component that imports `useCatalog()` for one field re-runs the
whole thing. The Compiler can't memoize it (too large). Tests can't be
written against a single concern.

**Solution.** Split by responsibility, not by entity:
```ts
useCatalogData()      // server data, returns { pages, currentPage, isLoading }
useCatalogUiState()   // ui state, returns { selectedNode, setSelectedNode, filters, ... }
useCatalogActions()   // imperative actions, returns { purchase, gift, openOffer }
```

Inside, `useCatalogData` uses `useOctaneQuery` (#2). `useCatalogUiState` uses
a Zustand slice (#5). `useCatalogActions` is a stateless export — just
functions that compose composers.

**Status.** Pilot done on `useDoorbellWidget`:
- `src/hooks/rooms/widgets/useDoorbellState.ts` — the users list,
  derived from three events using a `useOctaneEventReducer`-like pattern.
- `src/hooks/rooms/widgets/useDoorbellActions.ts` — `answer(name, flag)`.
- `src/hooks/rooms/widgets/useDoorbellWidget.ts` kept as a deprecated
  shim that composes the two so existing consumers don't break.

It's a small hook so the split looks almost theatrical, but the shape is
the same one we want to apply to `useCatalog`.

**Migration order suggested.** Largest pain first, moving down:
1. `useCatalog` (~1100 LOC) — but only after #2 is enabled (server fetches
   collapse to a few `useOctaneQuery` calls, removing 60% of the file).
2. `useChatInputWidget` (~500 LOC)
3. `useWiredTools` (~600 LOC)
4. `useInventoryFurni` (~300 LOC)

---

### 5. Unified UI store

**Problem.** Cross-feature UI state lives in:
- React Context (e.g. `UiSettingsContext`)
- Custom hooks with module-level singletons (`useNavigator`'s implicit cache)
- `let foo = ...` module-level mutable variables — flagged by the React
  Compiler as "Writing to a variable defined outside a component or hook is
  not allowed" (currently 5+ violations)
- `localStorage` reads in effects

There is no single source of truth, no devtools, no time-travel.

**Solution.** Adopt **Zustand** for cross-feature UI state. Each feature
owns one slice:
```ts
// src/state/wired-tools.ts (or src/components/wired-tools/wiredToolsStore.ts)
export const useWiredToolsStore = create<WiredToolsState>()((set) => ({
    activeTab: 'monitor',
    setActiveTab: (tab) => set({ activeTab: tab }),
    // ...
}));
```

Components subscribe to **specific keys** (Zustand re-renders only the
subscribers whose selected slice changed):
```ts
const activeTab = useWiredToolsStore(s => s.activeTab);
```

This eliminates the `let isCreatingRoom = false` module-level pattern and
makes the state ispezionable in dev tools.

**Status.** Skeleton written (`src/state/createOctaneStore.ts`), not yet
adopted — `zustand` is not yet installed. Same reason as #2: deliberately
a follow-up `yarn add` step.

**To enable.**
```sh
yarn add zustand
```
Then convert the smallest singleton first (suggestion: the
`isCreatingRoom`/`createRoomTimeout` pair in
`NavigatorRoomCreatorView.tsx` — it's a clean 5-line conversion).

**Do not** wholesale-replace Context. Some Contexts (theming, i18n) are
fine as-is. Zustand is for *application* state, not *configuration* state.

---

## Bonus: error boundaries

`react-error-boundary` is already a dependency. A widget crashing in a
room (e.g. malformed pet data in `InfoStandWidgetFurniView`) currently
takes down the whole UI.

**Solution.** Wrap each widget root in `<ErrorBoundary fallback={null} onError={OctaneLogger.error}>`.
Implementation lives at `src/common/error-boundary/WidgetErrorBoundary.tsx`.

**Status.** Implemented + applied to `RoomWidgetsView` as the umbrella for
all in-room widgets, **plus** a per-widget pass that wraps each of the 13
direct children of `RoomWidgetsView` and each of the 20 sub-widgets in
`FurnitureWidgetsView`. A crash in any single widget now silently logs
through `OctaneLogger` and renders `null` for that widget only — its
siblings keep rendering. Each boundary carries a `name` prop matching
the widget so the log line identifies the culprit.

---

## What's already in place

The current branch (**`feat/react19-modernization`**, PR #2) has applied:

### Toolchain
- React 19.2 / `react-dom` 19.2 / `@types/react` 19.2.
- TS 6 for build + **TS 7 native preview** (`tsgo`) for `yarn typecheck`.
- ESLint 10 + `typescript-eslint` 8 + `eslint-plugin-react-hooks@7` +
  `eslint-plugin-react-compiler`.
- Vite 8 + React Compiler 1.0 (`babel-plugin-react-compiler`).
- `<StrictMode>` mounted; `App.tsx` made idempotent for the double-mount.

### React 19 idioms
- **`forwardRef` → `ref` prop** on 7 layout/component files (11 call sites).
- **`<Ctx.Provider>` → `<Ctx>`** on 6 contexts.
- **Native `<script>`** in `TurnstileWidget`, `ExternalPluginLoader`,
  `GoogleAdsView`.
- **Form Actions** (`useActionState` + `useFormStatus`) for the inline
  Login/Register/Forgot dialogs in `LoginView.tsx`. Legacy non-Action
  versions in `components/login/components/` removed as dead code.
- **`useEffectEvent`** in `App.tsx`, `FurniEditorSearchView`,
  `NotificationBadgeReceivedBubbleView`,
  `NavigatorRoomSettingsRightsTabView`, `UiSettingsContext`,
  `TurnstileWidget` — clears all remaining `exhaustive-deps` warnings.
- Targeted `set-state-in-effect` fixes: `CatalogHeaderView` (pure derive),
  `NavigatorRoomCreatorView` (lazy state init), `LoginView`
  (track-previous-prop reset), `ChooserWidgetView` (callback in
  `useEffectEvent`).

### Patterns + adoption (proposals #1, #2, #4, #5)
- **`useOctaneEventState` / `useMessageEventState` + companions** (proposal #1)
  — adapters in `src/hooks/events/`. Selectors are held in a
  `useLayoutEffect`-refreshed ref (Dan Abramov's use-event-callback
  pattern) so the listener stays mounted across renders.
  Companions for the multi-event → single state-slice case:
  `useOctaneEventReducer`, `useMessageEventReducer`, plus
  `useExternalSnapshot` (a typed wrapper of `useSyncExternalStore` for the
  renderer's `EventDispatcher.subscribe()` + `getXxxSnapshot()` getters
  added in `Octane_Render_V3` 2.1.0).
  Pilots: `OfferView` (single-event), `useAvatarInfoWidget` (3 listeners
  for figure/badges/group merged via pure reducers — moved out of
  `InfoStandWidgetUserView`, killing 3 `CloneObject` calls), and
  `useInventoryFurni` (4 message listeners + fragment buffer refactored
  to pure reducers; the module-level `furniMsgFragments` is now a
  `useRef` and the dead `FurniturePostItPlacedEvent` handler dropped).
- **`useOctaneQuery`** (proposal #2) — **enabled**. `@tanstack/react-query` +
  devtools installed; `QueryClientProvider` mounted in `src/index.tsx`.
  Adapter at `src/api/octane-query/createOctaneQuery.ts` with `select`,
  `accept` (correlation-key filter), `timeoutMs`, `staleTime`, plus a
  lower-level `awaitOctaneResponse()` for imperative use. Companion at
  `src/api/octane-query/useOctaneEventInvalidator.ts` invalidates a slot
  whenever the server pushes the matching event unprompted — required
  for queries whose data the server refreshes outside the request cycle
  (e.g. ClubGiftInfoEvent after a gift claim). Pilots / sites:
    - `OfferView` (targeted offer)
    - `CatalogLayoutRoomAdsView` (room-ad list)
    - `ModToolsChatlogView` / `CfhChatlogView` (correlated by roomId / ticketId)
    - `useGiftConfiguration` — replaces the GiftWrappingConfigurationEvent
      listener + eager composer dispatch that lived in `useCatalog`
    - `useUserGroups` — consolidates 5 sites that each fired
      CatalogGroupsComposer independently (2 wired views + 2 catalog
      group widgets + useCatalog itself); now one query, dedup'd
    - `useClubOffers(windowId)` — per-windowId query for the VIP / Builders
      Club purchase pages, with accept() correlation filter
    - `useSellablePetPalette(breed)` — per-breed pet palette, accept()
      filter on parser.productCode
    - `useMarketplaceConfiguration` — lifts a self-fetch out of
      MarketplacePostOfferView
    - `useClubGifts` — paired with `useOctaneEventInvalidator` for the
      server-push-after-SelectClubGift case
- **`ICatalogOptions` deleted** — useCatalog used to expose a
  `catalogOptions` bag where multiple components stuffed unrelated
  fetched data (groups, clubOffers, clubOffersByWindowId, petPalettes,
  marketplaceConfiguration, clubGifts, giftConfiguration). Every field
  is now its own TanStack query at the consumer site; the bag and the
  interface are gone.
- **Layout / feature folders** (proposal #3) — **rejected**. The existing
  `src/components/<area>/<feature>/` (views) +
  `src/hooks/<area>/<feature?>/` (flat hook files) is the layout that
  stays. See section 3 above for the full rule.
- **God-hook split** (proposal #4) — applied to:
    - **doorbell**: `useDoorbellState` + `useDoorbellActions` + shim.
    - **poll**: `usePollSubscriptions` (mounted once in `RoomWidgetsView`)
      + `usePollActions` + shim. `useWordQuizWidget` was migrated to
      import `usePollActions` directly so it doesn't pull subscriptions.
    - **furni chooser**: `useFurniChooserState` + `useFurniChooserActions`
      + shim. Helper `buildWallItem`/`buildFloorItem` dedupes ~50 lines
      of inline `RoomObjectItem` construction (typed via `IRoomObject`;
      the dead `sessionDataManager.getUserData` fallback dropped — the
      method never existed).
    - **user chooser**: `useUserChooserState` + `useUserChooserActions`
      + shim. Helper `buildUserItem`. Adds `?.` guards on
      `roomSession?.userDataManager?` to avoid the room-transition NPE
      pattern.
    - **friend request**: `useFriendRequestState` (3 useState + 2 event
      bridges + 1 derive effect) + `useFriendRequestActions` (thin
      adapter on the friends store) + shim. Exports `ActiveFriendRequest`
      type.
    - **chat input**: `useChatInputState` (5 state slices + 3 event
      listeners + 3 lifecycle effects: flood countdown, idle auto-clear,
      typing-indicator sync) + `useChatInputActions` (`sendChat` with
      the full slash-command repertoire and the outgoing-translation
      pipeline) + shim. Single consumer (`ChatInputView`) keeps the
      original tuple.
    - **wired tools**: `useWiredToolsStore` (internal singleton — state,
      listeners, effects, 13 actions in one closure) + `useWiredToolsState`
      / `useWiredToolsActions` (read-only and imperative `useSharedHook`
      filters over the same singleton) + `useWiredTools` shim. Used by
      ~20 consumers; the singleton sharing keeps a single source of
      truth while letting consumers import only the slice they touch.
    - **translation**: `useTranslationStore` (internal singleton) +
      `useTranslationState` / `useTranslationActions` (filtered
      `useSharedHook` views) + `useTranslation` shim. Same pattern as
      Wired tools — six consumers split across read-only views
      (settings panel, bootstrap) and dispatch sites (messenger, chat
      input).
    - **notification**: `useNotificationStore` (internal singleton) +
      `useNotificationState` (queue arrays for the renderer view) +
      `useNotificationActions` (8 entry points: simpleAlert,
      showOctaneAlert, showTradeAlert, showConfirm, showSingleBubble,
      closeAlert, closeBubbleAlert, closeConfirm) + shim. The ~30
      message-event listeners and 5 state slices stay in the singleton.
      Used by ~44 consumers, most of which only need one action.
    - **friends**: `useFriendsStore` (internal singleton) +
      `useFriendsState` (friends arrays, settings, derived
      online/offline split, lookup helpers) + `useFriendsActions`
      (requestFriend, requestResponse, followFriend, updateRelationship)
      + shim. 16 consumers.
- **Zustand** (proposal #5) — **enabled**. `zustand` installed; factory at
  `src/state/createOctaneStore.ts`. First adoption: the `let isCreatingRoom`
  / `createRoomTimeout` module-level pair in `NavigatorRoomCreatorView`
  replaced by `useRoomCreatorStore` (timer lives in the store closure,
  survives StrictMode double-mount).

### `WiredCreatorToolsView` decomposition
- Top-level constants/types/helpers extracted to sibling files
  (`WiredCreatorTools.{types,constants,helpers}.ts`).
- All four tab JSX bodies extracted into sibling components:
    - `WiredMonitorTabView`
    - `WiredInspectionTabView`
    - `WiredVariablesTabView`
    - `WiredToolsSettingsTabView` (already separate from before this PR)
- The three Monitor-tab overlay popups guarded by `{ false && ... }`
  were dead duplicates of the live overlays mounted at the root level —
  dropped.
- Main view: **4493 → 3544 lines** (−21%).

### `useCatalog` decomposition (in progress)

The 1100-line god-hook owns the catalog page tree, current page,
offer selection, and a long tail of secondary fetches. Decomposition
strategy from ARCHITECTURE.md proposal #4 step 1: lift the
session-stable read-only fetches to TanStack queries first, then
split the remaining state ownership into `useCatalogData` /
`useCatalogUiState` / `useCatalogActions`.

Status after this round of work:

| Fetch | Migrated to |
|---|---|
| GiftWrappingConfiguration | `useGiftConfiguration()` |
| GuildMemberships | `useUserGroups()` |
| HabboClubOffers (per windowId) | `useClubOffers(windowId)` |
| SellablePetPalettes (per breed) | `useSellablePetPalette(breed)` |
| MarketplaceConfiguration | `useMarketplaceConfiguration()` |
| ClubGiftInfo | `useClubGifts()` (with `useOctaneEventInvalidator`) |
| CatalogPagesList / CatalogPage | **deferred** — core state slice (rootNode / offersToNodes / currentPage), needs its own split-out store |
| BuildersClubFurniCount / SubscriptionStatus | **deferred** — read by the internal `getBuilderFurniPlaceableStatus` logic, moves with the data/actions split |

**Helper extraction + filter split both landed.** The 1100-line hook
now has its dependency-free logic in
`src/hooks/catalog/useCatalog.helpers.ts` and exposes three public
filters built on top of the same Zustand-backed shared source:

- `useCatalogData()` — server-driven read-only slice (`rootNode`,
  `offersToNodes`, `currentPage`, `currentOffer`, `frontPageItems`,
  `searchResult`, `roomPreviewer`, `isBusy`,
  `catalogLocalizationVersion`, Builders Club counters + timers).
- `useCatalogUiState()` — UI ephemeral state + writers
  (`isVisible`, `pageId`, `previousPageId`, `currentType`,
  `activeNodes`, `navigationHidden`, `purchaseOptions`,
  `catalogPlaceMultipleObjects`, plus all the `set*` writers,
  including the ones that mutate the data slice on page / offer /
  search-result selection).
- `useCatalogActions()` — imperative operations
  (`openCatalogByType`, `toggleCatalogByType`, `activateNode`,
  `openPageBy{Id,Name,OfferId}`, `requestOfferToMover`,
  `selectCatalogOffer`, `getNodeBy{Id,Name}`,
  `getBuilderFurniPlaceableStatus`).

The internal store is named `useCatalogStore` and is **not exported**;
the three public entry points (`useCatalogData` / `useCatalogUiState`
/ `useCatalogActions`) all funnel into the same `useSharedHook`
store, so listeners + state register once. All 48 historical
consumers have been migrated to the targeted filters; the deprecated
`useCatalog` shim has been removed.

Pure helpers in `useCatalog.helpers.ts`:

- `normalizeCatalogType(type?)` — coerce the optional catalog type
  back to `NORMAL` / `BUILDER`.
- `getOfferProductKeys(offer)` — canonical lookup keys for the
  resolved-offer cache.
- `findNodeById` / `findNodeByName` — DFS over the catalog tree,
  root excluded.
- `getNodesByOfferIdFromMap(offerId, map, onlyVisible)` — used to be
  the closed-over `getNodesByOfferId`; the `onlyVisible` fallback to
  the full bucket is preserved.
- `buildCatalogNodeTree(NodeData)` — pulled out of the
  `CatalogPagesListEvent` reducer; returns the tree + the offerId
  index map in one pass.
- `resolveBuilderFurniPlaceableStatus(input)` — the placement
  decision tree as a pure function; the hook keeps the `GetRoomEngine`
  / `GetSessionDataManager` reads (to count non-self, non-moderator
  visitors) and passes the resulting `visitorCount` into the helper.

`useCatalog.ts` now imports these instead of defining them inline
(net **−75 LOC**). Co-located test file `src/hooks/catalog/useCatalog.helpers.test.ts` covers
all six helpers with 34 cases (tree depth + offerId mapping,
node lookups including root exclusion, the limit-reached / guild-admin
fallback / visitors-in-room paths of the placement helper, and the
empty-map / partial-bucket branches of the offer lookup).

### Tests
- Vitest 3 + jsdom + `@testing-library/react` + `@testing-library/jest-dom`
  configured. Separate `vitest.config.mts` so the runner doesn't drag in
  the renderer SDK aliases from `vite.config.mjs`.
- **178 cases passing** across 13 test files, **co-located under `src/`** next to each subject (no separate `tests/` tree). Pure-module suites:
    - `WiredCreatorTools.helpers.test.ts` (18) — formatters + snapshot
      factory.
    - `navigatorRoomCreatorStore.test.ts` (4) — Zustand store invariants
      with fake timers.
    - `api-utils.test.ts` (27) — `ConvertSeconds`, `LocalizeShortNumber`,
      `CloneObject`, `GetWiredTimeLocale`, `WiredDateToString`,
      `PrefixUtils`.
    - `api-utils-extra.test.ts` (16) — `ColorUtils`, `FixedSizeStack`,
      `LocalizeFormattedNumber`.
    - `friendly-time.test.ts` (12) — `FriendlyTime` with a deterministic
      `LocalizeText` mock (cuts the transitive renderer-SDK import).
    - `dedupeBadges.test.ts` (6) — slot-preserving badge dedup
      (covers the helper used by the InfoStand pilot).
    - `catalog-favorites.helpers.test.ts` (16) — localStorage parse +
      v2→v3 migration + per-catalog-type storage-key routing.
    - `avatar-info-reducers.test.ts` (14) — InfoStand reducer pilot:
      bail-out branches (state-not-AvatarInfoUser, mismatched
      user/roomIndex, equal-after-dedup) + the figure / favorite-group
      apply paths.
    - `useCatalog.helpers.test.ts` (34) — catalog pure helpers
      extracted out of the god-hook: `normalizeCatalogType`,
      `getOfferProductKeys`, `findNodeById` / `findNodeByName` (with
      the root-exclusion guard), `getNodesByOfferIdFromMap` (with
      the partial-visible fallback), `buildCatalogNodeTree` (tree
      depth + offerId index), and the full decision tree of
      `resolveBuilderFurniPlaceableStatus`.
    - `useCatalog.filters.test.tsx` (4) — contract tests for the
      three-way singleton-filter split. Stubs `useSharedHook` so the
      filters share one fake store, asserts each filter exposes
      exactly the keys it owns (no leak across slices), and pins
      down `===` identity of callbacks between the shim and each
      slice so the migration of the 48 consumers stays safe.

  Component-/hook-level suites (on the new renderer-SDK mock):
    - `WidgetErrorBoundary.test.tsx` (4) — happy path + caught render
      error logged via `OctaneLogger.error` + custom fallback +
      `unknown` default name.
    - `useDoorbellState.test.tsx` (7) — initial empty state, append on
      `DOORBELL`, dedup duplicates, remove on `RSDE_ACCEPTED` /
      `RSDE_REJECTED`, ignore stale events, unsubscribe on unmount.

- **Renderer-SDK mock at `src/octane-renderer.mock.ts`** —
  `vitest.config.mts` aliases `@octane/renderer` over this file
  so jsdom-hosted tests never load Pixi or the message
  parser/composer registry. The mock exports:
    - Explicit, behavioral stubs for the symbols tests actually
      exercise: `OctaneLogger`, `GetEventDispatcher`,
      `mockEventDispatcher` / `clearMockEventDispatcher` helpers, the
      `RoomSessionDoorbellEvent` class (signature mirrors the real
      `(type, session, userName)` so `tsgo` stays happy).
    - String-keyed `Proxy` enums for every `*EventType` /
      `*FigurePartType` / `RoomObjectCategory` etc. — each access
      returns a stable unique string so dispatch + listener agree.
    - Lightweight `class StubClass {}` placeholders for the ~30 Pixi
      and gameplay classes the `src/api/*` barrel touches at import
      time (`OctaneAlphaFilter`, `OctaneContainer`, `EventDispatcher`,
      etc.). Keeps the cascade from throwing without simulating
      behavior tests don't care about.
    - Singleton getters (`GetAssetManager`, `GetCommunication`,
      `GetSessionDataManager`, …) returning a chainable proxy so
      `GetX().y.z` evaluates to a no-op proxy instead of crashing.
- **Pure-module convention** (still applies for non-component tests):
  import from concrete file paths so jsdom doesn't transitively load
  the renderer SDK; use `import type { … }` for type-only renderer
  imports.
- `yarn test` + `yarn test:watch` scripts.

### Logic bug fixes
- Doorbell close button didn't close while users were pending
  (`useEffect(() => setIsVisible(!!users.length))` overrode the close).
- Doorbell `answer()` removed users locally before the server confirmed
  via `RSDE_ACCEPTED`/`RSDE_REJECTED`, desyncing on network drop.
- `RoomToolsWidgetView` wiped `nitro.room.history` from localStorage on
  every `beforeunload` (every tab close).
- `AvatarInfoPetTrainingPanelView` crashed if `roomSession` was null at
  parser time.
- `useInventoryFurni` had a module-level `furniMsgFragments` buffer that
  would have collided between two simultaneous client instances (now
  scoped to a `useRef` inside the singleton hook).

### Dead code removed
- `src/components/login/components/RegisterDialog.tsx`.
- `src/components/login/components/ForgotDialog.tsx`.
- `src/components/login/components/shared.ts` (consumed only by the two
  legacy dialogs).
- `useInventoryFurni`'s empty `FurniturePostItPlacedEvent` handler.
- `IRoomSession.sendWhisperGroupMessage` + impl in the renderer (the
  `ChatWhisperGroupComposer` it referenced never existed; no client
  call site).

### Typecheck baseline
- Repository-wide `tsgo` (TS 7 preview) errors driven down to **0**
  client-side and **0** renderer-side via a series of small targeted
  sweeps:
    - Framer-motion `Variants` typing on `ToolbarView` + `FriendsBarView`
      (−33).
    - `createOctaneQuery` import path / generics / Pick subset
      (−3 + −1 propagation).
    - `useFurniChooserState` typed as `IRoomObject` + dead getUserData
      branch dropped (−10).
    - `ColorVariantType` extended with the 5 `outline-*` bootstrap
      variants used by the group-forum thread view (−4).
    - React 19 `JSX` import in `WiredNeighborhoodSelectorView` (−1).
    - `showConfirm` extra-arg drop in `useOnClickChat` (−1).
    - `UserContainerView` `friendsCount.toString()` (−1).
- Renderer-side cluster cleared in a single pass: TS 5.7+ `ArrayBuffer`
  drift, Pixi v8 `Filter[]` / `WebGLRenderer` narrows, missing
  `IGraphicAsset` import, empty-tuple `IMessageComposer<[]>`,
  `PetBreedingMessageParser.bytesAvailable` boolean-vs-number bug,
  `RoomEnterComposer` extended with optional spawnX/spawnY to match the
  Arcturus server (which already reads both ints when present).

### Bonus
- **`WidgetErrorBoundary`** (`src/common/error-boundary/`) — wraps the
  `RoomWidgetsView` umbrella. A widget crash now degrades gracefully
  (logged to `OctaneLogger.error`) instead of unmounting the room.
- **`CLAUDE.md`** at the repo root — onboarding file Claude Code reads at
  session start. Captures the layout convention, the patterns to use,
  what's wired up, what isn't, and the open logic bugs.

### Boot-time orchestration (`src/bootstrap.ts`)
- Mobile viewport meta tag inserted before anything else.
- `await loadClientMode()` — fetches `client-mode.json` into
  `window.__octaneClientMode` so `getClientMode()` can pick up
  `secureAssetsEnabled` / `secureApiEnabled` / `apiBaseUrl` for the
  fetch interceptor.
- `installSecureFetch()` (no-op when both `secureAssetsEnabled` and
  `secureApiEnabled` are off, which is the dev default).
- Populate `window.OctaneConfig` with `config.urls`, `sso.ticket`,
  forward parameters.
- **`await GetConfiguration().init()`** — eager configuration load
  before React mounts. Eliminates the "Missing configuration key:
  asset.url / login.endpoint / login.turnstile.* / …" warning flood
  that happens when components synchronously read keys on the first
  paint while `prepare()`'s deferred init is still in flight.
- `import('./index')` — dynamic, so we keep top-level await for the
  steps above.

### Dev asset serving (`vite.config.mjs`)
- Game asset directories (`bundled/`, `c_images/`, `gamedata/`, `swf/`)
  live OUTSIDE the repo. The historical "symlink them into `public/`
  so Vite serves them via `publicDir`" trick is a trap on Windows:
  chokidar tries to install a watcher on every file under `public/`
  and the dev server hangs for minutes on ~177k assets.
- The current setup installs a tiny Vite plugin (`octaneAssetsServer`)
  that mounts `sirv` on `/nitro-assets` and `/swf`, reading from
  `../Nitro-Files/{nitro-assets,swf}`. `sirv` is connect-style
  middleware; it bypasses chokidar entirely.
- The same plugin wires the same handler into
  `configurePreviewServer` so `yarn preview` keeps working with the
  production build.
- `.gitignore` has explicit entries for `/public/nitro-assets` and
  `/public/swf` plus a comment explaining why those paths must not be
  recreated as symlinks.

### Upstream feature catch-up
- `duckietm/Octane-V3` PR #126 is cherry-picked: adds
  `src/components/user-settings/UserAccountSettingsView.tsx`
  (reset password / email / change username flows under the user
  settings overlay) and a wear-badge popup fix in
  `NotificationBadgeReceivedBubbleView` that gates the button on the
  `canShowWearButton` derived predicate. The cherry-pick required
  reconciling the LoginView fork to the Form Actions migration
  (`useActionState` + `useFormStatus`) and restoring the
  `useEffectEvent`-wrapped subscription pattern used elsewhere in
  this branch.

---

## How to pick the next refactor PR

Foundations are **done**: React Query enabled with 4 pilot migrations,
Zustand enabled with 1 store, Vitest with 77 cases, error boundary on
the room widgets umbrella, `usePollSubscriptions` already hoisted to
`RoomWidgetsView`, `WiredCreatorToolsView` fully split per tab.

Remaining order of value/risk for the next contributor:

1. **Migrate `useCatalog`'s read-only fetches to `useOctaneQuery`.**
   Biggest expected payoff (cache + dedup + loading state for free).
   The hook is ~1100 lines; start with the page-tree fetch and the
   handful of fire-and-forget request/response pairs (gift wrapping
   config, builders-club furni count, sellable pet palettes). The
   imperative purchase / gift flows stay where they are. Add a
   Vitest case per migration.
2. **Split `useCatalog` along the doorbell/poll lines**
   (`useCatalogData` / `useCatalogUiState` / `useCatalogActions`,
   siblings under `src/hooks/catalog/`). Only after step 1 — React
   Query removes ~60% of the file's responsibility, Zustand can absorb
   the UI state slice.
3. **Hoist `WiredCreatorToolsView`'s shared state to a Zustand slice.**
   The 4-tab split is done but the parent still passes ~25 props to
   each tab. A slice at `src/components/wired-tools/wiredToolsStore.ts`
   would make each tab subscribe to the keys it needs.
4. **Widen the component/hook Vitest coverage.** The renderer-SDK
   mock layer is in place (`src/octane-renderer.mock.ts`) and the
   first two pilots — `WidgetErrorBoundary` and `useDoorbellState` —
   pass. Good follow-up targets: other `*State` hooks built on event
   reducers (`useFurniChooserState`, `useUserChooserState`,
   `useFriendRequestState`, `useChatInputState`), the `useOctaneQuery`
   adapter (timeout + cleanup + accept-filter behavior), and the
   `LoginView` Form Actions happy/error paths. Each new test will
   likely need to add 1-3 named exports to the renderer mock.

Skipped intentionally and documented in commit messages:

- `usePetPackageWidget` and `useWordQuizWidget` god-hook splits — their
  "actions" mutate internal state, so a clean data/actions split would
  need either action arguments or a shared store first.
- `useChatInputWidget` / `useChatWidget` / `useAvatarInfoWidget` —
  large state machines, need per-file design before a mechanical split.

Anything else (the `LoginView` dialog split, the
`react-compiler/react-compiler` warnings on the remaining big files,
the `set-state-in-effect` sweep) is a downstream consequence of the
above — easier and safer once the foundations are in place.

---

## Known logic bugs (independent of structural refactor)

These are runtime bugs spotted while doing the structural work. They are
**not** fixed by the patterns above — they need their own PRs with manual
QA. Listing them here because there is currently no GitHub Issues board on
this repo.

### Open

_(none — both previously-listed bugs have landed; see "Recently fixed"
below.)_

### Recently fixed (in this branch)

- **`LayoutFurniImageView` / `LayoutAvatarImageView` async fetch race
  fixed.** Both effects kicked off async image work
  (`TextureUtils.generateImage` / SDK `resetFigure` callback) and wrote
  the result via `setImageElement` / `setAvatarUrl` guarded only by an
  `isMounted` / `isDisposed` ref. If props changed twice in quick
  succession the older fetch could resolve last and overwrite the
  newer image. Both now capture a `requestIdRef` bumped at the start
  of the effect; the async callback bails when its captured id no
  longer matches the latest one. (React Query keyed on the props
  tuple would also work, but neither call goes through a composer /
  parser pair so the request-id ref is the lighter fix.)
- **`MainView` CREATED/ENDED race fixed.** Two independent
  `useOctaneEvent` listeners on `RoomSessionEvent.CREATED` /
  `RoomSessionEvent.ENDED` could land out of order under flaky
  reconnects, leaving `landingViewVisible` contradicting the actual
  session state. Replaced with a single `useOctaneEventReducer` that
  carries the active session's `roomId`: a CREATED bumps the tracked
  id and closes the landing view; an ENDED is honored only if its
  `event.session.roomId` matches the tracked id (or no session is
  active), otherwise it's a stale ENDED for a previous session and
  gets ignored.
- **Doorbell close button didn't close** while users were pending
  (`useEffect(() => setIsVisible(!!users.length))` overrode the close).
  Fixed by `src/components/room/widgets/doorbell/DoorbellWidgetView.tsx`
  (separate `dismissed` state, visibility computed in render).
- **Doorbell optimistic remove without rollback** — the original
  `answer()` removed the user from the local list before the server
  confirmed via `RSDE_ACCEPTED`/`RSDE_REJECTED`, leaving client and
  server desynced if the network dropped. Fixed by removing the local
  `removeUser` call: the server-driven events now own the list. Note:
  a "pending" indicator (so users see their answer is in flight) is
  desirable — separate small PR.
- **`localStorage` room history wiped on every tab close**
  (`RoomToolsWidgetView.tsx`, `useEffect` on `beforeunload` removing
  `nitro.room.history`). Fixed by removing the `beforeunload` handler;
  history now persists across sessions, which is the only sensible
  meaning of `localStorage`. If "session-only" was the intent, the right
  primitive is `sessionStorage` — file an issue if that's actually
  desired.
- **`AvatarInfoPetTrainingPanelView` null-pointer** —
  `roomSession.userDataManager.getPetData(parser.petId)` could throw if
  `roomSession` was null at the moment the event arrived (between rooms).
  Fixed with `?.` chain.
- **`useAvatarEditor` `set.paletteID` null-pointer** —
  `buildCategory` read `set.paletteID` on the line above its
  `if(!set || !palette) return null` guard. For categories where
  `getSetType()` legitimately returns null (PETS / MISC without
  server-side figure data), this threw and the avatar editor crashed
  on open, escalating to `WidgetErrorBoundary`. Split the guard so
  `set` is checked before its property access.
