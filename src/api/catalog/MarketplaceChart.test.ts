import { describe, expect, it } from 'vitest';
import {
    getMarketplaceChartPoints,
    getMarketplaceChartYMax,
    getMarketplaceStatsCategory,
    isMarketplaceChartAvailable,
    sortMarketplaceHistory
} from './MarketplaceChart';

describe('MarketplaceChart', () => {
    it('rounds the axis top up to the leading digit like AIR', () => {
        expect(getMarketplaceChartYMax([137, 20])).toBe(200);
        expect(getMarketplaceChartYMax([42])).toBe(50);
        expect(getMarketplaceChartYMax([7, 3])).toBe(7);
        expect(getMarketplaceChartYMax([1000])).toBe(1000);
        expect(getMarketplaceChartYMax([])).toBe(0);
    });

    it('needs at least two days for a line', () => {
        expect(isMarketplaceChartAvailable([-1], [10])).toBe(false);
        expect(isMarketplaceChartAvailable([-2, -1], [10, 12])).toBe(true);
    });

    it('maps day -30 to the left edge, today to the right and 0 to the bottom', () => {
        expect(getMarketplaceChartPoints([-30, -15, 0], [0, 50, 100], 300, 200, 100)).toEqual([
            { x: 0, y: 200 },
            { x: 150, y: 100 },
            { x: 300, y: 0 }
        ]);
    });

    it('keeps an all-zero line on the bottom instead of dividing by zero', () => {
        expect(getMarketplaceChartPoints([-2, -1], [0, 0], 300, 200, 0).every((point) => point.y === 200)).toBe(true);
    });

    it('sorts the history oldest day first and keeps the columns together', () => {
        expect(sortMarketplaceHistory([-1, -5, -3], [10, 50, 30], [1, 5, 3])).toEqual({
            dayOffsets: [-5, -3, -1],
            averagePrices: [50, 30, 10],
            soldAmounts: [5, 3, 1]
        });
    });

    it('asks with the AIR category: unique 3, wall 2, floor 1', () => {
        expect(getMarketplaceStatsCategory(1, true)).toBe(3);
        expect(getMarketplaceStatsCategory(2, false)).toBe(2);
        expect(getMarketplaceStatsCategory(1, false)).toBe(1);
    });
});
