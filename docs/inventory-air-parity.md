# Inventory AIR parity evidence

Source: WIN63-202609091217-117204808, verified September bundle in
`reference/habbo-air-WIN63-202609091217-117204808`. Full original research is
preserved below. This implementation targets Furniture, Pets, Badges and Bots;
Prefixes, custom badges and deletion remain Polaris extensions. Collectibles
and Rentables remain deferred (see companion document).

## Corrections after runtime review

- Frame skin: original Ubuntu frame3 26×55 bitmap, slices33/10/10/10.
  Alpha staircase is preserved by a matching whole-pixel clip polygon, including
  bottom rows with1/1/2/3/5 transparent edge pixels. Shadow belongs to the
  draggable wrapper so it survives clipping. Generic content gets frame clearance.
- The shared pointer-capture resize handle serves both card APIs. Inventory
  width490 is fixed, initial height342/minimum300; badge custom row adds22.
  CSS native resize cannot work with the frame's visible overflow.
- XML content plane: margins6/35/6/6, tab context478px, content area x5/y35.
  Furniture columns284+6+180; native42px slots,40px tinted border5 plates,
  native unscaled bitmap and separate selected outline. Grid spacing2.
- FurniView preview list params1049728 combines bottom anchoring on own resize
  and relative vertical movement. Name/actions stay at the bottom; floor furni
  hide preview walls, room textures come from active room with101 defaults.
  Preview click/down initiates placement; compact-screen rotate/use retained.
- Source menus are filters, not sorting. Search applies on Enter, clear and
  dropdown changes. Pagination is200 records. Source order remains intact.
- Closed and expanded filters use exact style0 dropmenu skin, Volter9 text,
  source padding/states and portalled popups. Search border0 and options
  border3 use atlas skins, not rounded rectangle approximations.
- Missing runtime pets configuration returned SPA HTML with200 and prevented
  all pet asset requests. The provided pets mapping is now present in preview.
- Native bot head images avoid generic90×130 avatar layout boxes.
- Old preview emulator badge packets omit owner-count/rarity fields; parser
  compatibility is handled by whole-payload validation (see renderer evidence).

## Verification contract

Owned account InventoryAirQA and room Inventory AIR QA; no existing user's
session used. Chromium headless with SwiftShader,1280×800 CSS pixels,DPR1,
100% zoom, English. Local fixture contains two ducks, a chair, a dog, a bot and
achievement badges. Screenshots compare source-derived layout and native
assets; no running official AIR client comparison was performed.

## Limits

- Pet rarity is absent from current emulator/renderer pet data; the visible
  All rarities control is disabled rather than inventing classifications.
- Catalogue metadata availability determines tiles/rugs predicates. Missing
  custom metadata is not treated as proof that an item is a rug.
- Flash text rasterization/blending differs from browser text rendering.
- Source images referenced in the research came from the user's AIR captures.


---

# Habbo AIR inventory dossier

Build: `WIN63-202609091217-117204808` (bundle verified with the full bundle verifier).

Evidence roots used below:

- `AIR`: `/home/ubuntu/dev/polaris/reference/habbo-air-WIN63-202609091217-117204808/decompiled`
- `INVXML`: `/tmp/inventory_xml_sept.xml` (from `AIR/binaryData/1282_class_1063.bin`, layout `inventory`)
- `OCTANE`: `/home/ubuntu/dev/polaris/octane`

The regular `BadgesView.as` export contains failed decompilations for `updateAll` and `setTextDetail` (`AIR/scripts/com/sulake/habbo/inventory/badges/BadgesView.as:119-128,270-279`). They were independently recovered with FFDec 26.2.1 and expression simplification disabled at `/tmp/inventory-badges-recovery/scripts/com/sulake/habbo/inventory/badges/BadgesView.as:119-129,273-294`; those recovered methods are used only where explicitly noted.

## 1. Runtime tabs versus screenshots

Raw XML order is `furni`, `collectibles`, `rentables`, `pets`, `badges`, `bots` (`INVXML:14-83`). At construction AIR removes every tab, then re-adds only allowed tabs in that same order (`AIR/scripts/com/sulake/habbo/inventory/InventoryMainView.as:159-202`):

| Tab | Runtime rule |
| --- | --- |
| Furniture | Always re-added. |
| Collectibles | Stored only when `web3tradeEnabled`; still omitted until `showCollectiblesTab(true)` is called. That call inserts it at its saved index. `showCollectiblesTab(false)` removes it again (`InventoryMainView.as:175-184,235-251`). |
| Rentables | Shown only when `!mergeRentFurni && duckets.enabled` (`InventoryMainView.as:193-198`). It reuses the same `FurniModel` registered for Furniture (`AIR/scripts/com/sulake/habbo/inventory/HabboInventory.as:484-490`); there is no separate rentables content container in the XML. |
| Pets | Always re-added. |
| Badges | Always re-added. |
| Bots | Shown only when `inventory.bots.enabled` (`InventoryMainView.as:187-191`). |

All four supplied screenshots show the resulting set and order **Furniture, Pets, Badges, Bots**, so for that session: Collectibles was not exposed, Rentables failed its visibility condition, and Bots was enabled. Screenshot corroboration:

- Furniture filled: `/home/ubuntu/.cursor/projects/home-ubuntu-dev-polaris/assets/14302f39-4630-4905-afc1-e2603c709614.png`
- Pets empty: `/home/ubuntu/.cursor/projects/home-ubuntu-dev-polaris/assets/7b4c73a2-1c10-4d84-a361-f3507d335aef.png`
- Badges filled: `/home/ubuntu/.cursor/projects/home-ubuntu-dev-polaris/assets/0cc92850-7463-4c40-9bf2-8dcb1bf2f45d.png`
- Bots empty: `/home/ubuntu/.cursor/projects/home-ubuntu-dev-polaris/assets/d645baeb-93ee-4606-a7ee-0277ea1a8cfb.png`

Use XML/controller logical pixels, not screenshot pixels; the screenshots are scaled captures.

## 2. Geometry

All coordinates below are logical AIR pixels and relative to the named parent. The frame is `490×342`, fixed width (`min=max=490`) with minimum height `300`; its content margins are L6/T35/R6/B6 (`INVXML:3,877-881`). `top_content` is `478×301`; `contentArea` is `(5,35) 468×261` inside it (`INVXML:8,143`).

### Furniture, filled state

Parent is the `furni` container, `(0,0) 468×261` within `contentArea` (`INVXML:145`).

| Element | XML geometry | Runtime notes |
| --- | --- | --- |
| Filter bar `options_container` | `(0,0) 468×25` | Visible only in content state. Search border `(4,3) 139×20`; input is `(3,2) 122×15` inside it (`INVXML:147-173`). |
| Main filter | `(150,2) 119×21` | Category filter, not a sort menu. |
| Type/placement filter | `(274,2) 119×21` | Option set changes with main filter. |
| Grid container | `(0,27) 284×231` | `item_grid` `(0,0) 284×221`; page list `(0,220) 280×10` (`INVXML:176-204`). Pages are hidden unless page count exceeds one (`FurniGridView.as:239-270`). |
| Preview container | `(290,27) 180×237` | Preview hit region and room widget are `(5,0) 170×130` (`INVXML:211-219`). |
| Preview text/action list | `(0,-31) 180×266` | Name, description, extra, spacer and actions are an auto-resizing vertical list with spacing 1 (`INVXML:219-300`). Its authored child Y values are templates, not final displayed positions. |
| Place button | authored `(0,80) 180×22` | Removed during init and conditionally appended. Shown outside trading when the item is placeable; enabled only with a selected item in a private room (`FurniView.as:545-553,585-620,639-663`). |
| Trade quantity | authored `(0,126) 50×19` | Appended only while trading and `multi.item.trading.enabled` is true (`FurniView.as:603-609`). |
| Offer-to-trade | authored `(0,146) 148×22` | Appended only while trading; enabled only for an unlocked, tradeable selected item when the user can trade (`FurniView.as:606-609,619-635`). |

The list also conditionally appends Go to room, Sell, Use, Extend rent and Buy rented item. All action widgets are removed first, then appended in controller order, so the active set compacts vertically (`FurniView.as:545-553,570-663`). This explains the supplied filled screenshot: only the relevant name and Place in room action occupy the lower preview region.

### Badges, filled state

Parent is `(0,0) 468×261` (`INVXML:668`).

| Element | Geometry | Runtime notes |
| --- | --- | --- |
| Filter bar | `(0,0) 468×25` | Search border/input match Furniture. Type filter `(150,2) 119×21`; rarity filter `(274,2) 119×21` (`INVXML:670-699`). |
| Owned/inactive badge grid | `(0,27) 328×143` | Page list `(0,170) 328×10`; pages hidden unless more than one (`BadgeGridView.as:199-231`). |
| Wearing title/grid | title `(330,32) 134×19`; grid `(335,58) 135×120` | Grid is repopulated from in-use badges on refresh (`BadgesView.as:225-247`). |
| Detail footer | `(0,184) 468×78` | Background fills it; badge image `(9,14) 50×50`; details list `(63,3) 271×39`; Wear/Clear button `(282,40) 179×28` (`INVXML:753-849`). |
| Rarity detail | tag `92×17` in the details list | Description, rarity tag and owner count are independently shown/hidden. The list resizes on item updates (`INVXML:779-842`; recovered `BadgesView.as:180-194,273-294,297-323`). |

No selection clears/hides details and badge image and disables Wear. A selection changes the action caption to Wear Badge or Clear Badge, displays the badge image/details, and disables Wear when all active slots are occupied (`BadgesView.as:130-176,179-202`). This matches the supplied filled Badges screenshot, including the Wearing grid and white detail footer.

### Pets and Bots, empty and filled

The **empty state is shared**, not category-specific: `empty_container` is `(0,20) 478×278` inside `top_content`. Image slot `(46,42) 180×180`; text list `(287,64) 176×154`; Open Shop button `(241,225) 149×51` (`INVXML:86-129`). In Pets/Bots empty state, this container is shown while each category's grid, preview and Pets filters are hidden (`PetsView.as:370-442`; `BotsView.as:321-367`). That is exactly what the Pets and Bots screenshots show.

Filled-state geometry:

| Category | Grid/filter | Preview |
| --- | --- | --- |
| Pets | options `(0,0) 468×25`; type menu `(150,2) 119×21`; rarity menu `(274,2) 119×21`; grid `(0,27) 274×231` | container `(280,0) 190×261`; name `(0,32)`; image slot `(5,53) 150×152`; type description `(4,205) 180×17`; room-info text `(5,200) 154×29`, XML-hidden; Place `(0,229) 158×28` (`INVXML:550-625`). Controller centers the rendered pet bitmap in the `150×152` slot and enables Place only for a selection when owner/room pet permission allows (`PetsView.as:446-543`). |
| Bots | no filter bar; grid `(0,0) 274×256` | container `(280,0) 190×261`; name `(0,0)`; image slot `(43,24) 100×150`; motto `(0,174) 190×45`; Place `(10,225) 158×28` (`INVXML:628-666`). Controller centers a cropped full-avatar image and enables Place only for a selection when owner/room bot permission allows (`BotsView.as:370-452`). |

Both filled states hide the shared empty/loading containers and show their grid/preview (`PetsView.as:425-442`; `BotsView.as:357-367`). Note: `BotsView` attempts to update `preview_info`, but the Bots XML has no such child; the null check makes this harmless (`BotsView.as:418-441`).

## 3. Filter and sorting option contracts

### Furniture

There is **no user-facing sort dropdown** in `FurniView`; the two menus are main-category and type filters.

- Main IDs: `all`, `floor_items`, `wall_items`, `room_layout` (`FurniView.as:50`).
- Localization pattern: `inventory.furni.filter.main.<id>` (`FurniView.as:940-947`).
- Type localization pattern: `inventory.furni.filter.type.<id>` (`FurniView.as:940-947`).
- Type IDs by main filter (`FurniView.as:895-908`):
  - `all` or `floor_items`: `any`, `sittable`, `layable`, `tiles_or_rugs`, `ltd`, `wired`, `credit_furni`, `clothes`, `pet_food`, `collectibles`, `tradable`, `non_tradable`, `recyclable`
  - `wall_items`: `any`, `windows`, `dimmers`, `stickies`, `paintings`, `collectibles`, `tradable`, `non_tradable`, `recyclable`
  - `room_layout`: `any`, `floors`, `wallpapers`, `landscape`

The only explicit sort here is automatic and non-interactive: in a separate unmerged Rentables view, items are ordered by rent-started state, then ascending expiration seconds (`FurniGridView.as:166-176`). Otherwise source order is retained.

### Badges

- Main filter 0: all → `inventory.badges.filter.all`
- Main filter 1: normal badges → `inventory.badges.filter.normal_badges`; excludes IDs beginning `ACH_`
- Main filter 2: achievements → `inventory.badges.filter.achievements`; includes only IDs beginning `ACH_`

Sources: `BadgesView.as:456-468`; `BadgeGridView.as:276-301`.

Rarity options are data-driven, ordered as:

1. `-1` All rarities → `inventory.badges.filter.rarity.all`
2. Optional `-2` Common group → `inventory.badges.filter.rarity.common`
3. Available standalone rarity IDs from the model

Sources: `BadgesView.as:337-368,472-513`. Standalone IDs map through `class_3472`:

| ID | Key |
| ---: | --- |
| 1 | `badge.rarity.uncommon` only when uncommon rarity is enabled; otherwise grouped as common |
| 2 | `badge.rarity.rare` |
| 3 | `badge.rarity.epic` |
| 4 | `badge.rarity.mythical` |
| 5 | `badge.rarity.legendary` |
| 6 | `badge.rarity.unique` |

Source: `AIR/scripts/com/sulake/habbo/communication/enum/class_3472.as:6-19,28-62`. The detail pill formats the localized tier through `badge.rarity.badge` (`BadgesView.as:282-313`).

## 4. Empty state and shop action

The XML resolves `asset_uri="inventory_inventory_empty"` into a centered, non-stretched `180×180` slot (`INVXML:88-95`). The shared window-manager alias maps that URI to `inventory_empty_png$1d8...`, whose embedded source is `_assets/1861_inventory_empty_png...png` (`AIR/scripts/HabboWindowManagerCom.as:1353-1358`; `AIR/scripts/inventory_empty_png$1d8cbfcab4939e56731b4914c26d5e51893062458.as:1-10`).

Text keys are `inventory.empty.title` and `inventory.empty.desc`; the button key is `inventory.open.catalog` (`INVXML:98-128`). In the supplied build/session that button localizes to **Open Shop**. Clicking `open_catalog_btn` calls `catalog.openCatalog()` (`InventoryMainView.as:397-406`).

## 5. Ubuntu frame style 3 and dotted resize grip

The inventory frame uses style 3 and params `98305 = 1 | 32768 | 65536`; `32768` is mouse-dragging target and `65536` is mouse-scaling target (`INVXML:3`; `AIR/scripts/com/sulake/core/window/enum/class_1927.as:50-66`).

Ownership chain:

1. Registry maps `frame/style 3` to `habbo_skin_frame_3_xml` + `habbo_window_layout_frame_3_xml`, and `scaler/style 3` to `habbo_skin_scaler_3_xml` + `habbo_window_layout_scaler_3_xml` (`AIR/binaryData/2319_class_836.bin:149-151`).
2. Shared frame layout injects `_FRAME_SCALER` at the bottom-right, `20×20`, moving with both frame axes (`AIR/binaryData/2119_frame_3_xml$ab358b35be0bb41f09087ec157f2f172971149344.bin:25-41`).
3. The dotted triangle is painted by **`habbo_skin_scaler_3_xml`**, using atlas **`habbo_skin_ubuntu_png` crop `(120,100) 20×20`** (`AIR/binaryData/1866_habbo_skin_scaler_3_xml$49666a39ce573f9c4af9dbfbebc929971129798494.bin:2-22,28-36`). The atlas embed is `_assets/2925_habbo_skin_ubuntu_png...png` (`AIR/scripts/habbo_skin_ubuntu_png$3e7b6c31bebfcaeb507157a302e0b5be1308799348.as:1-10`).
4. It is not painted by inventory code or by the frame's bottom-right 9-slice. The frame skin separately uses the same atlas for its nine frame pieces (`AIR/binaryData/2731_habbo_skin_frame_3_xml$d1e23f95e0a5a8d49e2c96e218b39397322985329.bin:19-31,52-103`).

At runtime inventory resets the `65536` scaling flag to `inventory.allow.scaling` (`InventoryMainView.as:153-159`). `FrameController.setupScaling()` shows the scaler only when horizontal, vertical, or combined scaling is enabled; combined `65536` enables both scaler triggers (`AIR/scripts/com/sulake/core/window/components/FrameController.as:136-163`). Therefore preserve the grip conditionally, not unconditionally. The supplied screenshots prove it was enabled in that session.

## 6. Important runtime mutations

- Category views are removed from `contentArea` during construction, then the selected one is reparented and forced to `contentArea.height` (`InventoryMainView.as:159-164,503-510,537-579`).
- Loading, empty and main category portions are mutually switched by each model's initializing/empty/content state (`FurniView.as:186-207,666-720`; `PetsView.as:208-236,370-442`; `BotsView.as:188-217,321-367`).
- The Furniture preview action list removes every optional button at init and compacts only currently applicable controls; text, rarity/chest/rent detail, trade/recycle counters, limited/rarity overlays, room preview and external-image controls also change visibility/data (`FurniView.as:245-442,538-558,570-663,950-984`).
- Furniture and Badge page strips are hidden for a single page and rebuilt for multiple pages (`FurniGridView.as:239-290`; `BadgeGridView.as:199-250`).
- Badge details independently hide/show badge image, description, rarity and owner count; the Wear button caption/enabled state changes with selection and active-slot capacity (`BadgesView.as:130-202`; recovered `BadgesView.as:273-323`).
- Search clear icons toggle with input content and Escape; Enter applies the search (`FurniView.as:813-845`; `BadgesView.as:370-430`; `PetsView.as:570-631`).
- Unseen counters are added into tab buttons; when visible they alter title right margin and tab width (`InventoryMainView.as:675-734`).
- Double-clicking the title collapses frame height to `minHeight=300` (`InventoryMainView.as:384-414`).
- Optional subviews disable normal scaling, sit 5px below `top_content`, resize to their lowest child, and make the frame resize to content. Removing a subview restores scaling and collapses `subContentArea` to height 0 (`InventoryMainView.as:600-673`).

## 7. Polaris-only controls that must remain

AIR's official runtime does not provide these Octane extensions, but the port must retain them and skin/place them around the official geometry:

- **Prefixes tab**: current Octane tab order includes `inventory.prefixes` between Badges and Bots (`OCTANE/src/components/inventory/InventoryView.tsx:35-51,151-188`). The Prefixes/Icons view includes activation/deactivation and prefix deletion (`OCTANE/src/components/inventory/views/prefix/InventoryPrefixView.tsx:83-121,143-160,205-229`).
- **Delete item**: Furniture preview exposes the trash action and dispatches the existing delete confirmation (`OCTANE/src/components/inventory/views/furniture/InventoryFurnitureView.tsx:22-29,120-142`). The confirmation supports quantity/max and sends `DeleteItemMessageComposer` (`OCTANE/src/components/inventory/views/furniture/InventoryFurnitureDeleteView.tsx:10-48,51-95`).

Implementation rule: preserve both behaviors and packet flows. Keep Prefixes as an additional tab after the official AIR group/order decision, and fit Delete Item into the official Furniture preview/action area without removing AIR Place/Trade/Sell/rental behavior.

## Implementer checklist

- Build the initial `490×342` logical desktop window first; preserve fixed `490px` width, `min-height:300`, and conditional scaler behavior.
- Render tabs from runtime feature rules, then append the Polaris Prefixes tab; do not hard-code the four screenshot tabs as the universal AIR set.
- Reproduce shared empty state once and reuse it for Furniture/Pets/Bots empty models.
- Treat preview action Y values as authored templates; implement controller-driven compact ordering.
- Use the shared Ubuntu frame/scaler atlas primitives. Do not add an inventory-specific CSS triangle.
- Keep Delete Item and Prefixes fully functional while matching official chrome.

---

# Inventory Pets / Bots source and implementation audit

Build: WIN63-202609091217-117204808. Source paths relative to reference bundle decompiled/.

- binaryData/1282_class_1063.bin, decoded /tmp/inventory_xml_sept.xml: pets lines550–625; bots628–666. Pets grid x0,y27,width274,h231; bot grid x0,y0,width274,h256. Both previews x280,width190. Pet name y32; stage x5,y53,150×152; type y205; Place x0,y229,158×28. Bot name y0; stage x43,y24,100×150; motto y174; Place x10,y225,158×28.
- inventory_thumb_xml (binaryData/1425_inventory_thumb_xml...bin) root42×42; border5 at1,1 size40×40; image native centered/clipped40×40. Shared .octane-inventory-thumb owned by main agent.
- scripts/com/sulake/habbo/inventory/pets/PetsGridItem.as constructor sets default scale64/direction3/head. Species15 scale32/dir2/body,35 scale64/dir3/body,26/27 scale32/dir3/body,16 scale32/dir2/body with grwN posture until level7.
- PetsView.as:446–543 preview scale64/direction4/body, species16 direction2/growth posture. Permission room-owner OR pets allowed. Class_56.as:4093–4116 proves AIR getPetImage arg7=true means full body, inverse of Renderer getRoomObjectPetImage headOnly.
- BotsView.as:221–239 thumbnail cropped head/dir3/scale h; preview370–452 cropped full-body/dir4,100×150 centered. Existing Polaris owner-only placement restriction retained.
- PetsView.as:570–631 Enter applies search, Escape/clear resets, dropdown selection updates. 632–852 numeric ascending available types, search name OR localized type, source item order retained. Rarity dropdown always visible in filled state (370–442), rarity predicate applies only type16. Current Renderer PetData has no rarityLevel; All rarities retained disabled, no fabricated values or packet changes.
- Native image rendering replaces room scenes and scaled thumbnails. Pet data figureString aliases figureData.figuredata; earlier claim that field naming caused missing pet was not supported. Missing pet assets still require runtime observation.
- Existing delete confirmation/composer preserved after official Pet Place button. Preview gets scroll overflow to retain extra at minimum height. Drag-out and double-click placement preserved; drag mouse-down state reset on leave.

Checks: Docker polaris-local-nitro-1 mounted task worktree; yarn typecheck returned empty log; targeted ESLint hooks pet/bot returned no diagnostics. Biome check --write on owned TSX files passed. No new tests, commits or deployment. No direct browser visual/runtime comparison by this sub-agent.

Additional furniture evidence: preview_element_list params1049728 =1048576 bottom-align on own resize +1024 move with parent vertical resize +128 horizontal stretch. WindowController.as:793–829 subtracts height delta from Y, preserving list bottom as list shrinks. XML authored bottom is235 (-31+266). FIT:* tags exist on place/goto/rent actions but their runtime consumer was not present as a literal in normal decompile; cannot establish text fit behavior from tags alone.

## Runtime diagnosis after seeded QA

- Pet head and body were absent because /configuration/pets.json returned SPA HTML (HTTP200); performance resource list contained no dog asset requests. Task public/configuration contained only pets.json.example.json. The bootstrap's optional pet config request therefore failed and pet.types was empty; RoomContentLoader.getPetNameForType(0) returned null, so the image request returned an empty ImageResult.
- Copied provided pets.json.example.json to ignored runtime public/configuration/pets.json and Docker-copied it to dist/configuration/pets.json. Browser fetch now parses JSON with37 entries. scripts/configure-json.mjs chooses JSON/JSONC parsing mode only; it does not generate deployment configuration files. Restart/reload bootstrap is required to initialize RoomContentLoader from this config.
- Bot thumbnail DOM had40×40 viewport (y300–340), but nested generic .avatar-image was130px tall (y255–385); actual image began at y255 and its head was clipped away. Common nativeCroppedHead does not override the global fixed avatar box. Additionally processAsCroppedImageUrl without trimTransparentPixels retains transparent margins (head image46×74).
- Added bot-local InventoryBotImageView using createAvatarImage scaleLARGE, setDirection FULL (3 thumbnail/4 preview), cropped HEAD/FULL with trimTransparentPixels=true, and direct native <img>. This avoids both generic fixed box and transparent-padding displacement; no shared renderer change.
- Bot edits passed frontend typecheck and Biome. Actual final-built/reloaded visual comparison remains main agent's pending validation.

---

# Inventory badge corrections

Build WIN63-202609091217-117204808, verified bundle under reference/habbo-air-WIN63-202609091217-117204808/decompiled.

- BadgesModel.initBadgeWindowAsset loads inventory_thumb_xml (1425 binary); Badge.as paints normal #cccccc and unseen #9ccc65. Native42px outer,40px plate at1,1; no image stretching. Implemented shared .octane-inventory-thumb, seven owned columns, three wearing columns,2px gaps. Occupied wearing badges only are painted; invisible empty cells retain Polaris drop targets.
- Inventory XML668+ defines owned328×143 at0,27; wearing title134×19 at330,32 and cells at335,58. Footer468×78 at0,184; image50×50 at9,14; details271px at63,3; wear179×28 at282,40. Badge view starts after common27px filter. Flexible main157px baseline +78px footer +22px custom row; parent should reserve22px extra height for this extension.
- BadgesView recovered /tmp/inventory-badges-recovery updateActionView and clearSelectedBadgeDetails prove disabled visible Wear + blank footer on no selection, no default explanation. Preserved selected wear/clear and capacity checks; moved custom Edit/Delete into Polaris row after official footer, retained All/Custom/Create with localized fallbacks.
- BadgeGridView.as uses200 badges/page, integer count floor(n/200)+1; source order retained. Zero-based page captions; active page red and underlined. New page buttons and bounded page rendering replace oversized5-column virtualizer.
- class_2346.shouldShowOwnerCount restricts owners0<count<1000. class_3472.getWhiteBackgroundTagColor gives common777777, rare56a152, epic5194cc, mythicaIa564b5, legendaryc02a20, uniquecc9200.
- border style3 resolves habbo_skin_border_slot_xml2856: atlas class840 image2378,3/1/3 slices x20/23/25 y30/33/35. Existing border-white.png18×18 was not this skin. Added generic border-slot.png7×7.
- border style2 rarity resolves2939_class_848.bin: same atlas,6/1/6 slices x0/6/12 y229/235/241. Added generic13×13 white slice plus exact RGB-multiplied tier slices, no CSS rounded-corner approximation. Provenance src/assets/images/habbo-skin/slices/inventory-badge-provenance.csv.

Checks: targeted Biome lint and format, hooks ESLint passed via existing polaris-local-nitro-1 container. No frontend tests added. Parent owns full typecheck/build/browser checks. Runtime rarity data still uses existing Polaris leaderboard cache rather than changing packet contracts. Native AIR comparison and browser screenshot review not independently performed by this subtask. Rarity Volter glyphs use existing browser font and text shadow, not Flash subtract/invert text blending.


## Custom AIR filter dropdown

InventoryFilterSelect replaces platform selects in Furniture/Badges/Pets. AIR DropBaseController149/236/342 opens a second rectangle at the original global origin and fits it to desktop; DropMenuController65+ computes width from labels, menu list inset6,2 and bottom padding3.1938_class_510.bin defines closed label10,4; class509 XML defines option text margins4,1,4,2. regular text style1911_styles_css490 is Volter9; line12 +3px margins yields15px option rows.2086_class_872.bin supplies frame3px/arrow16px and flat item state samples atlas190,0/20/40=(ffffff,d9d9d9,f2f2f2). Browser added accessible listbox keyboard/typeahead/escape/outside dismissal; menu portalled outside clipped card. Own checks: format,Biome lint,hooks ESLint pass. Parent owns runtime screenshot and typecheck.

---

# Furniture inventory filter audit

Build WIN63-202609091217-117204808, decompiled/scripts/com/sulake/habbo/inventory/furni/{FurniGridView,class_3936}.as. Main and type predicates follow class_3936; source item order remains unchanged.

Corrected rules:
- Floor main filter means !isWallItem. Wall excludes room-layout categories2,3,4.
- Tiles/rugs exclude tile_walkmagic* and hole, require canPutStuffOn; accept category rug/floor or carpet*; otherwise require height<=0.2, canStandOn, x/y dimensions>1.
- LTD requires positive stuffData unique serial (Renderer uniqueNumber), not merely the unique flag.
- Wired: wf_* classname OR wired_* category. Credit furniture: category12 OR CF_* classname (case-sensitive).
- Pet food: petfood* classname OR pet_food furniLine; shampoo is not pet food.
- Window: window_* OR windows furniLine OR window category.
- Dimmer: dimmer_* OR dimmer category OR dimmers furniLine.
- Painting: diamond_painting*; generic posters do not qualify.
- Tradeability: furnidata.tradeable; recycle remains item.recyclable.
- Search: name OR localized description OR stuffData.chestName, lowercase substring. Resolve missing GroupItem description from same keys as AIR GroupItem.getFurniItemDesc. Room-layout descriptions use inventory.furni.item.{wallpaper,floor,landscape}.desc; posters poster_ID_desc; ordinary furniture roomItem/wallItem.desc.ID.

Renderer metadata preservation (no packet changes):
- packages/api/src/octane/session/IFurnitureData.ts: optional canPutStuffOn,height,tradeable.
- packages/session/src/furniture/FurnitureData.ts: append optional constructor parameters/getters, preserve existing callers.
- packages/session/src/furniture/FurnitureDataLoader.ts: retain canputstuffon,height,tradeable for floor/wall gamedata records. Existing boolean normalization handles boolean/number/string inputs. Invalid/missing height remains undefined.
- AIR FurnitureDataParser.as: floor mapping lines250–257 proves canputstuffon and height separate from tileSizeZ (which is authored0). Do not substitute Polaris allowStack, which continues to consume only allowstack/allow_stack/allowStack and is untouched.

Limits / custom compatibility:
- When custom furniture omits tradeable metadata, preserve the existing per-item isTradable classification. With supplied metadata, AIR furnidata classification wins; actual trading permissions unchanged.
- Missing canputstuffon/height is not inferred. Such records cannot qualify through the height-based tile fallback; dataset completion is required if absent.
- Trax song creator lookup remains unsupported because GroupItem has no music-controller metadata accessor. Existing custom description is retained if provided.
- Collectibles/Rentables remain deferred per user scope; their filter option was not added.

Validation commands:
- docker exec -w /workspace/octane-renderer polaris-local-nitro-1 yarn compile:fast — PASS.
- docker exec -w /workspace/octane-renderer polaris-local-nitro-1 yarn exec eslint packages/api/src/octane/session/IFurnitureData.ts packages/session/src/furniture/FurnitureData.ts packages/session/src/furniture/FurnitureDataLoader.ts — PASS.
- /home/ubuntu/dev/polaris/octane/node_modules/.bin/biome check --write src/api/inventory/FurnitureFilter.ts (task Octane worktree) — PASS.
- git -C .worktrees/inventory-air-parity/octane-renderer diff --check — PASS.
- docker exec -w /workspace/octane-renderer polaris-local-nitro-1 yarn build > /tmp/inventory-renderer-build.log 2>&1 — result pending below.
- Renderer yarn build — PASS (exit0); /tmp/inventory-renderer-build.log contains build output.
- docker exec -w /workspace/octane polaris-local-nitro-1 yarn typecheck — PASS after Renderer rebuild.


## Final browser verification — 2026-09-15

Dedicated InventoryAirQA account and owned room, Chromium 1280×800 at device scale1, served by the existing local preview on port8080. The QA fixture contains two ducks, a chair, a dog, a bot, and earned badges; no existing player inventory was changed.

- Default furniture frame490×342; drag grip to490×432; closing/reopening retains490×432. Shared resize restoration runs after parent refs attach.
- Furniture cells42×42 with native images; pet head/body and cropped bot head/body load. Pet configuration now supplies the existing37-species asset mapping.
- All→Wall items filters the floor-only QA inventory to0. Typing Rubber retains2 groups until Enter, then returns1; Escape clears.
- Badges populate from the deployed legacy717 packet. Wear badge changes to Clear badge and fills Wearing. See companion renderer docs/inventory-badges-wire-compatibility.md for the project legacy/extended contracts; this is not a migration to September AIR’s fragmented badge protocol.
- Delete Maximum selects2 ducks; confirmation reads “Delete2×Rubber Duck?” with proper spacing in UI; Cancel closes without deletion. Pet Delete remains appended after official Place, with a372px default pet frame to expose the extra action.
- Place in room enters placement and hides inventory; Escape cancels. Committed placement, trading/marketplace transactions and actual deletion were not exercised.
-390×844 viewport keeps the inventory frame on screen at x8,width374, retaining the Habbo window structure with horizontal scrolling for the full-width content.
- No JavaScript page errors in the inventory tab/filter/resize run. Actual screenshots: /tmp/inventory-final-furniture.png, /tmp/inventory-final-resized.png, /tmp/inventory-final-pets.png, /tmp/inventory-final-bots.png, /tmp/inventory-final-badge-wearing.png, /tmp/inventory-final-narrow.png. Runtime records: /tmp/inventory-runtime-results.json and /tmp/inventory-interactions.json.
- Task-owned client TS/TSX formatting, Biome lint, hooks lint, full TypeScript check and production build pass. Renderer types/build/lint and six binary badge-contract cases pass. No new frontend test files.

Single-class recovery of BadgesView with simplifyExpressions=false confirms setTextDetail only sets text/visibility/color; it does not override the authored271px description width. The badge details list uses zero spacing, matching XML. Long localized descriptions retain the authored two-line cap.

Limits: source-derived layout/assets and Octane browser behavior were verified; simultaneous native AIR pixel-diff verification was not performed. Pet rarity data is absent from the current project packet, so its dropdown remains disabled. Collectibles/Rentables remain deferred, and Polaris delete/prefix/custom-badge features are retained. No backend deployment, commits, PR publication or merges performed in this pass.

Final served production bundle: src-DyvDQwEG.js. Final TS/TSX formatting/lint/hooks/full typecheck and build pass; CSS is excluded by repository Biome configuration. QA browser stopped after verification.

## Requested visual refinement

Furniture Delete is now a22×22 icon-only overlay in the lower-right of the170×130 preview, with an accessible Delete name. It uses the existing red shiny AIR bitmap, vertically flipped for the requested dark-top/light-bottom shading. Pointer/click propagation is stopped so deleting does not begin furniture placement; the quantity/confirmation flow is preserved. Select captions and menu options retain9px type with mobile text autosizing disabled. This is a requested Polaris styling extension, not an official AIR delete control.

Refinement verification: production build/types/hooks/lint pass; Chromium computes select text at9px. Actual screenshot /tmp/inventory-red-delete.png. Clicking the preview trash opens Delete furniture while inventory stays visible, so it does not invoke placement. Mobile text-adjust suppression is shipped in CSS; native iOS rendering was not available for verification. QA account home room is set to its owned room3 for repeatable preview entry.

## Same-scale screenshot follow-up

The new Habbo reference shows a taller, resized inventory, whereas the Octane reference shows the342px default frame. Both are approximately490 logical pixels wide. Do not scale all furniture icons or hard-code the taller screenshot as the default.

Recovered missed resize contract: inventory_xml preview_container has height237; furni_preview_widget has height130 and params2192 (vertical stretch). Its bottom allowance is107px, so increasing frame height must increase the canvas, not only the blank space below it. FurniView.resizePreview calls modifyRoomCanvas with the widget's live dimensions. LayoutRoomPreviewerView now exposes opt-in fitParent and recreates its render texture on either width or height changes; existing fixed-height callers keep their behavior.

Frame_3 internal scaler is x41/y40/20×20 inside64×64: right3/bottom4, not zero. Search input explicitly resets native appearance and uses12px text (browser previously computed16px). English inventory.badges label “Achieved badges” is normalized to the supplied AIR screenshot's “Badges”; other translations remain intact.

User refinement: trash button now18×18, icon8×9, aligned exactly to preview right/bottom with no4px inset; existing red skin and confirmation retained.

Follow-up geometry corrections: TabContext selector is32px high (2457_tab_context_3_xml); retain35px content offset,32px visible tabs and separator at31. Content below the25px filter initially measured236px high. Match authored grid y27/height231 with2px gap and height minus5; preview y27/height237 with2px gap and height plus1. Allow its authored3px overhang below contentArea while the containing window still clips overflow. Default preview is now170×130 and grows by the window-height delta.

Standards review found no scoped issue. Spec review found nonshrinking stage+details could clip long text/actions; corrected by making the stage independently positioned while keeping details bottom-anchored, as in AIR.

TextLabelController.refresh sizes using TextField.width rather than textWidth, then adds margins. Inventory tabs and shiny actions include2px extra on each side for that Flash text-field box, matching the supplied reference's wider text controls without enlarging the font.

Final browser sizing run verifies342→406 window height and130→194 canvas height (width170 unchanged), search input12px, trash18px aligned to stage bottom/right, and20px grip inset3/4. Search returns the expected duck group and the trash opens the delete dialog without hiding inventory.

Latest user refinement: keep the compact18px red trash button, with4px breathing room from both preview edges instead of flush placement.

Status icon alignment repair: inventory_xml icons_element_list has52px regions, native40×16 trade bitmap and28×16 recycle bitmap, both at x0. Centering the28px bitmap in40px displaced recycling6px. Both backgrounds now anchor at0,0 in52px regions. Restore positive counts at trade33,1 / recycle18,1 with white glow; zero uses the existing no-trade/no-recycle bitmap and no count (FurniView.updateItemPreview).

Badge alignment refinement: inventory_thumb_xml's badge widget is40×40 inside the40px plate at root(1,1), pivot center, no stretch. Both owned/wearing cells now position the badge-image div at(1,1) with a fixed40×40 centered native background, rather than a normal-flow intrinsic-size div at(0,0). Create badge has5px right margin per user request.
