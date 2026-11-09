import { describe, expect, it } from 'vitest';
import { shouldVirtualizeCatalogOffers } from './catalogGridPerformance.helpers';

describe('catalog grid performance policy', () => {
    it('virtualizes the large pages that exist in the live catalog', () => {
        expect(shouldVirtualizeCatalogOffers(240, false)).toBe(true);
        expect(shouldVirtualizeCatalogOffers(101, false)).toBe(true);
        expect(shouldVirtualizeCatalogOffers(90, false)).toBe(false);
    });

    it('virtualizes large pages in Catalog Studio too; reorder carries offer indices, not DOM positions', () => {
        expect(shouldVirtualizeCatalogOffers(240, true)).toBe(true);
        expect(shouldVirtualizeCatalogOffers(90, true)).toBe(false);
    });
});
