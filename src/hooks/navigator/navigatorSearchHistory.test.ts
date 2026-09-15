import { describe, expect, it } from 'vitest';
import {
    addSearchContextAtCurrentOffset,
    EMPTY_SEARCH_HISTORY,
    getCurrentSearchContext,
    goBackInSearchHistory,
    goForwardInSearchHistory,
    hasNextSearchContext,
    hasPreviousSearchContext,
    isSameSearchContext
} from './navigatorSearchHistory';

const ctx = (code: string, filter = '') => ({ code, filter });

describe('navigatorSearchHistory', () => {
    it('starts empty with nothing to go back or forward to', () => {
        expect(hasPreviousSearchContext(EMPTY_SEARCH_HISTORY)).toBe(false);
        expect(hasNextSearchContext(EMPTY_SEARCH_HISTORY)).toBe(false);
        expect(getCurrentSearchContext(EMPTY_SEARCH_HISTORY)).toBeNull();
        expect(goBackInSearchHistory(EMPTY_SEARCH_HISTORY)).toBeNull();
    });

    it('pushes contexts and advances the offset', () => {
        let state = addSearchContextAtCurrentOffset(EMPTY_SEARCH_HISTORY, ctx('official_view'));
        state = addSearchContextAtCurrentOffset(state, ctx('hotel_view', 'tag:x'));

        expect(state.offset).toBe(1);
        expect(getCurrentSearchContext(state)).toEqual(ctx('hotel_view', 'tag:x'));
        expect(hasPreviousSearchContext(state)).toBe(true);
        expect(hasNextSearchContext(state)).toBe(false);
    });

    it('goes back and forward without mutating the input', () => {
        const state = addSearchContextAtCurrentOffset(addSearchContextAtCurrentOffset(EMPTY_SEARCH_HISTORY, ctx('a')), ctx('b'));
        const back = goBackInSearchHistory(state);

        expect(back?.context).toEqual(ctx('a'));
        expect(back?.state.offset).toBe(0);
        expect(state.offset).toBe(1);
        expect(hasNextSearchContext(back!.state)).toBe(true);

        const forward = goForwardInSearchHistory(back!.state);

        expect(forward?.context).toEqual(ctx('b'));
        expect(forward?.state.offset).toBe(1);
        expect(goForwardInSearchHistory(forward!.state)).toBeNull();
    });

    it('discards the forward entries when a new context is added after going back', () => {
        let state = addSearchContextAtCurrentOffset(EMPTY_SEARCH_HISTORY, ctx('a'));
        state = addSearchContextAtCurrentOffset(state, ctx('b'));
        state = addSearchContextAtCurrentOffset(state, ctx('c'));
        state = goBackInSearchHistory(goBackInSearchHistory(state)!.state)!.state;
        state = addSearchContextAtCurrentOffset(state, ctx('d'));

        expect(state.contexts).toEqual([ctx('a'), ctx('d')]);
        expect(state.offset).toBe(1);
    });

    it('compares contexts by code and filter', () => {
        expect(isSameSearchContext(ctx('a', '1'), ctx('a', '1'))).toBe(true);
        expect(isSameSearchContext(ctx('a', '1'), ctx('a', '2'))).toBe(false);
        expect(isSameSearchContext(null, ctx('a'))).toBe(false);
    });
});
