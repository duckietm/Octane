import { afterEach, describe, expect, it } from 'vitest';
import { BadgeRarityTier, clearBadgeRarityFromPacket, getBadgeRarityFromPacket, isBadgeRarityTierId, rememberBadgeRarityFromPacket } from './badgeRarity';

describe('badge rarity from the UserCurrentBadges packet', () => {
    afterEach(() => clearBadgeRarityFromPacket());

    it('remembers the owner count and tier per badge code', () => {
        rememberBadgeRarityFromPacket([
            { badgeCode: 'ACH_Login1', ownerCount: 120, badgeRarityId: BadgeRarityTier.COMMON },
            { badgeCode: 'HWAY1', ownerCount: 3, badgeRarityId: BadgeRarityTier.MYTHICAL }
        ]);

        expect(getBadgeRarityFromPacket('HWAY1')).toEqual({ ownerCount: 3, tier: BadgeRarityTier.MYTHICAL });
        expect(getBadgeRarityFromPacket('ACH_Login1')).toEqual({ ownerCount: 120, tier: BadgeRarityTier.COMMON });
        expect(getBadgeRarityFromPacket('UNKNOWN')).toBeNull();
        expect(getBadgeRarityFromPacket('')).toBeNull();
        expect(getBadgeRarityFromPacket(null)).toBeNull();
    });

    it('ignores slots without a code or with a tier outside the official enum', () => {
        rememberBadgeRarityFromPacket([
            { badgeCode: '', ownerCount: 1, badgeRarityId: BadgeRarityTier.UNIQUE },
            { badgeCode: 'ODD', ownerCount: 1, badgeRarityId: 99 },
            { badgeCode: 'NEG', ownerCount: -4, badgeRarityId: BadgeRarityTier.RARE }
        ]);
        rememberBadgeRarityFromPacket(null);
        rememberBadgeRarityFromPacket([]);

        expect(getBadgeRarityFromPacket('ODD')).toBeNull();
        expect(getBadgeRarityFromPacket('NEG')).toEqual({ ownerCount: 0, tier: BadgeRarityTier.RARE });
    });

    it('validates tier ids against the official range', () => {
        expect(isBadgeRarityTierId(BadgeRarityTier.COMMON)).toBe(true);
        expect(isBadgeRarityTierId(BadgeRarityTier.UNIQUE)).toBe(true);
        expect(isBadgeRarityTierId(7)).toBe(false);
        expect(isBadgeRarityTierId(-1)).toBe(false);
        expect(isBadgeRarityTierId(1.5)).toBe(false);
    });

    it('lets a newer packet replace an older classification', () => {
        rememberBadgeRarityFromPacket([{ badgeCode: 'X', ownerCount: 60, badgeRarityId: BadgeRarityTier.COMMON }]);
        rememberBadgeRarityFromPacket([{ badgeCode: 'X', ownerCount: 2, badgeRarityId: BadgeRarityTier.MYTHICAL }]);

        expect(getBadgeRarityFromPacket('X')).toEqual({ ownerCount: 2, tier: BadgeRarityTier.MYTHICAL });
    });
});
