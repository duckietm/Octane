import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/handheld/HandheldCatalog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of the rule with exactly this selector list. */
const ruleOf = (selector: string): string => {
    const start = css.indexOf(`\n${selector} {`);

    expect(start, selector).toBeGreaterThan(-1);

    return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
};

const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({ selector: match[1].trim(), body: match[2] }));

// An earlier phone page stacked the desktop parts and kept their offsets (the grid's bottom: 60px): an invisible panel
// then lay over the first rows and took their taps. The page is now built from parts of the flow only.
describe('phone shop page: the grid and the product panel are parts of the flow', () => {
    it('lays the grid and the panel out one after the other, the grid taking the height that is left', () => {
        const layout = ruleOf(":root[data-handheld] .octane-handheld-shop__layout");

        expect(layout).toContain('display: flex');
        expect(layout).toContain('flex-direction: column');
        expect(ruleOf(':root[data-handheld] .octane-handheld-shop__grid-scroll')).toMatch(/flex: 1 1 0;[\s\S]*min-height: 0;[\s\S]*overflow-y: auto/);
        expect(ruleOf(':root[data-handheld] .octane-handheld-shop__product')).toContain('flex: none');
    });

    it('positions none of the page parts, the grid or the panel absolutely or stuck', () => {
        const parts = ['__panes', '__menu', '__page', '__layout', '__grid-scroll', '__grid', '__product', '__strip', '__buy', '__actions'];

        for (const { selector, body } of rules) {
            if (!parts.some((part) => selector.endsWith(`.octane-handheld-shop${part}`))) continue;

            expect(body, selector).not.toMatch(/position:\s*(absolute|fixed|sticky)/);
            expect(body, selector).not.toMatch(/\b(top|bottom):\s*\d/);
        }
    });

    it('clears the desktop offsets of every AIR part it moves into the flow', () => {
        // The stepper's parts and the preview buttons sit at fixed AIR coordinates on the desktop.
        expect(ruleOf(':root[data-handheld] .octane-handheld-shop__buy .octane-catalog-standard-spinner-button')).toMatch(/top: auto;\s*left: auto/);
        expect(css).toMatch(/\.octane-catalog-standard-spinner-input-frame \{\s*position: relative;\s*top: auto;\s*left: auto/);
        expect(ruleOf(':root[data-handheld] .octane-handheld-shop__preview .octane-catalog-preview-controls button')).toMatch(/top: auto;\s*right: auto;\s*bottom: auto;\s*left: auto/);
        expect(ruleOf(':root[data-handheld] .octane-handheld-shop__search .octane-catalog-search-clear')).toMatch(/top: auto;\s*right: auto;\s*bottom: auto;\s*left: auto/);
    });

    it('shows the list or the page upright, and three columns on its side', () => {
        expect(css).toMatch(/:root\[data-handheld='portrait'\] \.octane-handheld-shop__panes\[data-step='menu'\] > \.octane-handheld-shop__page,\s*:root\[data-handheld='portrait'\] \.octane-handheld-shop__panes\[data-step='page'\] > \.octane-handheld-shop__menu \{\s*display: none/);
        expect(ruleOf(":root[data-handheld='landscape'] .octane-handheld-shop__panes")).toContain('grid-template-columns: 200px minmax(0, 1fr)');
        expect(ruleOf(":root[data-handheld='landscape'] .octane-handheld-shop__layout")).toContain('grid-template-columns: minmax(0, 1fr) 252px');
    });

    it('fits six tiles across a phone held upright, each at least a finger high', () => {
        const grid = ruleOf(':root[data-handheld] .octane-handheld-shop__grid');

        // 393 - 2 x 12 (sheet) - 2 x 3 (ring room) = 363: six columns of 52 with five gaps of 6 need 342, seven need 400.
        expect(grid).toContain('grid-template-columns: repeat(auto-fill, minmax(52px, 1fr))');
        expect(grid).toContain('gap: 6px');
        expect(ruleOf(':root[data-handheld] .octane-handheld-shop__tile')).toContain('min-height: 64px');
    });
});
