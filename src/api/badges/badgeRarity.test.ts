import { describe, expect, it } from 'vitest';
import {
    BadgeRarityTier,
    badgeRarityColorToCss,
    formatBadgeOwnerCount,
    getBadgeRarityGlowColor,
    getBadgeRarityLabelKey,
    getBadgeRarityTagColor,
    getBadgeRarityTier,
    isBadgeRarityStandaloneTier,
    shouldShowBadgeOwnerCount
} from './badgeRarity';

describe('badge rarity tiers', () => {
    it('maps the leaderboard keys onto the official tier ids', () => {
        expect(getBadgeRarityTier('common')).toBe(BadgeRarityTier.COMMON);
        expect(getBadgeRarityTier('uncommon')).toBe(BadgeRarityTier.UNCOMMON);
        expect(getBadgeRarityTier('rare')).toBe(BadgeRarityTier.RARE);
        expect(getBadgeRarityTier('epic')).toBe(BadgeRarityTier.EPIC);
        expect(getBadgeRarityTier('mythical')).toBe(BadgeRarityTier.MYTHICAL);
        expect(getBadgeRarityTier('legendary')).toBe(BadgeRarityTier.LEGENDARY);
        expect(getBadgeRarityTier('Unique')).toBe(BadgeRarityTier.UNIQUE);
        expect(getBadgeRarityTier(undefined)).toBe(BadgeRarityTier.COMMON);
        expect(getBadgeRarityTier('nonsense')).toBe(BadgeRarityTier.COMMON);
    });

    it('treats rare and above as standalone, uncommon only behind the flag', () => {
        expect(isBadgeRarityStandaloneTier(BadgeRarityTier.COMMON)).toBe(false);
        expect(isBadgeRarityStandaloneTier(BadgeRarityTier.UNCOMMON)).toBe(false);
        expect(isBadgeRarityStandaloneTier(BadgeRarityTier.UNCOMMON, true)).toBe(true);
        expect(isBadgeRarityStandaloneTier(BadgeRarityTier.RARE)).toBe(true);
        expect(isBadgeRarityStandaloneTier(BadgeRarityTier.UNIQUE)).toBe(true);
    });

    it('labels non-standalone tiers as common', () => {
        expect(getBadgeRarityLabelKey(BadgeRarityTier.COMMON)).toBe('badge.rarity.common');
        expect(getBadgeRarityLabelKey(BadgeRarityTier.UNCOMMON)).toBe('badge.rarity.common');
        expect(getBadgeRarityLabelKey(BadgeRarityTier.UNCOMMON, true)).toBe('badge.rarity.uncommon');
        expect(getBadgeRarityLabelKey(BadgeRarityTier.RARE)).toBe('badge.rarity.rare');
        expect(getBadgeRarityLabelKey(BadgeRarityTier.EPIC)).toBe('badge.rarity.epic');
        expect(getBadgeRarityLabelKey(BadgeRarityTier.MYTHICAL)).toBe('badge.rarity.mythical');
        expect(getBadgeRarityLabelKey(BadgeRarityTier.LEGENDARY)).toBe('badge.rarity.legendary');
        expect(getBadgeRarityLabelKey(BadgeRarityTier.UNIQUE)).toBe('badge.rarity.unique');
    });

    it('uses the official colours for glow and tag', () => {
        expect(getBadgeRarityGlowColor(BadgeRarityTier.RARE)).toBe(8780159);
        expect(getBadgeRarityGlowColor(BadgeRarityTier.UNCOMMON)).toBe(0);
        expect(getBadgeRarityGlowColor(BadgeRarityTier.UNCOMMON, true)).toBe(11759111);
        expect(getBadgeRarityTagColor(BadgeRarityTier.COMMON)).toBe(7829367);
        expect(getBadgeRarityTagColor(BadgeRarityTier.UNCOMMON)).toBe(7829367);
        expect(getBadgeRarityTagColor(BadgeRarityTier.UNCOMMON, true)).toBe(16758605);
        expect(getBadgeRarityTagColor(BadgeRarityTier.UNIQUE)).toBe(13406720);

        // The rare tag is the display colour darkened by 35 percent, channel by channel.
        const rare = 8780159;
        const expected = (Math.floor(((rare >> 16) & 0xff) * 0.65) << 16) | (Math.floor(((rare >> 8) & 0xff) * 0.65) << 8) | Math.floor((rare & 0xff) * 0.65);

        expect(getBadgeRarityTagColor(BadgeRarityTier.RARE)).toBe(expected);
        expect(badgeRarityColorToCss(0x0000ff)).toBe('#0000ff');
        expect(badgeRarityColorToCss(7829367)).toBe('#777777');
    });

    it('prints owner counts like the official bubble', () => {
        expect(shouldShowBadgeOwnerCount(0)).toBe(false);
        expect(shouldShowBadgeOwnerCount(1)).toBe(true);
        expect(shouldShowBadgeOwnerCount(999)).toBe(true);
        expect(shouldShowBadgeOwnerCount(1000)).toBe(false);
        expect(formatBadgeOwnerCount(12)).toBe('12');
        expect(formatBadgeOwnerCount(1000)).toBe('1000+');
        expect(formatBadgeOwnerCount(4321)).toBe('1000+');
    });
});
