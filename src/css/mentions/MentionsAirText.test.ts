import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/mentions/MentionsPanel.css'), 'utf8');
const air = css.slice(css.indexOf('AIR text pass'));
const rule = (selector: string) => air.match(new RegExp(`(?:^|[{},]|\\*/)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

describe('mentions panel text (AIR conventions, no AIR layout)', () => {
    it('uses the regular Ubuntu cut, not the condensed `Ubuntu` face', () => {
        expect(rule('.mentions-window')).toContain('font-family: HabboAirUbuntu, UbuntuRegular, sans-serif');
        expect(rule('.mentions-window :where(*):not(svg, svg *)')).toContain('font-family: HabboAirUbuntu, UbuntuRegular, sans-serif !important');
    });

    it('uses the AIR text sizes and weights', () => {
        expect(rule('.mentions-window .mention-row-name')).toContain('font-size: 12px');
        expect(rule('.mentions-window .mention-row-name')).toContain('font-weight: 700');
        expect(rule('.mentions-window .mention-row-msg')).toContain('font-size: 12px');
        expect(rule('.mentions-window .mention-row-msg')).toContain('font-weight: 400');
        expect(rule('.mentions-window .mention-row-room')).toContain('font-size: 11px');
        expect(rule('.mentions-window .mention-row-chip')).toContain('font-size: 10px');
        expect(rule('.mentions-window .mentions-search input')).toContain('font-size: 12px');
        expect(rule('.mentions-window .mentions-empty-text')).toContain('font-size: 12px');
    });

    it('gives the buttons 12 px text, the shared Button through @layer base', () => {
        expect(rule('.mentions-window .mentions-refresh')).toContain('font-size: 12px');
        expect(rule('.mentions-window .mentions-markall')).toContain('font-size: 12px !important');
    });

    it('draws mark-all and refresh on the grey shiny skin (AIR button style 3) with black captions', () => {
        expect(rule('.mentions-window .mentions-markall.habbo-btn-primary')).toContain('border-image-source: var(--habbo-skin-shiny) !important');
        expect(rule('.mentions-window .mentions-markall.habbo-btn-primary')).toContain('color: #000000 !important');
        expect(css).toMatch(/\*\/\s*\.mentions-refresh \{[^}]*border-image-source: var\(--habbo-skin-shiny\);[^}]*color: #000000;/);
        expect(css).not.toContain('var(--habbo-skin-button)');
    });
});

