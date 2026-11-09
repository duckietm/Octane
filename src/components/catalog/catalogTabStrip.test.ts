import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The catalog window widens itself to fit however many root categories the hotel publishes,
 * between the original client's 570px and a 1040px ceiling. Two things have to hold for that
 * to actually keep every category reachable, and neither is visible from a unit test of the
 * hook alone - jsdom has no layout, so the measurement it does returns zero.
 */
describe('catalog tab strip', () => {
    const hook = readFileSync(join(process.cwd(), 'src/components/catalog/useCatalogWindowWidth.ts'), 'utf8');
    const stylesheet = readFileSync(join(process.cwd(), 'src/css/catalog/CatalogView.css'), 'utf8');

    it('sizes the window from the tabs, from the original 570px up to a ceiling', () => {
        expect(hook).toContain('CATALOG_WINDOW_BASE_WIDTH = 570');
        expect(hook).toContain('CATALOG_WINDOW_MAX_WIDTH = 1040');
        expect(hook).toContain('measureCatalogTabStripWidth');
        // scrollWidth grows with the window it is used to size, so reading it feeds back into
        // itself. The comment naming that trap may stay; the call may not.
        const code = hook.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

        expect(code).not.toContain('scrollWidth');
    });

    it('measures the tabs at their natural width, never at the width it is deciding', () => {
        // A tab that could shrink to fit the current window would report that squeezed width
        // back as the width the window should have.
        const base = stylesheet.slice(
            stylesheet.indexOf('.octane-catalog-window .octane-catalog-tabs-shell .octane-card-tab-item {'),
            stylesheet.indexOf('.octane-catalog-window .octane-catalog-tabs-shell.is-condensed')
        );

        expect(base).toContain('flex-shrink: 0');
        expect(hook).toContain("classList.remove(CONDENSED_CLASS)");
        expect(hook).toContain("classList.add(CONDENSED_CLASS)");
    });

    it('lets the tabs condense only once the window cannot widen any further', () => {
        const condensed = stylesheet.slice(stylesheet.indexOf('.octane-catalog-window .octane-catalog-tabs-shell.is-condensed'));

        expect(condensed).toContain('flex-shrink: 1');
        // Shrunk down to its icon a tab is still a target; shrunk to nothing it is not.
        expect(condensed).toContain('min-width: 34px');
        expect(hook).toContain('needed > CATALOG_WINDOW_MAX_WIDTH');
    });
});
