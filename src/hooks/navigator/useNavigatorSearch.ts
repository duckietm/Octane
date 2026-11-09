import { FlatCreatedEvent, NavigatorSearchComposer, NavigatorSearchEvent, NavigatorSearchResultSet, RoomSettingsSavedEvent } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { useNavigatorUiStore } from './navigatorUiStore';

const NAVIGATOR_USER_COUNT_REFRESH_MS = 15000;
const MY_ROOMS_TAB_CODE = 'myworld_view';
/** The server keeps the first 64 characters of a search and echoes those back. */
const SERVER_MAX_QUERY_LENGTH = 64;

/**
 * Whether a search reply answers the search on screen: same tab and same filter. Only the tab was compared, so while
 * typing a reply for an older filter (or a poll sent before the change) could replace the newer results.
 */
export const isReplyForSearch = (code: string, data: string, tabCode: string, filter: string): boolean => {
    if (!tabCode || code !== tabCode) return false;

    const expected = (filter ?? '').slice(0, SERVER_MAX_QUERY_LENGTH);

    return (data ?? '') === expected;
};

export const useNavigatorSearch = () => {
    const tabCode = useNavigatorUiStore((s) => s.currentTabCode);
    const filter = useNavigatorUiStore((s) => s.currentFilter);
    const isVisible = useNavigatorUiStore((s) => s.isVisible);
    const needsSearch = useNavigatorUiStore((s) => s.needsSearch);
    const consumeSearchRequest = useNavigatorUiStore((s) => s.consumeSearchRequest);

    const [searchResult, setSearchResult] = useState<NavigatorSearchResultSet | null>(null);
    const [isFetching, setIsFetching] = useState(false);

    useEffect(() => {
        if (!tabCode) return;

        setIsFetching(true);
        SendMessageComposer(new NavigatorSearchComposer(tabCode, filter));
    }, [tabCode, filter]);

    useEffect(() => {
        if (!needsSearch || !tabCode) return;

        consumeSearchRequest();
        setIsFetching(true);
        SendMessageComposer(new NavigatorSearchComposer(tabCode, filter));
    }, [needsSearch, tabCode, filter, consumeSearchRequest]);

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

        if (!isReplyForSearch(result.code, result.data, tabCode, filter)) return;

        setSearchResult(result);
        setIsFetching(false);
    });

    useMessageEvent<FlatCreatedEvent>(FlatCreatedEvent, () => {
        if (!tabCode) return;

        setIsFetching(true);
        SendMessageComposer(new NavigatorSearchComposer(tabCode, filter));
    });

    // AIR (navigator IncomingMessages.onRoomSettingsSaved) reloads the own rooms list, so a renamed room shows its new name.
    useMessageEvent<RoomSettingsSavedEvent>(RoomSettingsSavedEvent, () => {
        if (tabCode !== MY_ROOMS_TAB_CODE) return;

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
