import { FC, useCallback, useEffect, useId, useRef, useState } from 'react';
import { IMarketplaceSearchOptions, LocalizeText, localizeWithFallback, MarketplaceSearchType } from '../../../../../../api';
import { Button, Text } from '../../../../../../common';
import { OctaneInput } from '../../../../../../layout';

export interface SearchFormViewProps {
    searchType: number;
    sortTypes: number[];
    onSearch(options: IMarketplaceSearchOptions): void;
}

export const SearchFormView: FC<SearchFormViewProps> = (props) => {
    const { searchType = null, sortTypes = null, onSearch = null } = props;
    const [sortType, setSortType] = useState(sortTypes ? sortTypes[0] : 3); // first item of SORT_TYPES_ACTIVITY
    const [searchQuery, setSearchQuery] = useState('');
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(0);
    // marketplace_search_simple.xml `combine_uniques_checkbox`: MarketPlaceCatalogWidget starts with
    // _combineUniques = true and re-runs the search whenever it is toggled.
    const [combineUniques, setCombineUniques] = useState(true);
    const combineUniquesRef = useRef(combineUniques);
    const combineUniquesId = useId();
    const isSimpleSearch = searchType === MarketplaceSearchType.BY_ACTIVITY || searchType === MarketplaceSearchType.BY_VALUE;

    const onSortTypeChange = useCallback(
        (sortType: number) => {
            setSortType(sortType);

            if (searchType === MarketplaceSearchType.BY_ACTIVITY || searchType === MarketplaceSearchType.BY_VALUE)
                onSearch({ minPrice: -1, maxPrice: -1, query: '', type: sortType, combineUniques });
        },
        [combineUniques, onSearch, searchType]
    );

    const onCombineUniquesChange = useCallback(
        (checked: boolean) => {
            combineUniquesRef.current = checked;
            setCombineUniques(checked);

            if (searchType === MarketplaceSearchType.BY_ACTIVITY || searchType === MarketplaceSearchType.BY_VALUE)
                onSearch({ minPrice: -1, maxPrice: -1, query: '', type: sortType, combineUniques: checked });
        },
        [onSearch, searchType, sortType]
    );

    const onClickSearch = useCallback(() => {
        const minPrice = min > 0 ? min : -1;
        const maxPrice = max > 0 ? max : -1;

        onSearch({ minPrice: minPrice, maxPrice: maxPrice, type: sortType, query: searchQuery, combineUniques });
    }, [combineUniques, max, min, onSearch, searchQuery, sortType]);

    useEffect(() => {
        if (!sortTypes || !sortTypes.length) return;

        const sortType = sortTypes[0];

        setSortType(sortType);

        if (searchType === MarketplaceSearchType.BY_ACTIVITY || MarketplaceSearchType.BY_VALUE === searchType)
            onSearch({ minPrice: -1, maxPrice: -1, query: '', type: sortType, combineUniques: combineUniquesRef.current });
    }, [onSearch, searchType, sortTypes]);

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
                <Text className="col-span-3">{LocalizeText('catalog.marketplace.sort_order')}</Text>
                <select className="form-select form-select-sm" value={sortType} onChange={(event) => onSortTypeChange(parseInt(event.target.value))}>
                    {sortTypes.map((type) => (
                        <option key={type} value={type}>
                            {LocalizeText(`catalog.marketplace.sort.${type}`)}
                        </option>
                    ))}
                </select>
            </div>
            {isSimpleSearch && (
                <label className="octane-marketplace-combine-uniques flex items-center gap-1" htmlFor={combineUniquesId}>
                    <input
                        checked={combineUniques}
                        data-testid="marketplace-combine-uniques"
                        id={combineUniquesId}
                        type="checkbox"
                        onChange={(event) => onCombineUniquesChange(event.target.checked)}
                    />
                    <Text small className="text-muted">
                        {localizeWithFallback('catalog.marketplace.combine_uniques', 'Combine identical LTD items into one offer')}
                    </Text>
                </label>
            )}
            {searchType === MarketplaceSearchType.ADVANCED && (
                <>
                    <div className="flex items-center gap-1">
                        <Text className="col-span-3">{LocalizeText('catalog.marketplace.search_name')}</Text>
                        <OctaneInput value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
                    </div>
                    <div className="flex items-center gap-1">
                        <Text className="col-span-3">{LocalizeText('catalog.marketplace.search_price')}</Text>
                        <div className="flex w-full gap-1">
                            <OctaneInput min={0} type="number" value={min} onChange={(event) => setMin(event.target.valueAsNumber)} />
                            <OctaneInput min={0} type="number" value={max} onChange={(event) => setMax(event.target.valueAsNumber)} />
                        </div>
                    </div>
                    <Button className="mx-auto" variant="secondary" onClick={onClickSearch}>
                        {LocalizeText('generic.search')}
                    </Button>
                </>
            )}
        </div>
    );
};
