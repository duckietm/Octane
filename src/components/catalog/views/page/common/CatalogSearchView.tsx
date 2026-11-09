import { GetSessionDataManager } from '@octane/renderer';
import { ChangeEvent, FC, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import {
    CatalogPage,
    FilterCatalogNode,
    FurnitureOffer,
    ICatalogNode,
    ICatalogPage,
    IPurchasableOffer,
    LocalizeText,
    localizeWithFallback,
    PageLocalization,
    SearchResult
} from '../../../../../api';
import { useCatalogActions, useCatalogData, useCatalogUiState } from '../../../../../hooks';
import {
    CATALOG_SEARCH_DEBOUNCE_MS,
    findCatalogFurnitureMatches,
    isCatalogSearchEnterKey,
    normalizeCatalogSearchText,
    shouldRunCatalogSearch
} from './catalogSearch.helpers';
import { BaseButton } from '../../../../../common/BaseButton';

export const CatalogSearchView: FC<{}> = () => {
    const [searchValue, setSearchValue] = useState('');
    const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
    const { rootNode = null } = useCatalogData();
    const { currentType = null, setSearchResult = null, setCurrentPage = null } = useCatalogUiState();
    const { getNodesByOfferId = null } = useCatalogActions();

    const runSearch = useCallback(
        (search: string) => {
            if (!rootNode || !shouldRunCatalogSearch(search)) return;

            const furnitureDatas = GetSessionDataManager().getAllFurnitureData();

            if (!furnitureDatas || !furnitureDatas.length) return;

            const { furniture: foundFurniture, furniLines: foundFurniLines } = findCatalogFurnitureMatches(
                furnitureDatas,
                search,
                currentType,
                undefined,
                getNodesByOfferId ? (offerId) => !!getNodesByOfferId(offerId, true)?.length : null
            );

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
        [currentType, getNodesByOfferId, rootNode, setCurrentPage, setSearchResult]
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
        // AIR searchContainer: the search.helper text (catalog.search, #666666) in the box and common_small_pen on the
        // right, which turns into icons_close once something is typed.
        <div className="octane-catalog-search relative w-full">
            <input
                aria-label={LocalizeText('catalog.search')}
                className="octane-catalog-search-input w-full"
                placeholder={LocalizeText('catalog.search')}
                type="text"
                value={searchValue}
                onChange={onSearchChange}
                onKeyDown={onSearchKeyDown}
            />
            {searchValue && searchValue.length > 0 ? (
                <BaseButton
                    aria-label={localizeWithFallback('generic.clear', 'Clear')}
                    type="button"
                    className="octane-catalog-search-clear"
                    onClick={clearSearch}
                >
                    <FaTimes />
                </BaseButton>
            ) : (
                <span aria-hidden="true" className="octane-catalog-search-pen" />
            )}
        </div>
    );
};
