import { useEffect, useRef } from 'react';
import {
    canRequestNewPage,
    createPageRequestState,
    markPageLoaded,
    NO_PAGE,
    REQUEST_PAGE_RATELIMIT,
    tryRequestPage
} from '../../components/wired-tools/WiredPaging.helpers';

export interface WiredPageRequestsOptions {
    /** The page being shown, `NO_PAGE` while none has arrived. */
    currentPage: number;
    /** The last page of the result set, `NO_PAGE` while none has arrived. */
    lastPage: number;
    /** Identifies the page data being shown; a new one releases the page that was in flight. */
    pageKey?: unknown;
    /** Gap between two requests in ms; 190 for the room logs, 280 for the variable owners. */
    ratelimit?: number;
    /** Block the page already in flight for two seconds. The room logs turn it off. */
    samePageTimeout?: boolean;
    /** Sends the request. Only called once the limiter has let the page through. */
    onRequestPage: (page: number) => void;
}

export interface WiredPageRequests {
    canRequestNewPage: (samePage: boolean) => boolean;
    /** `true` when the limiter let it through and the request was sent. */
    requestPage: (page: number) => boolean;
    requestFirstPage: () => boolean;
    requestPreviousPage: () => boolean;
    requestNextPage: () => boolean;
    requestLastPage: () => boolean;
    /** The current page again. */
    refresh: () => boolean;
}

/**
 * The requesting side of a paged wired window: a rate limited `requestPage` and the button
 * handlers that feed it. The limiter's two fields live in a ref and the clock is only read
 * inside the returned functions, which run from event handlers.
 */
export const useWiredPageRequests = ({
    currentPage,
    lastPage,
    pageKey,
    ratelimit = REQUEST_PAGE_RATELIMIT,
    samePageTimeout = true,
    onRequestPage
}: WiredPageRequestsOptions): WiredPageRequests => {
    const state = useRef(createPageRequestState());

    useEffect(() => {
        markPageLoaded(state.current, currentPage);
    }, [currentPage, pageKey]);

    const requestPage = (page: number): boolean => {
        if (!tryRequestPage(state.current, page, performance.now(), ratelimit, samePageTimeout)) return false;

        onRequestPage(page);
        // A refresh of the page on screen is only held back by the rate limit, never by the
        // same-page timeout: the page it asks for is the one already shown.
        markPageLoaded(state.current, currentPage);

        return true;
    };

    return {
        canRequestNewPage: (samePage) => canRequestNewPage(state.current, samePage, performance.now(), ratelimit, samePageTimeout),
        requestPage,
        requestFirstPage: () => requestPage(1),
        requestPreviousPage: () => (currentPage === NO_PAGE ? false : requestPage(Math.max(1, currentPage - 1))),
        requestNextPage: () => (currentPage === NO_PAGE ? false : requestPage(currentPage + 1)),
        requestLastPage: () => (lastPage === NO_PAGE ? false : requestPage(lastPage)),
        refresh: () => (currentPage === NO_PAGE ? requestPage(1) : requestPage(currentPage))
    };
};
