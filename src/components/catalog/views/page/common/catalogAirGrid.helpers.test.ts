/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
    catalogPageUsesAirBaseTemplate,
    getAirCatalogColumnCount,
    getAirCatalogOfferDimensions,
    getVisibleAirGridEntries,
    layoutAirCatalogOffers
} from './catalogAirGrid.helpers';

describe('getVisibleAirGridEntries', () => {
    const entry = (index: number, y: number, height: number) => ({ offer: { offerId: index } as any, index, x: 0, y, width: 36, height });
    const entries = [entry(0, 0, 36), entry(1, 36, 36), entry(2, 500, 74), entry(3, 1000, 36)];

    it('returns the entries intersecting the viewport plus the overscan', () => {
        expect(getVisibleAirGridEntries(entries, 0, 100, 0).map((e) => e.index)).toEqual([0, 1]);
        expect(getVisibleAirGridEntries(entries, 0, 100, 450).map((e) => e.index)).toEqual([0, 1, 2]);
        expect(getVisibleAirGridEntries(entries, 480, 100, 0).map((e) => e.index)).toEqual([2]);
    });
    it('keeps an entry that starts above the window but ends inside it', () => {
        expect(getVisibleAirGridEntries(entries, 20, 10, 0).map((e) => e.index)).toEqual([0]);
    });
    it('returns every entry while the viewport is unmeasured', () => {
        expect(getVisibleAirGridEntries(entries, 0, 0)).toBe(entries);
    });
    it('handles an empty layout', () => {
        expect(getVisibleAirGridEntries([], 0, 100)).toEqual([]);
    });
});

describe('the AIR box an offer is drawn in', () => {
    const offer = (offerId: number, priced: boolean) =>
        ({
            offerId,
            priceInCredits: priced ? 10 : 0,
            priceInActivityPoints: 0
        }) as any;

    it('keeps the 36x36 base box for a page where nothing carries a price', () => {
        const offers = [offer(1, false), offer(2, false)];

        expect(catalogPageUsesAirBaseTemplate(offers, 'NORMAL')).toBe(true);
        expect(layoutAirCatalogOffers(offers, 2, 'NORMAL').entries.map((entry) => entry.height)).toEqual([36, 36]);
        expect(getAirCatalogColumnCount(offers, 80, 'NORMAL')).toBe(2);
    });

    it('gives an offer with a missing price the priced box when the page sells something else', () => {
        const offers = [offer(1, true), offer(2, false)];

        expect(catalogPageUsesAirBaseTemplate(offers, 'NORMAL')).toBe(false);
        expect(layoutAirCatalogOffers(offers, 2, 'NORMAL').entries.map((entry) => ({ width: entry.width, height: entry.height }))).toEqual([
            { width: 53, height: 74 },
            { width: 53, height: 74 }
        ]);
    });

    it('keeps every column of such a page on the same row baseline', () => {
        const offers = [offer(1, true), offer(2, false), offer(3, true), offer(4, true), offer(5, false), offer(6, true)];

        const { entries, height } = layoutAirCatalogOffers(offers, 3, 'NORMAL');

        expect(entries.slice(0, 3).map((entry) => entry.y)).toEqual([0, 0, 0]);
        expect(entries.slice(3).map((entry) => entry.y)).toEqual([74, 74, 74]);
        expect(height).toBe(148);
    });

    it('still reads a single offer on its own when asked for', () => {
        expect(getAirCatalogOfferDimensions(offer(1, false), 'NORMAL')).toEqual({ width: 36, height: 36 });
        expect(getAirCatalogOfferDimensions(offer(1, true), 'NORMAL')).toEqual({ width: 53, height: 74 });
    });
});
