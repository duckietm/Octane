import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The limited-edition plate and the rotation controls share the top-right corner of the product
 * preview, and in the original client they overlap: `limitedItemWidget` spans 186..360 of a
 * 360-wide box while `rotate_avatar_left/right` sit at 300..354 of the same box. That works
 * there because the plaque is artwork aligned to its left edge. Ours is text, so it has to stop
 * where the controls begin.
 */
describe('catalog preview top-right corner', () => {
    const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
    const experience = read('src/css/catalog/CatalogExperience.css');
    const catalog = read('src/css/catalog/CatalogView.css');
    const widget = read('src/components/catalog/views/page/widgets/CatalogLimitedItemWidgetView.tsx');

    // Anchored at a line start: the same class also appears inside longer, more specific
    // selectors, and a bare indexOf lands in the first of those instead.
    const rule = (stylesheet: string, selector: string) => {
        const start = stylesheet.indexOf(`
${selector} {`);

        expect(start).toBeGreaterThan(-1);

        return stylesheet.slice(start, stylesheet.indexOf('}', start));
    };

    it('reads its placement from the right edge, not from a fixed offset', () => {
        const plate = rule(experience, '.octane-catalog-preview-limited');
        const productView = rule(catalog, '.octane-catalog-product-view');

        expect(plate).toContain('top: 5px');
        // The box this sits in is no longer the original's fixed 360: it follows a window that
        // sizes itself from its tab strip. An offset measured from the left would drift into
        // the middle of it, which is exactly what the original's `left: 186` would do here.
        expect(productView).toContain('width: 100%');
        expect(productView).not.toContain('width: 360px');
        expect(plate).not.toContain('left:');
    });

    it('clears the lane the controls occupy', () => {
        const plate = rule(experience, '.octane-catalog-preview-limited');
        const controls = rule(catalog, '.octane-catalog-preview-controls');

        expect(controls).toContain('right: 6px');
        expect(controls).toContain('width: 54px');
        // Those two numbers are the lane, and the plate starts where it ends.
        expect(plate).toContain('right: 60px');
    });

    it('takes the size of the plate rather than imposing one on it', () => {
        const plate = rule(experience, '.octane-catalog-preview-limited');

        // `.unique-complete-plate` is the 170x29 of its own background artwork. A width here
        // constrained nothing - the plate overflowed it - so reserving room inside this box
        // moved the plate not at all.
        expect(plate).not.toContain('width:');
        expect(plate).not.toContain('height:');
        expect(plate).not.toContain('padding-right:');
        expect(widget).not.toContain('w-full');
        expect(widget).not.toContain('mx-auto');
    });
});
