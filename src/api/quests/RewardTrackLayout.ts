/**
 * The geometry of the official reward track window (reward_track_main_xml, 1103x722), ported from
 * RewardTrackPrizeLayout / RewardTrackPrizeTrackView / RewardTrackMainProgressBarView.
 *
 * Prizes and point indicators are placed along the track by their required points: one pixel scale
 * (distance per point) for the whole track, a page every `pagePointSpan` points, and the prev / next
 * buttons step through the pages. Every x is relative to the prize layer (`prize_content`, 598 wide).
 */

/** prize_content / points_indicator width. */
export const REWARD_TRACK_VISIBLE_WIDTH = 598;
/** prize_template width (also point_indicator_template). */
export const REWARD_TRACK_PRIZE_WIDTH = 80;
/** RewardTrackPrizeTrackView.MIN_PRIZE_SPACING. */
export const REWARD_TRACK_MIN_PRIZE_SPACING = 15;
/** The main loading_bar of the track container. */
export const REWARD_TRACK_BAR_WIDTH = 602;

const PAGE_BOUNDARY_EPSILON = 1e-4;

export interface RewardTrackLayoutPrize {
    premium: boolean;
    requiredPoints: number;
}

export interface RewardTrackLayout {
    distancePerPoint: number;
    pageCount: number;
    pagePointSpan: number;
    zeroOffset: number;
    /** The x of a points value on a page. */
    xFor: (points: number, page: number) => number;
    /** The page a points value belongs to. */
    pageOf: (points: number) => number;
}

const minRequiredPoints = (prizes: RewardTrackLayoutPrize[]): number => {
    let min = -1;

    for (const prize of prizes) if (min === -1 || prize.requiredPoints < min) min = prize.requiredPoints;

    return Math.max(0, min);
};

const maxRequiredPoints = (prizes: RewardTrackLayoutPrize[]): number => prizes.reduce((max, prize) => Math.max(max, prize.requiredPoints), 0);

/** The smallest positive gap between two prizes of the same tier, in list order. */
const tierMinimumGap = (prizes: RewardTrackLayoutPrize[], premium: boolean): number => {
    let previous = -1;
    let gap = 0;

    for (const prize of prizes) {
        if (prize.premium !== premium) continue;

        if (previous !== -1) {
            const delta = prize.requiredPoints - previous;

            if (delta > 0 && (gap === 0 || delta < gap)) gap = delta;
        }

        previous = prize.requiredPoints;
    }

    return gap;
};

const minimumGap = (prizes: RewardTrackLayoutPrize[]): number => {
    const free = tierMinimumGap(prizes, false);
    const premium = tierMinimumGap(prizes, true);

    if (free <= 0) return premium;

    if (premium <= 0) return free;

    return Math.min(free, premium);
};

const pageIndexOf = (points: number, span: number): number => (points <= 0 ? 0 : Math.max(0, Math.ceil((points - PAGE_BOUNDARY_EPSILON) / span) - 1));

/** RewardTrackPrizeLayout.rebuild(). */
export const buildRewardTrackLayout = (
    prizes: RewardTrackLayoutPrize[],
    visibleWidth = REWARD_TRACK_VISIBLE_WIDTH,
    prizeWidth = REWARD_TRACK_PRIZE_WIDTH,
    spacing = REWARD_TRACK_MIN_PRIZE_SPACING
): RewardTrackLayout => {
    const firstOffset = prizeWidth / 2 + spacing;
    const minPoints = minRequiredPoints(prizes);
    const zeroOffsetFor = (distance: number) => Math.max(0, firstOffset - minPoints * distance);
    const usableWidth = (distance: number) => Math.max(1, visibleWidth - firstOffset - zeroOffsetFor(distance));
    const fits = (distance: number, span: number) => span * distance <= usableWidth(distance) + PAGE_BOUNDARY_EPSILON;

    let gap = minimumGap(prizes);

    if (gap <= 0) gap = Math.max(1, maxRequiredPoints(prizes));

    let distancePerPoint = (prizeWidth + spacing) / gap;

    if (distancePerPoint <= 0) distancePerPoint = 1;

    const pagePointSpan = Math.max(1, Math.max(1, Math.floor(usableWidth(distancePerPoint) / distancePerPoint / gap)) * gap);

    // findMaxDistancePerPoint(): stretch the scale as far as one page still fits.
    let low = distancePerPoint;
    let high = distancePerPoint;

    for (let step = 0; step < 32; step++) {
        high *= 2;

        if (!fits(high, pagePointSpan)) break;

        low = high;
    }

    for (let step = 0; step < 24; step++) {
        const middle = (low + high) / 2;

        if (fits(middle, pagePointSpan)) low = middle;
        else high = middle;
    }

    distancePerPoint = low;

    const zeroOffset = zeroOffsetFor(distancePerPoint);
    const pageCount = Math.max(1, prizes.reduce((max, prize) => Math.max(max, pageIndexOf(prize.requiredPoints, pagePointSpan)), 0) + 1);

    return {
        distancePerPoint,
        pageCount,
        pagePointSpan,
        zeroOffset,
        xFor: (points: number, page: number) => zeroOffset + (points - Math.max(0, page * pagePointSpan)) * distancePerPoint,
        pageOf: (points: number) => Math.max(0, Math.min(pageCount - 1, pageIndexOf(points, pagePointSpan)))
    };
};

export interface RewardTrackPage<T extends RewardTrackLayoutPrize> {
    free: T[];
    premium: T[];
    /** The distinct point values of the page's prizes, one indicator each. */
    points: number[];
}

/** RewardTrackPrizeTrackView.buildPageData(): the prizes and indicator values of every page, in prize order. */
export const buildRewardTrackPages = <T extends RewardTrackLayoutPrize>(prizes: T[], layout: RewardTrackLayout): RewardTrackPage<T>[] => {
    const pages: RewardTrackPage<T>[] = [];

    for (let index = 0; index < layout.pageCount; index++) pages.push({ free: [], premium: [], points: [] });

    for (const prize of prizes) {
        const page = pages[layout.pageOf(prize.requiredPoints)];

        (prize.premium ? page.premium : page.free).push(prize);

        if (page.points.indexOf(prize.requiredPoints) === -1) page.points.push(prize.requiredPoints);
    }

    return pages;
};

/** A prize / indicator window is centred on its x: `window.x = round(x - width / 2)`. */
export const getRewardTrackSlotLeft = (x: number, width = REWARD_TRACK_PRIZE_WIDTH): number => Math.round(x - width / 2);

/**
 * RewardTrackMainProgressBarView.refreshByX() + render(): the `progress` container gets
 * `round(602 * trunc(x) / 602)` px and the green fill shape 4px more (the whole bar once it is near the end).
 */
export const getRewardTrackBarWidths = (x: number, barWidth = REWARD_TRACK_BAR_WIDTH): { fill: number; progress: number } => {
    const ratio = Math.max(0, Math.min(1, Math.trunc(x) / barWidth));
    const progress = Math.max(0, Math.min(barWidth, Math.round(barWidth * ratio)));

    return { fill: progress >= barWidth - 4 ? barWidth : progress + 4, progress };
};

/** The red counters on the page buttons: claimable prizes on the earlier / later pages. */
export const countRewardTrackUnclaimed = <T extends RewardTrackLayoutPrize>(
    prizes: T[],
    layout: RewardTrackLayout,
    page: number,
    isClaimable: (prize: T) => boolean
): { next: number; previous: number } => {
    let previous = 0;
    let next = 0;

    for (const prize of prizes) {
        if (!isClaimable(prize)) continue;

        const prizePage = layout.pageOf(prize.requiredPoints);

        if (prizePage === page) continue;

        if (prizePage < page) previous++;
        else next++;
    }

    return { next, previous };
};

/** A task / level mini bar: `progress` width in px (rounded like RewardTrackProgressBarViewBase.render()). */
export const getRewardTrackMiniBarWidth = (ratio: number, width: number): number => Math.max(0, Math.min(width, Math.round(width * Math.max(0, Math.min(1, ratio)))));
