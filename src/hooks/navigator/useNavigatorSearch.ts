import { FlatCreatedEvent, NavigatorSearchComposer, NavigatorSearchEvent, NavigatorSearchResultSet, RoomSettingsSavedEvent } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { shouldReloadRoomListAfterSettingsSaved } from './navigatorEnforceCategory';
import { useNavigatorUiStore } from './navigatorUiStore';

const NAVIGATOR_USER_COUNT_REFRESH_MS = 15000;

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

        if (!tabCode || result.code !== tabCode) return;

        setSearchResult(result);
        setIsFetching(false);
        useNavigatorUiStore.getState().recordSearchContext(result.code, result.data ?? '');
    });

    useMessageEvent<FlatCreatedEvent>(FlatCreatedEvent, () => {
        if (!tabCode) return;

        setIsFetching(true);
        SendMessageComposer(new NavigatorSearchComposer(tabCode, filter));
    });

    // Official onRoomSettingsSaved -> reloadRoomList(5): saved settings
    // (name, category, ...) refresh the "my rooms" list while it is open.
    useMessageEvent<RoomSettingsSavedEvent>(RoomSettingsSavedEvent, () => {
        if (!tabCode || !shouldReloadRoomListAfterSettingsSaved(isVisible, searchResult?.code ?? tabCode)) return;

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
