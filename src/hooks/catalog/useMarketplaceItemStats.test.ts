import { describe, expect, it, vi } from 'vitest';

vi.mock('@octane/renderer', () => ({
    GetMarketplaceItemStatsComposer: class {},
    MarketplaceItemStatsEvent: class {}
}));

vi.mock('../../api/octane-query', () => ({ useOctaneQuery: vi.fn() }));

import {
    getMarketplaceStatsCategory,
    MARKETPLACE_STATS_CATEGORY_FLOOR,
    MARKETPLACE_STATS_CATEGORY_LIMITED,
    MARKETPLACE_STATS_CATEGORY_WALL,
    selectMarketplaceItemStats
} from './useMarketplaceItemStats';

describe('useMarketplaceItemStats helpers', () => {
    it('keys the request the way the official client does', () => {
        expect(getMarketplaceStatsCategory(false, false)).toBe(MARKETPLACE_STATS_CATEGORY_FLOOR);
        expect(getMarketplaceStatsCategory(true, false)).toBe(MARKETPLACE_STATS_CATEGORY_WALL);
        expect(getMarketplaceStatsCategory(true, true)).toBe(MARKETPLACE_STATS_CATEGORY_LIMITED);
    });

    it('copies the parser arrays and defaults the AIR 13 price hints to zero', () => {
        const dayOffsets = [-2, -1, 0];
        const stats = selectMarketplaceItemStats({
            averagePrice: 12,
            offerCount: 3,
            historyLength: 30,
            dayOffsets,
            averagePrices: [10, 12, 14],
            soldAmounts: [1, 2, 3],
            furniTypeId: 77,
            furniCategoryId: 1
        });

        expect(stats.dayOffsets).toEqual(dayOffsets);
        expect(stats.dayOffsets).not.toBe(dayOffsets);
        expect(stats.lowestCurrentPrice).toBe(0);
        expect(stats.suggestedPrice).toBe(0);
    });

    it('keeps the price hints when the parser carries them', () => {
        const stats = selectMarketplaceItemStats({
            averagePrice: 12,
            offerCount: 3,
            historyLength: 30,
            dayOffsets: [],
            averagePrices: [],
            soldAmounts: [],
            furniTypeId: 77,
            furniCategoryId: 1,
            lowestCurrentPrice: 9,
            suggestedPrice: 11
        });

        expect(stats.lowestCurrentPrice).toBe(9);
        expect(stats.suggestedPrice).toBe(11);
    });
});
