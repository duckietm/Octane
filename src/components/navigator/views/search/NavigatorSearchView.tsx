import { NavigatorSearchComposer, NavigatorSearchResultSet } from '@octane/renderer';
import { FC, FormEvent, useEffect, useState } from 'react';
import { INavigatorSearchFilter, LocalizeText, SearchFilterOptions, SendMessageComposer } from '../../../../api';
import refreshIcon from '../../../../assets/images/navigator/air/refresh-search.png';
import searchCloseIcon from '../../../../assets/images/navigator/air/search-close.png';
import searchPenIcon from '../../../../assets/images/navigator/air/search-pen.png';
import { useNavigatorData, useNavigatorUiStore } from '../../../../hooks';
import { NavigatorFilterChipsView } from './NavigatorFilterChipsView';

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
        useNavigatorUiStore.getState().setFilter(buildQuery(searchFilterIndex, value));
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        submitSearch();
    };

    const refreshSearch = () => {
        if (!tabCode) return;
        SendMessageComposer(new NavigatorSearchComposer(tabCode, currentFilter || buildQuery(searchFilterIndex, inputText)));
    };

    const clearSearch = () => {
        setInputText('');
    };

    return (
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
                />
                <button
                    type={hasQuery ? 'button' : 'submit'}
                    className="octane-navigator-air__search-clear"
                    aria-label={hasQuery ? LocalizeText('generic.clear') : placeholder}
                    onClick={hasQuery ? clearSearch : undefined}
                >
                    <img src={hasQuery ? searchCloseIcon : searchPenIcon} alt="" />
                </button>
            </div>
            {hasQuery && (
                <button type="button" className="octane-navigator-air__search-refresh" aria-label={LocalizeText('generic.refresh')} onClick={refreshSearch}>
                    <img src={refreshIcon} alt="" />
                </button>
            )}
        </form>
    );
};
