import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/user-settings/UserSettingsView.css'), 'utf8');

describe('user settings text (memenu settings / sound / chat / other settings)', () => {
    it('is regular Ubuntu everywhere, never the condensed `Ubuntu` face', () => {
        expect(css).not.toMatch(/UbuntuRegular, Ubuntu,/);
        expect(css).toMatch(/\.user-settings-window :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu, UbuntuRegular/);
    });

    it('draws titles, labels and buttons as u_regular 12 px white', () => {
        expect(css).toMatch(/\.air-settings-window__title \{[^}]*color: #ffffff;[^}]*font: 400 12px\/17px HabboAirUbuntu/);
        expect(css).toMatch(/\.air-settings-volume-row__label \{[^}]*color: #ffffff;[^}]*font: 400 12px\/18px HabboAirUbuntu/);
        expect(css).toMatch(/\.air-settings-button \{[^}]*font: 400 12px\/16px HabboAirUbuntu/);
    });
});

describe('account settings text (Octane extra, AIR conventions)', () => {
    it('is regular Ubuntu at 12 px with a 14 px bold name and 10 px fine print', () => {
        expect(css).toMatch(/\.user-account-settings-window :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu, UbuntuRegular/);
        expect(css).toMatch(/\.user-account-settings__content :where\(\*\):not\([^)]*\) \{[^}]*font-size: 12px !important/);
        expect(css).toMatch(/\.user-account-settings__name \{[^}]*font-size: 14px !important;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.user-account-settings__fine-print \{[^}]*font-size: 10px !important/);
        expect(css).toMatch(/\.user-account-settings__content button \{[^}]*font-weight: 400 !important/);
    });

    it('draws the settings buttons on the grey shiny skin (AIR button style 3) with black captions', () => {
        expect(css).toMatch(/\.air-settings-button \{[^}]*border-image-source: var\(--habbo-skin-shiny\);[^}]*border-image-slice: 5 fill;[^}]*color: #000000;/);
        expect(css).toMatch(/\.air-settings-button:hover \{\s*border-image-source: var\(--habbo-skin-shiny-hover\);/);
        expect(css).not.toContain('var(--habbo-skin-button)');
    });

    it('turns the account settings buttons grey instead of the green buy skin', () => {
        expect(css).toMatch(/\.user-account-settings__content :where\(\.habbo-btn-primary, \.habbo-btn-secondary\) \{[^}]*border-image-source: var\(--habbo-skin-shiny\) !important;[^}]*color: #000000 !important;/);
    });
});

