import { afterEach, describe, expect, it, vi } from 'vitest';

const leaderboardStats: Record<string, { badgeCode: string; ownerCount: number; rarity: string }> = {};

vi.mock('../../../../api', () => ({
    getCachedBadgeRarityStat: (badgeCode: string) => leaderboardStats[badgeCode] ?? null,
    isCustomBadgeCode: (badgeCode: string) => badgeCode.startsWith('CUSTOM_'),
    LocalizeBadgeName: (badgeCode: string) => `name of ${badgeCode}`,
    LocalizeBadgeDescription: (badgeCode: string) => `description of ${badgeCode}`,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

import { BadgeRarityTier, clearBadgeRarityFromPacket, rememberBadgeRarityFromPacket } from '../../../../api/badges/badgeRarity';
import {
    BADGE_FILTER_ACHIEVEMENTS,
    BADGE_FILTER_ALL,
    BADGE_FILTER_CUSTOM,
    BADGE_FILTER_NORMAL,
    BADGE_RARITY_FILTER_ALL,
    BADGE_RARITY_FILTER_COMMON,
    getInventoryBadgeRarity,
    getInventoryBadgeRarityFilterIds,
    getInventoryBadgeRarityFilterLabel,
    isInventoryBadgeRarityFilterEnabled,
    passInventoryBadgeFilter,
    passInventoryBadgeRarityFilter,
    passInventoryBadgeSearch,
    passInventoryBadgeTypeFilter
} from './inventoryBadgeFilters';

afterEach(() => {
    clearBadgeRarityFromPacket();

    for (const key of Object.keys(leaderboardStats)) delete leaderboardStats[key];
});

describe('passInventoryBadgeTypeFilter', () => {
    it('splits achievements from normal badges on the ACH_ prefix', () => {
        expect(passInventoryBadgeTypeFilter('ACH_Login1', BADGE_FILTER_ALL)).toBe(true);
        expect(passInventoryBadgeTypeFilter('ACH_Login1', BADGE_FILTER_NORMAL)).toBe(false);
        expect(passInventoryBadgeTypeFilter('ACH_Login1', BADGE_FILTER_ACHIEVEMENTS)).toBe(true);
        expect(passInventoryBadgeTypeFilter('HC1', BADGE_FILTER_NORMAL)).toBe(true);
        expect(passInventoryBadgeTypeFilter('HC1', BADGE_FILTER_ACHIEVEMENTS)).toBe(false);
    });

    it('keeps the custom badge option', () => {
        expect(passInventoryBadgeTypeFilter('CUSTOM_1', BADGE_FILTER_CUSTOM)).toBe(true);
        expect(passInventoryBadgeTypeFilter('HC1', BADGE_FILTER_CUSTOM)).toBe(false);
    });
});

describe('getInventoryBadgeRarity', () => {
    it('prefers the tier the worn-badge packets sent over the leaderboard classification', () => {
        leaderboardStats.HC1 = { badgeCode: 'HC1', ownerCount: 900, rarity: 'rare' };
        rememberBadgeRarityFromPacket([{ badgeCode: 'HC1', ownerCount: 12, badgeRarityId: BadgeRarityTier.LEGENDARY }]);

        expect(getInventoryBadgeRarity('HC1')).toEqual({ tier: BadgeRarityTier.LEGENDARY, ownerCount: 12 });
    });

    it('falls back to the leaderboard cache and reports unknown badges as null', () => {
        leaderboardStats.HC1 = { badgeCode: 'HC1', ownerCount: 900, rarity: 'epic' };

        expect(getInventoryBadgeRarity('HC1')).toEqual({ tier: BadgeRarityTier.EPIC, ownerCount: 900 });
        expect(getInventoryBadgeRarity('UNKNOWN')).toBeNull();
    });
});

describe('getInventoryBadgeRarityFilterIds', () => {
    it('lists all, common when a plain badge exists, then the owned standalone tiers ascending', () => {
        leaderboardStats.A = { badgeCode: 'A', ownerCount: 5, rarity: 'legendary' };
        leaderboardStats.B = { badgeCode: 'B', ownerCount: 5000, rarity: 'common' };
        leaderboardStats.C = { badgeCode: 'C', ownerCount: 50, rarity: 'rare' };
        leaderboardStats.D = { badgeCode: 'D', ownerCount: 50, rarity: 'rare' };

        expect(getInventoryBadgeRarityFilterIds(['A', 'B', 'C', 'D', 'UNKNOWN'], false)).toEqual([
            BADGE_RARITY_FILTER_ALL,
            BADGE_RARITY_FILTER_COMMON,
            BadgeRarityTier.RARE,
            BadgeRarityTier.LEGENDARY
        ]);
    });

    it('treats uncommon as common unless the flag is on', () => {
        rememberBadgeRarityFromPacket([{ badgeCode: 'U', ownerCount: 400, badgeRarityId: BadgeRarityTier.UNCOMMON }]);

        expect(getInventoryBadgeRarityFilterIds(['U'], false)).toEqual([BADGE_RARITY_FILTER_ALL, BADGE_RARITY_FILTER_COMMON]);
        expect(getInventoryBadgeRarityFilterIds(['U'], true)).toEqual([BADGE_RARITY_FILTER_ALL, BadgeRarityTier.UNCOMMON]);
    });

    it('only enables the rarity menu with more than two options', () => {
        expect(isInventoryBadgeRarityFilterEnabled([BADGE_RARITY_FILTER_ALL, BADGE_RARITY_FILTER_COMMON])).toBe(false);
        expect(isInventoryBadgeRarityFilterEnabled([BADGE_RARITY_FILTER_ALL, BADGE_RARITY_FILTER_COMMON, BadgeRarityTier.RARE])).toBe(true);
    });
});

describe('passInventoryBadgeRarityFilter', () => {
    it('matches the exact tier, and groups everything below rare under common', () => {
        leaderboardStats.A = { badgeCode: 'A', ownerCount: 5, rarity: 'legendary' };
        leaderboardStats.B = { badgeCode: 'B', ownerCount: 5000, rarity: 'common' };

        expect(passInventoryBadgeRarityFilter('A', BADGE_RARITY_FILTER_ALL, false)).toBe(true);
        expect(passInventoryBadgeRarityFilter('A', BadgeRarityTier.LEGENDARY, false)).toBe(true);
        expect(passInventoryBadgeRarityFilter('A', BadgeRarityTier.RARE, false)).toBe(false);
        expect(passInventoryBadgeRarityFilter('A', BADGE_RARITY_FILTER_COMMON, false)).toBe(false);
        expect(passInventoryBadgeRarityFilter('B', BADGE_RARITY_FILTER_COMMON, false)).toBe(true);
        expect(passInventoryBadgeRarityFilter('UNKNOWN', BADGE_RARITY_FILTER_COMMON, false)).toBe(true);
        expect(passInventoryBadgeRarityFilter('UNKNOWN', BadgeRarityTier.RARE, false)).toBe(false);
    });
});

describe('passInventoryBadgeSearch', () => {
    it('searches the name and the description without caring about case or spaces', () => {
        expect(passInventoryBadgeSearch('HC1', '')).toBe(true);
        expect(passInventoryBadgeSearch('HC1', 'NAME OF')).toBe(true);
        expect(passInventoryBadgeSearch('HC1', 'description')).toBe(true);
        expect(passInventoryBadgeSearch('HC1', 'nothing')).toBe(false);
    });
});

describe('passInventoryBadgeFilter', () => {
    it('combines the three filters', () => {
        leaderboardStats.ACH_Login1 = { badgeCode: 'ACH_Login1', ownerCount: 5000, rarity: 'common' };

        expect(passInventoryBadgeFilter('ACH_Login1', BADGE_FILTER_ACHIEVEMENTS, BADGE_RARITY_FILTER_COMMON, 'login', false)).toBe(true);
        expect(passInventoryBadgeFilter('ACH_Login1', BADGE_FILTER_NORMAL, BADGE_RARITY_FILTER_COMMON, 'login', false)).toBe(false);
        expect(passInventoryBadgeFilter('ACH_Login1', BADGE_FILTER_ACHIEVEMENTS, BadgeRarityTier.RARE, 'login', false)).toBe(false);
        expect(passInventoryBadgeFilter('ACH_Login1', BADGE_FILTER_ACHIEVEMENTS, BADGE_RARITY_FILTER_COMMON, 'zzz', false)).toBe(false);
    });
});

describe('labels', () => {
    it('names the all and common options and the tiers', () => {
        expect(getInventoryBadgeRarityFilterLabel(BADGE_RARITY_FILTER_ALL, false)).toBe('All rarities');
        expect(getInventoryBadgeRarityFilterLabel(BADGE_RARITY_FILTER_COMMON, false)).toBe('Common');
        expect(getInventoryBadgeRarityFilterLabel(BadgeRarityTier.RARE, false)).toBe('Rare');
        expect(getInventoryBadgeRarityFilterLabel(BadgeRarityTier.UNCOMMON, false)).toBe('Common');
        expect(getInventoryBadgeRarityFilterLabel(BadgeRarityTier.UNCOMMON, true)).toBe('Uncommon');
    });
});
