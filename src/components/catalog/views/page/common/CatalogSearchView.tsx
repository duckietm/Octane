import { GetSessionDataManager } from '@octane/renderer';
import { ChangeEvent, FC, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import {
    CatalogPage,
    FilterCatalogNode,
    FurnitureOffer,
    ICatalogNode,
    ICatalogPage,
    IPurchasableOffer,
    LocalizeText,
    PageLocalization,
    SearchResult
} from '../../../../../api';
import { useCatalogData, useCatalogUiState } from '../../../../../hooks';
import {
    CATALOG_SEARCH_DEBOUNCE_MS,
    findCatalogFurnitureMatches,
    isCatalogSearchEnterKey,
    normalizeCatalogSearchText,
    shouldRunCatalogSearch
} from './catalogSearch.helpers';

export const CatalogSearchView: FC<{}> = () => {
    const [searchValue, setSearchValue] = useState('');
    const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
    const { rootNode = null } = useCatalogData();
    const { currentType = null, setSearchResult = null, setCurrentPage = null } = useCatalogUiState();

    const runSearch = useCallback(
        (search: string) => {
            if (!rootNode || !shouldRunCatalogSearch(search)) return;

            const furnitureDatas = GetSessionDataManager().getAllFurnitureData();

            if (!furnitureDatas || !furnitureDatas.length) return;

            const { furniture: foundFurniture, furniLines: foundFurniLines } = findCatalogFurnitureMatches(furnitureDatas, search, currentType);

            const offers: IPurchasableOffer[] = [];

            for (const furniture of foundFurniture) {
                offers.push(new FurnitureOffer(furniture));
            }

            let nodes: ICatalogNode[] = [];

            FilterCatalogNode(search, foundFurniLines, rootNode, nodes);

            setSearchResult(
                new SearchResult(
                    search,
                    offers,
                    nodes.filter((node) => node.isVisible)
                )
            );
            setCurrentPage(
                new CatalogPage(
                    -1,
                    'default_3x3',
                    new PageLocalization([], [LocalizeText('catalog.search.results', ['count', 'needle'], [String(offers.length), search])]),
                    offers,
                    false,
                    1
                )
            );
        },
        [currentType, rootNode, setCurrentPage, setSearchResult]
    );

    const scheduleSearch = useCallback(
        (value: string, immediate = false) => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);

            const search = normalizeCatalogSearchText(value);

            if (!shouldRunCatalogSearch(search)) {
                setSearchResult(null);

                return;
            }

            if (immediate) {
                runSearch(search);

                return;
            }

            searchTimeout.current = setTimeout(() => runSearch(search), CATALOG_SEARCH_DEBOUNCE_MS);
        },
        [runSearch, setSearchResult]
    );

    const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;

        setSearchValue(value);
        scheduleSearch(value);
    };

    const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!isCatalogSearchEnterKey(event.key, searchValue)) return;

        event.preventDefault();
        scheduleSearch(searchValue, true);
    };

    const clearSearch = () => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        setSearchValue('');
        setSearchResult(null);
    };

    useEffect(() => {
        if (searchValue) scheduleSearch(searchValue);
    }, [currentType, rootNode]);

    useEffect(() => () => searchTimeout.current && clearTimeout(searchTimeout.current), []);

    return (
        <div className="relative w-full">
            <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted pointer-events-none" />
            <input
                aria-label={LocalizeText('generic.search')}
                className="w-full pl-6 pr-6 py-[3px] text-[11px] rounded border-2 border-card-grid-item-border bg-white text-dark placeholder-muted focus:outline-none focus:border-primary transition-colors"
                placeholder={LocalizeText('generic.search')}
                type="text"
                value={searchValue}
                onChange={onSearchChange}
                onKeyDown={onSearchKeyDown}
            />
            {searchValue && searchValue.length > 0 && (
                <button
                    aria-label={LocalizeText('generic.clear')}
                    type="button"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-muted hover:text-danger cursor-pointer transition-colors"
                    onClick={clearSearch}
                >
                    <FaTimes />
                </button>
            )}
        </div>
    );
};
