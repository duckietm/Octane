import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/inventory/InventoryView.css'), 'utf8');

describe('the empty inventory shop button', () => {
    it('slices the large shiny picture the same way in every state', () => {
        expect(css).toContain('.octane-inventory-empty-shop:hover');
        expect(css).toContain('var(--habbo-skin-shiny-large-hover)');
        expect(css).toContain('var(--habbo-skin-shiny-large-pressed)');
        expect(css.match(/border-image-slice: 6 6 7 6 fill !important;/g)?.length).toBeGreaterThanOrEqual(3);
    });
});
