/**
 * Pure step logic of the official "The Habbo Way" booklet
 * (HabboWayController in the AIR client).
 *
 * The booklet is a run of `finalPage` do's-and-don'ts pages (0 based) followed
 * by one closing page that offers the quiz. The page count comes from the
 * `help.habboway.page.count` configuration (official default 6); when it is
 * not configured we count the `habbo.way.page.N.*` texts instead so a hotel
 * with more pages in its texts shows them all.
 */

export const HABBO_WAY_START_PAGE = 0;
export const HABBO_WAY_DEFAULT_PAGE_COUNT = 6;
export const HABBO_WAY_MAX_DISCOVERED_PAGES = 32;

/** Returns '' (or the key itself) when a text is missing. */
export type TextLookup = (key: string) => string;

export interface HabboWayPageKeys {
    correctTitle: string;
    correctDescription: string;
    wrongTitle: string;
    wrongDescription: string;
}

export const getHabboWayPageKeys = (page: number): HabboWayPageKeys => ({
    correctTitle: `habbo.way.page.${page}.correct.title`,
    correctDescription: `habbo.way.page.${page}.correct.description`,
    wrongTitle: `habbo.way.page.${page}.wrong.title`,
    wrongDescription: `habbo.way.page.${page}.wrong.description`
});

const hasText = (lookup: TextLookup, key: string): boolean => {
    const value = lookup(key);

    return !!value && value !== key;
};

/** Number of booklet pages found in the texts (`habbo.way.page.N.correct.title`). */
export const discoverHabboWayPageCount = (lookup: TextLookup): number => {
    let count = 0;

    while (count < HABBO_WAY_MAX_DISCOVERED_PAGES && hasText(lookup, getHabboWayPageKeys(count).correctTitle)) count++;

    return count;
};

/**
 * Resolves the final page index: a positive configured count wins, otherwise
 * the texts, otherwise the official default.
 */
export const resolveHabboWayPageCount = (configuredCount: number | null | undefined, lookup: TextLookup): number => {
    if (typeof configuredCount === 'number' && configuredCount > 0) return configuredCount;

    const discovered = discoverHabboWayPageCount(lookup);

    return discovered > 0 ? discovered : HABBO_WAY_DEFAULT_PAGE_COUNT;
};

export const isHabboWayFinalPage = (page: number, finalPage: number): boolean => page >= finalPage;

export const nextHabboWayPage = (page: number, finalPage: number): number => Math.min(finalPage, page + 1);

export const previousHabboWayPage = (page: number): number => Math.max(HABBO_WAY_START_PAGE, page - 1);

/** Path of the page illustration under `image.library.url`, as the official client loads it. */
export const getHabboWayIllustrationPath = (page: number, finalPage: number): string =>
    isHabboWayFinalPage(page, finalPage) ? 'habboway/page_end.png' : `habboway/page_${page}.png`;

/**
 * Position shown by the page dots widget: 1 based while reading, 0 (no dot
 * lit) on the closing page.
 */
export const getHabboWayIndicatorPosition = (page: number, finalPage: number): number => (isHabboWayFinalPage(page, finalPage) ? 0 : page + 1);
