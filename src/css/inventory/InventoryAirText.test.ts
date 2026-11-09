import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(join(process.cwd(), 'src/css/inventory', name), 'utf8');
const rule = (css: string, selector: string) => css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

describe('inventory text (AIR inventory layout)', () => {
    it('uses the AIR sizes for the description, the preview names and the wearing title', () => {
        expect(rule(read('InventoryView.css'), '.octane-inventory-furni-desc')).toContain('font-size: 12px');
        expect(rule(read('InventoryAnimals.css'), '.octane-inventory-animal-name')).toContain('font-size: 14px');
        expect(rule(read('InventoryBadges.css'), '.octane-inventory-badges-wearing-title')).toContain('font-size: 14px');
    });

    it('writes the grey button_shiny_regular captions in black, the empty-shop one regular', () => {
        const css = read('InventoryView.css');

        expect(css).toMatch(/\.octane-inventory-animal-place, \.octane-inventory-btn-wear, \.octane-inventory-empty-shop\):not\(:disabled\) \{\s*color: #000000 !important;/);
        expect(rule(css, '.octane-inventory-window .octane-inventory-empty-shop')).toContain('font-weight: 400 !important');
    });

    it('skins every other grey inventory button with the shiny picture', () => {
        const css = read('InventoryView.css');

        expect(css).toMatch(/@layer base \{\s*\.octane-inventory-window \.habbo-btn-secondary:not\(\.octane-inventory-empty-shop\) \{[^}]*border-image-source: var\(--habbo-skin-shiny\) !important/);
        expect(rule(css, '.octane-inventory-window .octane-inventory-btn-delete')).toContain('var(--habbo-skin-shiny)');
        expect(rule(read('InventoryBadges.css'), '.octane-inventory-badges-polaris-row button')).toContain('border-image-source: var(--habbo-skin-shiny)');
    });
});
