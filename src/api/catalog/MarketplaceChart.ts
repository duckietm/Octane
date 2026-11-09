/**
 * AIR MarketplaceChart geometry. The x values are day offsets (-30 .. 0, today at the right edge),
 * the y values either the average price or the traded amount of each day. The top of the axis is
 * the largest value rounded up to its leading digit (137 -> 200, 42 -> 50, 7 -> 7).
 */
export const MARKETPLACE_CHART_X_MIN = -30;

/** The bitmap AIR draws into (chart_bitmap in marketplace_offer_details.xml). */
export const MARKETPLACE_CHART_WIDTH = 320;
export const MARKETPLACE_CHART_HEIGHT = 200;

/** Five grid bands: AIR strokes six horizontal lines. */
export const MARKETPLACE_CHART_GRID_LINES = 5;

export type MarketplaceChartType = 'price_development' | 'trade_volume';

export interface MarketplaceChartPoint {
    x: number;
    y: number;
}

/** A line needs two days of trading; with fewer AIR shows the "not available" title and no chart. */
export const isMarketplaceChartAvailable = (dayOffsets: ReadonlyArray<number>, values: ReadonlyArray<number>): boolean =>
    !!dayOffsets && !!values && dayOffsets.length > 1;

export const getMarketplaceChartYMax = (values: ReadonlyArray<number>): number => {
    let max = 0;

    for (const value of values) if (value > max) max = value;

    const step = Math.pow(10, Math.max(Math.trunc(max).toString().length - 1, 0));

    return Math.ceil(max / step) * step;
};

/**
 * The line's points inside the plot area (0,0 = top-left of the grid). `chartWidth` / `chartHeight`
 * are what is left of the bitmap after the y labels: AIR keeps `width - labelWidth - 2` and
 * `height - labelHeight`.
 */
export const getMarketplaceChartPoints = (
    dayOffsets: ReadonlyArray<number>,
    values: ReadonlyArray<number>,
    chartWidth: number,
    chartHeight: number,
    yMax: number
): MarketplaceChartPoint[] => {
    const points: MarketplaceChartPoint[] = [];
    const count = Math.min(dayOffsets.length, values.length);

    for (let i = 0; i < count; i++) {
        points.push({
            x: chartWidth + (chartWidth / -MARKETPLACE_CHART_X_MIN) * dayOffsets[i],
            y: yMax > 0 ? chartHeight - (chartHeight / yMax) * values[i] : chartHeight
        });
    }

    return points;
};

/** The history rows sorted oldest day first, so the line never doubles back. */
export const sortMarketplaceHistory = (
    dayOffsets: ReadonlyArray<number>,
    averagePrices: ReadonlyArray<number>,
    soldAmounts: ReadonlyArray<number>
): { dayOffsets: number[]; averagePrices: number[]; soldAmounts: number[] } => {
    const rows = dayOffsets.map((day, index) => ({ day, price: averagePrices[index] ?? 0, sold: soldAmounts[index] ?? 0 }));

    rows.sort((a, b) => a.day - b.day);

    return {
        dayOffsets: rows.map((row) => row.day),
        averagePrices: rows.map((row) => row.price),
        soldAmounts: rows.map((row) => row.sold)
    };
};

/** The category GetMarketplaceItemStats sends (AIR MarketplaceModel): 3 unique, 2 wall, 1 floor. */
export const getMarketplaceStatsCategory = (furniType: number, isUniqueLimitedItem: boolean): number => {
    if (isUniqueLimitedItem) return 3;

    return furniType === 2 ? 2 : 1;
};
