# Navigator AIR rendering evidence

Reference: WIN63-202609091217-117204808, original SHA-256 a4f23900ccef102a514346a8acc9474766ec592f51f58ade3b0527faa6d0eb07. Bundle identity verified with verify-air-bundle.sh. Paths below are relative to the reference's decompiled directory. Octane starting point: 7585d769 (origin/Dev).

## Geometry and layers (direct source)

`binaryData/138_navigator_frame_2_xml$*.bin` builds a 578×628 frame (minimum height 500), content origin (3,36). `scripts/com/sulake/habbo/navigator/view/NavigatorView.as`, setLeftPaneVisibility, moves right pane from (159,25) to (7,25), shrinks width by 153, and positions tab context at x115 or x35. Persisted height replaces initial height; footer follows vertical resize.

| Element | Geometry / state | Evidence |
| --- | --- | --- |
| Footer borders | right-pane (0,H-60) and (205,H-60), both 189×60 | frame XML create/random/promote_room_border |
| Clickable inner region | border (2,2), 185×56; clips children | frame XML create/random/promote_room |
| Artwork | inner (0,0), bitmap widget 186×59, native image 187×59, no stretch, centered pivot | frame XML; StaticBitmap wrapper |
| Label | inner (60,22), 125×17; id_heading_2; bottom-right black etching alpha 63/255 | frame XML |
| Painting order | border skin first, then region artwork, then text; no border overlay over child bitmap | XML child tree |
| Border states | default/active use identical skin; no hover/pressed art swap | binaryData/2024_habbo_skin_border_4_xml$*.bin, 2813_habbo_skin_border_5_xml$*.bin |
| Second action | promote on myworld_view/roomads_view, random otherwise | NavigatorView.onSearchResults |
| Create label | navigator.create.room (not creator dialog navigator.createroom.create) | frame XML |
| Help | help_page=navigator makes header help visible | frame XML, core/window/components/FrameController.helpPage |
| Tabs | caption updates label; child resize accommodates it; title margins 10+10, initial centered label | core/window/components/TabButtonController; binaryData/2304_tab_button_3_xml$*.bin |
| Filter | style4 falls back to style0 (no style4 dropmenu entry); 116×24, title (10,4), default blue atlas skin | binaryData/2319_class_836.bin; SkinContainer.getSkinRendererByTypeAndStyle/getWindowLayoutByTypeAndStyle; 1938_class_510.bin; 2086_class_872.bin |
| Results | scroll list (1,45), width407; category width=itemListWidth-13; collapsed header26 versus expanded30 | frame XML; navigator/view/search/results/CategoryElementFactory |
| Saved search header | region height21 clips orange border height27; list starts y25 | frame XML left_pane_hide / quicklinks_list |

## Asset identity

HabboWindowManagerCom: newnavigator_create_room → class_430 → images/3003_class_430.png; promote → class_1362 → images/2634_class_1362.png; random → images/2158_random_room_png$*.png. All native 187×59. Existing Octane artwork is retained after pixel identity comparison.

Shared atlas: habbo_blue_skin_png → class_840 → images/2378_class_840.png. Dropmenu frame uses corners (164,0,3,3)/(185,0,3,3)/(164,19,3,3)/(185,19,3,3), 1px stretch strips at x167 and y3; arrow (168,1,16,16). Help/scaler use images/2925_habbo_skin_ubuntu_png$*.png; help states (140/200/170,39,19,20), scaler (120,100,20,20).

## Preservation and verification scope

Keep room creation, random-room forwarding, catalog room promotion, saved searches, filters, result modes, settings and all Polaris controls. Screenshots supplied by the user are different tabs and different heights; their button identity difference alone is expected. Native AIR text rasterization and current live/server data are separate from browser geometry and must not be claimed as proven by an isolated fixture.

Preview contract: Chromium headless, viewport1280×800, DPR 1, 100% zoom, English deterministic mock data, await document.fonts.ready; also narrow375px and short viewport. Capture normal, hover, pressed, dropdown, collapsed sections, quick links hidden, and both footer modes. No new frontend tests.

## Final implementation details

- Tab selector adds its own 8px inset (`2457_tab_context_3_xml`). `relative_horizontal_scale_center` is 192; `WindowController.updateScaleRelativeToParent` centers the resized title, and `TabButtonController` fits the parent to its right edge. Browser mapping uses 44 + ceil((measured caption width + 4 TextField gutter + 20 title margins)/2). This retains the 88px XML template baseline. Actual native placeholder/font metrics can affect absolute widths; the browser approximation is not proof of identical AIR font rasterization.
- Result categories are 407−13=394px and begin at x 2; AIR's 17px scroll gutter clips their right edge. Block spacing is 5px; collapsed headers are 26px. Only expanded categories expose the tile/list toggle, matching the separate collapsed XML template.
- The scrollbar is an opt-in shared style (`AirScrollbar.css`). `2262_scrollable_itemlist_vertical_ubuntu_xml` supplies 17px width; `2198_class_879.bin` supplies Ubuntu button/track/lift states. Existing generic scrollbar images were a different skin, including faded arrow graphics masquerading as disabled caps, so the source Ubuntu states were exported separately. Thumb top/bottom slices stay 5px and the 16px grip stays centered.
- CSS zoom now divides lengths by lengths to produce a valid dimensionless scale. The logical height drives both frame and content sizing; resize persistence writes offsetWidth/offsetHeight, not scaled screen dimensions.

## Observed verification — 2026-09-15

Preview: actual production Navigator/search/filter/result/saved-row components, isolated game-service mocks, deterministic English rooms. Renderer reference for production build: origin/Dev 41ee2a00. Chromium 153.0.8010.12 headless Linux, 1280×800 DPR 1; scrollbar-hiding default disabled, fonts awaited. Initial persisted frame height 532. Narrow 375×700 and short 1280×400 also captured. Preview files and runtime logs live beside this worktree in `.worktrees/navigator-air-parity/`; disposable harness lives in `.navigator-preview/` and is not shipped.

- Both footer borders measured 189×60; inner region 185×56; artwork 187×59, no browser max-width shrink.
- Exact comparison threshold 0: **0 differing pixels out of 7978 opaque, nontext artwork pixels per Create/Promote button**. Compare the inner 185×56 region, excluding label rectangle (60,22)–(185,41) and 7 transparent corner pixels. This is an artwork check, not a full-window/native AIR screenshot diff.
- Footer hover/pressed screenshots byte-identical to normal, matching the source's unchanged border states.
- My World→Promote routes `catalog/open/room_event`; Public→Somewhere New routes `navigator/goto/random_friending_room` and hides Navigator. Create changes creator state; help routes `habbopages/navigator`. These observations verify UI dispatch, not a live room transfer/catalog purchase or help-content response.
- Dropdown opens and Escape closes it; categories expand/collapse; hidden-sidebar width 425. Narrow resize persisted logical 578×660 while displayed width 359. Short viewport footer bottom 344.5 remains within 400. Wheel scrolling moved results scrollTop to 250. No page errors observed.
- Focused Biome and hooks ESLint pass; production Vite build plus minification pass. Full TypeScript check fails only in the unchanged `src/octane-renderer.mock.ts` duplicate HabbiCon/event declarations. The file is byte-identical to task baseline 7585d769. No new frontend tests or relaxed assertions.
- Independent Standards/Spec review identified zoomed persistence and incorrect intrinsic tab sizing; both were corrected and rechecked. Standards noted optional consolidation of pointer/keyboard height constraints into the store; no hard standards violation. Final shared-scrollbar review found no serious regression.

Not deployed. Other Navigator dialogs, live server data, platform-specific text antialiasing, and exhaustive language/permission combinations are not proven by these captures.
