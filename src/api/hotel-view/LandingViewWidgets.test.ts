import { describe, expect, it } from 'vitest';
import {
    acceptTimingCode,
    campaignizeAssetUri,
    CONCURRENT_USERS_ACTIVE,
    CONCURRENT_USERS_REDEEM,
    CONCURRENT_USERS_REWARDED,
    getBonusRareProgressPercent,
    getCommunityGoalNeedleFrame,
    getCommunityGoalVsNeedleFrame,
    getConcurrentUsersView,
    getNextLimitedRareMode,
    getPrizeRankLimits,
    getPrizesUserRankKey,
    getSecondsLeft,
    isCommunityGoalLevelLit,
    isPromoArticleButtonVisible,
    parseNumberArray,
    PROMO_LINK_INTERNAL,
    PROMO_LINK_NONE,
    PROMO_LINK_URL,
    wrapPromoArticleIndex
} from './LandingViewWidgets';

describe('hotel view live widgets', () => {
    it('moves the community goal needle between the level frames', () => {
        expect(getCommunityGoalNeedleFrame(0, 0)).toBe(0);
        expect(getCommunityGoalNeedleFrame(0, 50)).toBe(4);
        expect(getCommunityGoalNeedleFrame(1, 100)).toBe(16);
        expect(getCommunityGoalNeedleFrame(3, 10)).toBe(23);
        expect(isCommunityGoalLevelLit(16, 2)).toBe(true);
        expect(isCommunityGoalLevelLit(15, 2)).toBe(false);
    });

    it('leans the vs needle towards the leading side', () => {
        expect(getCommunityGoalVsNeedleFrame(0, 0, 10)).toBe(12);
        expect(getCommunityGoalVsNeedleFrame(0, 100, 10)).toBe(16);
        expect(getCommunityGoalVsNeedleFrame(0, 100, -10)).toBe(5);
        expect(getCommunityGoalVsNeedleFrame(-3, 50, -1)).toBe(0);
        expect(getCommunityGoalVsNeedleFrame(3, 50, 1)).toBe(23);
    });

    it('names the meter images after the goal', () => {
        expect(campaignizeAssetUri('https://img/reception/meter_level_1.png', 'lympix')).toBe('https://img/reception/meter_level_1_lympix.png');
        expect(campaignizeAssetUri('https://img/reception/meter_level_1.png', '')).toBe('https://img/reception/meter_level_1.png');
    });

    it('fills the bonus rare bar with the credits already spent', () => {
        expect(getBonusRareProgressPercent(120, 30)).toBe(75);
        expect(getBonusRareProgressPercent(120, 200)).toBe(0);
        expect(getBonusRareProgressPercent(0, 0)).toBe(0);
    });

    it('switches the concurrent users element to the reward once reached', () => {
        expect(getConcurrentUsersView(CONCURRENT_USERS_ACTIVE)).toMatchObject({ achieved: false, polling: true, showRedeemButton: false });
        expect(getConcurrentUsersView(CONCURRENT_USERS_REDEEM)).toMatchObject({ achieved: true, polling: false, showRedeemButton: true });
        expect(getConcurrentUsersView(CONCURRENT_USERS_REWARDED)).toMatchObject({ achieved: true, showRedeemButton: false });
        expect(getConcurrentUsersView(CONCURRENT_USERS_REDEEM).bodyKey).toBe('landing.view.concurrentusers.bodytext.success');
    });

    it('hides the article button without a link and wraps the navigation', () => {
        expect(isPromoArticleButtonVisible(PROMO_LINK_NONE, 'x')).toBe(false);
        expect(isPromoArticleButtonVisible(PROMO_LINK_URL, '')).toBe(false);
        expect(isPromoArticleButtonVisible(PROMO_LINK_INTERNAL, '')).toBe(true);
        expect(wrapPromoArticleIndex(-1, 3)).toBe(2);
        expect(wrapPromoArticleIndex(3, 3)).toBe(0);
    });

    it('shows the next limited rare as a countdown, then as available', () => {
        expect(getNextLimitedRareMode(120, -1)).toBe('countdown');
        expect(getNextLimitedRareMode(-1, 12)).toBe('available');
        expect(getNextLimitedRareMode(-1, -1)).toBe('hidden');
        expect(getSecondsLeft(120, 1000, 31_500)).toBe(90);
        expect(getSecondsLeft(10, 0, 60_000)).toBe(0);
    });
});

describe('community goal competition widgets', () => {
    it('splits the prize levels over the reward user limits like setPrizeRankLimits', () => {
        expect(getPrizeRankLimits(1, [1, 4, 20])).toEqual({ start: 1, end: 1 });
        expect(getPrizeRankLimits(2, [1, 4, 20])).toEqual({ start: 2, end: 5 });
        expect(getPrizeRankLimits(3, [1, 4, 20])).toEqual({ start: 6, end: 25 });
        expect(getPrizeRankLimits(3, [])).toEqual({ start: 1, end: 0 });
    });

    it('picks the rank caption of the player', () => {
        expect(getPrizesUserRankKey(true, 0)).toBe('yourfinalrank');
        expect(getPrizesUserRankKey(false, 4)).toBe('yourrank');
        expect(getPrizesUserRankKey(false, 0)).toBe('youarenotranked');
    });

    it('accepts only the timing code of its own schedule', () => {
        expect(acceptTimingCode('2026-01-01 00:00,goal', '2026-01-01 00:00,goal', 'goal')).toBe(true);
        expect(acceptTimingCode('2026-01-01 00:00,goal', 'other', 'goal')).toBe(false);
        expect(acceptTimingCode('2026-01-01 00:00,goal', '2026-01-01 00:00,goal', '')).toBe(false);
    });

    it('reads the avatar list overrides', () => {
        expect(parseNumberArray('0, 4,8', [1])).toEqual([0, 4, 8]);
        expect(parseNumberArray('', [1])).toEqual([1]);
        expect(parseNumberArray('a,2', [1])).toEqual([1]);
    });
});
