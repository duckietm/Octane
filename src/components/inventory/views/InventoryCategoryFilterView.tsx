import { FC, KeyboardEvent, useEffect, useState } from 'react';
import { LocalizeText } from '../../../api';
import { OctaneInput } from '../../../layout';
import {
    BADGE_FILTER_ALL,
    BADGE_RARITY_FILTER_ALL,
    getInventoryBadgeFilterLabel,
    getInventoryBadgeRarityFilterLabel,
    INVENTORY_BADGE_FILTER_IDS,
    isInventoryBadgeRarityFilterEnabled
} from './badge/inventoryBadgeFilters';
import {
    getInventoryMainFilterLabel,
    getInventoryTypeFilterIds,
    getInventoryTypeFilterLabel,
    INVENTORY_MAIN_FILTER_IDS,
    MAIN_FILTER_ALL,
    TYPE_FILTER_ANY
} from './furniture/inventoryFurniFilters';

const TAB_BADGES = 'inventory.badges';

interface InventoryCategoryFilterViewProps {
    currentTab: string;
    searchValue: string;
    mainFilter: string;
    typeFilter: string;
    badgeTypeFilter?: string;
    badgeRarityFilter?: number;
    badgeRarityFilterIds?: number[];
    uncommonRarityEnabled?: boolean;
    onSearchChange: (value: string) => void;
    onMainFilterChange: (value: string) => void;
    onTypeFilterChange: (value: string) => void;
    onBadgeTypeFilterChange?: (value: string) => void;
    onBadgeRarityFilterChange?: (value: number) => void;
}

export const InventoryCategoryFilterView: FC<InventoryCategoryFilterViewProps> = (props) => {
    const {
        currentTab = null,
        searchValue = '',
        mainFilter = MAIN_FILTER_ALL,
        typeFilter = TYPE_FILTER_ANY,
        badgeTypeFilter = BADGE_FILTER_ALL,
        badgeRarityFilter = BADGE_RARITY_FILTER_ALL,
        badgeRarityFilterIds = [BADGE_RARITY_FILTER_ALL],
        uncommonRarityEnabled = false,
        onSearchChange = null,
        onMainFilterChange = null,
        onTypeFilterChange = null,
        onBadgeTypeFilterChange = null,
        onBadgeRarityFilterChange = null
    } = props;
    // The official filter field (FurniView.as:822-828, BadgesView.as:408-414) only runs the search
    // on Enter; Escape and the clear button empty it and run it again. The draft is what the
    // player types, `searchValue` is what the grid is filtered with.
    const [draft, setDraft] = useState(searchValue);
    const typeFilterIds = getInventoryTypeFilterIds(mainFilter);
    const isBadges = currentTab === TAB_BADGES;
    const rarityFilterEnabled = isInventoryBadgeRarityFilterEnabled(badgeRarityFilterIds);

    useEffect(() => {
        setDraft(searchValue);
    }, [searchValue]);

    const clearSearch = () => {
        setDraft('');
        onSearchChange?.('');
    };

    const onSearchKeyUp = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            clearSearch();

            return;
        }

        if (event.key === 'Enter') onSearchChange?.(draft);
    };

    return (
        <div className={`octane-inventory-filter-bar flex gap-1 rounded p-1 shrink-0 ${isBadges ? 'is-badges' : ''}`}>
            <div className="relative flex flex-1 items-center">
                <OctaneInput
                    className="w-full"
                    data-testid="inventory-search"
                    placeholder={LocalizeText('catalog.search')}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyUp={onSearchKeyUp}
                />
                {draft && draft.length > 0 && (
                    <i className="icon icon-clear absolute cursor-pointer right-1 top-1" data-testid="inventory-search-clear" onClick={clearSearch} />
                )}
            </div>
            {!isBadges && (
                <>
                    <select
                        aria-label={getInventoryMainFilterLabel(MAIN_FILTER_ALL)}
                        className="form-select text-xs rounded px-1 py-0 border border-gray-400 bg-white cursor-pointer"
                        data-testid="inventory-main-filter"
                        value={mainFilter}
                        onChange={(event) => onMainFilterChange?.(event.target.value)}
                    >
                        {INVENTORY_MAIN_FILTER_IDS.map((id) => (
                            <option key={id} value={id}>
                                {getInventoryMainFilterLabel(id)}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label={getInventoryTypeFilterLabel(TYPE_FILTER_ANY)}
                        className="form-select text-xs rounded px-1 py-0 border border-gray-400 bg-white cursor-pointer"
                        data-testid="inventory-type-filter"
                        value={typeFilterIds.indexOf(typeFilter) >= 0 ? typeFilter : TYPE_FILTER_ANY}
                        onChange={(event) => onTypeFilterChange?.(event.target.value)}
                    >
                        {typeFilterIds.map((id) => (
                            <option key={id} value={id}>
                                {getInventoryTypeFilterLabel(id)}
                            </option>
                        ))}
                    </select>
                </>
            )}
            {isBadges && (
                <>
                    <select
                        aria-label={getInventoryBadgeFilterLabel(BADGE_FILTER_ALL)}
                        className="form-select text-xs rounded px-1 py-0 border border-gray-400 bg-white cursor-pointer"
                        data-testid="inventory-badge-filter"
                        value={badgeTypeFilter}
                        onChange={(event) => onBadgeTypeFilterChange?.(event.target.value)}
                    >
                        {INVENTORY_BADGE_FILTER_IDS.map((id) => (
                            <option key={id} value={id}>
                                {getInventoryBadgeFilterLabel(id)}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label={getInventoryBadgeRarityFilterLabel(BADGE_RARITY_FILTER_ALL, uncommonRarityEnabled)}
                        className="form-select text-xs rounded px-1 py-0 border border-gray-400 bg-white cursor-pointer"
                        data-testid="inventory-badge-rarity-filter"
                        disabled={!rarityFilterEnabled}
                        value={badgeRarityFilterIds.indexOf(badgeRarityFilter) >= 0 ? badgeRarityFilter : BADGE_RARITY_FILTER_ALL}
                        onChange={(event) => onBadgeRarityFilterChange?.(Number(event.target.value))}
                    >
                        {badgeRarityFilterIds.map((id) => (
                            <option key={id} value={id}>
                                {getInventoryBadgeRarityFilterLabel(id, uncommonRarityEnabled)}
                            </option>
                        ))}
                    </select>
                </>
            )}
        </div>
    );
};
