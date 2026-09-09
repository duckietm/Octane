import { getCachedBadgeRarityStat, isCustomBadgeCode, LocalizeBadgeDescription, LocalizeBadgeName, localizeWithFallback } from '../../../../api';
import {
    BadgeRarityTierId,
    getBadgeRarityFromPacket,
    getBadgeRarityLabelKey,
    getBadgeRarityTier,
    isBadgeRarityStandaloneTier
} from '../../../../api/badges/badgeRarity';

// Mirrors BadgesView.as (AIR 13, `filter.options` + `filter.rarity` drop menus) and the
// BadgeGridView.passFilter pair: a type filter over normal / achievement badges plus a rarity
// filter built from the tiers the player actually owns.
export const BADGE_FILTER_ALL = 'all';
export const BADGE_FILTER_NORMAL = 'normal_badges';
export const BADGE_FILTER_ACHIEVEMENTS = 'achievements';
// Our own addition: the badge creator lets players own custom badges, and the inventory keeps a
// way to list only those. The official client has no such option.
export const BADGE_FILTER_CUSTOM = 'custom';

export const INVENTORY_BADGE_FILTER_IDS = [BADGE_FILTER_ALL, BADGE_FILTER_NORMAL, BADGE_FILTER_ACHIEVEMENTS, BADGE_FILTER_CUSTOM];

export const BADGE_RARITY_FILTER_ALL = -1;
export const BADGE_RARITY_FILTER_COMMON = -2;

const BADGE_FILTER_FALLBACKS: Record<string, string> = {
    [BADGE_FILTER_ALL]: 'All badges',
    [BADGE_FILTER_NORMAL]: 'Normal badges',
    [BADGE_FILTER_ACHIEVEMENTS]: 'Achievements',
    [BADGE_FILTER_CUSTOM]: 'Custom badges'
};

const BADGE_RARITY_LABEL_FALLBACKS: Record<string, string> = {
    'badge.rarity.common': 'Common',
    'badge.rarity.uncommon': 'Uncommon',
    'badge.rarity.rare': 'Rare',
    'badge.rarity.epic': 'Epic',
    'badge.rarity.mythical': 'Mythical',
    'badge.rarity.legendary': 'Legendary',
    'badge.rarity.unique': 'Unique'
};

export const getInventoryBadgeFilterLabel = (id: string): string => localizeWithFallback(`inventory.badges.filter.${id}`, BADGE_FILTER_FALLBACKS[id] ?? id);

export const getBadgeRarityTierLabel = (tier: number, uncommonEnabled: boolean): string => {
    const key = getBadgeRarityLabelKey(tier, uncommonEnabled);

    return localizeWithFallback(key, BADGE_RARITY_LABEL_FALLBACKS[key] ?? key);
};

export const getInventoryBadgeRarityFilterLabel = (id: number, uncommonEnabled: boolean): string => {
    if (id === BADGE_RARITY_FILTER_ALL) return localizeWithFallback('inventory.badges.filter.rarity.all', 'All rarities');

    if (id === BADGE_RARITY_FILTER_COMMON) return localizeWithFallback('inventory.badges.filter.rarity.common', 'Common');

    return getBadgeRarityTierLabel(id, uncommonEnabled);
};

export const isAchievementBadgeCode = (badgeCode: string): boolean => !!badgeCode && badgeCode.startsWith('ACH_');

/**
 * The official badge list packet carries the rarity tier and the owner count per badge, and the
 * inventory reads them from there (rememberBadgeRarityFromPacket, fed by the badges, worn-badges
 * and badge-info packets). The leaderboard classification cache is only the fallback for badges no
 * packet has described yet; unknown badges have no tier at all.
 */
export const getInventoryBadgeRarity = (badgeCode: string): { tier: BadgeRarityTierId; ownerCount: number } | null => {
    if (!badgeCode) return null;

    const packet = getBadgeRarityFromPacket(badgeCode);

    if (packet) return { tier: packet.tier as BadgeRarityTierId, ownerCount: packet.ownerCount };

    const stat = getCachedBadgeRarityStat(badgeCode);

    if (stat) return { tier: getBadgeRarityTier(stat.rarity), ownerCount: stat.ownerCount };

    return null;
};

/**
 * BadgesModel.refreshAvailableRareBadgeRarityIds + BadgesView.getAvailableBadgeRarityFilterIds:
 * "all", then "common" when at least one badge is below the standalone tiers, then every
 * standalone tier owned, ascending.
 */
export const getInventoryBadgeRarityFilterIds = (badgeCodes: string[], uncommonEnabled: boolean): number[] => {
    const standaloneTiers = new Set<number>();

    let hasCommonGroup = false;

    for (const badgeCode of badgeCodes) {
        const rarity = getInventoryBadgeRarity(badgeCode);

        if (!rarity) continue;

        if (isBadgeRarityStandaloneTier(rarity.tier, uncommonEnabled)) standaloneTiers.add(rarity.tier);
        else hasCommonGroup = true;
    }

    const ids = [BADGE_RARITY_FILTER_ALL];

    if (hasCommonGroup) ids.push(BADGE_RARITY_FILTER_COMMON);

    return ids.concat(Array.from(standaloneTiers).sort((a, b) => a - b));
};

/** BadgesView.isBadgeRarityFilterEnabled: the drop menu only makes sense with more than two options. */
export const isInventoryBadgeRarityFilterEnabled = (rarityFilterIds: number[]): boolean => rarityFilterIds.length > 2;

export const passInventoryBadgeTypeFilter = (badgeCode: string, typeFilter: string): boolean => {
    switch (typeFilter) {
        case BADGE_FILTER_NORMAL:
            return !isAchievementBadgeCode(badgeCode);
        case BADGE_FILTER_ACHIEVEMENTS:
            return isAchievementBadgeCode(badgeCode);
        case BADGE_FILTER_CUSTOM:
            return isCustomBadgeCode(badgeCode);
        default:
            return true;
    }
};

export const passInventoryBadgeRarityFilter = (badgeCode: string, rarityFilter: number, uncommonEnabled: boolean): boolean => {
    if (rarityFilter === BADGE_RARITY_FILTER_ALL) return true;

    const rarity = getInventoryBadgeRarity(badgeCode);

    if (rarityFilter === BADGE_RARITY_FILTER_COMMON) return !rarity || !isBadgeRarityStandaloneTier(rarity.tier, uncommonEnabled);

    return !!rarity && rarity.tier === rarityFilter;
};

/** BadgeGridView.passFilter searches the badge name and its description, case-insensitively. */
export const passInventoryBadgeSearch = (badgeCode: string, search: string): boolean => {
    if (!search) return true;

    const comparison = search.toLocaleLowerCase();
    const name = (LocalizeBadgeName(badgeCode) ?? '').toLocaleLowerCase();
    const description = (LocalizeBadgeDescription(badgeCode) ?? '').toLocaleLowerCase();

    return name.includes(comparison) || (description.length > 0 && description.includes(comparison));
};

export const passInventoryBadgeFilter = (badgeCode: string, typeFilter: string, rarityFilter: number, search: string, uncommonEnabled: boolean): boolean =>
    passInventoryBadgeTypeFilter(badgeCode, typeFilter) &&
    passInventoryBadgeRarityFilter(badgeCode, rarityFilter, uncommonEnabled) &&
    passInventoryBadgeSearch(badgeCode, search);
