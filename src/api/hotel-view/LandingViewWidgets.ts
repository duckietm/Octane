/**
 * The live hotel view widgets of the official client (friendbar/landingview/widget): the rules the
 * slot widgets of the landing view share, kept pure so they can be tested without the renderer.
 */

/** CommunityGoalWidget.CHALLENGE_LEVEL_NEEDLE_BASE_FRAMES: needle frame per reached level. */
export const COMMUNITY_GOAL_NEEDLE_FRAMES = [0, 8, 16, 23];
/** CommunityGoalVsModeWidget: levels -3..3 map onto needle frames, the middle is a draw. */
export const COMMUNITY_GOAL_VS_LEVELS = [-3, -2, -1, 0, 1, 2, 3];
export const COMMUNITY_GOAL_VS_FRAMES = [0, 0, 4.75, 11.5, 16.25, 23, 23];
/** CommunityGoalWidget: the needle waits 1.5 s, then takes 1 s to climb. */
export const COMMUNITY_GOAL_METER_DELAY_MS = 1500;
export const COMMUNITY_GOAL_METER_BUILDUP_MS = 1000;
/** PromoArticleWidget.REFRESH_PERIOD_IN_MILLIS / MAX_ARTICLES. */
export const PROMO_ARTICLE_REFRESH_MS = 10 * 60 * 1000;
export const PROMO_ARTICLE_MAX = 10;
/** NextLimitedRareCountdownWidget.REFRESH_PERIOD_IN_MILLIS. */
export const NEXT_LIMITED_RARE_REFRESH_MS = 30 * 1000;
/** ConcurrentUsersInfoElementHandler.UPDATE_INTERVAL_MS. */
export const CONCURRENT_USERS_POLL_MS = 5000;

/** ConcurrentUsersInfoElementHandler states. */
export const CONCURRENT_USERS_DISABLED = 0;
export const CONCURRENT_USERS_ACTIVE = 1;
export const CONCURRENT_USERS_REDEEM = 2;
export const CONCURRENT_USERS_REWARDED = 3;

/** PromoArticleData link types (class_4338 of the official client). */
export const PROMO_LINK_URL = 0;
export const PROMO_LINK_INTERNAL = 1;
export const PROMO_LINK_NONE = 2;

/** CommunityGoalWidget.getCurrentNeedleFrame: the frame of the reached level plus the way to the next. */
export const getCommunityGoalNeedleFrame = (level: number, percentTowardsNext: number): number => {
    const frames = COMMUNITY_GOAL_NEEDLE_FRAMES;

    if (level >= frames.length - 1) return frames[frames.length - 1];

    const base = frames[Math.max(0, level)] ?? 0;
    const span = (frames[Math.max(0, level) + 1] ?? base) - base;

    return base + Math.floor((percentTowardsNext * (span + 0.001)) / 100);
};

/** CommunityGoalVsModeWidget.getCurrentNeedleFrame: the needle leans to the side that leads. */
export const getCommunityGoalVsNeedleFrame = (level: number, percentTowardsNext: number, scoreRemainingUntilNextLevel: number): number => {
    const levels = COMMUNITY_GOAL_VS_LEVELS;
    const frames = COMMUNITY_GOAL_VS_FRAMES;

    if (level <= levels[0]) return Math.round(frames[0]);
    if (level >= levels[levels.length - 1]) return Math.round(frames[frames.length - 1]);

    const direction = scoreRemainingUntilNextLevel < 0 ? -1 : 1;
    const from = levels.indexOf(level);
    const to = levels.indexOf(level + direction);
    const base = frames[from] ?? 0;
    const span = Math.abs((frames[to] ?? base) - base);

    return Math.round(base + (percentTowardsNext / 100) * span * direction);
};

/** CommunityGoalWidget.updateMeter: level n of the meter lights up once the needle passed it. */
export const isCommunityGoalLevelLit = (frame: number, level: number): boolean => frame >= (COMMUNITY_GOAL_NEEDLE_FRAMES[level] ?? Number.MAX_SAFE_INTEGER);

/** CommunityGoalWidget.campaignizeMeterElementAssetUri: `meter_level_1.png` -> `meter_level_1_<code>.png`. */
export const campaignizeAssetUri = (uri: string, goalCode: string): string => {
    const index = uri.indexOf('.png');

    if (index < 0 || !goalCode) return uri;

    return `${uri.substring(0, index)}_${goalCode}.png`;
};

/** BonusRarePromoWidget.setProgress: the bar fills with what was already spent. */
export const getBonusRareProgressPercent = (totalCoinsForBonus: number, coinsStillRequiredToBuy: number): number => {
    if (!totalCoinsForBonus || totalCoinsForBonus <= 0) return 0;

    const spent = totalCoinsForBonus - Math.max(0, coinsStillRequiredToBuy);

    return Math.max(0, Math.min(100, (spent / totalCoinsForBonus) * 100));
};

/** ConcurrentUsersInfoElementHandler.updateLocalization: what the element shows per state. */
export const getConcurrentUsersView = (state: number) => {
    const achieved = state === CONCURRENT_USERS_REDEEM || state === CONCURRENT_USERS_REWARDED;

    return {
        achieved,
        showRedeemButton: state === CONCURRENT_USERS_REDEEM,
        /** The five second poll stops once the goal is reached. */
        polling: !achieved,
        captionKey: achieved ? 'landing.view.concurrentusers.caption.success' : 'landing.view.concurrentusers.caption',
        bodyKey: achieved ? 'landing.view.concurrentusers.bodytext.success' : 'landing.view.concurrentusers.bodytext'
    };
};

/** PromoArticleWidget.setArticleContent: no button for "no link" or an empty web link. */
export const isPromoArticleButtonVisible = (linkType: number, linkContent: string): boolean =>
    !(linkType === PROMO_LINK_NONE || (linkType === PROMO_LINK_URL && !linkContent));

/** PromoArticleWidget._r332303f814b0e9: the navigation wraps around both ends. */
export const wrapPromoArticleIndex = (index: number, count: number): number => {
    if (count <= 0) return 0;
    if (index < 0) return count - 1;
    if (index >= count) return 0;

    return index;
};

export type NextLimitedRareMode = 'available' | 'countdown' | 'hidden';

/** NextLimitedRareCountdownWidget.refreshContent: a page means the rare is out, seconds mean it is coming. */
export const getNextLimitedRareMode = (appearsInSeconds: number, pageId: number): NextLimitedRareMode => {
    if (pageId >= 0) return 'available';

    return appearsInSeconds > 0 ? 'countdown' : 'hidden';
};

/** Seconds left of a countdown received `receivedAt` (ms) with `seconds` to go. */
export const getSecondsLeft = (seconds: number, receivedAt: number, now: number): number =>
    Math.max(0, seconds - Math.floor((now - receivedAt) / 1000));

/** The days:hours:minutes:seconds of the countdown widgets. */
export const getCountdownParts = (seconds: number) => ({
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60
});

export const padCountdown = (value: number): string => value.toString().padStart(2, '0');

/** UserListWidget: ten avatars, their vertical offsets and the side each one faces (2 = right, 4 = left). */
export const HALL_OF_FAME_MAX_USERS = 10;
export const HALL_OF_FAME_Y_OFFSETS = [0, 10, 5, 0, 5, 10, 0, 10, 5, 10];
export const HALL_OF_FAME_DIRECTIONS = [2, 4, 2, 2, 4, 2, 2, 2, 4, 2];

/** `landing.view.<code>.avatarlist.yoffsets.array` style overrides: "0,10,5" -> [0, 10, 5]; invalid -> fallback. */
export const parseNumberArray = (value: string, fallback: number[]): number[] => {
    if (!value || !value.trim()) return fallback;

    const parsed = value.split(',').map((part) => Number.parseInt(part.trim(), 10));

    return parsed.some((entry) => Number.isNaN(entry)) ? fallback : parsed;
};

/**
 * CommunityGoalHallOfFameWidget.onTimingCode: the answer counts only for this slot's schedule and
 * only when the server picked a code.
 */
export const acceptTimingCode = (schedulingStr: string, answeredSchedulingStr: string, code: string): boolean =>
    !!code && answeredSchedulingStr === schedulingStr;

/**
 * CommunityGoalPrizesWidget.setPrizeRankLimits: prize level n covers the ranks after the levels
 * before it. Returns the first and last rank of the level.
 */
export const getPrizeRankLimits = (level: number, rewardUserLimits: number[]): { start: number; end: number } => {
    const limits = rewardUserLimits ?? [];
    let start = 1;
    let end = 0;

    for (let index = 0; index < level; index++) {
        if (index < level - 1) start += limits[index] ?? 0;

        end += limits[index] ?? 0;
    }

    return { start, end };
};

export type PrizesUserRankKey = 'yourfinalrank' | 'yourrank' | 'youarenotranked';

/** CommunityGoalPrizesWidget.refreshContent: which `landing.view.competition.prizes.<key>` caption the player sees. */
export const getPrizesUserRankKey = (hasGoalExpired: boolean, personalContributionRank: number): PrizesUserRankKey => {
    if (hasGoalExpired) return 'yourfinalrank';

    return personalContributionRank > 0 ? 'yourrank' : 'youarenotranked';
};
