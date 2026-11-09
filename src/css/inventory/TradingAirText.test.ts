import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/inventory/InventoryWiredTrade.css'), 'utf8');
const rule = (selector: string) => css.match(new RegExp(`(?:^|\\}|\\*/)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

describe('trading text (inventory_trading, inventory_trading_wired, inventory_trading_name_scam_warning)', () => {
    it('sets the trade body in the regular Ubuntu at u_regular 12 px', () => {
        const body = rule('.octane-inventory-window .octane-inventory-body.is-trade,\n.octane-trade-name-scam-body');

        expect(body).toContain('font-family: HabboAirUbuntu, UbuntuRegular, sans-serif');
        expect(body).toContain('font-size: 12px');
        expect(css).toMatch(/@layer base \{[^@]*\.octane-inventory-body\.is-trade :where\(\*\):not\(svg, svg \*\)[^}]*font-family: HabboAirUbuntu, UbuntuRegular, sans-serif !important/);
    });

    it('draws the buttons as button_shiny_regular and the user names bold', () => {
        expect(css).toMatch(/\.octane-trade-button[^{]*\{\s*font-size: 12px !important;\s*font-weight: 400 !important;/);
        expect(rule('.octane-trade-offer-title .octane-trade-offer-user')).toContain('font-weight: 700');
        expect(rule('.octane-trade-offer-title')).toContain('font-weight: 400');
    });

    it('uses the AIR colours and sizes of the wired trade and the name scam warning', () => {
        expect(rule('.octane-wired-trade-panel')).toContain('font-size: 12px');
        expect(rule('.octane-wired-trade-time')).toContain('color: #bf272a');
        expect(rule('.octane-wired-trade-bubble-note.is-disclaimer')).toContain('color: #bf272a');
        expect(rule('.octane-trade-name-scam-body .octane-trade-name-scam-muted')).toContain('color: #555555');
        expect(rule('.octane-trade-name-scam-body .octane-trade-name-scam-trader')).toContain('font-size: 13px');
    });

    it('skins accept and cancel as the grey shiny button, the cancel never red', () => {
        const view = readFileSync(join(process.cwd(), 'src/components/inventory/views/furniture/InventoryTradeView.tsx'), 'utf8');

        expect(css).toMatch(/\.octane-wired-trade-cancel\)\.habbo-btn-secondary,\s*\.octane-trade-name-scam-body \.octane-trade-button\.habbo-btn-secondary \{[^}]*border-image-source: var\(--habbo-skin-shiny\) !important;[^}]*color: #000000 !important/);
        expect(view).not.toMatch(/octane-trade-button" variant="danger"/);
    });
});
