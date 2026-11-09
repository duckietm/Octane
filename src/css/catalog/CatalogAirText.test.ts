import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('catalogue text', () => {
    it('is set in regular Ubuntu at AIR sizes, after the other catalogue sheets', () => {
        const css = read('src/css/catalog/CatalogAirText.css');
        const index = read('src/index.tsx');
        const rule = (selector: string) => css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

        expect(rule('.octane-catalog-window')).toContain('font-family: HabboAirUbuntu');
        expect(rule('.octane-catalog-window .octane-catalog-navigation-item')).toContain('font-size: 12px');
        expect(rule('.octane-catalog-window .octane-catalog-purchase-selection-prompt')).toContain('font-size: 14px');
        expect(index.indexOf("'./css/catalog/CatalogAirText.css'")).toBeGreaterThan(index.lastIndexOf("'./css/catalog/SpecialItemsDisplay.css'"));
    });

    it('keeps the AIR button skins: green only for buy / recycle, grey for gift, redeem, guild and the VIP stub', () => {
        const css = read('src/css/catalog/CatalogAirText.css');
        const vip = read('src/css/catalog/CatalogVipBuyView.css');
        const rule = (selector: string) => css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

        expect(rule('.octane-catalog-window .octane-catalog-standard-buy-button')).toContain('font-size: 12px !important');
        expect(rule('.octane-catalog-window .octane-catalog-standard-gift-button')).toContain('color: #000000 !important');
        expect(rule('.octane-catalog-window .octane-catalog-standard-gift-button')).toContain('font-weight: 400 !important');
        expect(rule('.octane-catalog-window .octane-catalog-club-upgrade-button')).toContain('var(--habbo-skin-shiny-thick)');
        expect(rule('.octane-catalog-window .octane-catalog-air-recycler .octane-catalog-air-recycler__recycle')).toContain('var(--habbo-skin-shiny-green)');
        expect(rule('.octane-catalog-window .octane-catalog-sound-listen-button')).toContain('var(--habbo-skin-shiny)');
        expect(css).toMatch(
            /@layer base \{[^@]*:where\(\.octane-catalog-redeem-button, \.octane-catalog-air-info__guild-buy, \.octane-catalog-guild-join-btn\)\.habbo-btn-primary \{[^}]*border-image-source: var\(--habbo-skin-shiny\) !important;[^}]*color: #000000 !important/
        );
        expect(vip).toMatch(/\.octane-catalog-club-gift__select \{[^}]*color: #000;/);
        expect(read('src/components/catalog/views/page/widgets/CatalogClubUpgradeButton.tsx')).not.toContain('octane-catalog-standard-buy-button');
        expect(read('src/components/catalog/views/page/common/CatalogRedeemVoucherView.tsx')).not.toContain('variant="primary"');
    });

    it('draws the remaining grey buttons with the shiny skin, never the flat 3 px button_default picture', () => {
        const view = read('src/css/catalog/CatalogView.css');
        const vip = read('src/css/catalog/CatalogVipBuyView.css');

        expect(view).toMatch(
            /\.octane-catalog-window \.octane-catalog-standard-button \{[^}]*border-image-source: var\(--habbo-skin-shiny\) !important;[^}]*color: #000000 !important;[^}]*font-size: 12px !important;\s*font-weight: 400 !important/
        );
        expect(view).toMatch(/\.octane-catalog-air-trophies__model \{[^}]*border-image-source: var\(--habbo-skin-shiny\);/);
        expect(vip).toMatch(/\.octane-club-offer\.is-compact \.octane-club-offer-action \{[^}]*border-image-source: var\(--habbo-skin-shiny\) !important/);
        expect(vip).toMatch(/\.octane-catalog-club-gift__select:disabled \{\s*border-image-source: var\(--habbo-skin-shiny-disabled\)/);
        expect(vip).not.toContain('var(--habbo-skin-button');
    });

    it('draws the special items claim_btn (style 4) dark and the builder place buttons tinted as AIR', () => {
        const special = read('src/css/catalog/SpecialItemsDisplay.css');
        const builders = read('src/css/catalog/BuildersBlocks.css');

        expect(special).toMatch(
            /\.octane-special-items-claim-button \{[^}]*border-image-source: var\(--habbo-skin-shiny-black\);[^}]*color: #ffffff;[^}]*font-size: 12px;[^}]*font-weight: 400/
        );
        expect(special).toMatch(/\.octane-special-items-claim-button:hover:not\(:disabled\) \{\s*border-image-source: var\(--habbo-skin-shiny-black-hover\)/);
        expect(special).not.toContain('var(--habbo-skin-button');
        expect(builders).toMatch(/\.octane-builders-place-button\.is-one \{\s*border-image-source: var\(--habbo-skin-shiny-thick-tint-dda100\);/);
        expect(builders).toMatch(/\.octane-builders-place-button\.is-many \{\s*border-image-source: var\(--habbo-skin-shiny-thick-tint-0a9bc5\);/);
        expect(builders).not.toMatch(/\.octane-builders-place-button[^{]*\{[^}]*linear-gradient/);
        // builderWidget: 130 x 30 buttons at y 30, the red bold error strip with its icon, still coloured when disabled
        expect(builders).toMatch(/\.octane-builders-place-button \{[^}]*top: 30px;[^}]*width: 130px;[^}]*height: 30px/);
        expect(builders).toMatch(/\.octane-builders-widget-error-message \{[^}]*color: #de0e0a;[^}]*font-weight: 700/);
        expect(builders).toMatch(/\.octane-builders-widget-error::before \{[^}]*background: #f2d193/);
        expect(builders).not.toMatch(/tint-(dda100|0a9bc5)-disabled/);
        // layout_recolorable_furniture: 27 x 22 swatches from ctlg_clr_27x22_1..3, the grid 116 px
        expect(builders).toMatch(/\.octane-catalog-recolorable-swatch \{[^}]*width: 27px;[^}]*height: 22px;[^}]*ctlg_clr_27x22_1\.png/);
        expect(builders).toMatch(/\.octane-catalog-recolorable-swatch\.is-chosen::after \{[^}]*ctlg_clr_27x22_3\.png/);
        expect(builders).toMatch(/\.octane-catalog-recolorable \.octane-catalog-builders-blocks-shapes \{\s*flex: 0 0 116px/);
        // layout_frontpage_featured: a 552 x 460 block, the 184 px first item, 360 x 126 list items, the 0x51bbee voucher
        const shop = read('src/css/catalog/CatalogView.css');
        expect(shop).toMatch(/\.octane-catalog-air-frontpage \{[^}]*grid-template-columns: 184px 360px;[^}]*width: 552px;[^}]*height: 460px/);
        expect(shop).toMatch(/\.octane-catalog-air-frontpage__item \{[^}]*height: 126px/);
        expect(shop).toMatch(/\.octane-catalog-air-frontpage__item \{[^}]*background-size: cover/);
        expect(shop).toMatch(/\.octane-catalog-standard-header-bg \{[^}]*background-size: cover/);
        expect(shop).toMatch(/\.octane-catalog-redeem-button \{[^}]*white-space: nowrap/);
        expect(shop).toMatch(/\.octane-catalog-air-frontpage__voucher \{[^}]*width: 345px;[^}]*height: 61px;[^}]*background: #51bbee/);
        // AIR's colours: #e9e9e1 body, #d2d1cb boxes in a #757571 line with a #f4f4f0 edge; prices "7 c" / "+ 10 d"
        expect(shop).toMatch(/--catalog-standard-bg: #e9e9e1;\s*--catalog-standard-box: #d2d1cb;\s*--catalog-standard-box-line: #757571;\s*--catalog-standard-box-edge: #f4f4f0;/);
        expect(shop).toMatch(/\.octane-catalog-navigation-shell \{[^}]*background: var\(--catalog-standard-box\)/);
        expect(shop).toMatch(/\.octane-catalog-grid-shell \{\s*border: 1px solid var\(--catalog-standard-box-line\);[^}]*background: var\(--catalog-standard-box\)/);
        expect(shop).toMatch(/\.octane-catalog-grid-price-plus \{\s*padding-right: 3px/);
        // navigation drop_button, searchContainer pen, "Select an item!" bar and black page text, as AIR draws them
        expect(shop).toMatch(/\.octane-catalog-navigation-caret \{[^}]*arrow_right\.png/);
        // crisp labels without a doubled etching shadow; leaves keep no room for a drop_button
        expect(shop).toMatch(/\.octane-catalog-navigation-item \{[^}]*height: 20px;[^}]*padding: 0 4px 0 0;[^}]*text-shadow: none/);
        expect(shop).toMatch(/\.octane-catalog-navigation-item\.is-branch \{\s*padding-right: 30px/);
        expect(shop).toMatch(/\.octane-catalog-navigation-caret\.is-open \{[^}]*arrow_down\.png/);
        expect(shop).toMatch(/\.octane-catalog-search-pen \{[^}]*small_pen\.png/);
        expect(shop).toMatch(/\.octane-catalog-purchase-selection-prompt \{[^}]*border-image-source: var\(--habbo-skin-shiny-thick-disabled\)/);
        expect(read('src/css/catalog/CatalogAirText.css')).toMatch(/\.octane-catalog-welcome > :not\(img\) \{\s*color: #000000 !important/);
        // catalog tab_button: label only, at least 80 px
        expect(shop).toMatch(/\.octane-catalog-tabs-shell \.octane-card-tab-item \{[^}]*min-width: 80px/);
        // the BC status values are AIR's <font color="#ff8d00"><b>
        expect(read('src/css/catalog/CatalogView.css')).toMatch(
            /\.octane-catalog-standard-header \.octane-catalog-builder-header-value \{\s*color: #ff8d00;\s*font-weight: 700;/
        );
        // the warehouse header has no side stripes (AIR draws it edge to edge)
        expect(read('src/css/catalog/CatalogView.css')).toMatch(
            /\.octane-catalog-standard-header\.is-builder \{\s*margin: 0;\s*border-left-width: 0;\s*border-right-width: 0;/
        );
        // the palette shrinks before the builder widget does, so the place buttons are never cut off
        expect(builders).toMatch(/\.octane-catalog-recolorable \.octane-catalog-recolorable-palette \{\s*flex: 0 1 174px;\s*min-height: 48px/);
        expect(builders).toMatch(/\.octane-catalog-builders-blocks-actions \{\s*flex: 0 0 auto/);
    });

    it('tints the targeted offer btn_buy 0x4faf4f as AIR', () => {
        const css = read('src/css/catalog/CatalogAirText.css');
        expect(read('src/components/catalog/views/targeted-offer/OfferWindowView.tsx')).toContain('octane-targeted-offer__buy');
        expect(css).toMatch(
            /\.octane-targeted-offer \.octane-targeted-offer__buy\.habbo-btn-primary \{\s*border-image-source: var\(--habbo-skin-shiny-thick-tint-4faf4f\) !important;\s*color: #ffffff !important;/
        );
        expect(css).toMatch(
            /\.octane-targeted-offer__buy\.habbo-btn-primary:hover \{\s*border-image-source: var\(--habbo-skin-shiny-thick-tint-4faf4f-hover\)/
        );
    });
});
