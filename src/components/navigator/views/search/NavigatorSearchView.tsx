import { NavigatorSearchComposer, NavigatorSearchResultSet } from '@octane/renderer';
import { FC, FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { INavigatorSearchFilter, LocalizeText, SearchFilterOptions, SendMessageComposer } from '../../../../api';
import refreshIcon from '../../../../assets/images/navigator/air/refresh-search.png';
import searchCloseIcon from '../../../../assets/images/navigator/air/search-close.png';
import searchPenIcon from '../../../../assets/images/navigator/air/search-pen.png';
import { useNavigatorData, useNavigatorUiStore } from '../../../../hooks';
import { useIsHandheld } from '../../../../hooks/handheld/useHandheldLayout';
import { NavigatorFilterChipsView } from './NavigatorFilterChipsView';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

interface NavigatorSearchViewProps {
    searchResult: NavigatorSearchResultSet | null;
}

const buildQuery = (filterIndex: number, value: string) => {
    const searchFilter: INavigatorSearchFilter = SearchFilterOptions[filterIndex] ?? SearchFilterOptions[0];

    return (searchFilter.query ? searchFilter.query + ':' : '') + value;
};

export const NavigatorSearchView: FC<NavigatorSearchViewProps> = (props) => {
    const { searchResult } = props;
    const [searchFilterIndex, setSearchFilterIndex] = useState(0);
    const [inputText, setInputText] = useState('');
    const { topLevelContext } = useNavigatorData();
    const tabCode = useNavigatorUiStore((state) => state.currentTabCode);
    const currentFilter = useNavigatorUiStore((state) => state.currentFilter);
    const placeholder = LocalizeText('navigator.filter.input.placeholder');
    const hasQuery = inputText.length > 0;
    const isHandheld = useIsHandheld();

    useEffect(() => {
        if (!searchResult) return;

        const split = searchResult.data.split(':');

        let filter: INavigatorSearchFilter = null;
        let value: string = '';

        if (split.length >= 2) {
            const [query, ...rest] = split;

            filter = SearchFilterOptions.find((option) => option.query === query);
            value = rest.join(':');
        } else {
            value = searchResult.data;
        }

        if (!filter) filter = SearchFilterOptions[0];

        setSearchFilterIndex(SearchFilterOptions.findIndex((option) => option === filter));
        setInputText(value);
    }, [searchResult]);

    const submitSearch = (value = inputText) => {
        if (!topLevelContext) return;

        const query = buildQuery(searchFilterIndex, value);

        // The same filter does not change the store, so the search is sent again directly.
        if (query === currentFilter && tabCode) {
            SendMessageComposer(new NavigatorSearchComposer(tabCode, query));
            return;
        }

        useNavigatorUiStore.getState().setFilter(query);
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        submitSearch();
    };

    // The filter's hidden input counts as a second text field, so with no submit button on screen the browser never submits on Enter.
    const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;

        event.preventDefault();
        submitSearch();
    };

    const refreshSearch = () => {
        if (!tabCode) return;

        const query = currentFilter || buildQuery(searchFilterIndex, inputText);

        // A typed search that was never submitted goes through the store, so its reply matches the filter on screen.
        if (query !== currentFilter) {
            useNavigatorUiStore.getState().setFilter(query);
            return;
        }

        SendMessageComposer(new NavigatorSearchComposer(tabCode, query));
    };

    const clearSearch = () => {
        setInputText('');
    };

    // Phone layout: one tall box, the filter chooser behind its magnifier, the pen (or clear) button at its end.
    if (isHandheld) {
        const filterName = SearchFilterOptions[searchFilterIndex]?.name;

        return (
            <NativeTextTree>
                <form onSubmit={onSubmit} className="octane-handheld-nav__search">
                    <NavigatorFilterChipsView handheld value={searchFilterIndex} onChange={setSearchFilterIndex} />
                    <input
                        aria-label={placeholder}
                        autoCapitalize="none"
                        autoComplete="off"
                        autoCorrect="off"
                        className="octane-handheld-nav__search-input"
                        enterKeyHint="search"
                        name="q"
                        placeholder={searchFilterIndex > 0 && filterName ? LocalizeText('navigator.filter.' + filterName) : placeholder}
                        type="text"
                        value={inputText}
                        onChange={(event) => setInputText(event.target.value)}
                        onKeyDown={onInputKeyDown}
                    />
                    <BaseButton
                        type={hasQuery ? 'button' : 'submit'}
                        className="octane-handheld-nav__search-action"
                        aria-label={hasQuery ? LocalizeText('generic.clear') : placeholder}
                        onClick={hasQuery ? clearSearch : undefined}
                    >
                        <img src={hasQuery ? searchCloseIcon : searchPenIcon} alt="" />
                    </BaseButton>
                </form>
            </NativeTextTree>
        );
    }

    return (
        <NativeTextTree>
            <form onSubmit={onSubmit} className="octane-navigator-air__search">
                <NavigatorFilterChipsView value={searchFilterIndex} onChange={setSearchFilterIndex} />
                <div className={`octane-navigator-air__search-field${hasQuery ? '' : ' is-placeholder'}`}>
                    <input
                        className="octane-navigator-air__search-input"
                        name="q"
                        placeholder={placeholder}
                        type="text"
                        value={inputText}
                        onChange={(event) => setInputText(event.target.value)}
                        onKeyDown={onInputKeyDown}
                    />
                    <BaseButton
                        type={hasQuery ? 'button' : 'submit'}
                        className="octane-navigator-air__search-clear"
                        aria-label={hasQuery ? LocalizeText('generic.clear') : placeholder}
                        onClick={hasQuery ? clearSearch : undefined}
                    >
                        <img src={hasQuery ? searchCloseIcon : searchPenIcon} alt="" />
                    </BaseButton>
                </div>
                {hasQuery && (
                    <BaseButton
                        type="button"
                        className="octane-navigator-air__search-refresh"
                        aria-label={LocalizeText('generic.refresh')}
                        onClick={refreshSearch}
                    >
                        <img src={refreshIcon} alt="" />
                    </BaseButton>
                )}
            </form>
        </NativeTextTree>
    );
};
