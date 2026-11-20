import { BadgeRarityTier } from './badgeRarity';

export interface BadgeLeaderboardLinkTarget {
    /** The list to open: `totalBadges`, `achievementLevel` or `rarity-<key>`. */
    key: string;
    /** Zero-based page of that list. */
    page: number;
}

const TOTAL_BADGES = 0;
const BADGES_BY_RARITY = 1;
const ACHIEVEMENT_LEVEL = 2;

const RARITY_KEY_BY_TIER: Record<number, string> = {
    [BadgeRarityTier.COMMON]: 'common',
    [BadgeRarityTier.UNCOMMON]: 'common',
    [BadgeRarityTier.RARE]: 'rare',
    [BadgeRarityTier.EPIC]: 'epic',
    [BadgeRarityTier.MYTHICAL]: 'mythical',
    [BadgeRarityTier.LEGENDARY]: 'legendary',
    [BadgeRarityTier.UNIQUE]: 'unique'
};

const toInt = (value: string | undefined, fallback: number): number => {
    const parsed = parseInt(value ?? '', 10);

    return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * The arguments of the official `badge_leaderboard/<type>/<rarity>/<page>` link: type 0 is the total, 1 a rarity
 * tier and 2 the achievement level. Anything unknown opens the total, as the official controller does.
 */
export const parseBadgeLeaderboardLink = (args: readonly string[]): BadgeLeaderboardLinkTarget => {
    const type = toInt(args[0], TOTAL_BADGES);
    const rarity = toInt(args[1], -1);
    const page = Math.max(0, toInt(args[2], 0));

    if (type === ACHIEVEMENT_LEVEL) return { key: 'achievementLevel', page };

    if (type === BADGES_BY_RARITY && RARITY_KEY_BY_TIER[rarity]) return { key: `rarity-${RARITY_KEY_BY_TIER[rarity]}`, page };

    return { key: 'totalBadges', page };
};
