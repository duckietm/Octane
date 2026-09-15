# Habbicons collection AIR skins

## Scope and baseline

User reference: attached AIR collection screenshot (approximately 2× native scale). Implement the collection book chrome, geometry, border/shadow skins and visible states while preserving the existing catalogue/shop/reward actions. Octane baseline: 7585d769, origin/Dev on 2026-09-15. Isolated worktree: octane, bugfix/habbicons-air-skins. No deployment authorized.

## Qualified evidence

AIR WIN63-202609091217-117204808; reference/habbo-air-WIN63-202609091217-117204808, verified with verify-air-bundle.sh. SWF SHA256 a4f23900ccef102a514346a8acc9474766ec592f51f58ade3b0527faa6d0eb07.
All following paths are relative to this bundle's decompiled/.

- scripts/HabboCatalogCom.as binds habbicon_view_xml to class_828, binaryData/1686_class_828.bin.
- scripts/com/sulake/habbo/catalog/habbicons/HabbiconView.as builds this XML, extracts tile templates and changes selected set/tab/popup state.
- HabbiconAlbumHeaderView refresh updates only stats/progress; it does not remove stat border fills.
- HabbiconSetRailRowView.updateLook uses row colours f0cf86 (selected), fff2c6 (hover), f8ebd6 (default); region backgrounds are non-painted hit areas.
- HabbiconTileView.updateLook supplies separate owned/unowned hover/active colours; refresh applies ColorTransform (.35,.35,.35,.65,90,85,80,0) and locked overlay to unowned nonclaimable images.
- HabbiconProgressBarView: incomplete #54a8e8, complete #78c95c, 4px fill cap overshoot clipped by progress width; highlight and stroke from XML.
- HabbiconRewardPanelView.refresh keeps disabled Claim on locked rewards, switches Claim/Claimed, and shows separate buy panel only for purchasable locked rewards. Constructor is a known decompile failure: recover separately before citing constructor.
- binaryData/2319_class_836.bin resolves border 2=colorless, 3=slot, 4=thin dark, 6=Ubuntu inset, 7=Ubuntu thin, 10=colorless dropshadow; button 5=shiny default; tab 3=Ubuntu tab.
- BitmapSkinRenderer.configureWindowColorTransform multiplies RGB but explicitly sets alphaMultiplier=1. A zero alpha byte in a skin's color is NOT transparent skin output. This caused the missing stat fills in the current port.

## Geometry (native CSS pixels, relative to content unless stated)

| Element | Position and size | Skin/layer |
| --- | --- | --- |
| Frame | 560×570; content (3,36) | shared frame 3, shadow distance 4 at 45°, alpha .349 |
| Album background | 0,0,554,530 | border 3 #d7d1be |
| Header outer / inner | -2,-3,558,110 / 2,2,554,106 | outer #2b7aa0, inner border 3 #1f5d78 |
| Header pattern | inner -1,2,554,110 | bitmap bg_pattern_001, blend .16 |
| Logo | inner 18,20,66,70 | original bitmap |
| Copy | inner 100,14 title; 100,39 subtitle | Ubuntu 18 bold / 11 regular |
| Stats | inner 331,12 and 443,12; 102×42 | border 7 #41aad3 |
| Album progress | inner 102,79; 304×18 | round_rectangle, black 1px stroke |
| Tabs | 7,113,540,33 | tab context: runtime layout must include strip insets |
| All sets | 7,146,540,380 | rail + page |
| Rail / list | 0,0,154,380 / 4,4,145,372 | border 6; rows 50 high + spacing 1 |
| Rail row | background 1,1,145,49 | border 10, clip to row; icon 7,4; title 50,7; progress 53,28,69,12 |
| Set page | 160,0,380,380 | separate header/background |
| Page header | 0,2,380,92, painted height 91 | border 10 #e0cba6 |
| Page background | 0,98,380,282 | border 10 #f6ebd7 |
| Set progress | page 14,67,154,16 | round_rectangle, black 1px stroke |
| Grid | page 8,106,234,266 | 4 columns 50×50, spacing 4, min 20 tiles |
| Tile | background 1,1,48,48; border 0,0,50,50 | border 2 overlays background; bitmap 5,5,40,40; locked overlay; markers last |
| Reward | page 252,106,116,152 | border 3 #e7d5b2; title y9; icon frame 35,32,46,46; description y84; button 8,116,100,28 |
| Buy set | page 252,267,116,71 | separate border 3, not part of reward fill |
| Tray | 7,146,540,380 | border 3; scroll groups at 10,59,526,310; border 10 group rows |
| Popup | width 180; runtime-sized | border 4 #efefef, bottom pointer, button 5 |

## States and preservation

Check All Sets / Owned / Favorited, selected and hover set, owned/unowned/claimable/favorited/active tile, locked/claimable/claimed/purchasable reward, popup open/close and actions, empty/loading/error, long labels, compact viewport. Keep all handlers and pending/error guards. No new frontend tests.

## Verification contract

Isolated browser fixture using actual React feature, deterministic mock catalogue (explicitly not a live server). Native capture 1280×800 DPR1 zoom100 after fonts/images ready; also 375×812. Screenshot supplied by user corroborates shape/layers but lacks native pixel/font/build metadata, so no numerical 1:1 pixel accuracy claim. In-app browser unavailable; use local Chromium and label screenshots as isolated preview.

## Implementation and review outcome

- Exported 21 multiply-tinted nine-slices into the shared habbo-skin/slices directory. The reproducible exporter and per-entity atlas rectangles are in scripts/air/export-habbicon-skins.py and docs/air/habbicon-skins.csv.
- Shared AirBitmapSurface paints skin independently of layout padding. Feature CSS supplies only its skin choice/geometry. Existing shared frame/close/shadow primitives remain in use.
- Header bg_pattern_001 repeats at native 24×20, as wrap_x/wrap_y=true and stretched_x/stretched_y=false specify.
- Sidebar now uses the first regular Habbicon's preview from HabbiconSetRailRowView.updateIcon(), matching the current user's all-1:1 request. An older port used tiny collection badges by earlier preference; the current requested AIR look supersedes that sidebar-only visual choice. Collection badges elsewhere remain untouched.
- Reward constructor recovered successfully with simplifyExpressions=0; it adds listeners and bitmap disposal, with no geometry mutation. The recovered source is retained in the task evidence directory.
- Progress uses AnimatedScalar's acceleration, speed, tolerance and 8ms integration steps; clips rounded/stroked fill at rounded pixel widths with 4px cap overshoot; uses per-size highlight dimensions and starts 250ms completion-colour transition only when the animated value reaches one.
- Buy-set button width is 88px from the XML. The popup Buy button is 57px. Keep the existing multi-currency price component in the horizontal buy row.
- Owned/favourite tray headings remain fixed while the inner 526×310 group list scrolls. Compact screens keep the same AIR content plane inside a scrollable frame; popup coordinates include content scroll offsets.

Independent Standards review: zero findings. Independent Spec review initially identified popup tint, buy-row layout and progress rendering; all three were corrected and targeted re-review found no remaining introduced issues. Reviews were source reviews, not live-gameplay proof.

## Verification observed

- Production Vite build + minify-dist passed. Focused Biome and hooks ESLint passed. git diff --check passed.
- Full tsgo reports 18 errors, all duplicate declarations in unchanged src/octane-renderer.mock.ts. That file is byte-for-byte unchanged from starting Dev commit 7585d769; initial and final diagnostics are identical. This task did not modify test mocks or add frontend tests.
- Local headless Chromium, 1280×800, DPR1, browser zoom100; actual HabbiconHubView, OctaneCardView, OctaneCardHeaderView and production styles. Catalogue state and image service are fixture inputs, with real archived sprites. External font requests blocked for deterministic captures; bundled AIR Ubuntu fonts loaded before capture.
- Locked and owned reward Claim disabled; claimable reward enabled. Popup state matched owned/favourited/claimable/purchasable inputs. Favorite callback received ID28; Claim callback received ID28; buy-set callback received {id:7,collection:true}. These are mock callback checks, not server transaction verification.
- All Sets, Owned (40 regular entries in fixture), Favourited (4 fixture entries), rail selection, popup dismissal and close inspected. No browser page errors in the state pass.
- Progress observed: empty clip0; moving clip6/fill10; completed clip154/fill154 with completed flag; partial clip62/fill66 for 4/10.
- Compact viewport375×812: frame359×570 at x8, document width375; horizontal content scrolling retains original desktop geometry.
- Screenshots and runtime logs live alongside the isolated worktree. No live server mutation, deployment or publication performed. Exact pixel equality to the supplied scaled screenshot is not established; source-derived native geometry/skins and browser output were inspected.

Final tray check: heading position unchanged while group list scrollTop=160; Close removed the collection window. The fixture is outside the repository at ../preview; run from octane with `node_modules/.bin/vite --config ../preview/vite.config.mjs` for an isolated localhost preview (port5193). It is not shipped in the production bundle.

## PR preparation update

Merged Dev 4062d74b during PR preparation. Its Habbicons stylesheet conflict was limited to an interim 572px frame height/background; retained the source-derived 570px frame and bitmap background from this port. Other upstream changes remain intact. With matching Renderer Dev 41ee2a00, full TypeScript and the production build now pass; the duplicate-mock errors recorded above applied to the earlier baseline. Focused Biome/hooks lint and the task diff whitespace check also pass.
