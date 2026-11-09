import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/collectibles/Collectibles.css'), 'utf8');
const rule = (selector: string) => css.match(new RegExp(`(?:^|\\}|\\*/)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

describe('collectibles text (collectible_view, collectible_reward)', () => {
    it('is regular Ubuntu, not the condensed cut', () => {
        expect(css).toMatch(/:is\(\.octane-collectibles-hub, \.octane-collectibles-reward-box\) :where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu/);
    });

    it('uses the AIR text styles', () => {
        expect(rule('.octane-collectibles-score')).toContain('font-weight: 400');
        expect(rule('.octane-collectibles-score > .octane-collectibles-score-value:nth-child(2)')).toContain('font-weight: 700');
        expect(rule('.octane-collectibles-tab')).toMatch(/font-size: 12px;[^}]*font-weight: 400/);
        expect(rule('.octane-collectibles-navigation-item')).toMatch(/color: #666666;[^}]*font-weight: 700/);
        expect(rule('.octane-collectibles-collection-name')).toContain('font-size: 16px');
        expect(rule('.octane-collectibles-preview-info div > span:first-child')).toContain('color: #eb8f01');
        expect(rule('.octane-collectibles-price')).toContain('font-size: 14px');
        expect(rule('.octane-collectibles-stamps-value')).toMatch(/font-size: 30px;[^}]*font-weight: 400/);
        expect(rule('.octane-collectibles-transfer-fee span')).toContain('font-weight: 400');
    });

    it('draws the collection page as collection_content does', () => {
        expect(rule('.octane-collectibles-navigation-item.is-active')).toContain('color: #ffffff');
        expect(rule('.octane-collectibles-collection-header')).toContain('background: #cbd1d8');
        expect(rule('.octane-collectibles-collection-name')).toMatch(/color: #000000;[^}]*font-weight: 400/);
        expect(rule('.octane-collectibles-collection-progress')).toMatch(/font-size: 12px;[^}]*font-weight: 400/);
        expect(rule('.octane-collectibles-collection-progress .octane-collectibles-preview-bar')).toMatch(/font-size: 11px;[^}]*font-weight: 400/);
    });

    it('keeps the me menu icon untouched', () => {
        expect(rule('.icon-me-collectibles')).toContain('me_menu_me_cabinet.png');
    });

    it('draws ok_button (style 3) on the grey shiny skin, 12 px regular black', () => {
        const plain = rule('.octane-collectibles-button.is-plain');
        expect(plain).toContain('border-image-source: var(--habbo-skin-shiny)');
        expect(plain).toContain('border-radius: 0');
        expect(plain).toMatch(/color: #000;[^}]*font-size: 12px;[^}]*font-weight: 400/);
        expect(plain).not.toContain('linear-gradient');
    });

    it('tints the style 5 buttons as AIR: 0x01a101 green and 0x2095d4 blue on the grey shiny skin, white text', () => {
        const tinted = rule('.octane-collectibles-button:is(.is-green, .is-blue)');
        expect(tinted).toMatch(/color: #fff;[^}]*font-size: 12px;[^}]*font-weight: 400/);
        expect(tinted).toContain('background: transparent');
        expect(rule('.octane-collectibles-button.is-green')).toContain('border-image-source: var(--habbo-skin-shiny-tint-01a101)');
        expect(rule('.octane-collectibles-button.is-blue')).toContain('border-image-source: var(--habbo-skin-shiny-tint-2095d4)');
        expect(rule('.octane-collectibles-button.is-blue:hover:not(:disabled)')).toContain('var(--habbo-skin-shiny-tint-2095d4-hover)');
        expect(css).not.toMatch(/\.octane-collectibles-button\.is-(green|blue) \{[^}]*linear-gradient/);
    });
});
