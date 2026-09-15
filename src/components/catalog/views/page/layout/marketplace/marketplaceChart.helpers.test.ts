import { describe, expect, it } from 'vitest';
import { buildMarketplaceChartPoints, getMarketplaceChartMax, isMarketplaceChartAvailable, layoutMarketplaceChart } from './marketplaceChart.helpers';

describe('marketplace chart helpers', () => {
    it('needs two days of trading before the chart is available', () => {
        expect(isMarketplaceChartAvailable([])).toBe(false);
        expect(isMarketplaceChartAvailable([{ dayOffset: 0, value: 3 }])).toBe(false);
        expect(
            isMarketplaceChartAvailable([
                { dayOffset: -1, value: 3 },
                { dayOffset: 0, value: 4 }
            ])
        ).toBe(true);
    });

    it('pairs offsets with values oldest-first and clamps negative values', () => {
        const points = buildMarketplaceChartPoints([0, -2, -1], [5, -3, 7]);

        expect(points).toEqual([
            { dayOffset: -2, value: 0 },
            { dayOffset: -1, value: 7 },
            { dayOffset: 0, value: 5 }
        ]);
    });

    it('rounds the axis maximum up to the leading digit like the official bitmap', () => {
        expect(getMarketplaceChartMax([137, 42])).toBe(200);
        expect(getMarketplaceChartMax([42])).toBe(50);
        expect(getMarketplaceChartMax([9])).toBe(9);
        expect(getMarketplaceChartMax([])).toBe(0);
    });

    it('spreads points over a fixed day window with today at the right edge', () => {
        const layout = layoutMarketplaceChart(
            [
                { dayOffset: -30, value: 0 },
                { dayOffset: -15, value: 50 },
                { dayOffset: 0, value: 100 }
            ],
            101,
            101
        );

        expect(layout.maxValue).toBe(100);
        expect(layout.points.map((point) => point.x)).toEqual([0, 50, 100]);
        expect(layout.points.map((point) => point.y)).toEqual([100, 50, 0]);
        expect(layout.gridLines).toEqual([0, 20, 40, 60, 80, 100]);
    });

    it('pins days older than the window to the left edge and returns no points when unavailable', () => {
        const layout = layoutMarketplaceChart(
            [
                { dayOffset: -45, value: 1 },
                { dayOffset: 0, value: 1 }
            ],
            101,
            51
        );

        expect(layout.points[0].x).toBe(0);
        expect(layout.points[1].x).toBe(100);
        expect(layoutMarketplaceChart([{ dayOffset: 0, value: 1 }], 101, 51).points).toEqual([]);
    });
});
