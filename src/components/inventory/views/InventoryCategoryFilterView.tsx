import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { OctaneInput } from '../../../layout';

// Filter option keys (also consumed by InventoryView's useMemo derivation).
export const FILTER_EVERYTHING = 'inventory.filter.option.everything';
export const FILTER_FLOOR = 'inventory.furni.tab.floor';
export const FILTER_WALL = 'inventory.furni.tab.wall';

const TAB_BADGES = 'inventory.badges';

interface InventoryCategoryFilterViewProps {
    currentTab: string;
    searchValue: string;
    filterType: string;
    onSearchChange: (value: string) => void;
    onFilterTypeChange: (value: string) => void;
}

export const InventoryCategoryFilterView: FC<InventoryCategoryFilterViewProps> = (props) => {
    const { currentTab = null, searchValue = '', filterType = FILTER_EVERYTHING, onSearchChange = null, onFilterTypeChange = null } = props;

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
                <select
                    className="form-select text-xs rounded px-1 py-0 border border-gray-400 bg-white cursor-pointer"
                    value={filterType}
                    onChange={(event) => onFilterTypeChange?.(event.target.value)}
                >
                    {[FILTER_EVERYTHING, FILTER_FLOOR, FILTER_WALL].map((type, index) => (
                        <option key={index} value={type}>
                            {LocalizeText(type)}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
};
