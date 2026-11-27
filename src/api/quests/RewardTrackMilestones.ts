/**
 * The prize road as the phone draws it: one stop per points threshold, top to bottom, with the free and the premium
 * prizes of that threshold side by side. The desktop window pages the same prizes along a pixel track
 * (RewardTrackLayout); the phone needs no pages, only the stops and how far the points have come between them.
 */

export interface RewardTrackMilestonePrize {
    requiredPoints: number;
    premium: boolean;
}

export interface RewardTrackMilestone<T extends RewardTrackMilestonePrize> {
    points: number;
    free: T[];
    premium: T[];
}

/** The stops of the road, by rising points; prizes of one tier at one stop keep the order the server sent. */
export const buildRewardTrackMilestones = <T extends RewardTrackMilestonePrize>(prizes: ReadonlyArray<T>): RewardTrackMilestone<T>[] => {
    const stops = new Map<number, RewardTrackMilestone<T>>();

    for (const prize of prizes) {
        let stop = stops.get(prize.requiredPoints);

        if (!stop) {
            stop = { points: prize.requiredPoints, free: [], premium: [] };
            stops.set(prize.requiredPoints, stop);
        }

        (prize.premium ? stop.premium : stop.free).push(prize);
    }

    return [...stops.values()].sort((a, b) => a.points - b.points);
};

export interface RewardTrackNextStop {
    /** The points of the next stop, or null once every stop is reached. */
    next: number | null;
    /** Points still missing for it (0 when there is none). */
    remaining: number;
    /** How far the points are from the stop before it to the next one, 0..1 (1 when there is none). */
    ratio: number;
}

/** The stop the points are heading for, for the summary's bar. */
export const getRewardTrackNextStop = (stops: ReadonlyArray<number>, points: number): RewardTrackNextStop => {
    const index = stops.findIndex((stop) => stop > points);

    if (index === -1) return { next: null, remaining: 0, ratio: 1 };

    const previous = index > 0 ? stops[index - 1] : 0;
    const span = stops[index] - previous;

    return {
        next: stops[index],
        remaining: stops[index] - points,
        ratio: span > 0 ? Math.max(0, Math.min(1, (points - previous) / span)) : 0
    };
};

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

/** How far the points are from stop `index` to the one after it, 0..1 (0 after the last stop). */
const segmentFill = (stops: ReadonlyArray<number>, index: number, points: number): number => {
    if (index < 0 || index >= stops.length - 1) return 0;

    const span = stops[index + 1] - stops[index];

    return span > 0 ? clamp((points - stops[index]) / span) : points >= stops[index] ? 1 : 0;
};

/**
 * How much of the rail beside stop `index` is filled, 0..1. The rail of a row runs from its top to its bottom with the
 * stop in the middle: the upper half is the second half of the way from the stop before (for the first stop, the whole
 * way from no points), the lower half the first half of the way to the stop after. The last row's rail ends at its stop.
 */
export const getRewardTrackRowFill = (stops: ReadonlyArray<number>, index: number, points: number): number => {
    if (index < 0 || index >= stops.length) return 0;

    const arriving = index === 0 ? (stops[0] > 0 ? clamp(points / stops[0]) : 1) : clamp(2 * segmentFill(stops, index - 1, points) - 1);
    const leaving = index === stops.length - 1 ? (points >= stops[index] ? 1 : 0) : clamp(2 * segmentFill(stops, index, points));

    return Math.round((arriving + leaving) * 500) / 1000;
};
