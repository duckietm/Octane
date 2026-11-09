import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/purse/PurseView.css'), 'utf8');
const clubExtendCss = readFileSync(join(process.cwd(), 'src/css/purse/ClubExtendView.css'), 'utf8');

describe('purse text (grid_purse)', () => {
    it('is regular Ubuntu, never the condensed `Ubuntu` face', () => {
        expect(css).toMatch(/@layer base \{[^}]*\.octane-purse-container[^{]*\{[^}]*HabboAirUbuntu, UbuntuRegular/);
        expect(css).not.toMatch(/font(-family)?:[^;]*(?<!Air)Ubuntu, sans-serif/);
    });

    it('draws the amounts and the HC / earnings labels in u_bold 12', () => {
        expect(css).toMatch(/\.allcurrencypurse \.text-white \{[^}]*font-size: 12px;[^}]*font-weight: 700;[^}]*text-shadow: 0 1px 0 rgba\(0, 0, 0, 0\.27\)/);
        expect(css).toMatch(/\.octane-purse__btn--earnings \{[^}]*color: #00c1c4;[^}]*font-size: 12px;[^}]*font-weight: 700;[^}]*text-shadow: none/);
    });

    it('draws the HC extend buy_now_button as the grey button_thick, 12 px bold black', () => {
        expect(clubExtendCss).toMatch(/@layer base \{\s*\.octane-club-extend \.octane-club-extend-buy \{[^}]*border-image-source: var\(--habbo-skin-shiny-thick\) !important;[^}]*color: #000000 !important;[^}]*font-size: 12px !important;[^}]*font-weight: 700 !important;/);
    });
});

