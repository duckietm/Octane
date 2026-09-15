# Deferred: AIR inventory Collectibles & Rentables tabs

Status: intentionally **not** implemented in the current Octane inventory AIR parity pass
(Furniture / Pets / Badges / Bots + Polaris Prefixes + delete). Revisit after UI parity
for the four official always-on tabs is accepted.

## Why skipped now

- User direction (2026-09-15): do not include Collectibles / Rentables yet.
- Polaris Emulator does **not** expose a separate collectibles inventory tab or NFT
  inventory model. It does mark individual furniture as `rentable` on the wire
  (`FurnitureItem.rentable`), and supports rentable **bots/space** elsewhere, but
  there is no AIR-style Rentables inventory page or Collectibles page backed by
  server packets today.
- AIR only shows these tabs under feature flags (see dossier).

## AIR runtime rules (WIN63-202609091217-117204808)

Source: `InventoryMainView.as` tab rebuild after removing every XML tab.

| Tab | Shown when |
| --- | --- |
| Collectibles | `web3tradeEnabled`, then only after `showCollectiblesTab(true)` inserts it at its saved index |
| Rentables | `!mergeRentFurni && duckets.enabled` — reuses `FurniModel` (no separate XML content container) |

XML order in `inventory_xml`: furni → collectibles → rentables → pets → badges → bots.

## Evidence pointers

- Layout: `/tmp/inventory_xml_sept.xml` (`contentArea/collectibles`, rentables tab button)
- Controllers: `.../inventory/collectibles/CollectiblesView.as`, `CollectiblesModel.as`
- Furniture rentables path: same `FurniView` / `FurniModel` with rent-started sort in
  `FurniGridView.as` when that category is active
- Dossier: `/tmp/inventory-air-dossier.md` §1 and furniture rent action buttons
  (`extendrent_btn`, `buyrenteditem_btn`)

## When implementing later

1. Confirm Polaris packets + DB for collectibles / unmerged rent inventory.
2. Gate tabs on the same feature flags AIR uses (or Polaris config equivalents).
3. Append after Furniture if both enabled, matching AIR insert order; keep Prefixes
   after the official group.
4. Reuse Furniture filter/preview chrome for Rentables; Collectibles needs the NFT
   preview container from XML (`nft_info`, `nft_image`, `offer_options`).
