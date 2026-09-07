# Claude Code — project memory for Octane

This file is read automatically by Claude Code at session start. It captures
the conventions and current state of this branch so a new session can hit
the ground running.

## TL;DR

This client carries a long-running React 19.2 modernization: React 19
idioms + supporting infrastructure (TanStack Query, Zustand, Vitest,
React Compiler, error boundaries), god-hook splits, and logic-bug audits.

**Working base is now `main`** (tracking `duckietm/Octane`). The earlier
`feat/react19-modernization` long-running branch was superseded — feature
work now ships as small focused PRs against `duckietm:Dev`, staged through
Dev then merged to main. (`feat/react19-modernization` still exists on the
fork as backup; do not force-push it.)

**Navigator modernization landed** (merged to main 2026-05-28, PRs
#168/#169/#170): the 492-line `useNavigator` god-hook was split into
`useNavigatorStore` + `useNavigatorData`/`useNavigatorUiState`/
`useNavigatorSearch` filters (wired-tools layout), door lifecycle extracted
to `src/hooks/rooms/widgets/useDoorState.ts`, 9 UI flags moved to a Zustand
`navigatorUiStore`, search migrated to a query hook, and 5 sub-views wrapped
in `WidgetErrorBoundary`. **Caveat**: duckietm patched `useNavigatorSearch`
post-merge (`05d71dd1`) — see the `useOctaneQuery` fragility note below.

When syncing upstream, expect conflicts in `App.tsx` / `bootstrap.ts` /
`LoginView.tsx` on React 19 imports — always keep the modernized version.

Local-dev game assets are served by a small Vite plugin (`sirv` middleware
mounted on `/nitro-assets` and `/swf`, reading from
`E:\Users\simol\Desktop\DEV\Nitro-Files`) — NOT by symlinking inside
`public/`. The symlink path triggers chokidar on ~177k files and the dev
server hangs for minutes on Windows. See `vite.config.mjs` and the
`.gitignore` note.

Detailed status, decisions, and next steps live in **`docs/ARCHITECTURE.md`** —
read that before starting anything non-trivial.

## Commands

| Goal | Command |
|---|---|
| Dev server | `yarn start` |
| Production build | `yarn build` |
| Serve production build | `yarn preview` (defaults to http://localhost:4173) |
| Lint | `yarn eslint` |
| Type-check (TS 7 native, fast) | `yarn typecheck` |
| Test (Vitest, once) | `yarn test` |
| Test (watch) | `yarn test:watch` |

## Setup walkthrough

1. **Clone the renderer SDK as a sibling of this repo.**
   `vite.config.mjs` resolves the `@octane/*` aliases against
   `../octane-renderer` (preferred) or `../renderer` (legacy). If neither
   exists, the dev server and build now fail fast with a message
   pointing here.

   ```sh
   cd ..                            # parent of octane
   git clone <renderer-repo> octane-renderer
   cd octane-renderer && yarn install
   ```

2. **Install client deps.**
   ```sh
   cd ../octane
   yarn install
   ```

3. **Materialize the runtime configuration.** `public/configuration/`
   ships `.example` files. Copy the ones you need without the `.example`
   suffix and point them at your game server (websocket URL, asset
   base URL, UI texts, etc.). The dev server doesn't fail if these are
   missing but the client renders a blank/error screen at runtime.

4. **Run.**
   - Dev: `yarn start` (Vite, HMR, includes the renderer source).
   - Production preview: `yarn build && yarn preview`.

The renderer SDK (`@octane/renderer`) is consumed via a filesystem
link to a sibling working tree — `../octane-renderer` (preferred) or
`../renderer` (legacy). Without it, `yarn typecheck` reports TS2307 across
the codebase — that's expected on a sandbox without the renderer, not a
regression.

## Runtime verification

This client can't be driven **headless** — the room renders via PixiJS/WebGL,
which hangs in a headless browser, and login needs an SSO session. To verify a
change at runtime, use the **Claude-in-Chrome extension** against the user's
real, logged-in `localhost:5173` session: it shares the browser's SSO cookie
(auto-login) and uses the real GPU. Toolbar buttons are canvas (not in the
accessibility tree) — locate them by screenshot/zoom, then click by coordinate.
The `preview_*` (headless) tools can't bind 5173 here and won't get past
login/WebGL, so they're not usable for in-game verification.

## Stack snapshot

- React 19.2.5, `react-dom` 19.2.5, `@types/react` 19.2.x.
- TypeScript: TS 6 for build, **TS 7 native preview** (`@typescript/native-preview`,
  invoked via `tsgo`) for the `typecheck` script.
- Vite 8 + `@vitejs/plugin-react` 6 + `babel-plugin-react-compiler` 1.0.
- ESLint 10 + `typescript-eslint` 8 + `eslint-plugin-react-hooks@7` +
  `eslint-plugin-react-compiler`.
- TanStack Query 5 (`@tanstack/react-query` + devtools).
- Zustand 5.
- Vitest 3 + jsdom + `@testing-library/react` + `@testing-library/jest-dom`.
- `react-error-boundary` 6.

## Layout convention (DO NOT CHANGE)

Established by the team and recorded in `docs/ARCHITECTURE.md` proposal #3
(rejected the `src/features/` alternative). Stay on this layout — every PR
that violates it will need to be reworked.

```
src/components/<area>/<feature>/         → views (.tsx only)
  e.g. src/components/room/widgets/doorbell/DoorbellWidgetView.tsx

src/hooks/<area>/<feature?>/             → hooks, FLAT files, no per-feature subfolder
  e.g. src/hooks/rooms/widgets/useDoorbellState.ts
       src/hooks/rooms/widgets/useDoorbellActions.ts
       src/hooks/rooms/widgets/useDoorbellWidget.ts (deprecated shim)

src/api/                                 → cross-cutting helpers (LocalizeText, composers, formatters)
src/common/                              → reusable UI primitives + error boundary
src/state/                               → Zustand stores (cross-feature only)
src/**/*.test.{ts,tsx}                   → Vitest suites co-located next to their subject (e.g. `Foo.ts` + `Foo.test.ts`)
src/octane-renderer.mock.ts               → hand-written renderer-SDK stub for tests (aliased over `@octane/renderer`)
src/test-setup.ts                        → Vitest setupFiles entry (jest-dom matchers, etc.)
```

When splitting a god-hook the convention is **3 files, all flat in the
hooks barrel directory**:

- `use<Feature>State.ts` — state + event subscriptions + derived values
- `use<Feature>Actions.ts` — pure imperative actions (no state writes)
- `use<Feature>Widget.ts` — deprecated wrapper that composes the two and
  preserves the old return shape so existing consumers don't break

See `useDoorbellState`/`useDoorbellActions`/`useDoorbellWidget` as the
canonical pattern.

## Patterns to use

### `useSessionSnapshots` (renderer snapshot pattern, React-side — OPT-IN)

For state that lives on a renderer Manager and is invalidated through
`OctaneEventType.*_UPDATED`, the file
`src/hooks/session/useSessionSnapshots.ts` exposes eight consumer hooks
backed by `useSyncExternalStore`:

```ts
const userData = useUserDataSnapshot();           // SessionData
const room    = useActiveRoomSessionSnapshot();   // RoomSession
const ignored = useIgnoredUsersSnapshot();        // ReadonlyArray<string>
const isIgn   = useIsUserIgnored(name);           // boolean, memoized
const badges  = useGroupBadgesSnapshot();         // ReadonlyMap<number,string>
const badge   = useGroupBadge(groupId);           // string, memoized
const vols    = useVolumesSnapshot();             // sound volumes
const users   = useRoomUserListSnapshot();        // ReadonlyArray<IRoomUserData>
```

Each hook has defensive `typeof method === 'function'` guards against
a stale renderer bundle and degrades to a frozen default snapshot if
the renderer doesn't expose the matching getter (kept module-level so
React's bailout still works on the degraded path).

**Adoption status: three pilot consumers shipped (commit `d28819d`,
2026-05-19).** `useSessionInfo` reads userFigure / respectsLeft /
respectsPetLeft from `useUserDataSnapshot`; `useChatWidget.ownUserId`
reads from the snapshot directly; `AvatarInfoWidgetAvatarView` flips
its Ignore/Unignore menu via `useIsUserIgnored`.

The legacy `use-between` dispatcher proxy could not execute
`useSyncExternalStore` hooks and caused the original snapshot crash.
The project now uses `useSharedHook`, whose source runs in a normal
React host and publishes its snapshot through a Zustand vanilla store.
Shared sources must be registered at module scope so the root registry
can mount them before their first consumer renders.

```ts
const useSessionInfoState = () => {
    const [chatStyleId, setChatStyleId] = useState(0);
    // … useMessageEvent, actions …
    return { chatStyleId, /* actions */ };
};

export const useSessionInfo = () => {
    const shared = useSharedHook(useSessionInfoState);
    const userData = useUserDataSnapshot();
    return { ...shared, userFigure: userData.figure, /* etc */ };
};

registerSharedHook(useSessionInfoState);
```

Regression guard: `src/hooks/session/useSessionSnapshots.test.tsx`
and `src/state/useSharedHook.test.tsx` cover snapshot and shared-source
lifecycle behavior. A CI gate (`yarn lint:hooks` →
`react-hooks/rules-of-hooks: error`) blocks any future commit that
reintroduces hook-order issues.

### `useOctaneEventState` / `useMessageEventState`

For "derived state from a single event" replace the two-step
`useState + useOctaneEvent(e => setState(...))` with a single call:

```ts
const foo = useOctaneEventState(SomeEvent, e => e.payload, initial);
const data = useMessageEventState(SomeParser, e => e.getParser()?.field ?? null, null);
```

The selector is held in a `useLayoutEffect`-refreshed ref so the listener
stays registered across renders. Both hooks are exported from
`src/hooks/events`.

### `useOctaneQuery`

For composer/parser request-response pairs:

```ts
const { data } = useOctaneQuery<SomeParser, SomeData>({
    key: ['octane', 'domain', 'request', ...args],
    request: () => new SomeComposer(args),
    parser: SomeParser,
    select: e => e.getParser()?.data,
    accept: e => e.getParser()?.correlationKey === args, // optional, for shared event bus
    staleTime: 60_000,
});
```

Already wired up; `QueryClientProvider` is mounted in `src/index.tsx`.

Companion `useOctaneEventInvalidator(eventType, queryKey, accept?)` —
import from `src/api/octane-query`. Subscribes to the renderer event
and invalidates the query slot on every push, so server-driven
refresh paths work the same as the initial request/response (e.g.
ClubGiftInfoEvent firing again after the user claims a gift).

**⚠️ Fragility — do NOT use `useOctaneQuery` for primary visible data.**
The one-shot listener inside `awaitOctaneResponse` (register listener →
await one matching response → remove itself) is fragile against
renderer-bundle quirks: for some parsers the event fires but the listener
never matches, so the promise never resolves and `query.data` stays
`undefined` forever — the UI shows the server's response arriving in logs
but renders blank. This bit **ModTools Room/CFH chatlog** (reverted to
`useMessageEvent + useEffect`) and then **Navigator search** (P2 shipped
with `useOctaneQuery`, duckietm reverted it in `05d71dd1` to the god-hook
pattern). **Rule: reserve `useOctaneQuery` for config / secondary fetches
where a brief blank is tolerable. For anything that is the primary visible
content of a panel, use `useMessageEvent + useState/useEffect`** — that's
what the rest of the codebase does and it's robust.

### Singleton-filter split for Zustand-backed shared hooks

When a hook backs many consumers but most only need either state OR
actions (not both), split it without breaking the shared-singleton
guarantee:

```ts
// internal: state + actions in one closure
const useFooStore = () => {
    const [ data, setData ] = useState(...);
    // listeners, effects, actions ...
    return { data, doThing };
};

// public: read-only filter
export const useFooState = () => {
    const { data } = useSharedHook(useFooStore);
    return { data };
};

// public: imperative filter
export const useFooActions = () => {
    const { doThing } = useSharedHook(useFooStore);
    return { doThing };
};

// deprecated shim — keeps the historical return shape
export const useFoo = () => useSharedHook(useFooStore);

registerSharedHook(useFooStore);
```

`useSharedHook` ensures all three entry points read the same Zustand
store, while the registered source owns listeners and effects once.

### Zustand stores

For cross-feature UI state (avoid module-level `let`):

```ts
import { createOctaneStore } from '@/state/createOctaneStore';

export const useFooStore = createOctaneStore<FooState>()((set) => ({
    ...
}));
```

Components subscribe to slices, not the whole store:

```ts
const value = useFooStore(s => s.value);
```

Adoptions: `src/components/navigator/views/navigatorRoomCreatorStore.ts` (create-room lockout) and `src/components/wired-tools/wiredCreatorToolsUiStore.ts` (UI-only flags for the WiredCreatorTools panel — tab nav, modal/popover open, monitor + variable-manage filters).

### `WidgetErrorBoundary`

Wrap any in-room widget tree so a crash degrades gracefully (logs to
OctaneLogger, falls back to `null`). Already applied at `RoomWidgetsView`
as an umbrella; per-widget wrapping is a follow-up.

```tsx
<WidgetErrorBoundary name="ChatWidget">
    <ChatWidgetView />
</WidgetErrorBoundary>
```

### Form Actions

Login / Register / Forgot in `src/components/login/LoginView.tsx` use
`useActionState` + `useFormStatus`. The legacy non-Action versions in
`src/components/login/components/{Register,Forgot}Dialog.tsx` and
`shared.ts` have been **removed** (dead code).

### Configuration pre-init in bootstrap

`src/bootstrap.ts` calls `await GetConfiguration().init()` **before**
importing `./index`. Otherwise the first paint dumps a flood of
"Missing configuration key" warnings while components synchronously
read `asset.url`, `login.endpoint`, … against an empty store before
`prepare()`'s deferred init lands.

### Asset serving in dev

Game assets (`bundled/`, `c_images/`, `gamedata/`, `swf/...`) are NOT
copied or symlinked under `public/`. They're served by a custom Vite
plugin (`octaneAssetsServer` in `vite.config.mjs`) that mounts `sirv`
on `/nitro-assets` and `/swf`, reading from
`E:\Users\simol\Desktop\DEV\Nitro-Files\`. sirv is a connect-style
middleware that bypasses chokidar entirely, so the ~177k asset files
never enter the watch graph. The plugin also wires the same handler
into `configurePreviewServer` so `yarn preview` keeps working.

## What's wired up and what isn't

| Adopted | Pilot sites |
|---|---|
| Renderer snapshot consumer hooks (`useSessionSnapshots`) | `useSessionInfo` (userFigure / userRespectRemaining / petRespectRemaining via `useUserDataSnapshot`), `useChatWidget.ownUserId` (via `useUserDataSnapshot`), `AvatarInfoWidgetAvatarView` Ignore/Unignore (via `useIsUserIgnored`), `ModToolsView` selected-user presence dot (via `useRoomUserListSnapshot` — green when still in the active room, gray when they've left). The 8 hooks (userData / activeRoomSession / ignoredUsers / groupBadges / soundVolumes / roomUserList / isUserIgnored / groupBadge) keep their typeof-guard defensive fallbacks for stale-renderer paths. |
| Reactive event-driven local state (companion to snapshots — when there is no manager-snapshot to read from yet) | `AvatarInfoWidgetAvatarView` Give/Remove Rights — local `controllerLevel` initialized from `avatarInfo.targetRoomControllerLevel`, kept reactive via `useMessageEvent<FlatControllerAddedEvent>` / `FlatControllerRemovedEvent` filtered by `parser.data.userId === avatarInfo.webID`, plus optimistic bump on click so the moderate submenu flips immediately. Same shape as `useIsUserIgnored` but the source is the renderer event bus, not a snapshot getter — use this when adding a manager-side snapshot for the same data isn't justified. |
| `useOctaneEventState` + companions (Reducer, ExternalSnapshot) | `OfferView`, `useAvatarInfoWidget` (figure/badges/group reducer), `useInventoryFurni` (pure reducers + fragments useRef) |
| `useOctaneQuery` + `useOctaneEventInvalidator` | `OfferView`, `CatalogLayoutRoomAdsView`, `ModToolsChatlogView`, `CfhChatlogView`, `useGiftConfiguration`, `useUserGroups`, `useClubOffers(windowId)`, `useSellablePetPalette(breed)`, `useMarketplaceConfiguration`, `useClubGifts` (with invalidator) |
| Zustand | `NavigatorRoomCreatorView` (`useRoomCreatorStore`), `WiredCreatorToolsView` (`useWiredCreatorToolsUiStore` — every panel-lifecycle-relevant flag, snapshot, selection, highlight, inline editor, picker chain hoisted; what's left in the component as `useState` is genuinely transient: keepSelected, globalClock, roomEnteredAt, selectedMonitorErrorType, selectedMonitorLogDetails) |
| God-hook split (state + actions + shim) | `doorbell`, `poll`, `furni-chooser`, `user-chooser`, `friend-request`, `chat-input` |
| God-hook split (Zustand-backed shared source + state filter + actions filter + shim) | `wired-tools`, `translation`, `notification`, `friends`, `catalog` (three-way: `useCatalogData` / `useCatalogUiState` / `useCatalogActions` — all 48 consumers migrated, deprecated `useCatalog` shim removed) |
| Navigator modernization (merged to main 2026-05-28, PRs #168/#169/#170) | 492-line `useNavigator` god-hook split into a Zustand-backed shared `useNavigatorStore` + flat filters `useNavigatorData` / `useNavigatorUiState` / `useNavigatorSearch`; door bell/password lifecycle extracted to `src/hooks/rooms/widgets/useDoorState.ts` (dual-subscribes `GetGuestRoomResultEvent` + `GenericErrorEvent` alongside the nav store, each filtering by branch/errorCode); 9 UI flags + `currentTabCode`/`currentFilter` in Zustand `navigatorUiStore` (`src/hooks/navigator/navigatorUiStore.ts`); all 5 Navigator sub-views wrapped in `WidgetErrorBoundary`; old shim deleted. **`useNavigatorSearch` was reverted by duckietm (`05d71dd1`) from `useOctaneQuery` to `useMessageEvent + useEffect`** — see the useOctaneQuery fragility note. Specs/plans under `docs/superpowers/`. |
| `WidgetErrorBoundary` | `RoomWidgetsView` umbrella + per-widget wrap on all 13 room widgets and all 20 furniture widgets (so a crash in one widget no longer takes down its siblings) |
| Vitest | 207/207 cases — pure helpers (incl. 4 new on `getPetPackageNameError`) + 2 Zustand store suites (`navigatorRoomCreatorStore`, `wiredCreatorToolsUiStore` with 45 cases including the picker-chain hoists) + 2 component-/hook-level pilots (WidgetErrorBoundary, useDoorbellState) on top of the renderer-SDK mock at `src/octane-renderer.mock.ts`, 34 cases on the catalog pure helpers, 4 contract cases on the catalog filters. **Tests are co-located** under `src/`, alongside their subject. |
| Form Actions | Login / Register / Forgot (LoginView.tsx) |
| Upstream `origin/Dev` absorbed (merge `779a98c`) | Through `b2318b9` (2026-05-18): JSON5, user-settings reset password/email/username, wear-badge popup fix, login screen fix, About, offer-selection refactor |

| Not yet | Notes |
|---|---|
| Split `useChatWidget` / `useAvatarInfoWidget` (data/actions) | Both state-driven via events with no clean imperative actions to extract — split still skip-motivated, but `useAvatarInfoWidget` got a typed `__octaneAvatarClickControl` accessor + module-scope DEBOUNCE const in 2026-05-18 (commit `05ff7df`). `useChatWidget.ownUserId` reactive migration re-applied 2026-05-19 in `d28819d` via `useUserDataSnapshot`. |
| Split `usePetPackageWidget` / `useWordQuizWidget` / `useChatCommandSelector` (data/actions) | Data/actions split remains a bad fit, but all three got real modernization in 2026-05-18 instead: usePetPackageWidget → useReducer + extracted `getPetPackageNameError` pure helper + 4 tests; useWordQuizWidget → fixed stale-closure bug in `setUserAnswers` updater + `useRef` for the timeout handle; useChatCommandSelector → module-level `let` cache replaced with a Zustand store. |
| Migrate more consumers to renderer snapshot hooks | **Unblocked.** Three pilot consumers shipped 2026-05-19 (`d28819d`), pattern documented above. Next candidates: any code reading from `GetSessionDataManager().userId / userName / clubLevel / securityLevel`, `GetRoomSessionManager().getActiveSession()`, or `GetSoundManager().<volume>` synchronously — those don't re-render today when the value changes. CI gate `yarn lint:hooks` and `src/hooks/session/useSessionSnapshots.test.tsx` guard hook correctness. |
| Widen the component / hook test coverage | Mock layer is in place (`src/octane-renderer.mock.ts`) and 3+ hook/component pilots pass. Good follow-up targets: `LoginView` Form Actions happy/error paths, `OfferView` with `useOctaneQuery`. (Acceptable only as a side-effect of a real change — coverage growth on its own is deprioritized per session feedback.) |

## Known open logic bugs

None on this branch. The two previously-open races are closed:

- `MainView` CREATED/ENDED race → fixed in `9d10e52` via a session-aware
  reducer pattern.
- `LayoutFurniImageView` / `LayoutAvatarImageView` async fetch race →
  fixed in `97c9717` via `requestIdRef` guard on the async callback.

See `docs/ARCHITECTURE.md` "Recently fixed" for fix shapes.

## House rules

- **Never merge a branch that violates the layout convention** above.
  The hooks-adapter approach that put hooks under `src/components/...` is
  wrong and a recurring temptation.
- **Skip-motivated god-hook splits are fine** — when a hook's actions
  mutate internal state, document the reason and move on rather than
  forcing a bad split.
- **`yarn test` must stay green**. `yarn typecheck` + `yarn test --run`
  must both pass.
- **Lint baseline**: don't regress. Some pre-existing errors (`FC<{}>`,
  `IMessageEvent | undefined` redundant union in the local sandbox where
  the renderer SDK isn't installed) are out of scope here.

## Where everything lives

- Architecture doc: `docs/ARCHITECTURE.md`
- Test runner config: `vitest.config.mts` (separate from `vite.config.mjs`)
- Test setup: `src/test-setup.ts`
- Test convention: co-located under `src/` next to the subject (`src/<path>/Foo.ts` ↔ `src/<path>/Foo.test.ts`). No separate `tests/` tree.
- React Query adapter: `src/api/octane-query/createOctaneQuery.ts`
- Zustand factory: `src/state/createOctaneStore.ts`
- Error boundary: `src/common/error-boundary/WidgetErrorBoundary.tsx`
- Event hooks (`useOctaneEvent`, `useMessageEvent`, `useOctaneEventState`,
  `useMessageEventState`): `src/hooks/events/`
- Wired-tools split (types/constants/helpers + 3 tab views):
  `src/components/wired-tools/`
- User account settings (cherry-picked from upstream PR #126):
  `src/components/user-settings/UserAccountSettingsView.tsx`
- Access-token persistence helper (used by login + remember + rotate):
  `src/api/auth/accessToken.ts` (`persistAccessTokenFromPayload`)
- Asset middleware: `octaneAssetsServer()` in `vite.config.mjs`
- Configuration pre-init: `src/bootstrap.ts` (`await GetConfiguration().init()`
  before `import('./index')`)
- Catalog pure helpers: `src/hooks/catalog/useCatalog.helpers.ts`
  (`buildCatalogNodeTree`, `findNodeById` / `findNodeByName`,
  `getNodesByOfferIdFromMap`, `getOfferProductKeys`,
  `normalizeCatalogType`, `resolveBuilderFurniPlaceableStatus`)
- Catalog three-way filter split: `useCatalogData` /
  `useCatalogUiState` / `useCatalogActions` in
  `src/hooks/catalog/useCatalog.ts` (all 48 consumers migrated;
  deprecated `useCatalog` shim removed)
- Navigator hooks: `src/hooks/navigator/` — `useNavigatorStore.ts`
  (internal closure), `useNavigatorData.ts` / `useNavigatorUiState.ts` /
  `useNavigatorSearch.ts` (filters), `navigatorUiStore.ts` (Zustand UI
  flags + `setTab`/`setFilter`). Door lifecycle: `src/hooks/rooms/widgets/useDoorState.ts`.
  Specs/plans: `docs/superpowers/specs/2026-05-2*-navigator-*.md`
- Renderer-SDK mock for Vitest: `src/octane-renderer.mock.ts`
  (aliased over `@octane/renderer` via `vitest.config.mts`).
  Hosts the explicit `OctaneLogger` mock, the `mockEventDispatcher` /
  `clearMockEventDispatcher` helpers used by hook tests, the
  `RoomSessionDoorbellEvent` stub, and a long list of placeholder
  classes/enums kept around just so the `src/api/*` barrel cascade
  imports without throwing. **Grow this file when a new test needs a
  symbol; prefer real deterministic stubs over `vi.fn()`.**

## Furni names (furnidata-driven)

Furni name/description are furnidata-driven (`FurnitureData` by classname) — the
client does NOT get furni display names from the server. The 3 furni surfaces
refresh live on the window event `octane-localization-updated`: catalog
(`useCatalog.ts`), inventory (`useInventoryFurni.ts`), infostand
(`useAvatarInfoWidget.ts`). The renderer's `FurnitureDataReload` packet (header
10047) dispatches that event on server-pushed furnidata changes — no client code
needed.
