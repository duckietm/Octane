export interface IMarketplaceChartPoint {
    dayOffset: number;
    value: number;
}

export interface IMarketplaceChartLayout {
    width: number;
    height: number;
    maxValue: number;
    points: { x: number; y: number; dayOffset: number; value: number }[];
    gridLines: number[];
}

// The official MarketplaceChart only draws once it has two days of trading to connect.
export const isMarketplaceChartAvailable = (points: IMarketplaceChartPoint[]): boolean => Array.isArray(points) && points.length > 1;

/**
 * Pairs the per-day offsets with one of the two stat series and sorts them oldest-first so the
 * line reads left to right like the official chart (offsets are negative day counts from today).
 */
export const buildMarketplaceChartPoints = (dayOffsets: number[], values: number[]): IMarketplaceChartPoint[] => {
    if (!dayOffsets || !values) return [];

    const count = Math.min(dayOffsets.length, values.length);
    const points: IMarketplaceChartPoint[] = [];

    for (let i = 0; i < count; i++) points.push({ dayOffset: dayOffsets[i], value: Math.max(0, values[i]) });

    return points.sort((a, b) => a.dayOffset - b.dayOffset);
};

/**
 * Rounds the top of the value axis up to the leading digit, the way the official chart does
 * (137 -> 200, 42 -> 50, 9 -> 9), so the top grid label reads as a round number.
 */
export const getMarketplaceChartMax = (values: number[]): number => {
    let max = 0;

    for (const value of values) if (value > max) max = value;

    if (max <= 0) return 0;

    const magnitude = 10 ** (Math.floor(max).toString().length - 1);

    return Math.ceil(max / magnitude) * magnitude;
};

// The official MarketplaceChart hard-codes its x axis to the last 30 days (`_xMin = -30`), so a
// history with fewer days still starts part-way across the box instead of stretching to fill it.
export const MARKETPLACE_CHART_DAY_WINDOW = 30;

/**
 * Projects the points into a `width` x `height` box: the x axis runs from `dayWindow` days ago
 * at the left edge to today at the right edge, the y axis runs from 0 at the bottom to the
 * rounded maximum at the top, and five horizontal grid lines split the box the way the official
 * bitmap does. Offsets older than the window are pinned to the left edge.
 */
export const layoutMarketplaceChart = (
    points: IMarketplaceChartPoint[],
    width: number,
    height: number,
    dayWindow: number = MARKETPLACE_CHART_DAY_WINDOW
): IMarketplaceChartLayout => {
    const maxValue = getMarketplaceChartMax(points.map((point) => point.value));
    const gridLines: number[] = [];

    for (let i = 0; i <= 5; i++) gridLines.push(Math.round(((height - 1) / 5) * i));

    if (!isMarketplaceChartAvailable(points)) return { width, height, maxValue, points: [], gridLines };

    const window = Math.max(1, dayWindow);

    return {
        width,
        height,
        maxValue,
        gridLines,
        points: points.map((point) => {
            const ratio = Math.min(1, Math.max(0, 1 + point.dayOffset / window));

            return {
                dayOffset: point.dayOffset,
                value: point.value,
                x: Math.round(ratio * (width - 1)),
                y: maxValue > 0 ? Math.round(height - 1 - (point.value / maxValue) * (height - 1)) : height - 1
            };
        })
    };
};
