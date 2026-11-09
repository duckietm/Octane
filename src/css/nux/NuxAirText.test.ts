import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/nux/Nux.css'), 'utf8');
const rule = (selector: string) => css.match(new RegExp(`(?:^|\\}|\\*/)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

describe('nux text (ui_help_bubble, nux_offer_old_user, nux_gift_selection, nux_noob_room_offer)', () => {
    it('uses the regular Ubuntu cut, not the condensed `Ubuntu` face', () => {
        expect(css).toContain('.octane-nux-offer :where(*):not(svg, svg *)');
        expect(css).toContain('.octane-help-bubble :where(*):not(svg, svg *)');
        expect(rule('.octane-help-bubble__text')).toContain('font-family: HabboAirUbuntu, UbuntuRegular, sans-serif');
        expect(css).not.toMatch(/font-family:\s*Ubuntu\b/);
    });

    it('uses the AIR text styles', () => {
        expect(rule('.octane-help-bubble__text')).toContain('font-size: 15px');
        expect(rule('.octane-help-bubble__ok')).toContain('font-size: 12px');
        expect(rule('.octane-nux-offer__banner')).toContain('font-size: 22px');
        expect(rule('.octane-nux-offer__text')).toContain('font-size: 11px');
        expect(rule('.octane-nux-offer__text')).toContain('color: #333333');
        expect(rule('.octane-nux-offer.is-lobby .octane-nux-offer__text')).toContain('font-size: 12px');
        expect(rule('.octane-nux-offer__link')).toContain('font-size: 11px');
        expect(rule('.octane-nux-offer__link')).toContain('text-decoration: underline');
        expect(rule('.octane-nux-offer__go')).toContain('font-size: 12px');
        expect(rule('.octane-nux-gifts__name')).toContain('font-size: 9px');
    });

    it('skins the buttons like the layouts: green OK / btnGo, grey option_button', () => {
        expect(rule('.octane-help-bubble__ok')).toContain('border-image-source: var(--habbo-skin-shiny-green)');
        expect(rule('.octane-nux-offer__go')).toContain('border-image-source: var(--habbo-skin-shiny-thick-green)');
        expect(rule('.octane-nux-offer__go')).not.toContain('linear-gradient');
        expect(rule('.octane-nux-offer__go.octane-nux-offer__get')).toMatch(/border-image-source: var\(--habbo-skin-shiny\);[^}]*color: #000000;[^}]*font-weight: 400/);
    });
});

