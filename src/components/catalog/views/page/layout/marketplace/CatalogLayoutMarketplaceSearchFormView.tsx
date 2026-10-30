import { FC } from 'react';
import { localizeWithFallback, MARKETPLACE_MAX_PRICE_LENGTH, MARKETPLACE_MAX_SEARCH_LENGTH, MarketplaceSearchType } from '../../../../../../api';
import { BaseButton, Checkbox } from '../../../../../../common';
import { UbuntuDropmenuView } from '../../../../../../common/dropmenu/UbuntuDropmenuView';
import { NativeTextTree } from '../../../../../../common/native-text/NativeTextTree';

export interface MarketplaceSearchFormState {
    query: string;
    minPrice: string;
    maxPrice: string;
}

export interface SearchFormViewProps {
    searchType: number;
    sortTypes: number[];
    sortType: number;
    combineUniques: boolean;
    form: MarketplaceSearchFormState;
    onSortChange(sortType: number): void;
    onCombineUniquesChange(value: boolean): void;
    onFormChange(form: MarketplaceSearchFormState): void;
    onSearch(): void;
}

/** English fallbacks for the search panel texts, used only when the external texts lack the key. */
const FALLBACKS: Record<string, string> = {
    'catalog.marketplace.sort_order': 'Sort by',
    'catalog.marketplace.combine_uniques': 'Combine LTDs',
    'catalog.marketplace.search_name': 'Search furni...',
    'catalog.marketplace.search_price': 'Price between',
    'generic.search': 'Search',
    'catalog.marketplace.sort.1': 'Highest price first',
    'catalog.marketplace.sort.2': 'Lowest price first',
    'catalog.marketplace.sort.3': 'Most traded today first',
    'catalog.marketplace.sort.4': 'Least traded today first',
    'catalog.marketplace.sort.5': 'Most offers first',
    'catalog.marketplace.sort.6': 'Least offers first'
};

const text = (key: string) => localizeWithFallback(key, FALLBACKS[key] ?? key);

const digits = (value: string) => value.replace(/[^0-9]/g, '').substring(0, MARKETPLACE_MAX_PRICE_LENGTH);

/**
 * The content AIR puts in `search_container`: marketplace_search_simple (by activity / by value) or
 * marketplace_search_advanced, both 360x120.
 */
export const SearchFormView: FC<SearchFormViewProps> = (props) => {
    const { searchType, sortTypes = [], sortType, combineUniques, form, onSortChange, onCombineUniquesChange, onFormChange, onSearch } = props;
    const sortLabel = text('catalog.marketplace.sort_order');
    const options = sortTypes.map((type) => ({ value: type, label: text(`catalog.marketplace.sort.${type}`) }));
    const dropmenu = <UbuntuDropmenuView className="marketplace-search-sort" label={sortLabel} options={options} value={sortType} onSelect={onSortChange} />;
    // AIR combine_uniques_checkbox at (10,92) with its caption at (29,91).
    const combine = (
        <label className="marketplace-search-combine">
            <Checkbox checked={combineUniques} onCheckedChange={onCombineUniquesChange} />
            <span>{text('catalog.marketplace.combine_uniques')}</span>
        </label>
    );

    if (searchType !== MarketplaceSearchType.ADVANCED) {
        return (
            <NativeTextTree>
                <div className="octane-marketplace-search is-simple">
                    <span className="marketplace-search-sort-title">{sortLabel}</span>
                    {dropmenu}
                    {combine}
                </div>
            </NativeTextTree>
        );
    }

    return (
        <NativeTextTree>
            <div className="octane-marketplace-search is-advanced">
                <label className="marketplace-search-label is-name" htmlFor="marketplace-search-input">
                    {text('catalog.marketplace.search_name')}
                </label>
                <span className="marketplace-search-input is-name">
                    <input
                        autoComplete="off"
                        id="marketplace-search-input"
                        maxLength={MARKETPLACE_MAX_SEARCH_LENGTH}
                        type="text"
                        value={form.query}
                        onChange={(event) => onFormChange({ ...form, query: event.target.value.substring(0, MARKETPLACE_MAX_SEARCH_LENGTH) })}
                    />
                </span>
                <label className="marketplace-search-label is-price" htmlFor="marketplace-search-min-price">
                    {text('catalog.marketplace.search_price')}
                </label>
                <span className="marketplace-search-input is-min">
                    <input
                        autoComplete="off"
                        id="marketplace-search-min-price"
                        inputMode="numeric"
                        type="text"
                        value={form.minPrice}
                        onChange={(event) => onFormChange({ ...form, minPrice: digits(event.target.value) })}
                    />
                </span>
                <span className="marketplace-search-input is-max">
                    <input
                        aria-label={localizeWithFallback('catalog.marketplace.search_price', 'Price between')}
                        autoComplete="off"
                        inputMode="numeric"
                        type="text"
                        value={form.maxPrice}
                        onChange={(event) => onFormChange({ ...form, maxPrice: digits(event.target.value) })}
                    />
                </span>
                <span className="marketplace-search-label is-sort">{sortLabel}</span>
                {dropmenu}
                {combine}
                <BaseButton className="octane-marketplace-button marketplace-search-button" onClick={onSearch}>
                    {text('generic.search')}
                </BaseButton>
            </div>
        </NativeTextTree>
    );
};
