import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(join(process.cwd(), 'src/css/catalog', name), 'utf8');
const rule = (css: string, selector: string) =>
    css.match(new RegExp(`(?:^|\\}|\\*/)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

describe('marketplace text (ctlg_marketplace, marketplace_offer_details, make_marketplace_offer, buy_marketplace_tokens)', () => {
    it('keeps the own-items info at u_italic 12 px and the search placeholder unblended', () => {
        const css = read('MarketplaceCatalog.css');

        expect(rule(css, '.octane-marketplace-own-info')).toContain('font-size: 12px');
        expect(rule(css, '.marketplace-own-search-input input::placeholder')).toContain('opacity: 1');
    });

    it('uses u_small for the offer details figures and button_shiny_regular for its buttons', () => {
        const css = read('MarketplaceOfferDetails.css');

        expect(rule(css, '.octane-marketplace-offer-details .marketplace-details-small')).toContain('font-size: 10px');
        expect(css).toMatch(/@layer base \{[^@]*marketplace-details-back[^{]*\{\s*font-size: 12px !important;\s*font-weight: 400 !important;/);
    });

    it('sets the offer window headlines and the regular Ubuntu in the dialogs', () => {
        const post = read('MarketplacePostOfferView.css');

        expect(rule(post, '.octane-marketplace-post-offer-name')).toContain('font-size: 16px');
        expect(rule(post, '.octane-marketplace-post-offer-label')).toContain('font-size: 14px');
        expect(post).toMatch(/@layer base \{\s*\.octane-marketplace-post-offer-content :where\(\*\):not\(svg, svg \*\) \{\s*font-family: HabboAirUbuntu, UbuntuRegular, sans-serif !important;/);
        expect(read('MarketplaceTokenDialogs.css')).toMatch(
            /@layer base \{\s*\.octane-marketplace-token-dialog-content :where\(\*\):not\(svg, svg \*\) \{\s*font-family: HabboAirUbuntu, UbuntuRegular, sans-serif !important;/
        );
    });

    it('draws the offer details buttons in the grey shiny skin, not the green one', () => {
        expect(read('MarketplaceOfferDetails.css')).toMatch(
            /\.marketplace-details-chart-selector > button\)\.habbo-btn-primary \{\s*border-image-source: var\(--habbo-skin-shiny\) !important;\s*color: #000000 !important;/
        );
    });
});
