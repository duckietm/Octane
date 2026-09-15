import { InventoryFilterSelect } from './InventoryFilterSelect';
import { FC } from 'react';
import { FURNI_MAIN_FILTER, FURNI_TYPE_OPTIONS, FurniMainFilter, furniMainFilterKey, furniTypeFilterKey, LocalizeText } from '../../../api';

export const BADGE_MAIN_ALL = 'all';
export const BADGE_MAIN_NORMAL = 'normal';
export const BADGE_MAIN_ACHIEVEMENTS = 'achievements';

export const BADGE_RARITY_ALL = -1;

const TAB_BADGES = 'inventory.badges';
const TAB_FURNITURE = 'inventory.furni';

interface InventoryCategoryFilterViewProps {
    currentTab: string;
    searchValue: string;
    mainFilter: string;
    typeFilter: string;
    onSearchChange: (value: string) => void;
    onSearchApply: (value: string) => void;
    onMainFilterChange: (value: string) => void;
    onTypeFilterChange: (value: string) => void;
}

const FILTER_LABELS: Record<string, string> = {
    'inventory.furni.filter.main.all': 'All',
    'inventory.furni.filter.main.floor_items': 'Floor items',
    'inventory.furni.filter.main.wall_items': 'Wall items',
    'inventory.furni.filter.main.room_layout': 'Room layout',
    'inventory.furni.filter.type.any': 'Any type',
    'inventory.furni.filter.type.sittable': 'Sittable',
    'inventory.furni.filter.type.layable': 'Layable',
    'inventory.furni.filter.type.tiles_or_rugs': 'Tiles or rugs',
    'inventory.furni.filter.type.ltd': 'Limited edition',
    'inventory.furni.filter.type.wired': 'Wired',
    'inventory.furni.filter.type.credit_furni': 'Credit furni',
    'inventory.furni.filter.type.clothes': 'Clothes',
    'inventory.furni.filter.type.pet_food': 'Pet food',
    'inventory.furni.filter.type.tradable': 'Tradable',
    'inventory.furni.filter.type.non_tradable': 'Non-tradable',
    'inventory.furni.filter.type.recyclable': 'Recyclable',
    'inventory.furni.filter.type.windows': 'Windows',
    'inventory.furni.filter.type.dimmers': 'Dimmers',
    'inventory.furni.filter.type.stickies': 'Stickies',
    'inventory.furni.filter.type.paintings': 'Paintings',
    'inventory.furni.filter.type.floors': 'Floors',
    'inventory.furni.filter.type.wallpapers': 'Wallpapers',
    'inventory.furni.filter.type.landscape': 'Landscape',
    'inventory.badges.filter.all': 'All',
    'inventory.badges.filter.normal_badges': 'Normal badges',
    'inventory.badges.filter.achievements': 'Achievements',
    'inventory.badges.filter.rarity.all': 'All rarities',
    'inventory.badges.filter.rarity.common': 'Common'
};

const localizeOr = (key: string, fallback: string) => {
    const value = LocalizeText(key);

    if (value && value !== key) return value;

    return FILTER_LABELS[key] || fallback;
};

export const InventoryCategoryFilterView: FC<InventoryCategoryFilterViewProps> = (props) => {
    const {
        currentTab = null,
        searchValue = '',
        mainFilter = FURNI_MAIN_FILTER.ALL,
        typeFilter = 'any',
        onSearchChange = null,
        onSearchApply = null,
        onMainFilterChange = null,
        onTypeFilterChange = null
    } = props;

    const isBadges = currentTab === TAB_BADGES;
    const isFurniture = currentTab === TAB_FURNITURE;
    const typeOptions = isFurniture ? FURNI_TYPE_OPTIONS[(mainFilter as FurniMainFilter) || FURNI_MAIN_FILTER.ALL] || FURNI_TYPE_OPTIONS.all : [];

    return (
        <div className={`octane-inventory-filter-bar ${isBadges ? 'is-badges' : ''}`}>
            <div className="octane-inventory-filter-search">
                <input
                    className="octane-inventory-filter-input"
                    aria-label={localizeOr('catalog.search', 'Search inventory')}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') onSearchApply?.(searchValue);
                        if (event.key === 'Escape') {
                            onSearchChange?.('');
                            onSearchApply?.('');
                        }
                    }}
                    value={searchValue}
                    onChange={(event) => onSearchChange?.(event.target.value)}
                />
                {searchValue.length > 0 && (
                    <button
                        type="button"
                        className="octane-inventory-filter-clear"
                        aria-label={localizeOr('generic.clear', 'Clear search')}
                        onClick={() => {
                            onSearchChange?.('');
                            onSearchApply?.('');
                        }}
                    />
                )}
            </div>
            {isFurniture && (
                <>
                    <InventoryFilterSelect
                        value={mainFilter}
                        aria-label={localizeOr('inventory.filter.category', 'Category')}
                        onChange={(value) => onMainFilterChange?.(value)}
                    >
                        {Object.values(FURNI_MAIN_FILTER).map((id) => (
                            <option key={id} value={id}>
                                {localizeOr(furniMainFilterKey(id), FILTER_LABELS[furniMainFilterKey(id)] || id)}
                            </option>
                        ))}
                    </InventoryFilterSelect>
                    <InventoryFilterSelect
                        value={typeFilter}
                        aria-label={isBadges ? localizeOr('inventory.badges.filter.rarity.all', 'Rarity') : localizeOr('inventory.filter.type', 'Type')}
                        onChange={(value) => onTypeFilterChange?.(value)}
                    >
                        {typeOptions.map((id) => (
                            <option key={id} value={id}>
                                {localizeOr(furniTypeFilterKey(id), FILTER_LABELS[furniTypeFilterKey(id)] || id)}
                            </option>
                        ))}
                    </InventoryFilterSelect>
                </>
            )}
            {isBadges && (
                <>
                    <InventoryFilterSelect
                        value={mainFilter}
                        aria-label={localizeOr('inventory.filter.category', 'Category')}
                        onChange={(value) => onMainFilterChange?.(value)}
                    >
                        <option value={BADGE_MAIN_ALL}>{localizeOr('inventory.badges.filter.all', 'All')}</option>
                        <option value={BADGE_MAIN_NORMAL}>{localizeOr('inventory.badges.filter.normal_badges', 'Normal badges')}</option>
                        <option value={BADGE_MAIN_ACHIEVEMENTS}>{localizeOr('inventory.badges.filter.achievements', 'Achievements')}</option>
                    </InventoryFilterSelect>
                    <InventoryFilterSelect
                        value={typeFilter}
                        aria-label={isBadges ? localizeOr('inventory.badges.filter.rarity.all', 'Rarity') : localizeOr('inventory.filter.type', 'Type')}
                        onChange={(value) => onTypeFilterChange?.(value)}
                    >
                        <option value={String(BADGE_RARITY_ALL)}>{localizeOr('inventory.badges.filter.rarity.all', 'All rarities')}</option>
                        <option value="0">{localizeOr('inventory.badges.filter.rarity.common', 'Common')}</option>
                        <option value="1">{localizeOr('badge.rarity.uncommon', 'Uncommon')}</option>
                        <option value="2">{localizeOr('badge.rarity.rare', 'Rare')}</option>
                        <option value="3">{localizeOr('badge.rarity.epic', 'Epic')}</option>
                        <option value="4">{localizeOr('badge.rarity.mythical', 'Mythical')}</option>
                        <option value="5">{localizeOr('badge.rarity.legendary', 'Legendary')}</option>
                        <option value="6">{localizeOr('badge.rarity.unique', 'Unique')}</option>
                    </InventoryFilterSelect>
                </>
            )}
        </div>
    );
};
