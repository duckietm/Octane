import { GetSessionDataManager, IFurnitureData } from '@octane/renderer';
import { ChangeEvent, FC, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import {
    CatalogPage,
    FurnitureOffer,
    GetProductDataForLocalization,
    IPurchasableOffer,
    LocalizeText,
    localizeWithFallback,
    PageLocalization,
    SearchResult
} from '../../../../../api';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { useCatalogActions, useCatalogData, useCatalogUiState } from '../../../../../hooks';
import { useIsHandheld } from '../../../../../hooks/handheld/useHandheldLayout';
import { getNodesByOfferIdFromMap } from '../../../../../hooks/catalog/useCatalog.helpers';
import { readCachedCatalogOffer, readCatalogIndex } from '../../../../../hooks/catalog/useCatalogQueries';
import {
    CATALOG_SEARCH_DEBOUNCE_MS,
    filterCatalogSearchNodes,
    findCatalogSearchMatches,
    isCatalogSearchEnterKey,
    shouldRunCatalogSearch
} from './catalogSearch.helpers';

/** HabboCatalog.ensureSearchEntries: a furni is found by its name and by its product data name. */
const getSearchTerms = (furniture: IFurnitureData): string[] => [
    furniture.name,
    (GetProductDataForLocalization(furniture.fullName) ?? GetProductDataForLocalization(furniture.className))?.name
];

export const CatalogSearchView: FC<{}> = () => {
    const { rootNode = null, searchResult = null } = useCatalogData();
    const { currentType = null } = useCatalogUiState();
    const { beginCatalogSearch = null, endCatalogSearch = null } = useCatalogActions();
    // The field shows the running search: closing the catalog (or placing a result in the room) and reopening it keeps both.
    const [searchValue, setSearchValue] = useState(() => searchResult?.searchValue ?? '');
    // Phone layout: the field carries its hint as a plain placeholder in the phone's own type, not as AIR's drawn helper text.
    const isHandheld = useIsHandheld();
    const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const searchTypeRef = useRef(currentType);
    const searchRootRef = useRef(rootNode);
    const previousSearchResult = useRef(searchResult);

    const cancelTimer = () => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = null;
    };

    // HabboCatalog.performSearch (HabboCatalog.as:1901-1968): the results page, and the navigator filtered to the pages
    // that sell a match or whose name holds the text.
    const runSearch = useCallback(
        (search: string) => {
            if (!rootNode || !search.length) return;

            const furnitureDatas = GetSessionDataManager().getAllFurnitureData();

            if (!furnitureDatas || !furnitureDatas.length) return;

            const index = readCatalogIndex(currentType);
            const nodesByOfferId = (offerId: number) => getNodesByOfferIdFromMap(offerId, index?.offersToNodes, true);
            const matches = findCatalogSearchMatches(furnitureDatas, search, currentType, nodesByOfferId, getSearchTerms);
            // A page that is already loaded has the server's offer (limited edition numbers, prices); a clone keeps that
            // page's offer as it is when the results page takes the clone over.
            const offers: IPurchasableOffer[] = matches.offers.map((match) => {
                const pageIds = (nodesByOfferId(match.offerId) ?? []).map((node) => node.pageId);
                const cached = readCachedCatalogOffer(currentType, match.offerId, pageIds);

                return cached ? cached.clone() : new FurnitureOffer(match.furniture, match.offerId, match.isRent);
            });

            beginCatalogSearch(
                new SearchResult(search, offers, filterCatalogSearchNodes(search, matches.furniLines, matches.pageIds, rootNode)),
                new CatalogPage(
                    -1,
                    'default_3x3',
                    new PageLocalization(
                        ['catalog_header_roombuilder', 'credits_v3_teaser'],
                        [LocalizeText('catalog.search.results', ['count', 'needle'], [String(offers.length), search])]
                    ),
                    offers,
                    false,
                    1,
                    currentType
                )
            );
        },
        [beginCatalogSearch, currentType, rootNode]
    );

    // HabboCatalog.onClearSearch: an empty field goes back to the page that was open before the search.
    const endSearch = useCallback(() => endCatalogSearch?.(), [endCatalogSearch]);

    const scheduleSearch = useCallback(
        (value: string, immediate = false) => {
            cancelTimer();

            if (!value.length) {
                endSearch();

                return;
            }

            if (immediate) {
                runSearch(value);

                return;
            }

            if (!shouldRunCatalogSearch(value)) return;

            searchTimeout.current = setTimeout(() => {
                searchTimeout.current = null;
                runSearch(value);
            }, CATALOG_SEARCH_DEBOUNCE_MS);
        },
        [endSearch, runSearch]
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
        cancelTimer();
        setSearchValue('');
        endSearch();
        inputRef.current?.focus();
    };

    // Another catalogue (NORMAL / BUILDERS_CLUB) starts without a search; a new tree (index loaded, publish) reruns the
    // running one. Mounting again (the catalog reopened) keeps the search as it was.
    useEffect(() => {
        const rootChanged = searchRootRef.current !== rootNode;

        searchRootRef.current = rootNode;

        if (searchTypeRef.current !== currentType) {
            searchTypeRef.current = currentType;
            cancelTimer();
            setSearchValue('');

            return;
        }

        if (rootChanged && searchValue) scheduleSearch(searchValue, !!searchResult);
    }, [currentType, rootNode]);

    // The search ended elsewhere (a tab, a catalog link, another catalogue): the field follows.
    useEffect(() => {
        const previous = previousSearchResult.current;

        previousSearchResult.current = searchResult;

        if (!previous || searchResult) return;

        cancelTimer();
        setSearchValue('');
    }, [searchResult]);

    useEffect(() => () => cancelTimer(), []);

    const hasQuery = searchValue.length > 0;

    return (
        // AIR searchContainer: the search.helper text in the box and common_small_pen on the right, which turns into a
        // clear button once something is typed.
        <div className="octane-catalog-search relative w-full">
            {/* search.helper: ${catalog.search} in 0x666666 at blend 0.5 (0xb2b2b2 on the white field) until something is typed. */}
            {!hasQuery && !isHandheld && (
                <NativeText
                    nativeResolution
                    background={0xffffff}
                    className="octane-catalog-search-helper"
                    overrides={{ color: 0xb2b2b2 }}
                    text={LocalizeText('catalog.search')}
                    textStyle="u_regular"
                />
            )}
            <input
                ref={inputRef}
                aria-label={LocalizeText('catalog.search')}
                className="octane-catalog-search-input w-full"
                placeholder={isHandheld ? LocalizeText('catalog.search') : undefined}
                type="text"
                value={searchValue}
                onChange={onSearchChange}
                onKeyDown={onSearchKeyDown}
            />
            {hasQuery ? (
                <BaseButton aria-label={localizeWithFallback('generic.clear', 'Clear')} className="octane-catalog-search-clear" type="button" onClick={clearSearch}>
                    <FaTimes />
                </BaseButton>
            ) : (
                <span aria-hidden="true" className="octane-catalog-search-pen" />
            )}
        </div>
    );
};
