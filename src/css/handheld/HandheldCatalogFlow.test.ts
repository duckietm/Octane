import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/handheld/HandheldCatalog.css'), 'utf8');

/** The declarations of the first rule whose selector list contains the selector. */
const ruleOf = (selector: string): string => {
    const start = css.indexOf(selector);

    expect(start, selector).toBeGreaterThan(-1);

    return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
};

const LAYOUT = ':root[data-handheld] .octane-handheld-catalog__page .octane-catalog-default-layout >';

// The desktop page pins these parts with bottom offsets (grid 60px, price row 30px). Stacked in the flow on a phone,
// a kept offset pulls the grid up under the product view, which then takes the taps meant for the first rows.
describe('phone catalogue page: stacked parts drop the desktop offsets', () => {
    it('clears top and bottom on the item grid', () => {
        const rule = ruleOf(`${LAYOUT} .octane-catalog-grid-shell {`);

        expect(rule).toContain('top: auto !important');
        expect(rule).toContain('bottom: auto !important');
    });

    it('clears bottom on the price row and keeps the buy row stuck to the bottom', () => {
        expect(ruleOf(`${LAYOUT} .octane-catalog-price-row,`)).toContain('bottom: auto !important');

        const sticky = css.slice(css.lastIndexOf(`${LAYOUT} .octane-catalog-purchase-row {`));

        expect(sticky.slice(0, sticky.indexOf('}'))).toContain('bottom: 0 !important');
    });
});
