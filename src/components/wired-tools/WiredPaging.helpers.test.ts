import { describe, expect, it } from 'vitest';
import {
    calculateLastPage,
    canRequestNewPage,
    clampInputPage,
    createPageRequestState,
    markPageLoaded,
    NO_PAGE,
    parseInputPage,
    restrictPageInput,
    splitPagingText,
    tryRequestPage
} from './WiredPaging.helpers';

describe('WiredPaging.helpers', () => {
    it('an empty result still has one page and a full page does not spill over', () => {
        expect(calculateLastPage(0, 50)).toBe(1);
        expect(calculateLastPage(50, 50)).toBe(1);
        expect(calculateLastPage(51, 50)).toBe(2);
        expect(calculateLastPage(-1, 50)).toBe(NO_PAGE);
        expect(calculateLastPage(10, 0)).toBe(NO_PAGE);
    });

    it('clamps a typed page into the result set', () => {
        expect(restrictPageInput('1a2')).toBe('12');
        expect(parseInputPage('')).toBe(0);
        expect(clampInputPage(0, 4)).toBe(1);
        expect(clampInputPage(9, 4)).toBe(4);
        expect(clampInputPage(3, 4)).toBe(3);
        expect(clampInputPage(9, NO_PAGE)).toBe(9);
    });

    it('holds back a second request inside the rate limit', () => {
        const state = createPageRequestState();

        expect(tryRequestPage(state, 2, 1000, 200, true)).toBe(true);
        expect(tryRequestPage(state, 3, 1100, 200, true)).toBe(false);
        expect(tryRequestPage(state, 3, 1200, 200, true)).toBe(true);
    });

    it('blocks the page already in flight for the same-page timeout unless it has arrived', () => {
        const state = createPageRequestState();

        tryRequestPage(state, 2, 1000, 200, true);
        expect(canRequestNewPage(state, true, 1500, 200, true)).toBe(false);
        expect(canRequestNewPage(state, false, 1500, 200, true)).toBe(true);
        expect(canRequestNewPage(state, true, 1500, 200, false)).toBe(true);

        markPageLoaded(state, 2);
        expect(state.requestedPage).toBe(NO_PAGE);
        expect(tryRequestPage(state, 2, 1500, 200, true)).toBe(true);
    });

    it('splits the footer text at %page% like PagedTableView', () => {
        expect(splitPagingText('%entries_count% logs found. Showing page %page% of %page_count%', 120, 3)).toEqual({
            start: '120 logs found. Showing page ',
            end: ' of 3'
        });
        expect(splitPagingText('no page field here', 1, 1)).toBeNull();
        expect(splitPagingText('%page% and %page%', 1, 1)).toBeNull();
    });
});
