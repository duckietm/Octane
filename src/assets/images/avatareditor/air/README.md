# Habbo AIR avatar-editor assets

These bitmaps come from the WIN63 `HabboAir.swf` reference in
`reference/habbo-air/`.

- `main-misc.png` is the native 24×9 `avatar_editor_tabs_ae_tabs_misc`
  bitmap (`2435_class_170.png`).
- `main-hotlooks.png` is the native 41×22 `avatar_editor_tabs_ae_tabs_hotlooks`
  bitmap (habbo-window-manager-com).
- `tab-default.png`, `tab-hover.png`, and `tab-selected.png` render the
  52×32 `habbo_skin_button_tab_3_xml` states from
  `habbo_skin_ubuntu_png`. The source uses fixed 9px caps and a stretched
  4px middle.
- `tab-content.png` renders the fixed 486×365 avatar-editor tab surface
  from `habbo_skin_tab_content_3_xml` and the same Ubuntu atlas.

CSS leaves the 14 pixels below these 32px skins transparent inside AIR's
52×46 tab hit boxes.
