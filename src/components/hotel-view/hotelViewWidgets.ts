/**
 * Pure helpers for the official landing-view widget types the hotel view renders
 * on top of the emulator-driven slots (AIR 13 `LandingViewWidgetType.as` and the
 * widget classes under `friendbar/landingview/widget/`).
 */

export const HOTEL_VIEW_OFFICIAL_WIDGET_TYPES = [
    'promoarticle',
    'avatarimage',
    'roomhoppernetwork',
    'generic',
    'communitygoalvsmode',
    'communitygoalvsmodevote'
] as const;

export type HotelViewOfficialWidgetType = (typeof HOTEL_VIEW_OFFICIAL_WIDGET_TYPES)[number];

export const isHotelViewOfficialWidgetType = (type: string): type is HotelViewOfficialWidgetType =>
    (HOTEL_VIEW_OFFICIAL_WIDGET_TYPES as readonly string[]).includes(type);

// ---------------------------------------------------------------------------
// PromoArticleWidget.as
// ---------------------------------------------------------------------------

export const PROMO_ARTICLE_REFRESH_PERIOD_MS = 600000;
export const PROMO_ARTICLE_FADE_MS = 500;
export const PROMO_ARTICLE_MAX_NAVIGATION_DISKS = 10;

export const PromoArticleLinkType = {
    WEB: 0,
    CLIENT: 1,
    NONE: 2
} as const;

/** `setArticleContent`: the button hides for "no link" and for an empty web link. */
export const isPromoArticleButtonVisible = (linkType: number, linkContent: string): boolean =>
    !(linkType === PromoArticleLinkType.NONE || (linkType === PromoArticleLinkType.WEB && linkContent === ''));

/** `goToArticle`: wrap around at both ends. */
export const wrapPromoArticleIndex = (index: number, count: number): number => {
    if (count <= 0) return 0;
    if (index < 0) return count - 1;
    if (index >= count) return 0;

    return index;
};

/** `refresh`: re-request the articles only after the refresh period. */
export const shouldRequestPromoArticles = (lastRequestTime: number | null, now: number): boolean =>
    lastRequestTime === null || lastRequestTime + PROMO_ARTICLE_REFRESH_PERIOD_MS < now;

// ---------------------------------------------------------------------------
// GenericWidget.as
// ---------------------------------------------------------------------------

/** One `<element>,<arg1>,<arg2>,...` entry of a `landing.view.<code>.conf` string. */
export interface GenericWidgetElement {
    type: string;
    /** The whole comma-separated entry: `args[0]` is the type, like the official `param3`. */
    args: string[];
}

export const parseGenericWidgetConf = (conf: string | null | undefined): GenericWidgetElement[] => {
    if (!conf) return [];

    return conf
        .split(';')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .map((entry) => {
            const args = entry.split(',').map((arg) => arg.trim());

            return { type: args[0], args };
        })
        .filter((element) => element.type.length > 0);
};

/** `configureLayout`: the `landing.view.<code>.layout` key/value pairs. */
export interface GenericWidgetLayout {
    bitmapUri?: string;
    bitmapWidth?: number;
    bitmapHeight?: number;
    bitmapX?: number;
    bitmapY?: number;
    contentX?: number;
    contentY?: number;
    contentWidth?: number;
    containerHeight?: number;
}

export const parseGenericWidgetLayout = (layout: string | null | undefined): GenericWidgetLayout => {
    const result: GenericWidgetLayout = {};

    if (!layout) return result;

    for (const entry of layout.split(';')) {
        const [key, value = ''] = entry.split(',').map((part) => part.trim());
        const numeric = Number.parseInt(value, 10);

        switch (key) {
            case 'bitmap.uri':
                result.bitmapUri = value;
                break;
            case 'bitmap.width':
                result.bitmapWidth = numeric;
                break;
            case 'bitmap.height':
                result.bitmapHeight = numeric;
                break;
            case 'bitmap.x':
                result.bitmapX = numeric;
                break;
            case 'bitmap.y':
                result.bitmapY = numeric;
                break;
            case 'content.x':
                result.contentX = numeric;
                break;
            case 'content.y':
                result.contentY = numeric;
                break;
            case 'content.width':
                result.contentWidth = numeric;
                break;
            case 'container.height':
                result.containerHeight = numeric;
                break;
        }
    }

    return result;
};

/** `isWideSlot`: slots 3 and 5 are the narrow right-pane slots. */
export const isGenericWidgetWideSlot = (slot: number): boolean => slot !== 3 && slot !== 5;

// ---------------------------------------------------------------------------
// ConcurrentUsersInfoElementHandler.as
// ---------------------------------------------------------------------------

export const ConcurrentUsersState = {
    DISABLED: 0,
    ACTIVE: 1,
    REDEEM: 2,
    REWARDED: 3
} as const;

export const CONCURRENT_USERS_UPDATE_INTERVAL_MS = 5000;
export const CONCURRENT_USERS_DEFAULT_BADGE = 'ConcurrentUsersReward';

/** `updateLocalization`: the widget caption / bodytext switch to the `.success` keys once the goal is reached. */
export const getConcurrentUsersTextKeys = (state: number): { caption: string; bodytext: string } => {
    const suffix = state === ConcurrentUsersState.REDEEM || state === ConcurrentUsersState.REWARDED ? '.success' : '';

    return { caption: `landing.view.concurrentusers.caption${suffix}`, bodytext: `landing.view.concurrentusers.bodytext${suffix}` };
};

export const getConcurrentUsersBadgeUrl = (imageLibraryUrl: string, badgeCode: string = CONCURRENT_USERS_DEFAULT_BADGE): string =>
    `${imageLibraryUrl}album1584/${badgeCode || CONCURRENT_USERS_DEFAULT_BADGE}.png`;

/** `element_rewardbadge` (`class_4264`): the badge image of the image library album. */
export const getRewardBadgeUrl = (imageLibraryUrl: string, badgeCode: string): string => `${imageLibraryUrl}album1584/${badgeCode}.png`;

// ---------------------------------------------------------------------------
// CommunityGoalVsModeWidget.as
// ---------------------------------------------------------------------------

export const COMMUNITY_GOAL_NEEDLE_LEVELS = [-3, -2, -1, 0, 1, 2, 3] as const;
export const COMMUNITY_GOAL_NEEDLE_FRAMES = [0, 0, 4.75, 11.5, 16.25, 23, 23] as const;
export const COMMUNITY_GOAL_NEEDLE_MAX_FRAME = 23;

/** `getCurrentNeedleFrame`: interpolate the needle between the level frames. */
export const getCommunityGoalVsNeedleFrame = (
    communityHighestAchievedLevel: number,
    scoreRemainingUntilNextLevel: number,
    percentCompletionTowardsNextLevel: number
): number => {
    const levels = COMMUNITY_GOAL_NEEDLE_LEVELS;
    const frames = COMMUNITY_GOAL_NEEDLE_FRAMES;

    if (communityHighestAchievedLevel <= levels[0]) return Math.round(frames[0]);
    if (communityHighestAchievedLevel >= levels[levels.length - 1]) return Math.round(frames[levels.length - 1]);

    const direction = scoreRemainingUntilNextLevel < 0 ? -1 : 1;
    const levelIndex = levels.indexOf(communityHighestAchievedLevel as (typeof levels)[number]);
    const nextIndex = levels.indexOf((communityHighestAchievedLevel + direction) as (typeof levels)[number]);

    if (levelIndex === -1 || nextIndex === -1) return Math.round(frames[Math.max(0, levelIndex)] ?? 0);

    const base = frames[levelIndex];
    const span = Math.abs(frames[nextIndex] - frames[levelIndex]);

    return Math.round(base + (percentCompletionTowardsNextLevel / 100) * span * direction);
};

/** Needle frames 0..23 sweep the meter from the far left to the far right. */
export const getCommunityGoalNeedleAngle = (frame: number): number =>
    (Math.max(0, Math.min(COMMUNITY_GOAL_NEEDLE_MAX_FRAME, frame)) / COMMUNITY_GOAL_NEEDLE_MAX_FRAME) * 180 - 90;

/** `CommunityGoalVsModeWidgetWithVoting.refresh`: the vote buttons show until the user contributed. */
export const areCommunityGoalVoteButtonsVisible = (personalContributionScore: number): boolean => personalContributionScore === 0;
