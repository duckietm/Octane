import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { OctaneInput } from '../../../layout';
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
    onSearchChange: (value: string) => void;
    onMainFilterChange: (value: string) => void;
    onTypeFilterChange: (value: string) => void;
}

export const InventoryCategoryFilterView: FC<InventoryCategoryFilterViewProps> = (props) => {
    const {
        currentTab = null,
        searchValue = '',
        mainFilter = MAIN_FILTER_ALL,
        typeFilter = TYPE_FILTER_ANY,
        onSearchChange = null,
        onMainFilterChange = null,
        onTypeFilterChange = null
    } = props;
    const typeFilterIds = getInventoryTypeFilterIds(mainFilter);

    return (
        <div className={`octane-inventory-filter-bar flex gap-1 rounded p-1 shrink-0 ${currentTab === TAB_BADGES ? 'is-badges' : ''}`}>
            <div className="relative flex flex-1 items-center">
                <OctaneInput
                    className="w-full"
                    placeholder={LocalizeText('catalog.search')}
                    value={searchValue}
                    onChange={(event) => onSearchChange?.(event.target.value)}
                />
                {searchValue && searchValue.length > 0 && (
                    <i className="icon icon-clear absolute cursor-pointer right-1 top-1" onClick={() => onSearchChange?.('')} />
                )}
            </div>
            {currentTab !== TAB_BADGES && (
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
        </div>
    );
};
