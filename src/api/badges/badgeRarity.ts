import { BadgeRarityKey } from './BadgeLeaderboardApi';

/**
 * Badge rarity tiers as the official client numbers them
 * (com.sulake.habbo.communication.enum, "BadgeRarity"): the selected-badges
 * packet carries the tier id per slot and every label / colour rule keys
 * off that id. The uncommon tier only counts as its own tier when the
 * `badge_rarity.uncommon` configuration flag is on; otherwise it collapses
 * into "common", exactly like the AIR client does.
 */
export const BadgeRarityTier = {
    COMMON: 0,
    UNCOMMON: 1,
    RARE: 2,
    EPIC: 3,
    MYTHICAL: 4,
    LEGENDARY: 5,
    UNIQUE: 6
} as const;

export type BadgeRarityTierId = (typeof BadgeRarityTier)[keyof typeof BadgeRarityTier];

export type BadgeRarityTierKey = BadgeRarityKey | 'uncommon';

const TIER_BY_KEY: Record<BadgeRarityTierKey, BadgeRarityTierId> = {
    common: BadgeRarityTier.COMMON,
    uncommon: BadgeRarityTier.UNCOMMON,
    rare: BadgeRarityTier.RARE,
    epic: BadgeRarityTier.EPIC,
    mythical: BadgeRarityTier.MYTHICAL,
    legendary: BadgeRarityTier.LEGENDARY,
    unique: BadgeRarityTier.UNIQUE
};

const LOCALIZATION_KEY_BY_TIER: Record<number, string> = {
    [BadgeRarityTier.UNCOMMON]: 'badge.rarity.uncommon',
    [BadgeRarityTier.RARE]: 'badge.rarity.rare',
    [BadgeRarityTier.EPIC]: 'badge.rarity.epic',
    [BadgeRarityTier.MYTHICAL]: 'badge.rarity.mythical',
    [BadgeRarityTier.LEGENDARY]: 'badge.rarity.legendary',
    [BadgeRarityTier.UNIQUE]: 'badge.rarity.unique'
};

/* Display colours straight from the official enum (getDisplayColor). */
const DISPLAY_COLOR_BY_TIER: Record<number, number> = {
    [BadgeRarityTier.UNCOMMON]: 16758605,
    [BadgeRarityTier.RARE]: 8780159,
    [BadgeRarityTier.EPIC]: 6732543,
    [BadgeRarityTier.MYTHICAL]: 12809942,
    [BadgeRarityTier.LEGENDARY]: 14036772,
    [BadgeRarityTier.UNIQUE]: 13406720
};

const UNCOMMON_GLOW_COLOR = 11759111;
const NEUTRAL_TAG_COLOR = 7829367;

/* How much the white-background tag darkens each display colour. */
const TAG_DARKEN_BY_TIER: Record<number, number> = {
    [BadgeRarityTier.RARE]: 0.35,
    [BadgeRarityTier.EPIC]: 0.2,
    [BadgeRarityTier.MYTHICAL]: 0.15,
    [BadgeRarityTier.LEGENDARY]: 0.1
};

export const BADGE_RARITY_COMMON_LABEL_KEY = 'badge.rarity.common';

export const getBadgeRarityTier = (key: string | null | undefined): BadgeRarityTierId => {
    if (!key) return BadgeRarityTier.COMMON;

    const tier = TIER_BY_KEY[key.toLowerCase() as BadgeRarityTierKey];

    return tier === undefined ? BadgeRarityTier.COMMON : tier;
};

export const isBadgeRarityRareOrHigher = (tier: number): boolean => tier >= BadgeRarityTier.RARE;

/**
 * A "standalone" tier gets its own label, colour and glow; anything below
 * is presented as a plain common badge.
 */
export const isBadgeRarityStandaloneTier = (tier: number, uncommonEnabled = false): boolean =>
    isBadgeRarityRareOrHigher(tier) || (uncommonEnabled && tier === BadgeRarityTier.UNCOMMON);

export const getBadgeRarityLocalizationKey = (tier: number, uncommonEnabled = false): string => {
    if (tier === BadgeRarityTier.UNCOMMON) return uncommonEnabled ? LOCALIZATION_KEY_BY_TIER[tier] : '';

    return LOCALIZATION_KEY_BY_TIER[tier] ?? '';
};

export const getBadgeRarityLabelKey = (tier: number, uncommonEnabled = false): string =>
    isBadgeRarityStandaloneTier(tier, uncommonEnabled) ? getBadgeRarityLocalizationKey(tier, uncommonEnabled) : BADGE_RARITY_COMMON_LABEL_KEY;

export const getBadgeRarityDisplayColor = (tier: number, uncommonEnabled = false): number => {
    if (tier === BadgeRarityTier.UNCOMMON) return uncommonEnabled ? DISPLAY_COLOR_BY_TIER[tier] : 0;

    return DISPLAY_COLOR_BY_TIER[tier] ?? 0;
};

export const getBadgeRarityGlowColor = (tier: number, uncommonEnabled = false): number =>
    uncommonEnabled && tier === BadgeRarityTier.UNCOMMON ? UNCOMMON_GLOW_COLOR : getBadgeRarityDisplayColor(tier, uncommonEnabled);

const darkenColor = (color: number, amount: number): number => {
    const factor = 1 - amount;
    const red = Math.floor(((color >> 16) & 0xff) * factor);
    const green = Math.floor(((color >> 8) & 0xff) * factor);
    const blue = Math.floor((color & 0xff) * factor);

    return (red << 16) | (green << 8) | blue;
};

/** Colour of the rarity tag drawn on the white badge-details bubble. */
export const getBadgeRarityTagColor = (tier: number, uncommonEnabled = false): number => {
    switch (tier) {
        case BadgeRarityTier.COMMON:
            return NEUTRAL_TAG_COLOR;
        case BadgeRarityTier.UNCOMMON:
            return uncommonEnabled ? getBadgeRarityDisplayColor(tier, uncommonEnabled) : NEUTRAL_TAG_COLOR;
        case BadgeRarityTier.RARE:
        case BadgeRarityTier.EPIC:
        case BadgeRarityTier.MYTHICAL:
        case BadgeRarityTier.LEGENDARY:
            return darkenColor(getBadgeRarityDisplayColor(tier, uncommonEnabled), TAG_DARKEN_BY_TIER[tier]);
        default:
            return getBadgeRarityDisplayColor(tier, uncommonEnabled);
    }
};

export const badgeRarityColorToCss = (color: number): string => `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;

/** The official bubble only prints an owner count while it is meaningful. */
export const shouldShowBadgeOwnerCount = (ownerCount: number): boolean => Number.isFinite(ownerCount) && ownerCount > 0 && ownerCount < 1000;

export const formatBadgeOwnerCount = (ownerCount: number): string => (ownerCount >= 1000 ? '1000+' : String(Math.max(0, Math.floor(ownerCount || 0))));
