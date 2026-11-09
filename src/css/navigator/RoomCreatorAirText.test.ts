import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/navigator/NavigatorView.css'), 'utf8');
const rule = (selector: string) => css.match(new RegExp(`(?:^|\\}|\\*/)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

describe('room creator text (AIR roc_create_room / roc_room_thumbnail / roc_vip_promo)', () => {
    it('titles the style 3 frame in bold Ubuntu 12 white', () => {
        const title = rule('.octane-room-creator-air__title');

        expect(title).toMatch(/font-family: HabboAirUbuntu\b/);
        expect(title).toContain('font-size: 12px');
        expect(title).toContain('font-weight: 700');
        expect(title).toContain('color: #ffffff');
    });

    it('uses Volter Bold 9 for the *_caption texts', () => {
        const label = rule('.octane-room-creator-air__label');

        expect(label).toContain('font-family: Volter, monospace');
        expect(label).toContain('font-size: 9px');
        expect(label).toContain('font-weight: 700');
        expect(label).toContain('color: #000000');
    });

    it('uses regular Volter 9 for the style 0 inputs, drop menus and thumbnails', () => {
        for (const selector of [
            '.octane-room-creator-air__input',
            '.octane-room-creator-air__dropmenu-button',
            '.octane-room-creator-air__thumbnail-tiles'
        ]) {
            const body = rule(selector);

            expect(body).toContain('font-family: Volter, monospace');
            expect(body).toContain('font-size: 9px');
            expect(body).not.toContain('font-weight: 700');
        }
    });

    it('writes the VIP promo in white Volter 9', () => {
        const text = rule('.octane-room-creator-air__vip-promo-text');

        expect(text).toContain('font-size: 9px');
        expect(text).toContain('color: #ffffff');
    });

    it('writes create in Volter Bold (button_bold) and cancel in regular Volter (button_regular), black', () => {
        expect(rule('.octane-room-creator-air__button')).toContain('color: #000000');
        expect(rule('.octane-room-creator-air__button--cancel')).toContain('font-weight: 400');
    });
});
