import { FlatCreatedEvent, NavigatorSearchComposer, NavigatorSearchEvent, NavigatorSearchResultSet } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
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
    });

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
