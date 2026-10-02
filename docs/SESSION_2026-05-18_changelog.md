# React 19 modernization branches — complete changelog

End-to-end documentation of every modification made since the two modernization branches were opened:

- **Nitro-V3** (React client) — branch `feat/react19-modernization`, **114 commits** since baseline `ae17619`
- **Nitro_Render_V3** (renderer library) — branch `feat/react19-event-bus`, **22 commits** since baseline `98b03aa`

Plus the in-session upstream sync of the third codebase touched on 2026-05-18:

- **Arcturus-Morningstar-Extended** (Java emulator) — FF pull `e6093f9` → `efb4997` (v4.1.16)

Working directory: `E:\Users\simol\Desktop\DEV`. *(NitroV3-Housekeeping was not touched during the lifetime of these branches.)*

---

## Table of contents

1. [Overview](#1-overview)
2. [Nitro-V3 client — branch story](#2-nitro-v3-client--branch-story)
   - [Phase 1: React 19 baseline adoption](#phase-1-react-19-baseline-adoption)
   - [Phase 2: Infrastructure pillars (Query, Zustand, Vitest, mocks, Form Actions)](#phase-2-infrastructure-pillars-query-zustand-vitest-mocks-form-actions)
   - [Phase 3: Hook taxonomy and god-hook splits](#phase-3-hook-taxonomy-and-god-hook-splits)
   - [Phase 4: WiredCreatorTools extraction and Zustand hoists](#phase-4-wiredcreatortools-extraction-and-zustand-hoists)
   - [Phase 5: Typecheck cleanup (Pixi v8, TS 6, framer-motion)](#phase-5-typecheck-cleanup-pixi-v8-ts-6-framer-motion)
   - [Phase 6: Error boundaries and logic-bug fixes](#phase-6-error-boundaries-and-logic-bug-fixes)
   - [Phase 7: Test infrastructure evolution](#phase-7-test-infrastructure-evolution)
   - [Phase 8: CI pipeline](#phase-8-ci-pipeline)
   - [Phase 9: Upstream cherry-picks (PR #126) and drive-by bugs](#phase-9-upstream-cherry-picks-pr-126-and-drive-by-bugs)
   - [Phase 10: Toolbar spam-toggle fix (PR #130 upstream)](#phase-10-toolbar-spam-toggle-fix-pr-130-upstream)
   - [Phase 11: Full upstream sync (origin/Dev b2318b9)](#phase-11-full-upstream-sync-origindev-b2318b9)
3. [Nitro_Render_V3 renderer — branch story](#3-nitro_render_v3-renderer--branch-story)
   - [Phase 1: v2.1.0 React-friendly API additions](#phase-1-v210-react-friendly-api-additions)
   - [Phase 2: TypeScript 6 + tsgo migration](#phase-2-typescript-6--tsgo-migration)
   - [Phase 3: API interface alignments (IRoomSession)](#phase-3-api-interface-alignments-iroomsession)
   - [Phase 4: TS 5.7+ ArrayBuffer drift fixes](#phase-4-ts-57-arraybuffer-drift-fixes)
   - [Phase 5: Pixi v8 alignment](#phase-5-pixi-v8-alignment)
   - [Phase 6: Composer/parser alignment with Arcturus](#phase-6-composerparser-alignment-with-arcturus)
   - [Phase 7: Dead code removal and small fixes](#phase-7-dead-code-removal-and-small-fixes)
   - [Phase 8: Upstream sync (origin/main)](#phase-8-upstream-sync-originmain)
   - [Phase 9: Snapshot pattern extensions](#phase-9-snapshot-pattern-extensions)
4. [Arcturus emulator — upstream pull](#4-arcturus-emulator--upstream-pull)
5. [Documentation evolution (CLAUDE.md / ARCHITECTURE.md)](#5-documentation-evolution-claudemd--architecturemd)
6. [Full commit index](#6-full-commit-index)
7. [Final state matrix](#7-final-state-matrix)

---

## 1. Overview

### Branches and their goals

**`feat/react19-modernization`** (Nitro-V3 client) was opened to bring the React client up to React 19 idioms and the supporting infrastructure that React 19 unlocks: TanStack Query for server state, Zustand for cross-component UI state, Vitest for unit testing, React Compiler for automatic memoization, and `react-error-boundary` for graceful degradation. Along the way it absorbed god-hook decompositions, file extractions on oversized components, Pixi v8 alignment, two upstream cherry-picks (duckietm PR #126), an open-upstream PR (#130 — toolbar spam-toggle fix), and finally a full sync of `origin/Dev` through `b2318b9`.

**`feat/react19-event-bus`** (Nitro_Render_V3 renderer) was opened to add React-friendly primitives to the renderer library so the client could consume it through `useSyncExternalStore`, `use()`, and TanStack Query without re-architecting the event bus. It then absorbed TypeScript 6 + tsgo migration, TS 5.7+ ArrayBuffer drift fixes, Pixi v8 type alignment, composer/parser alignment with Arcturus (`RoomEnterComposer`, `RoomSettingsData.allowUnderpass`, etc.), dead-code removal, and finally — in the 2026-05-18 session — four new snapshot-pattern extensions covering ignored users, group badges, the room user list, and sound volumes.

### Current state

| Branch | HEAD | Commits since baseline | Typecheck | Vitest |
|---|---|---|---|---|
| Nitro-V3 / `feat/react19-modernization` | `02a396d` | 114 (baseline `ae17619`) | clean | **203/203** |
| Nitro_Render_V3 / `feat/react19-event-bus` | `28c552f` | 22 (baseline `98b03aa`) | clean | **127/127** |
| Arcturus / `main` | `efb4997` (v4.1.16) | tracks `origin/main` with no local divergence | n/a | n/a |

### Key architectural decisions taken

1. **Stay on the classic `src/components/` + `src/hooks/` layout** — an early experiment with `src/features/<feature>/` was reverted (commit `0755285`); the team decided the in-place layout is the convention. Every PR that violates it gets reworked.
2. **God-hook split into 3 files, flat in the hooks barrel directory** — `use<Feature>State`, `use<Feature>Actions`, `use<Feature>Widget` (deprecated wrapper). No per-feature subfolders for hooks.
3. **`useBetween`-based singleton-filter pattern** — for hooks shared by many consumers but where most consumers only need state OR actions, not both: one internal `useBetweenStore`, then a `useState` filter, `useActions` filter, and a deprecated `useFoo` shim.
4. **Renderer-SDK mock for Vitest** — `src/nitro-renderer.mock.ts` aliased over `@nitrots/nitro-renderer` via `vitest.config.mts`. Without it, importing any `src/api/*` file in a test crashes jsdom because the real renderer eagerly loads Pixi v8 at module-import time.
5. **Tests co-located next to subjects** — `src/path/Foo.ts` ↔ `src/path/Foo.test.ts`. No parallel `tests/` tree.
6. **Snapshot pattern on the renderer** — referentially-stable, lazy-frozen, invalidated-on-mutation. Now extended to 6 state holders (Session, RoomSession, IgnoredUsers, GroupInfo, RoomUserList, SoundVolumes).
7. **Composer/parser optional trailing fields use a flat early-return chain**, never nested `if(bytesAvailable)` guards. The pattern is now documented in the renderer's CLAUDE.md.

### Commit author + signing convention

All commits authored as `simoleo89 <simoleo89@users.noreply.github.com>` (client) or `simoleo89 <simoleo89@gmail.com>` (renderer), passed via per-command `git -c user.name=… -c user.email=…` overrides — the global git config is never modified. Co-authored-by trailers are explicitly forbidden by a feedback memory entry.

---

## 2. Nitro-V3 client — branch story

### Phase 1: React 19 baseline adoption

The runtime was already on `react@19.2.5` but no React 19 APIs were in use. Phase 1 brought the codebase forward to idiomatic React 19.

#### `a1bee1d` — Initial React 19 modernization sweep

- **forwardRef → ref-as-prop** in 7 layout/component files (NitroInput, Button, ItemCountBadge, Card variants, InfiniteGridItem, ToolbarItemView, AvatarEditorIcon).
- **`<Context.Provider>` → `<Context>`** in 6 contexts (CatalogAdmin, FloorplanEditor, UiSettings, GridContext, NitroCardContext, NitroCardAccordionContext).
- **Native `<script>` hoisting** for Turnstile, ExternalPluginLoader, GoogleAdsView. React 19 dedupes by `src` and removes manual `document.head.appendChild` + module-level promise caches.
- **React Compiler enabled** at build time via `babel-plugin-react-compiler` in `vite.config.mjs` (target `'19'`), plus `eslint-plugin-react-compiler` in lint mode.
- **Global `<ErrorBoundary>` + `<Suspense>`** in `src/index.tsx` using `react-error-boundary`, with `LoadingView` as fallback.
- **`use(promise)` pilot** in `BackgroundsView` demonstrating Suspense-driven config loading.
- **ESLint react settings** bumped 18.3.1 → 19.2; legacy `@typescript-eslint/ban-types` replaced with `no-restricted-types` (the old rule was removed in `@typescript-eslint` v8).

Form Actions phase (login/register) deferred to its own commit because `LoginView.tsx` was 1623 lines with lockout + Turnstile + heartbeat interleaving.

#### `1b1e0c1` — React 19 Phase 3: login/forgot/register forms migrated to Form Actions

- **Login form** — `handleLoginSubmit → loginAction(prevState, FormData)` wrapped in `useActionState`. Submit button extracted as `<LoginSubmitButton/>` reading pending state via `useFormStatus`. Reads username/password/remember from FormData; remember checkbox carries `name="remember"`.
- **Forgot password form** — `forgotAction` wrapped in `useActionState`; awaits parent `onSubmit` so pending stays true through the parent fetch. `ForgotSubmitButton` uses `useFormStatus`.
- **Register credentials step** — `credentialsAction` with `useActionState`; the step transition (`setStep('avatar')`) happens inside the action after `pingServer` + `onCheckEmail`.
- **Register avatar step** — `avatarAction` validates username, pings server, checks availability, then awaits `onSubmit`. Button label uses `isAvatarPending` to show "Creating…" without prop drilling `submitting`.
- **`DialogSharedProps.onSubmit`** signatures updated to return `Promise<void>` so dialog actions can `await` the parent's fetch.
- **`lockState` memo** replaced with a direct `readLock()` call in render — any re-render (triggered by the action's pending toggle) recomputes it.
- Unused `FormEvent` import dropped; unused `checking` state in RegisterDialog dropped.

#### Other Phase 1 commits

- `535fa71` — ESLint `--fix` auto-fix for brace-style/indent/semi/no-trailing-spaces (mechanical hygiene before adopting new lint rules).
- `25d51af` — Enabled `<StrictMode>` + made `App.tsx` renderer init idempotent (StrictMode double-invokes effects in dev — the renderer init had to become safe to run twice).
- `13dc483` — Bumped ecosystem dependencies (minor/patch).
- `5697d16` — Fixed rules-of-hooks violation in `InfiniteGrid`.
- `6c9f414` — Applied `useEffectEvent` (React 19.2) to TurnstileWidget callbacks (stops stale-closure issues without bloating effect deps).
- `f18c917` — Added `@typescript/native-preview` (tsgo, the TS 7 preview compiler) as a fast `yarn typecheck` script alongside TS 6.
- `d382635` — Phase A: cleared all `react-hooks/exhaustive-deps` warnings via `useEffectEvent` or hoisting.
- `39eb2c6` — Phase C: cleared 4 set-state-in-effect violations on safe candidates.

### Phase 2: Infrastructure pillars (Query, Zustand, Vitest, mocks, Form Actions)

The next chunk laid down the long-term infrastructure that the rest of the modernization rests on.

#### `48d62c5` — Architecture refactor: docs + 5 pilot implementations + error boundary

Introduced `docs/ARCHITECTURE.md` (~370 lines) — a living document describing where the project stood, five proposed structural improvements (feature-folder migration, TanStack Query, Zustand, god-hook splits, Vitest), and the recommended order for the next refactor PRs. Concrete pilots delivered alongside:
- **Doorbell feature folder** — `src/features/doorbell/` with `views/`, `hooks/useDoorbellState.ts`, `hooks/useDoorbellActions.ts`. The split (data vs actions) became the canonical pattern. The folder structure itself was later reverted (commit `0755285`); the data/actions split survived.

#### `0755285` — Reverted feature-folder migration; kept classic `src/components/` + `src/hooks/`

Team feedback on the experiment was that `src/features/<feature>/` introduced cross-cutting friction without obvious wins. Reverted the folder migration but kept the split convention. From this point onward, every god-hook split lives in `src/hooks/<area>/use<Feature>State.ts` + `use<Feature>Actions.ts` + `use<Feature>Widget.ts` (deprecated shim).

#### `34b1b56` — Enable TanStack Query (proposal #2) + first real-data pilot on OfferView

- `yarn add @tanstack/react-query@5 @tanstack/react-query-devtools@5` (^5 matches React 19 peer).
- `src/index.tsx` mounts `QueryClientProvider` above `ErrorBoundary + Suspense`. Default config: `staleTime=30s`, `retry=1`, `refetchOnWindowFocus=false` (chat client, not a data dashboard).
- New adapter at `src/api/nitro-query/createNitroQuery.ts`. Exposes `useNitroQuery({ key, request, parser, select, timeoutMs })` (wraps TanStack's `useQuery`) and `awaitNitroResponse(...)` (lower-level helper). The internal promise registers the parser, dispatches the composer, resolves with `select(event)` on first matching parser, rejects after `timeoutMs` (default 15s), and always cleans up.
- **First pilot** — `OfferView` migrated from the previous `useMessageEventState + manual useEffect-send` pattern.

#### `fd1835c` — Enable Zustand (proposal #5) + convert `isCreatingRoom` singleton

- `yarn add zustand` (^5).
- `src/state/createNitroStore.ts` exports a re-export of zustand's `create` under the project-local name `createNitroStore`. Comments document the convention (one store per domain, subscribe to slices not the whole store).
- **First migration target** — `src/components/navigator/views/navigatorRoomCreatorStore.ts`. A Zustand store with `isCreating: boolean` and `beginCreate()` (latches the flag, dispatches an auto-reset `setTimeout` after 5s, replaces any in-flight timer on re-entry). The component drops two module-level `let` variables that React Compiler was flagging.

#### `6793de2` — Set up Vitest + 22 smoke tests on pure modules (proposal #6)

- `yarn add -D vitest@3 jsdom @testing-library/dom @testing-library/react @testing-library/jest-dom`. Vitest pinned to 3 — yarn 1's peer resolution breaks on vitest@4's peer link to vite.
- `vitest.config.mts` (separate from `vite.config.mjs` because the test runner shouldn't pull in the renderer SDK aliases).
- `tests/setup.ts` imports `@testing-library/jest-dom/vitest` for custom matchers.
- `tests/WiredCreatorTools.helpers.test.ts` (18 cases) covers the pure helpers extracted earlier — `createEmptyMonitorSnapshot`, `formatMonitorLatestOccurrence` (5 time-bucket branches), etc.

#### `22a44d1` — Added `useNitroEventState` / `useMessageEventState` hooks (proposal #1)

The "derived state from a single event" pattern. Replaces the two-step `useState + useNitroEvent(e => setState(...))` with a single call:

```ts
const foo = useNitroEventState(SomeEvent, e => e.payload, initial);
const data = useMessageEventState(SomeParser, e => e.getParser()?.field ?? null, null);
```

The selector is held in a `useLayoutEffect`-refreshed ref so the listener stays registered across renders.

#### `bb1238a` — Added `useExternalSnapshot` + `useNitroEventReducer` + `useMessageEventReducer` companion hooks

Pattern #1 family extended:
- `useExternalSnapshot` for subscribing to renderer-side snapshot getters via `useSyncExternalStore`.
- `useNitroEventReducer` / `useMessageEventReducer` for stateful event accumulation (reducer-style).

#### Other Phase 2 commits

- `9d2e4a7` — Expanded Vitest coverage on the pure helpers in `src/api/{utils,wired}`.
- `388fb8e` — Migrated `CatalogLayoutRoomAdsView`'s room-ad fetch to `useNitroQuery`.
- `bf84a0c` — `useNitroQuery` extended with an `accept()` predicate; two mod-tools chatlog views migrated.
- `bb28d25` — Vitest +16 cases on ColorUtils, FixedSizeStack, LocalizeFormattedNumber.
- `dbafc97` — Dropped unused login dialogs (dead code) + Vitest coverage on FriendlyTime.
- `f75762a` — Added `CLAUDE.md` + refreshed `docs/ARCHITECTURE.md`.
- `559d860` — Pilot: moved InfoStand event listeners to `useAvatarInfoWidget` owner.
- `8b7bedf` — Pilot: extracted `useInventoryFurni` reducers to a pure module.
- `b1729d8` — Vitest: covered `dedupeBadges` with 6 cases.
- `f1af6fb` — Docs: ARCHITECTURE pattern #1 — companions implemented, pilots adopted.
- `8e4544c` — Migrated `catalog/giftConfiguration` to `useNitroQuery`.

### Phase 3: Hook taxonomy and god-hook splits

The god-hook decomposition pattern was applied across many of the project's central hooks.

**Three-file flat-layout splits** (state + actions + deprecated shim, all flat in the hooks barrel directory):
- `0ae371e` — `useFurniChooserWidget` split.
- `85fc827` — `useUserChooserWidget` split.
- `f3442f8` — `useFriendRequestWidget` split.
- `7218285` — `usePollWidget` split into subscriptions + actions (proposal #4).
- `419de09` — Hoisted `usePollSubscriptions` to `RoomWidgetsView`; dropped the side effect from `usePollWidget`.
- `a4c9dd8` — `useChatInputWidget` split.

**`useBetween`-based singleton-filter splits** for hooks shared by many consumers:
- `e1f5df6` — `useWiredTools` split into state + actions via `useBetween` singleton.
- `eeb9cc6` — `useTranslation` split via `useBetween` singleton.
- `5344eaf` — `useNotification` split via `useBetween` singleton.
- `9f3cd9b` — `useFriends` split via `useBetween` singleton.

#### Catalog three-way split (the most extensive decomposition)

- `fd3ef78` — Extracted pure helpers from `useCatalog` (`buildCatalogNodeTree`, `findNodeById`/`findNodeByName`, `getNodesByOfferIdFromMap`, `getOfferProductKeys`, `normalizeCatalogType`, `resolveBuilderFurniPlaceableStatus`) into `src/hooks/catalog/useCatalog.helpers.ts`. **+34 Vitest cases** on the pure helpers.
- `59d6c4c` — Three-way singleton-filter split: `useCatalogData` / `useCatalogUiState` / `useCatalogActions`. First 3 consumer migrations.
- `0f9fa12` — Migrated remaining 36 `useCatalog()` consumers to the three filters. Deprecated `useCatalog` shim removed. Every consumer now subscribes only to the slice it actually reads, which restores React Compiler memoization and stops catalog-wide re-renders on unrelated key changes.

#### useNitroQuery adoption widening

- `2d9785e` — `useUserGroups`: consolidated 4 dedup'd `CatalogGroupsComposer` call sites.
- `2a5b9a4` — `useClubOffers`: per-`windowId` TanStack query for HC offer pages.
- `3947781` — `useSellablePetPalette(breed)`: per-breed TanStack query for pet picker.
- `9a807bf` — `useMarketplaceConfiguration`: lifted the marketplace config self-fetch.
- `7b06229` — `useClubGifts` + `useNitroEventInvalidator`: closed the catalogOptions bag (composer/parser request-response with server-driven invalidation).
- `8b79233` — Extracted `useCatalogFavorites` pure helpers + 16 Vitest cases.

### Phase 4: WiredCreatorTools extraction and Zustand hoists

The `WiredCreatorTools` panel was the largest single component in the codebase. Phase 4 took it apart progressively.

#### File extractions

- `5d8717d` — Split `WiredCreatorToolsView`: extracted types/constants/helpers into 3 sibling files (`WiredCreatorTools.types.ts`, `WiredCreatorTools.constants.ts`, `WiredCreatorTools.helpers.ts`).
- `23fc302` — Extracted Variables tab JSX into `WiredVariablesTabView` component.
- `d7d9a7e` — Extracted Inspection tab JSX into `WiredInspectionTabView` component.
- `bb09a56` — Extracted Monitor tab JSX into `WiredMonitorTabView` + dropped dead overlays.

#### Progressive Zustand hoists (each its own commit for revertability)

- `c16ac1d` — **UI flags hoisted** to `useWiredCreatorToolsUiStore`: 14 pure UI flags (`isVisible`, `activeTab`, `inspectionType`, `variablesType`, modal/popover opens, monitor and variable-manage filters/sort/page). Setters accept value-or-updater. `WiredInspectionTabView` and `WiredVariablesTabView` drop 6 props.
- `eb8d879` — Docs follow-up (CLAUDE: store adoption + test count bump).
- `82bccd4` — **monitorSnapshot hoisted** + polling reset. Server-pushed stats now survive panel close/reopen.
- `7758af7` — Docs: vitest count bump after monitorSnapshot cases.
- `8182e06` — **Selection hoisted** (`selectedFurni`, `selectedFurniLiveState`, `selectedUser`, `selectedUserLiveState`, `selectedUserActionVersion`). Listeners (`useObjectSelectedEvent`, per-kind `useMessageEvent` handlers) stay in the component (need React lifecycle) and call store actions. Live-state setters keep the `Updater<T>` shape so the ~10 `previousValue => ...` call sites stay verbatim.
- `50fd908` — Docs: vitest count bump.
- `0fc32a1` — **Variable-highlight hoisted** (`isVariableHighlightActive` toggle + `variableHighlightOverlays` screen-coords array). `WiredVariablesTabView` drops two more props. The two screen-coords recompute effects stay in the component (need React lifecycle for `WiredSelectionVisualizer` install/teardown). `variableHighlightObjectsRef` stays as `useRef` (refs don't belong in Zustand).
- `c1aafff` — Docs: vitest count bump.
- `181ca09` — **Inline editor hoisted** (`editingVariable` / `editingValue` / `editingManagedHolderVariableId` / `editingManagedHolderValue`). `WiredInspectionTabView` drops three more props. `shouldPauseVariableSnapshotRefresh` still reads from the same store-backed values.
- `438b47d` — Docs: vitest count bump to 193/193.

#### Final picker hoists (2026-05-18 session — three commits closing the roadmap)

- `ba77806` — **Variable-key records hoisted** (`selectedInspectionVariableKeys`, `selectedVariableKeys`). Setter shape `Updater<Record<...Type, string>>` because all writers used `prev => ({ ...prev, [type]: key })`. Empty defaults — the existing definition-sync effect at `WiredCreatorToolsView.tsx:1543-1574` populates them on first render. **+4 test cases**.
- `8894fcc` — **Inspection give pickers hoisted** (`inspectionGiveVariableItemId`, `inspectionGiveValue`). Plain typed setters, sentinel pair `0`/`'0'`. **+2 test cases**.
- `1c2d8da` — **Managed-holder give picker chain hoisted** (`selectedManagedVariableEntry`, `selectedManagedHolderVariableId`, `managedGiveVariableItemId`, `managedGiveValue`). Cascade reset effects at 2265-2307 stay in the component. **+4 test cases**.

**Roadmap result:** every `useState` left in `WiredCreatorToolsView.tsx` after `1c2d8da` is genuinely transient (`keepSelected`, `globalClock`, `roomEnteredAt`, `selectedMonitorErrorType`, `selectedMonitorLogDetails`) — none would benefit from store-backed persistence.

### Phase 5: Typecheck cleanup (Pixi v8, TS 6, framer-motion)

A separate sweep aimed at getting `yarn typecheck` to 0 errors (initial state was ~50+ errors carried over from prior version bumps).

- `b5eeb68` — Typed `framer-motion variants` as `Variants` — killed 33 tsgo errors.
- `96b61ff` — Fixed 4 typecheck errors in `createNitroQuery`.
- `feba672` — Sweep: union expansions + React 19 JSX + extra arg.
- `1083b2e` — Typed `useFurniChooserState` builders + dropped dead `getUserData` guard.
- `a39aa37` — React 19: `useRef<T>() → useRef<T>(null)` across 15 sites (React 19 made this required at the type level).
- `f57266a` — Updated 3 `IGetImageListener.imageReady` call sites to Pixi v8 single-arg signature.
- `a8065f6` — Added optional `clone()` to `IPurchasableOffer`.
- `71a1586` — Stripped dead server-sync from `UiSettingsContext` + re-exported `ui-settings`.
- `0192952` — Sweep: 11 fixes across 9 files.
- `2a9a5dd` — Added `react-colorful` dep for `InterfaceColorTabView`.
- `f09bb7e` — Pixi v8 alignment in 2 room-widget helpers.
- `0c43377` — Dropped dead `await success` on fire-and-forget catalog-admin actions.
- `68de96c` — Last-mile typecheck sweep: 3 small bugs.

### Phase 6: Error boundaries and logic-bug fixes

#### `WidgetErrorBoundary` framework

`src/common/error-boundary/WidgetErrorBoundary.tsx` wraps any in-room widget tree so a crash degrades gracefully (logs to NitroLogger, falls back to `null`). Applied at `RoomWidgetsView` as an umbrella initially:
- `ab93113` — Wrapped each room + furniture widget (13 room widgets + 20 furniture widgets) in its own `WidgetErrorBoundary` so a crash in one widget no longer takes down its siblings.

#### Logic-bug fixes documented during the modernization

- `81656e7` — Fixed two logic bugs found while refactoring + documented the open ones in `docs/ARCHITECTURE.md`.
- `9d10e52` — **Fix(MainView):** collapsed CREATED/ENDED listeners into a session-aware reducer. The previous two-effect pattern had a race: a `RoomSessionEvent.ENDED` for a stale session could clear the current session's state if it arrived after `CREATED`. The reducer now compares session tokens.
- `97c9717` — **Fix(layout-image):** guarded async image fetch with a `requestIdRef`. Resolved a race where props changed twice in quick succession could land the second fetch's result first, then the first's, overwriting valid data with stale.
- `b01f09c` — `fix`: null-check the set type before reading `.paletteID` in avatar editor.

### Phase 7: Test infrastructure evolution

- `6793de2` — Vitest setup + 22 initial smoke tests (covered in Phase 2).
- `bb28d25` — +16 cases on ColorUtils / FixedSizeStack / LocalizeFormattedNumber.
- `dbafc97` — Vitest coverage on FriendlyTime; dropped dead login dialogs.
- `b1729d8` — `dedupeBadges` with 6 cases.
- `3c732f1` — `avatarInfo` reducers with 14 cases.
- `c401839` — **Renderer-SDK mock layer** at `tests/mocks/renderer-mock.ts` (later flattened to `src/nitro-renderer.mock.ts`). Stubs:
  - Explicit behavioral stubs for symbols tests actually exercise (`NitroLogger`, `GetEventDispatcher`, `mockEventDispatcher` helpers, `RoomSessionDoorbellEvent`).
  - String-keyed Proxy enums for `NitroEventType`, `RoomObjectCategory`, `AvatarFigurePartType`.
  - Lightweight `class StubClass {}` placeholders for ~30 Pixi and gameplay classes the `src/api/*` barrel touches.
  - Singleton getters returning chainable Proxies.
  - First 2 component-/hook-level pilots: `WidgetErrorBoundary` (4 tests) + `useDoorbellState` (7 tests).
- `fd3ef78` — Catalog pure-helper extraction + 34 Vitest cases.
- `8b79233` — `useCatalogFavorites` pure helpers + 16 Vitest cases.
- `8b4308a` — **Tests co-located** under `src/` — every `*.test.ts(x)` moved next to its subject.
- `803de20` — Flattened renderer mock to `src/nitro-renderer.mock.ts` (dropped `__mocks__/`).

### Phase 8: CI pipeline

- `8844cc1` — `ci`: ran typecheck + Vitest on every push to `main` / `feat/**` and on every PR. Workflow at `.github/workflows/ci.yml`.
- `53fc5f0` — `ci`: created renderer symlink AFTER `yarn install`, not before (yarn install would otherwise nuke the symlink).
- `5d7a20a` — `ci`: used absolute symlink target + checked out `feat/react19-event-bus` on the renderer fork.
- `cb7502f` — `ci`: opted JavaScript actions into Node.js 24.

### Phase 9: Upstream cherry-picks (PR #126) and drive-by bugs

Mid-modernization, two upstream commits from duckietm/Nitro-V3 PR #126 were cherry-picked into the branch so the modernization branch would carry features still pending upstream merge:

- `52b0c90` — Merge commit from PR #126 (merge of upstream into the local branch — at this stage upstream had not yet reached `b2318b9`).
- `53b0c90` `53f41cd` `2053c8e` — Fix wear badge popup + `UserAccountSettingsView` (reset password / email / username under user settings).
- `3a7c9ba` — Same wear-badge popup fix (rebased version).
- `9ef6983` — Post-cherry-pick: restored `useEffectEvent` wrapper + fixed configuration import (the cherry-pick's mechanical drift broke a few wires).
- `622d73c` — Docs: reflected PR #126 cherry-pick + boot/asset infrastructure.

**Boot/asset infrastructure** went in here too:
- `45620ca` — `vite`: actually split the renderer into its own chunk.
- `cd8951e` — `dev`: served game assets via `sirv` plugin and pre-init configuration. The chokidar-on-177k-files problem on Windows: serving game assets through `sirv` middleware mounted on `/nitro-assets` and `/swf` reading from `E:\Users\simol\Desktop\DEV\Nitro-Files\` bypasses chokidar entirely. The plugin also wires the same handler into `configurePreviewServer`. Same commit introduced `await GetConfiguration().init()` in `src/bootstrap.ts` before importing `./index` — otherwise the first paint flooded with "Missing configuration key" warnings while components synchronously read keys against an empty store.
- `35b8493` — `vite`: failed fast with a setup hint when the renderer SDK is missing.
- `8e0bcce` — Added `yarn preview` script for serving the production build.

#### Other Phase 9 commits

- `7cf01b0` — Docs: refresh ARCHITECTURE + CLAUDE.
- `cc225bd` — Docs: comprehensive refresh after React 19 modernization round.

### Phase 10: Toolbar spam-toggle fix (PR #130 upstream)

`4ab38d3` — **toolbar: always-mount nav rows + drive show/hide via framer variants**. Replaced the outer `AnimatePresence` wrapper around the four toolbar rows (desktop backplate, left-nav, right-nav, mobile-nav) with always-mounted `motion.div` elements driven by an `isVisible`-derived variant string (`'visible'` or `'hidden'`).

**The bug it fixed:** rapid clicks on the show/hide chevron previously left motion children in inconsistent intermediate states (stuck opacity 0, phantom scale 0.8) because `AnimatePresence + Fragment + multiple keyed children` breaks when enter/exit cycles overlap. With variants, framer-motion's spring solver picks up from the current animated value on each retarget, so spam-clicking just settles smoothly toward whichever target is current.

Refactor details:
- `containerVariants` dropped its `'exit'` state (now lives in `'hidden'`).
- `itemVariants` dropped `'exit'` as well.
- New `shellVariants` for the backplate.
- `pointer-events` animated per-variant (`'auto'` visible / `'none'` hidden) instead of pinned via a Tailwind class, so hidden rows don't intercept clicks.
- Wrapper variants computed inside the component because `leftNavVariants.hidden` depends on `isInRoom` (nav slides in from the side in-room, from the bottom otherwise).
- Variant inheritance: outer wrapper drives `'visible'`/`'hidden'`; inner container and items inherit via framer's variant propagation, so stagger runs in both directions without needing `AnimatePresence`.
- Inner `AnimatePresence` around the Me popover stays (it has a single child, no spam-toggle risk).

The same fix opened upstream as **PR #130** on `duckietm/Nitro-V3` (branch `simoleo89:fix/toolbar-spam-show-hide`).

### Phase 11: Full upstream sync (origin/Dev b2318b9)

After Phase 10, the local branch was 98 commits ahead of `origin/Dev`. Upstream had 10 commits the branch needed to absorb. Done in the 2026-05-18 session.

- Tagged rollback: `pre-upstream-merge-20260518` at `4ab38d3`.
- `git merge --no-ff origin/Dev` produced 6 conflicts in `package.json`, `src/App.tsx`, `src/bootstrap.ts`, `src/components/login/LoginView.tsx`, `src/components/notification-center/views/bubble-layouts/NotificationBadgeReceivedBubbleView.tsx`, `vite.config.mjs`, `yarn.lock`.
- Resolution: kept modernized structure on the conflict files, surgically applied upstream intent where it added value (`json5` dep, `JSON5.parse` fallback in `bootstrap.ts`, `base` config in `vite.config.mjs`). The `persistAccessTokenFromPayload(payload)` upstream fix in `LoginView.tsx` was already present in the modernized Form Actions SSO branch — no work needed.
- Two user-settings views auto-merged because the local branch had already cherry-picked the same commit (`cdf8d92` upstream = `2053c8e` local byte-for-byte).
- Five files came in upstream-only with no local divergence.
- `yarn.lock` regenerated via `git checkout --ours yarn.lock` then `yarn install`.

Verification: typecheck clean, Vitest 193/193 (preserved baseline), `yarn build` green.

Commit `779a98c` — merge commit. Followed by `3b35fa9` — CLAUDE.md refresh (TL;DR + wired-up table updated to reflect post-merge state with note about expected future conflict surface).

### Phase 12: Snapshot pattern consumer-side wiring + first migrations

After Phase 11 closed the WiredCreatorTools roadmap, the renderer side had six snapshot getters (Session, RoomSession, IgnoredUsers, GroupBadges, RoomUserList, SoundVolumes) but nothing on the client consumed them — `useExternalSnapshot` existed as a `useSyncExternalStore` wrapper, no widget was wired up to a snapshot.

#### `b2a86da` — React-side consumer hooks for the renderer snapshot pattern

New file [`src/hooks/session/useSessionSnapshots.ts`](../src/hooks/session/useSessionSnapshots.ts) exposes eight thin hooks, each a `useExternalSnapshot` wrapper around the matching subscribe + getter pair:

| Hook | Returns |
|---|---|
| `useUserDataSnapshot()` | `Readonly<IUserDataSnapshot>` |
| `useActiveRoomSessionSnapshot()` | `Readonly<IRoomSessionSnapshot> \| null` |
| `useIgnoredUsersSnapshot()` | `ReadonlyArray<string>` |
| `useIsUserIgnored(name)` | `boolean` (memoized) |
| `useGroupBadgesSnapshot()` | `ReadonlyMap<number, string>` |
| `useGroupBadge(groupId)` | `string` (memoized) |
| `useVolumesSnapshot()` | `Readonly<ISoundVolumesSnapshot>` |
| `useRoomUserListSnapshot()` | `ReadonlyArray<IRoomUserData>` |

Two design subtleties documented inline:
- `useRoomUserListSnapshot` subscribes to BOTH `ROOM_USER_LIST_UPDATED` (for join/leave/update inside the active session) AND `ROOM_SESSION_UPDATED` (because the underlying `userDataManager` reference flips when the active room changes). A module-level frozen `EMPTY_USER_LIST` is the fallback when no session is active, keeping reference stability across reads in the no-room state.
- `useIsUserIgnored` / `useGroupBadge` memoize the scalar derivation so a re-render only fires when the underlying snapshot reference flips, not on unrelated `useExternalSnapshot` wake-ups.

#### `71a0eee` — Migrate useSessionInfo to useUserDataSnapshot

First consumer migration. The old `useSessionInfo` carried three `useState` mirrors of session data (`userFigure` / `userRespectRemaining` / `petRespectRemaining`) driven by `useMessageEvent<UserInfoEvent>` + `useMessageEvent<FigureUpdateEvent>` + manual `setUser…` after `giveRespect`. Replaced with a single `useUserDataSnapshot()` read. `SessionDataManager` already invalidates its snapshot on every state change that mattered to the old hook (UserInfoEvent handler, FigureUpdateEvent listener, `giveRespect` / `givePetRespect`) — so the snapshot is a strict superset of the manual mirror.

Net result: 3 useState declarations + 2 useMessageEvent subscriptions removed; `respectUser` / `respectPet` become trivial pass-throughs because the manager's invalidate dispatches the event for us. `chatStyleId` stays on `useState` (driven by `UserSettingsEvent`, not in the snapshot). The deprecated `userInfo: UserInfoDataParser` field is dropped from the return shape — no in-tree consumer reads it.

#### `36addbe` — Reactive Ignore/Unignore menu entry via useIsUserIgnored

The Ignore ↔ Unignore context-menu entry in `AvatarInfoWidgetAvatarView` was driven by `avatarInfo.isIgnored` — a boolean captured by `AvatarInfoUtilities` once, at the time the avatar was clicked. If the user got ignored / unignored *while the popup was already open* (e.g. via the friends panel, or because a server push flipped the state), the menu kept showing the stale option and clicking it would no-op (or worse, double-ignore).

Switched the menu items to `useIsUserIgnored(avatarInfo.name)` — the reactive hook backed by `IgnoredUsersManager.getIgnoredUsersSnapshot()` + `NitroEventType.IGNORED_USERS_UPDATED`. The menu now flips automatically the moment the ignore list changes, without re-opening.

#### `02a396d` — docs(CLAUDE.md): refresh stale sections

Aligning `Nitro-V3/CLAUDE.md` with the current branch state:
- Adopted table: new row for the snapshot consumer hooks (pilots on `useSessionInfo` + `AvatarInfoWidgetAvatarView`); Vitest count bumped 193 → 203; Zustand row expanded to note the WiredCreatorTools panel-lifecycle hoist roadmap is fully closed.
- Not yet table: dropped the obsolete "hoist Wired Creator Tools derived state" row; added a new row for migrating remaining session-data mirrors.
- New "Patterns to use" entry at the top documenting the 8-hook `useSessionSnapshots` menu.
- "Known open logic bugs" replaced with a "no open bugs" entry (both previously-open races are closed in `9d10e52` and `97c9717`).

---

## 3. Nitro_Render_V3 renderer — branch story

### Phase 1: v2.1.0 React-friendly API additions

`87cf478` — **feat(events,session): add React-friendly subscribe APIs and snapshot getters**. The single foundational commit that gave the branch its name. Backwards-compatible additions needed to consume the renderer from React 19 hooks (`useSyncExternalStore`, `use()`, TanStack Query):

- `EventDispatcher.subscribe(type, cb): () => void` — unsubscriber-returning wrapper matching the `useSyncExternalStore` subscribe signature. Legacy `addEventListener` / `removeEventListener` still work.
- `CommunicationManager.subscribeMessage(eventCtor, handler): () => void` — packet-stream equivalent.
- `SessionDataManager.getUserDataSnapshot(): Readonly<IUserDataSnapshot>` — referentially-stable read-only view invalidated through the new `SESSION_DATA_UPDATED` event.
- `RoomSessionManager.getActiveRoomSessionSnapshot(): Readonly<IRoomSessionSnapshot> | null` — same pattern, invalidated through `ROOM_SESSION_UPDATED`.

The interface contracts:
- `packages/api/src/nitro/session/IUserDataSnapshot.ts`
- `packages/api/src/nitro/session/IRoomSessionSnapshot.ts`

Bumped renderer to **2.1.0**.

### Phase 2: TypeScript 6 + tsgo migration

- `c7a5aea` — Bumped TypeScript `5.8 → 6.0`. Added `@typescript/native-preview` (tsgo, the TS 7 preview compiler) as `yarn compile:fast` (~7× faster: 2.5s vs 17.6s). Tsconfig cleanup ahead of TypeScript 7 deprecations:
  - Removed `baseUrl` (unused).
  - Removed `downlevelIteration` (target ES2022 makes it a no-op).
  - `moduleResolution`: `"Node"` → `"bundler"`.
  - Compile errors: 28 → 29 (TS 6's tightened lib types flagged two pre-existing `crypto` calls).
- `ddb7222` — Bumped TypeScript pins to `^6.0.3` across all 12 workspaces + thumbmarkjs 1.9. Added `CLAUDE.md` to the renderer.
- `e82d3e0` — `chore(types)`: augmented `ImportMeta` with `glob` signature.

### Phase 3: API interface alignments (IRoomSession)

`afb5f33` — **fix(api): IRoomSession.password + sendBackgroundMessage + optional chatColour**. The `IRoomSession` interface was missing three things that always existed on the `RoomSession` implementation class:
- `password: string` — the room session's join password (used by the reconnect flow in `RoomSessionManager`).
- `sendBackgroundMessage(backgroundImage, backgroundStand, backgroundOverlay, backgroundCard?)` — sends the profile-background composer (used by the React client's `BackgroundsView`).
- `sendChatMessage` / `sendShoutMessage` `chatColour` parameter relaxed to optional. The implementation already accepted `undefined`; every historical call site in the React client passes only 2 args.

Net renderer typecheck: 26 → 23. Dropped 7 errors on the consumer side after the workspace link picked up the change.

### Phase 4: TS 5.7+ ArrayBuffer drift fixes

`c37171a` — **TS 5.7+ ArrayBuffer drift: cast where ArrayBufferLike leaked**. The renderer never uses `SharedArrayBuffer`, so the type-level narrowings are safe. Sites cast:
- `BinaryReader` / `BinaryWriter` — `getBuffer()` / `toArrayBuffer()`.
- `WsSessionCrypto.randomNonce()`.
- `ArrayBufferToBase64`.

### Phase 5: Pixi v8 alignment

`5ea3201` — **Align with Pixi v8: Filter[] union, WebGLRenderer narrow, ImageLike**. Four sites where Pixi v8's stricter typing tripped tsgo:

- `AvatarImage`: `container.filters` is `readonly Filter[] | null` in v8. Old fallback branch `else container.filters = [container.filters, …]` tried to treat a readonly array as a single Filter. Collapsed to the array-spread path which covers both undefined and non-empty cases.
- `FurnitureBadgeDisplayVisualization.updateSprite()` had a 4-arg override `(sprite, asset, scale, layerId)` of the parent's 2-arg `(scale, layerId)` signature. Refactored to fetch the sprite via `this.getSprite(layerId)` inside the override body.
- `ExtendedSprite`: `renderer.gl` / `glRenderTarget.resolveTargetFramebuffer` exist only on `WebGLRenderer` / `GlRenderTarget`. The runtime check `renderer.type === RendererType.WEBGL` guarantees this; cast at the boundary.
- `TextureUtils.generateImage`: Pixi v8's `Extractor.image()` returns the union `ImageLike` (`HTMLCanvasElement | HTMLImageElement`); the public signature promises `HTMLImageElement`. Cast at return.

### Phase 6: Composer/parser alignment with Arcturus

- `b42f989` — **RoomEnterComposer: optional `spawnX`/`spawnY` for reconnect**. Arcturus' `RequestRoomLoadEvent` reads the two extra ints only when the inbound packet has 8+ bytes remaining, so the renderer can send 2-arg or 4-arg payloads against the same header. The client already called the 4-arg variant in two places inside `RoomSession`/`RoomSessionManager` — the composer signature was lagging behind.
- `0fc38a1` — Fixed self-referential `ConstructorParameters` in two Wired composers (`WiredRoomSettingsRequestComposer`, `WiredUserVariablesRequestComposer` — empty-tuple composers needed explicit `getMessageArray(): []` annotation).
- `999b818` — Fixed `PetBreedingMessageParser.bytesAvailable < 12` (bytesAvailable is a boolean, not a byte count — the old code compared it against `12` which TS 6 caught).
- `ef6c661` — **Renderer: surface `allowUnderpass` on RoomSettingsData + composer**. Arcturus' `RoomSettingsComposer` appends an extra int at the end of the payload — `room.isAllowUnderpass() ? 1 : 0` — and `RoomSettingsSaveEvent` optionally reads back a boolean at the end (`if(bytesAvailable > 0)`). The renderer side never modeled this trailing field. Added the field + parser guard + optional trailing composer arg. Net client tsgo error count: 3 → 0 on the NavigatorRoomSettings cluster.
- `22d4e5b` — SocketConnection parser cast + RoomChatHandler arg-order fix.
- `f7a5897` — Renderer: aligned `NitroConfig` Window declaration with the client + fixed glob `.default` access.

### Phase 7: Dead code removal and small fixes

- `08d1efa` — **Drop dead `sendWhisperGroupMessage`**. `IRoomSession.sendWhisperGroupMessage(userId)` referenced a `ChatWhisperGroupComposer` that never existed in the codebase and had zero call sites in the React client. Both the interface declaration and the broken impl removed. The real whisper path is `RoomUnitChatWhisperComposer(recipientName, message, styleId)` — unchanged.
- `5f5ba2f` — Docs: documented recent `feat/react19-event-bus` additions in CLAUDE.md.

### Phase 8: Upstream sync (origin/main)

Done in the 2026-05-18 session. Zero file intersection between the 15 local commits and the 1 non-merge upstream commit (`b6a26fb` — small landscape-offset fix in `RoomPlane.ts`).

- Tagged rollback: `pre-upstream-merge-20260518` at `5f5ba2f`.
- `git merge --no-ff origin/main` auto-completed with no conflict prompts.
- Commit `820f791`.
- Verification: `yarn compile:fast` clean, Vitest 104/104.

### Phase 9: Snapshot pattern extensions

Five commits in the 2026-05-18 session extending the v2.1.0 snapshot pattern to four new state holders.

#### `98662e7` — BinaryReader / BinaryWriter round-trip Vitest coverage (23 cases)

Added comprehensive round-trip tests under `packages/utils/src/__tests__/BinaryReader.test.ts`:
- byte / short / int round-trips, including signed-edge values (int8 -1 from 0xFF, int16 / int32 boundaries)
- big-endian wire-order assertions on `writeShort` / `writeInt` (matches Arcturus's `DataInputStream`)
- string round-trip with length prefix + bare (`includeLength=false`) + UTF-8 multibyte byte count + empty-string edge
- `writeBytes` for both `number[]` and `ArrayBuffer` payloads
- `readBytes` slice returns an independent reader whose position is decoupled from the outer reader
- `remaining()` decrements correctly across mixed-size reads
- `readFloat` / `readDouble` decode IEEE-754 big-endian values (the writer has no float/double counterparts — buffer built via `DataView` for these cases)
- writer `position` getter + explicit setter (caller-managed reposition)
- two independent writers concatenate cleanly into a single reader

**Note:** retrospectively deprioritized — mid-session the user redirected with "anche se renderer devi ragione la ui, niente _tests_". Pure Vitest coverage growth on the renderer is no longer considered modernization progress; UI-affecting changes (rendering, API surface, perf) are preferred. The test commit was kept (no regression, useful safety net for any future BinaryReader changes) but flagged as not the kind of work to repeat by default. A feedback memory entry (`feedback_renderer_ui_over_tests.md`) captures this preference.

#### `a599e0c` — feat(session): snapshot getters for IgnoredUsersManager + GroupInformationManager

**`IgnoredUsersManager.getIgnoredUsersSnapshot(): ReadonlyArray<string>`** — wrapped the existing `_ignoredUsers: string[]` with a snapshot getter. Invalidation hooked into:
- `onIgnoredUsersEvent` (initial server-side list fetch).
- `addUserToIgnoreList` (ignore action result code 1 and 2).
- `removeUserFromIgnoreList` (unignore action result code 3).
- After the special `_ignoredUsers.shift()` operation that runs alongside `addUserToIgnoreList` for result code 2 (queue truncation) — added explicit `invalidateIgnoredUsersSnapshot()` after the shift so the dispatched event fires only once the truncation is complete.

**`GroupInformationManager.getGroupBadgesSnapshot(): ReadonlyMap<number, string>`** — wrapped `_groupBadges: Map<number, string>` with a snapshot getter. The `onGroupBadgesEvent` handler now compares each incoming badge against the cached value and only flips a `didChange` flag if an entry is new or actually changed. Invalidation fires only when `didChange === true`.

New `NitroEventType` members: `IGNORED_USERS_UPDATED`, `GROUP_BADGES_UPDATED`.

#### `761d8ff` — feat(session): snapshot getter for UserDataManager room user list

**`UserDataManager.getRoomUserListSnapshot(): ReadonlyArray<IRoomUserData>`** — the biggest snapshot in terms of invalidation surface. 11 mutation paths all wired:
`updateUserData`, `removeUserData`, `updateFigure`, `updateName`, `updateMotto`, `updateNickIcon`, `updateCustomization`, `updateBackground`, `updateAchievementScore`, `updatePetLevel`, `updatePetBreedingStatus`.

Design decision — **no deep-clone**: the inner `IRoomUserData` objects keep the existing in-place mutation semantics. Deep-cloning a snapshot of 30+ avatars on every server-pushed status event would defeat the snapshot's purpose. TSDoc on the interface explicitly documents that consumers should treat each entry as a *snapshot-at-time-of-read* and not retain references across invalidations.

Drive-by cleanup: `updatePetLevel` previously used an inline conditional; rewritten to use the explicit `if(!userData) return;` guard pattern shared by the surrounding methods.

New `NitroEventType` member: `ROOM_USER_LIST_UPDATED`.

#### `892d16b` — feat(sound): snapshot getter + volume-update event on SoundManager + bug fix

**`SoundManager.getVolumesSnapshot(): Readonly<ISoundVolumesSnapshot>`** — new `ISoundVolumesSnapshot { system, furni, trax }` interface. New `systemVolume` / `furniVolume` getters for parity with the pre-existing `traxVolume`.

**Drive-by bug fix — volume diff comparison was always wrong.** The previous `onEvent(SETTINGS_UPDATED)` handler compared `castedEvent.volumeFurni` (percent, e.g. `75`) against `this._volumeFurni` (the already-divided fraction, e.g. `0.75`). The check almost never reported "unchanged" for any real settings push. Both `updateFurniSamplesVolume` and `_musicController.updateVolume` were being called on every settings push regardless of whether the volume actually changed.

Fix: divide first into local variables, compare divided values against the stored fractions, then write. Also tracks `volumeSystemUpdated` for the new snapshot's invalidation event.

New `NitroEventType` member: `SOUND_VOLUMES_UPDATED`.

#### `d740f83` — refactor(parsers): flatten nested bytesAvailable guards

Two parsers had nested `if(wrapper.bytesAvailable)` chains making each new optional trailing block sit one extra indent deeper than the previous:

- **`UserProfileParser`** — optional trailing profile fields previously used nested `if(wrapper.bytesAvailable)` chains. Refactored to a flat early-return chain.
- **`GetGuestRoomResultMessageParser`** — 2 optional trailing tiers (hotelTimeZoneId + hotelCurrentTimeMs 2 strings, roomItemLimit 1 int). Previously 2 levels of nested `if`. Refactored to flat early-return.

Both files now follow the canonical pattern:

```ts
if(!wrapper.bytesAvailable) return true;
// block N reads
if(!wrapper.bytesAvailable) return true;
// block N+1 reads
…
```

Each block documented inline so the contract is obvious without cross-referencing Arcturus. Adding tier N+1 is now purely additive — no re-indentation of existing blocks.

An audit across all 29 parsers using `bytesAvailable` found exactly these two files with nested-guard chains. All other parsers either use a single optional trailing field or already used the flat pattern (`RoomUnitInfoParser` was the reference).

#### `28c552f` — docs(CLAUDE.md): document new snapshot getters + flat bytesAvailable pattern

Replaced the two-getter SessionData / RoomSession snapshot description in `Nitro_Render_V3/CLAUDE.md` with a six-row table covering every snapshot currently exposed:

| Manager | Getter | Invalidation event |
|---|---|---|
| `SessionDataManager` | `getUserDataSnapshot(): Readonly<IUserDataSnapshot>` | `SESSION_DATA_UPDATED` |
| `RoomSessionManager` | `getActiveRoomSessionSnapshot(): Readonly<IRoomSessionSnapshot> \| null` | `ROOM_SESSION_UPDATED` |
| `IgnoredUsersManager` | `getIgnoredUsersSnapshot(): ReadonlyArray<string>` | `IGNORED_USERS_UPDATED` |
| `GroupInformationManager` | `getGroupBadgesSnapshot(): ReadonlyMap<number, string>` | `GROUP_BADGES_UPDATED` |
| `UserDataManager` | `getRoomUserListSnapshot(): ReadonlyArray<IRoomUserData>` | `ROOM_USER_LIST_UPDATED` |
| `SoundManager` | `getVolumesSnapshot(): Readonly<ISoundVolumesSnapshot>` | `SOUND_VOLUMES_UPDATED` |

Plus a 3-step checklist for adding new ones and a dedicated section on the flat `bytesAvailable` early-return pattern as the canonical shape for optional-trailing-field parsers.

---

## 4. Arcturus emulator — upstream pull

In the same session, the Java emulator was brought from `e6093f9` (v4.1.14) to `efb4997` (v4.1.16) via a fast-forward pull from `origin/main` (duckietm). Zero local divergence existed; the FF pull absorbed 8 upstream commits:

- Version bumps to 4.1.15 and 4.1.16.
- Database migrations 000-019 reorganized under `Database Updates/Own_Database_RunFirst/`, with new files `010_Wired_Update.sql`, `018_Last_Username_Change.sql`, and a renamed `019_custom_nick_login_tokens_wired_message.sql`.
- New auth-related Java classes: `AccountChangeEndpoints`, `AccountCheckEndpoints`, `AuthHttpUtil`, `CorsOriginGate`, `RegistrationSupport`, `SessionEndpoints`, `StaticContentEndpoints`.
- `ChangeNameCommand.java` removed (replaced by API endpoints).
- Updates to `AboutCommand`, `CommandHandler`, `GuildManager`, multiple guild event handlers, `WebSocketChannelInitializer`.
- Default DB file renamed `FullDB.sql` → `FullDatabase.sql`.

Local working-tree modifications (customized `config.ini.example` shorter inline comments; untracked `Habbo-4.1.15-jar-with-dependencies.jar` and `emulator.cmd`) survived the pull intact. No push performed (local tracks `origin/main` directly).

Rollback tag: `pre-upstream-pull-20260518` at `e6093f9`.

---

## 5. Documentation evolution (CLAUDE.md / ARCHITECTURE.md)

Both branches maintained substantial in-tree documentation throughout their lifetime.

### Nitro-V3

**`docs/ARCHITECTURE.md`** (introduced in `48d62c5`) — Living long-form document describing where the project stands, the five structural proposals, and the next-PR recommended order. Updated across multiple commits as proposals landed:
- `0755285` — recorded the feature-folder reversion.
- `7218285` — proposal #4 landed (poll-widget split).
- `f1af6fb` — pattern #1 companions implemented, pilots adopted.
- `7cf01b0`, `cc225bd`, `622d73c` — comprehensive refresh sweeps.

**`Nitro-V3/CLAUDE.md`** (added in `f75762a`) — Project context summarized for Claude Code sessions. Refreshed across the modernization:
- `eb8d879`, `7758af7`, `50fd908`, `c1aafff`, `438b47d` — vitest count bumps after each hoist.
- `3b35fa9` — post-upstream-merge refresh.

### Nitro_Render_V3

**`Nitro_Render_V3/CLAUDE.md`** (added in `ddb7222`) — Renderer context for Claude Code sessions. Refreshed:
- `5f5ba2f` — documented feat/react19-event-bus additions.
- `28c552f` — documented new snapshot getters + flat bytesAvailable pattern.

---

## 6. Full commit index

### Nitro-V3 — `feat/react19-modernization` (109 commits, baseline `ae17619`)

#### Phase 1: React 19 baseline

| SHA | Subject |
|---|---|
| `cdf8d92` | 🆕 Added Reset password / Email and change username in user settings (upstream) |
| `a1bee1d` | React 19 modernization: forwardRef removal, Compiler, ErrorBoundary, Suspense, native <script> |
| `1b1e0c1` | React 19 Phase 3: login/forgot/register forms → useActionState + useFormStatus |
| `535fa71` | ESLint --fix: auto-fix brace-style, indent, semi, no-trailing-spaces |
| `25d51af` | Enable `<StrictMode>` + make App.tsx renderer init idempotent |
| `13dc483` | Bump ecosystem dependencies (minor/patch) |
| `5697d16` | Fix rules-of-hooks violation in InfiniteGrid |
| `6c9f414` | Apply useEffectEvent (React 19.2) to TurnstileWidget callbacks |
| `f18c917` | Add TypeScript 7 (tsgo) as fast type-checker alongside TS 6 |
| `d382635` | Phase A: clear all react-hooks/exhaustive-deps warnings via useEffectEvent or hoisting |
| `39eb2c6` | Phase C (targeted): clear 4 set-state-in-effect violations on safe candidates |

#### Phase 2: Infrastructure pillars

| SHA | Subject |
|---|---|
| `5d8717d` | Split WiredCreatorToolsView: extract types/constants/helpers into 3 sibling files |
| `22a44d1` | Add useNitroEventState / useMessageEventState hooks (proposal #1) |
| `48d62c5` | Architecture refactor: docs + 5 pilot implementations + error boundary |
| `81656e7` | Fix two logic bugs found while refactoring + document the open ones |
| `0755285` | Revert feature-folder migration; keep classic src/components + src/hooks layout |
| `34b1b56` | Enable React Query (proposal #2) + first real-data pilot on OfferView |
| `fd1835c` | Enable Zustand (proposal #5) + convert isCreatingRoom singleton |
| `6793de2` | Set up Vitest + 22 smoke tests on pure modules (proposal #6) |
| `7218285` | Split usePollWidget into subscriptions + actions (proposal #4) + doc update |
| `419de09` | Hoist usePollSubscriptions to RoomWidgetsView; drop the side effect from usePollWidget |
| `9d2e4a7` | Expand Vitest coverage on the pure helpers in src/api/{utils,wired} |
| `388fb8e` | Migrate CatalogLayoutRoomAdsView's room-ad fetch to useNitroQuery |
| `bf84a0c` | useNitroQuery: add accept() predicate; migrate two mod-tools chatlog views |
| `bb28d25` | Vitest: +16 cases on ColorUtils, FixedSizeStack, LocalizeFormattedNumber |
| `dbafc97` | Drop unused login dialogs (dead code) + Vitest coverage on FriendlyTime |
| `f75762a` | Add CLAUDE.md + refresh docs/ARCHITECTURE.md to current state |
| `bb1238a` | Add useExternalSnapshot + useNitroEventReducer + useMessageEventReducer hooks |

#### Phase 3: God-hook splits + tab extractions

| SHA | Subject |
|---|---|
| `559d860` | Pilot: move InfoStand event listeners to useAvatarInfoWidget owner |
| `8b7bedf` | Pilot: extract useInventoryFurni reducers to a pure module |
| `b1729d8` | Vitest: cover dedupeBadges with 6 cases |
| `f1af6fb` | docs: ARCHITECTURE pattern #1 — companions implemented, pilots adopted |
| `8e4544c` | Migrate catalog giftConfiguration to useNitroQuery |
| `23fc302` | Extract Variables tab JSX into WiredVariablesTabView component |
| `d7d9a7e` | Extract Inspection tab JSX into WiredInspectionTabView component |
| `bb09a56` | Extract Monitor tab JSX into WiredMonitorTabView + drop dead overlays |
| `0ae371e` | Split useFurniChooserWidget into state + actions (flat hooks layout) |
| `85fc827` | Split useUserChooserWidget into state + actions (flat hooks layout) |
| `f3442f8` | Split useFriendRequestWidget into state + actions (flat hooks layout) |
| `a4c9dd8` | Split useChatInputWidget into state + actions (flat hooks layout) |
| `e1f5df6` | Split useWiredTools into state + actions via useBetween singleton |
| `eeb9cc6` | Split useTranslation into state + actions via useBetween singleton |
| `5344eaf` | Split useNotification into state + actions via useBetween singleton |
| `9f3cd9b` | Split useFriends into state + actions via useBetween singleton |

#### Phase 4: useNitroQuery widening + catalog split

| SHA | Subject |
|---|---|
| `2d9785e` | useUserGroups: consolidate 4 dedup'd CatalogGroupsComposer call sites |
| `2a5b9a4` | useClubOffers: per-windowId TanStack query for HC offer pages |
| `3947781` | useSellablePetPalette(breed): per-breed TanStack query for pet picker |
| `9a807bf` | useMarketplaceConfiguration: lift the marketplace config self-fetch |
| `7b06229` | useClubGifts + useNitroEventInvalidator: close the catalogOptions bag |
| `8b79233` | Extract useCatalogFavorites pure helpers + 16 Vitest cases |
| `fd3ef78` | catalog: extract pure helpers + 34 cases, consume them from useCatalog |
| `59d6c4c` | catalog: three-way singleton-filter split + first 3 consumer migrations |
| `0f9fa12` | catalog: migrate remaining 36 useCatalog() consumers to the three filters |

#### Phase 5: Typecheck cleanup

| SHA | Subject |
|---|---|
| `b5eeb68` | Type framer-motion variants as Variants — kill 33 tsgo errors |
| `96b61ff` | Fix 4 typecheck errors in createNitroQuery |
| `feba672` | Sweep small typecheck nits: union expansions + React 19 JSX + extra arg |
| `1083b2e` | Type useFurniChooserState builders + drop dead getUserData guard |
| `a39aa37` | React 19: useRef<T>() -> useRef<T>(null) across 15 sites |
| `f57266a` | Update 3 IGetImageListener.imageReady call sites to v8 single-arg signature |
| `a8065f6` | Add optional clone() to IPurchasableOffer |
| `71a1586` | Strip dead server-sync from UiSettingsContext + re-export ui-settings |
| `0192952` | Sweep targeted typecheck errors: 11 fixes across 9 files |
| `2a9a5dd` | Add react-colorful dep for InterfaceColorTabView |
| `f09bb7e` | Pixi v8 alignment in 2 room-widget helpers |
| `0c43377` | Drop dead 'await success' on fire-and-forget catalog-admin actions |
| `68de96c` | Last-mile typecheck sweep: 3 small bugs |

#### Phase 6: Logic-bug fixes + WidgetErrorBoundary

| SHA | Subject |
|---|---|
| `9d10e52` | fix(MainView): collapse CREATED/ENDED listeners into a session-aware reducer |
| `97c9717` | fix(layout-image): guard async image fetch with a request-id ref |
| `ab93113` | widgets: wrap each room + furniture widget in its own WidgetErrorBoundary |
| `b01f09c` | fix: null-check the set type before reading .paletteID in avatar editor |

#### Phase 7: Test infrastructure evolution

| SHA | Subject |
|---|---|
| `c401839` | tests: add renderer-SDK mock layer + first 2 component-/hook-level pilots |
| `3c732f1` | Vitest +14 cases on avatarInfo reducers |
| `8b4308a` | tests: co-locate every Vitest suite next to its subject under src/ |
| `803de20` | tests: flatten renderer mock to src/nitro-renderer.mock.ts (drop __mocks__/) |

#### Phase 8: CI

| SHA | Subject |
|---|---|
| `8844cc1` | ci: run typecheck + Vitest on every push to main/feat/** and on every PR |
| `53fc5f0` | ci: create renderer symlink after yarn install, not before |
| `5d7a20a` | ci: use absolute symlink target + check out feat/react19-event-bus on the renderer fork |
| `cb7502f` | ci: opt the JavaScript actions into Node.js 24 |

#### Phase 9: PR #126 cherry-pick + asset infrastructure

| SHA | Subject |
|---|---|
| `35b8493` | vite: fail fast with a setup hint when the renderer SDK is missing |
| `53f41cd` | 🆙 Fix wear badge in popup |
| `52b0c90` | Merge pull request #126 from duckietm/Dev |
| `45620ca` | vite: actually split the renderer into its own chunk |
| `cd8951e` | dev: serve game assets via sirv plugin and pre-init configuration |
| `2053c8e` | 🆕 Added Reset password / Email and change username in user settings |
| `3a7c9ba` | 🆙 Fix wear badge in popup |
| `9ef6983` | post cherry-pick: restore useEffectEvent wrapper + fix configuration import |
| `622d73c` | docs: reflect PR #126 cherry-pick + boot/asset infrastructure |
| `8e0bcce` | Add yarn preview script for serving the production build |
| `7cf01b0` | docs: refresh ARCHITECTURE + CLAUDE with this session's work |
| `cc225bd` | docs: comprehensive refresh after the React 19 modernization round |

#### Phase 10: WiredCreatorTools Zustand hoists + Toolbar fix

| SHA | Subject |
|---|---|
| `c16ac1d` | wired-tools: hoist UI-only state flags to Zustand store |
| `eb8d879` | docs(claude): record wiredCreatorToolsUiStore adoption + new test count |
| `82bccd4` | wired-tools: hoist monitorSnapshot + polling reset to the Zustand store |
| `7758af7` | docs(claude): bump vitest count to 181/181 after monitorSnapshot cases |
| `8182e06` | wired-tools: hoist inspection selection (+ live state + action version) to the store |
| `50fd908` | docs(claude): bump vitest count to 187/187 after selection-hoist cases |
| `0fc32a1` | wired-tools: hoist variable-highlight toggle + overlays to the store |
| `c1aafff` | docs(claude): bump vitest count to 190/190 after highlight-hoist cases |
| `181ca09` | wired-tools: hoist inline editor state (variables + managed holder) to the store |
| `438b47d` | docs(claude): bump vitest count to 193/193 after editor-hoist cases |
| `4ab38d3` | toolbar: always-mount nav rows + drive show/hide via framer variants |

#### Phase 11: Upstream sync + final picker hoists (2026-05-18 session)

| SHA | Subject |
|---|---|
| `e209146` | 🆙 Update About screen (needs a emu change as well) (upstream) |
| `b2318b9` | 🆕 Added support for JSON5 (upstream) |
| `779a98c` | merge: sync upstream duckietm/Dev (b2318b9) into feat/react19-modernization |
| `3b35fa9` | docs(CLAUDE.md): refresh upstream-sync status after merging origin/Dev b2318b9 |
| `ba77806` | wired-tools(store): hoist variable-key records (selectedInspectionVariableKeys, selectedVariableKeys) |
| `8894fcc` | wired-tools(store): hoist inspection give pickers (inspectionGiveVariableItemId, inspectionGiveValue) |
| `1c2d8da` | wired-tools(store): hoist managed-holder give picker chain |

#### Phase 12: Snapshot consumer-side wiring + first migrations

| SHA | Subject |
|---|---|
| `e7e8bcc` | docs: full changelog for feat/react19-modernization + feat/react19-event-bus |
| `b2a86da` | feat(hooks/session): React-side consumer hooks for the renderer snapshot pattern |
| `71a0eee` | refactor(hooks/session): migrate useSessionInfo to useUserDataSnapshot |
| `36addbe` | fix(avatar-info): reactive Ignore/Unignore menu entry via useIsUserIgnored |
| `02a396d` | docs(CLAUDE.md): refresh stale sections — snapshot consumer hooks + closed bugs |

### Nitro_Render_V3 — `feat/react19-event-bus` (22 commits, baseline `98b03aa`)

| SHA | Subject |
|---|---|
| `87cf478` | feat(events,session): add React-friendly subscribe APIs and snapshot getters |
| `c7a5aea` | chore(ts): bump TypeScript 5.8 → 6.0 and add tsgo for fast type-checking |
| `ddb7222` | chore: bump TypeScript pins to ^6.0.3 across all 12 workspaces + thumbmarkjs 1.9 + add CLAUDE.md |
| `e82d3e0` | chore(types): augment ImportMeta with glob signature |
| `afb5f33` | fix(api): IRoomSession.password + sendBackgroundMessage + optional chatColour |
| `c37171a` | TS 5.7+ ArrayBuffer drift: cast where ArrayBufferLike leaked |
| `08d1efa` | Drop dead sendWhisperGroupMessage — composer never existed |
| `0fc38a1` | Fix self-referential ConstructorParameters in two Wired composers |
| `999b818` | Fix PetBreedingMessageParser bytesAvailable check |
| `b42f989` | RoomEnterComposer: optional spawnX/spawnY for reconnect |
| `5ea3201` | Align with Pixi v8: Filter[] union, WebGLRenderer narrow, ImageLike |
| `22d4e5b` | SocketConnection parser cast + RoomChatHandler arg-order fix |
| `f7a5897` | Renderer: align NitroConfig Window decl with client + fix glob .default access |
| `ef6c661` | Renderer: surface allowUnderpass on RoomSettingsData + composer |
| `5f5ba2f` | docs(claude): document recent feat/react19-event-bus additions |
| `b6a26fb` | 🆙 Small fix landscape's where a bit offset (upstream) |
| `e3078f0` | Merge pull request #69 from duckietm/Dev (upstream) |
| `820f791` | Merge remote-tracking branch 'origin/main' into feat/react19-event-bus |
| `98662e7` | test(utils): add BinaryReader / BinaryWriter round-trip coverage (23 cases) |
| `a599e0c` | feat(session): snapshot getters for IgnoredUsersManager + GroupInformationManager |
| `761d8ff` | feat(session): snapshot getter for UserDataManager room user list |
| `892d16b` | feat(sound): snapshot getter + volume-update event on SoundManager |
| `d740f83` | refactor(parsers): flatten nested bytesAvailable guards on UserProfile + GetGuestRoomResult |
| `28c552f` | docs(CLAUDE.md): document new snapshot getters + flat bytesAvailable pattern |

---

## 7. Final state matrix

### Repository state

| Repo | Branch | HEAD | Tracking | Push status |
|---|---|---|---|---|
| Nitro-V3 | `feat/react19-modernization` | `02a396d` | `simoleo/feat/react19-modernization` | up-to-date |
| Nitro_Render_V3 | `feat/react19-event-bus` | `28c552f` | `fork/feat/react19-event-bus` | up-to-date |
| Arcturus-Morningstar-Extended | `main` | `efb4997` (v4.1.16) | `origin/main` | up-to-date (no fork divergence) |
| NitroV3-Housekeeping | *(not touched)* | — | — | — |

### Verification gates

| Gate | Client | Renderer |
|---|---|---|
| Typecheck (`yarn typecheck` / `yarn compile:fast` — tsgo) | clean (0 errors) | clean (0 errors) |
| Vitest (`yarn test --run`) | **203/203** | **127/127** |
| Production build (`yarn build`) | green | n/a (library) |

### Test totals — evolution

The client started with 0 Vitest cases when the branch was opened. The renderer started with 0 too.

| Milestone | Client | Renderer |
|---|---|---|
| Branch open | 0 | 0 |
| After Vitest setup (`6793de2`) | 22 | — |
| After +16 ColorUtils etc (`bb28d25`) | 38 | — |
| After FriendlyTime (`dbafc97`) | ~50 | — |
| After dedupeBadges (`b1729d8`) | 56 | — |
| After avatarInfo reducers (`3c732f1`) | 70 | — |
| After catalog helpers (`fd3ef78`) | 104 | — |
| After useCatalogFavorites (`8b79233`) | 120 | — |
| After mock layer + first hook test (`c401839`) | ~133 | — |
| After all hoists pre-upstream-sync (`438b47d`) | 193 | — |
| After Phase 11 picker hoists (`1c2d8da`) | **203** | — |
| Renderer Vitest baseline (utility suites) | — | 104 |
| After BinaryReader tests (`98662e7`) | — | **127** |

### Public-API additions on the renderer (consumed by the React client)

| Surface | Commit | Type |
|---|---|---|
| `EventDispatcher.subscribe(type, cb): () => void` | `87cf478` | new |
| `CommunicationManager.subscribeMessage(eventCtor, handler): () => void` | `87cf478` | new |
| `SessionDataManager.getUserDataSnapshot()` + `IUserDataSnapshot` + `SESSION_DATA_UPDATED` | `87cf478` | new |
| `RoomSessionManager.getActiveRoomSessionSnapshot()` + `IRoomSessionSnapshot` + `ROOM_SESSION_UPDATED` | `87cf478` | new |
| `IRoomSession.password` (interface caught up to impl) | `afb5f33` | interface fix |
| `IRoomSession.sendBackgroundMessage(image, stand, overlay, card?)` (interface caught up to impl) | `afb5f33` | interface fix |
| `IRoomSession.sendChatMessage` / `sendShoutMessage` — `chatColour` optional | `afb5f33` | signature relax |
| `RoomEnterComposer(roomId, password?, spawnX?, spawnY?)` — 4-arg variant | `b42f989` | extension |
| `RoomSettingsData.allowUnderpass` + parser + composer arg | `ef6c661` | extension |
| `IgnoredUsersManager.getIgnoredUsersSnapshot()` + `IGNORED_USERS_UPDATED` | `a599e0c` | new |
| `GroupInformationManager.getGroupBadgesSnapshot()` + `GROUP_BADGES_UPDATED` | `a599e0c` | new |
| `UserDataManager.getRoomUserListSnapshot()` + `ROOM_USER_LIST_UPDATED` | `761d8ff` | new |
| `SoundManager.getVolumesSnapshot()` + `systemVolume`/`furniVolume` getters + `ISoundVolumesSnapshot` + `SOUND_VOLUMES_UPDATED` | `892d16b` | new |

### Bugs fixed during the modernization

| Bug | Commit | Repo | Severity |
|---|---|---|---|
| MainView CREATED/ENDED race (no session token guard) | `9d10e52` | client | medium — could clear current session state |
| LayoutImage async fetch race when props change twice quickly | `97c9717` | client | medium — stale image overwrites valid one |
| InfiniteGrid rules-of-hooks violation | `5697d16` | client | low — lint, no functional bug |
| Avatar editor `.paletteID` null-deref | `b01f09c` | client | low |
| Toolbar spam-toggle leaving children at opacity 0 / scale 0.8 | `4ab38d3` | client | medium — visible UI bug, also opened upstream as PR #130 |
| Two logic bugs found during refactor (documented) | `81656e7` | client | low–medium |
| `PetBreedingMessageParser.bytesAvailable < 12` comparing boolean against number | `999b818` | renderer | high — incorrect parse on common path |
| `ChatWhisperGroupComposer` never existed but was declared on the interface | `08d1efa` | renderer | low — dead code |
| `SoundManager` volume diff comparison (percent vs fraction) | `892d16b` | renderer | medium — every settings push fired updateFurniSamplesVolume + musicController.updateVolume regardless of whether the volume changed |
| Two Wired composers had self-referential `ConstructorParameters` | `0fc38a1` | renderer | low — typecheck only |

### Rollback safety tags (local-only, session-private)

| Repo | Tag | Points at |
|---|---|---|
| Nitro-V3 | `pre-upstream-merge-20260518` | `4ab38d3` |
| Nitro_Render_V3 | `pre-upstream-merge-20260518` | `5f5ba2f` |
| Arcturus-Morningstar-Extended | `pre-upstream-pull-20260518` | `e6093f9` |
