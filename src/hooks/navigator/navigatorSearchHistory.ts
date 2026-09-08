import type { NavigatorSearchContext } from './navigatorLegacySearch';

/**
 * Pure port of `SearchContextHistoryManager.as` (AIR 13): a browsing history of
 * search contexts with an offset. Adding a context after going back discards
 * the forward entries, exactly like the official manager.
 */
export interface NavigatorSearchHistoryState {
    contexts: NavigatorSearchContext[];
    offset: number;
}

export const EMPTY_SEARCH_HISTORY: NavigatorSearchHistoryState = { contexts: [], offset: -1 };

export const isSameSearchContext = (a: NavigatorSearchContext | null | undefined, b: NavigatorSearchContext | null | undefined): boolean =>
    !!a && !!b && a.code === b.code && a.filter === b.filter;

export const getCurrentSearchContext = (state: NavigatorSearchHistoryState): NavigatorSearchContext | null => state.contexts[state.offset] ?? null;

export const hasPreviousSearchContext = (state: NavigatorSearchHistoryState): boolean => state.offset > 0 && state.contexts.length > 0;

export const hasNextSearchContext = (state: NavigatorSearchHistoryState): boolean => state.offset + 1 < state.contexts.length;

/** `addSearchContextAtCurrentOffset`: drop everything after the offset, push, advance. */
export const addSearchContextAtCurrentOffset = (state: NavigatorSearchHistoryState, context: NavigatorSearchContext): NavigatorSearchHistoryState => ({
    contexts: [...state.contexts.slice(0, state.offset + 1), context],
    offset: state.offset + 1
});

/** `getPreviousSearchContextAndGoBack`: null when there is nothing to go back to. */
export const goBackInSearchHistory = (state: NavigatorSearchHistoryState): { state: NavigatorSearchHistoryState; context: NavigatorSearchContext } | null => {
    if (!hasPreviousSearchContext(state)) return null;

    const offset = state.offset - 1;

    return { state: { ...state, offset }, context: state.contexts[offset] };
};

/** `getNextSearchContextAndMoveForward`. */
export const goForwardInSearchHistory = (
    state: NavigatorSearchHistoryState
): { state: NavigatorSearchHistoryState; context: NavigatorSearchContext } | null => {
    if (!hasNextSearchContext(state)) return null;

    const offset = state.offset + 1;

    return { state: { ...state, offset }, context: state.contexts[offset] };
};
