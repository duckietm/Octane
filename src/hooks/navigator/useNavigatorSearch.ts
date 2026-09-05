import { FlatCreatedEvent, NavigatorSearchComposer, NavigatorSearchEvent, NavigatorSearchResultSet } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { useNavigatorUiStore } from './navigatorUiStore';

const NAVIGATOR_USER_COUNT_REFRESH_MS = 15000;

/**
 * Navigator search hook.
 *
 * Fires NavigatorSearchComposer(tabCode, filter) whenever the active tab
 * or filter changes (skipped when tabCode is '' — initial state, before
 * metadata arrives). Holds the latest NavigatorSearchResultSet that
 * matches the active tab.
 *
 * The TanStack Query variant (see useOctaneQuery) was tried earlier but
 * its one-shot listener doesn't always reach NavigatorSearchEvent in
 * production builds with older renderer SDKs; the persistent
 * useMessageEvent listener used here matches the rest of the codebase
 * and reliably catches every server push.
 */
export const useNavigatorSearch = () => {
    const tabCode = useNavigatorUiStore((s) => s.currentTabCode);
    const filter = useNavigatorUiStore((s) => s.currentFilter);
    const isVisible = useNavigatorUiStore((s) => s.isVisible);

    const [searchResult, setSearchResult] = useState<NavigatorSearchResultSet | null>(null);
    const [isFetching, setIsFetching] = useState(false);

    useEffect(() => {
        if (!tabCode) return;

        setIsFetching(true);
        SendMessageComposer(new NavigatorSearchComposer(tabCode, filter));
    }, [tabCode, filter]);

    // Keep room user counts fresh while the navigator stays open (official refreshes search periodically).
    useEffect(() => {
        if (!isVisible || !tabCode) return;

        const timer = setInterval(() => {
            SendMessageComposer(new NavigatorSearchComposer(tabCode, filter));
        }, NAVIGATOR_USER_COUNT_REFRESH_MS);

        return () => clearInterval(timer);
    }, [isVisible, tabCode, filter]);

    useMessageEvent<NavigatorSearchEvent>(NavigatorSearchEvent, (event) => {
        const result = event.getParser()?.result;
        if (!result) return;

        // No active tab → the search query is disabled, ignore any event.
        // Otherwise only accept the event whose code matches the active tab.
        if (!tabCode || result.code !== tabCode) return;

        setSearchResult(result);
        setIsFetching(false);
    });

    // A newly created room refetches the current search.
    useMessageEvent<FlatCreatedEvent>(FlatCreatedEvent, () => {
        if (!tabCode) return;

        setIsFetching(true);
        SendMessageComposer(new NavigatorSearchComposer(tabCode, filter));
    });

    return {
        searchResult,
        isFetching,
        refetch: () => {
            if (!tabCode) return;
            setIsFetching(true);
            SendMessageComposer(new NavigatorSearchComposer(tabCode, filter));
        }
    };
};
