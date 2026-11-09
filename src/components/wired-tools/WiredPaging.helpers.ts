/**
 * The arithmetic of the official client's `PagedTableView`, which the room logs window and the
 * variable owners window are built on: the last page of a result set, the clamping of a typed
 * page number, and the request rate limiter. Time never comes from here; every function that
 * needs "now" takes it as an argument so the limiter stays testable.
 */

/** The default gap between two page requests, in ms. */
export const REQUEST_PAGE_RATELIMIT = 200;

/** How long the page that is already in flight stays blocked, in ms. */
export const REQUEST_SAME_PAGE_TIMEOUT = 2000;

/** What `currentPage` and `lastPage` are while no page has arrived yet. */
export const NO_PAGE = -1;

/** An empty result still has a page 1. */
export const calculateLastPage = (totalEntries: number, pageSize: number): number => {
    if (totalEntries < 0 || pageSize <= 0) return NO_PAGE;

    return Math.trunc(Math.max(totalEntries - 1, 0) / pageSize + 1);
};

/** Digits only in the page field. */
export const restrictPageInput = (text: string): string => text.replace(/[^0-9]/g, '');

/** An empty field is page 0, which clamps to 1. */
export const parseInputPage = (text: string): number => {
    const typed = Number.parseInt(text, 10);

    return Number.isFinite(typed) ? typed : 0;
};

/** Below 1 becomes 1, above the last page becomes the last page. */
export const clampInputPage = (page: number, lastPage: number): number => {
    if (page < 1) return 1;
    if (lastPage !== NO_PAGE && page > lastPage) return lastPage;

    return page;
};

/** The page asked for last and when it was asked. */
export interface WiredPageRequestState {
    requestedPage: number;
    lastRequestTime: number;
}

export const createPageRequestState = (): WiredPageRequestState => ({ requestedPage: NO_PAGE, lastRequestTime: 0 });

/**
 * Nothing within `ratelimit` ms of the last request, and, when the same-page timeout is on, not
 * the page that is already in flight within `REQUEST_SAME_PAGE_TIMEOUT`.
 */
export const canRequestNewPage = (
    state: WiredPageRequestState,
    samePage: boolean,
    now: number,
    ratelimit: number,
    samePageTimeout: boolean
): boolean => {
    if (state.lastRequestTime > now - ratelimit) return false;
    if (samePageTimeout && samePage && state.lastRequestTime > now - REQUEST_SAME_PAGE_TIMEOUT) return false;

    return true;
};

/** The gate, then the bookkeeping. `true` when the request may be sent. */
export const tryRequestPage = (state: WiredPageRequestState, page: number, now: number, ratelimit: number, samePageTimeout: boolean): boolean => {
    if (!canRequestNewPage(state, page === state.requestedPage, now, ratelimit, samePageTimeout)) return false;

    state.requestedPage = page;
    state.lastRequestTime = now;

    return true;
};

/** The page in flight has arrived. */
export const markPageLoaded = (state: WiredPageRequestState, currentPage: number): void => {
    if (currentPage === state.requestedPage) state.requestedPage = NO_PAGE;
};

/** The footer text when a window's own key has no translation. */
export const DEFAULT_PAGING_TEXT = '%entries_count% found. Showing page %page% of %page_count%';

/**
 * `PagedTableView.updatePaging`: the window's footer text is split at `%page%`, where the page
 * field sits. The part before it gets the entry count, the part after it the last page. A text
 * without exactly one `%page%` leaves the footer without labels.
 */
export const splitPagingText = (text: string, totalEntries: number, lastPage: number): { start: string; end: string } | null => {
    const parts = (text ?? '').split('%page%');

    if (parts.length !== 2) return null;

    return { start: parts[0].replace('%entries_count%', String(totalEntries)), end: parts[1].replace('%page_count%', String(lastPage)) };
};
