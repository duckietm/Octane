import { describe, expect, it } from 'vitest';
import {
    areCommunityGoalVoteButtonsVisible,
    getWidgetContainerWidgetKey,
    isWidgetContainerAnswerForSchedule,
    ConcurrentUsersState,
    getCommunityGoalNeedleAngle,
    getCommunityGoalVsNeedleFrame,
    getConcurrentUsersBadgeUrl,
    getConcurrentUsersTextKeys,
    isGenericWidgetWideSlot,
    isHotelViewOfficialWidgetType,
    isPromoArticleButtonVisible,
    PROMO_ARTICLE_REFRESH_PERIOD_MS,
    PromoArticleLinkType,
    parseGenericWidgetConf,
    parseGenericWidgetLayout,
    shouldRequestPromoArticles,
    wrapPromoArticleIndex
} from './hotelViewWidgets';

describe('hotelViewWidgets', () => {
    it('recognises the official widget types the slot renderer dispatches', () => {
        expect(isHotelViewOfficialWidgetType('promoarticle')).toBe(true);
        expect(isHotelViewOfficialWidgetType('communitygoalvsmodevote')).toBe(true);
        expect(isHotelViewOfficialWidgetType('bonus')).toBe(false);
    });

    describe('promo article', () => {
        it('hides the button for "no link" and for an empty web link (setArticleContent)', () => {
            expect(isPromoArticleButtonVisible(PromoArticleLinkType.NONE, 'x')).toBe(false);
            expect(isPromoArticleButtonVisible(PromoArticleLinkType.WEB, '')).toBe(false);
            expect(isPromoArticleButtonVisible(PromoArticleLinkType.WEB, 'https://a')).toBe(true);
            expect(isPromoArticleButtonVisible(PromoArticleLinkType.CLIENT, '')).toBe(true);
        });

        it('wraps the article index at both ends (goToArticle)', () => {
            expect(wrapPromoArticleIndex(-1, 3)).toBe(2);
            expect(wrapPromoArticleIndex(3, 3)).toBe(0);
            expect(wrapPromoArticleIndex(1, 3)).toBe(1);
            expect(wrapPromoArticleIndex(5, 0)).toBe(0);
        });

        it('re-requests the articles only after the refresh period (refresh)', () => {
            expect(shouldRequestPromoArticles(null, 1000)).toBe(true);
            expect(shouldRequestPromoArticles(1000, 1000 + PROMO_ARTICLE_REFRESH_PERIOD_MS)).toBe(false);
            expect(shouldRequestPromoArticles(1000, 1001 + PROMO_ARTICLE_REFRESH_PERIOD_MS)).toBe(true);
        });
    });

    describe('generic widget', () => {
        it('parses the conf string into elements with the official argument layout', () => {
            expect(
                parseGenericWidgetConf('title,landing.view.x.title; bodytext,landing.view.x.body ;catalogbutton,landing.view.x.btn,limited_rares;;')
            ).toEqual([
                { type: 'title', args: ['title', 'landing.view.x.title'] },
                { type: 'bodytext', args: ['bodytext', 'landing.view.x.body'] },
                { type: 'catalogbutton', args: ['catalogbutton', 'landing.view.x.btn', 'limited_rares'] }
            ]);
            expect(parseGenericWidgetConf('')).toEqual([]);
            expect(parseGenericWidgetConf(undefined)).toEqual([]);
        });

        it('parses the layout string like configureLayout', () => {
            expect(
                parseGenericWidgetLayout('bitmap.uri,${image.library.url}reception/a.png;bitmap.width,120;bitmap.x,10;content.x,140;container.height,200')
            ).toEqual({
                bitmapUri: '${image.library.url}reception/a.png',
                bitmapWidth: 120,
                bitmapX: 10,
                contentX: 140,
                containerHeight: 200
            });
            expect(parseGenericWidgetLayout('')).toEqual({});
        });

        it('treats slots 3 and 5 as the narrow right-pane slots', () => {
            expect(isGenericWidgetWideSlot(1)).toBe(true);
            expect(isGenericWidgetWideSlot(3)).toBe(false);
            expect(isGenericWidgetWideSlot(5)).toBe(false);
        });
    });

    describe('concurrent users element', () => {
        it('switches the widget texts to the success keys once the goal is reached', () => {
            expect(getConcurrentUsersTextKeys(ConcurrentUsersState.ACTIVE)).toEqual({
                caption: 'landing.view.concurrentusers.caption',
                bodytext: 'landing.view.concurrentusers.bodytext'
            });
            expect(getConcurrentUsersTextKeys(ConcurrentUsersState.REDEEM).caption).toBe('landing.view.concurrentusers.caption.success');
            expect(getConcurrentUsersTextKeys(ConcurrentUsersState.REWARDED).bodytext).toBe('landing.view.concurrentusers.bodytext.success');
        });

        it('builds the badge image from the album, defaulting to ConcurrentUsersReward', () => {
            expect(getConcurrentUsersBadgeUrl('http://i/')).toBe('http://i/album1584/ConcurrentUsersReward.png');
            expect(getConcurrentUsersBadgeUrl('http://i/', 'ACH_X')).toBe('http://i/album1584/ACH_X.png');
        });
    });

    describe('community goal vs mode', () => {
        it('clamps the needle at the outer levels', () => {
            expect(getCommunityGoalVsNeedleFrame(-3, 10, 50)).toBe(0);
            expect(getCommunityGoalVsNeedleFrame(-9, 10, 50)).toBe(0);
            expect(getCommunityGoalVsNeedleFrame(3, 10, 50)).toBe(23);
        });

        it('interpolates towards the next level in the direction of the remaining score', () => {
            // level 0 (frame 11.5) half way to level 1 (frame 16.25): 11.5 + 0.5 * 4.75 = 13.875 -> 14
            expect(getCommunityGoalVsNeedleFrame(0, 100, 50)).toBe(14);
            // level 0 half way down to level -1 (frame 4.75): 11.5 - 0.5 * 6.75 = 8.125 -> 8
            expect(getCommunityGoalVsNeedleFrame(0, -100, 50)).toBe(8);
            expect(getCommunityGoalVsNeedleFrame(1, 100, 0)).toBe(16);
        });

        it('maps frames to a -90..90 degree sweep', () => {
            expect(getCommunityGoalNeedleAngle(0)).toBe(-90);
            expect(getCommunityGoalNeedleAngle(23)).toBe(90);
            expect(getCommunityGoalNeedleAngle(99)).toBe(90);
        });

        it('shows the vote buttons only before the user contributed', () => {
            expect(areCommunityGoalVoteButtonsVisible(0)).toBe(true);
            expect(areCommunityGoalVoteButtonsVisible(3)).toBe(false);
        });
    });

    describe('WidgetContainerWidget', () => {
        it('only accepts a timing answer for its own scheduling string', () => {
            expect(isWidgetContainerAnswerForSchedule('2001-01-01 00:00,promo', '2001-01-01 00:00,promo')).toBe(true);
            expect(isWidgetContainerAnswerForSchedule('2001-01-01 00:00,other', '2001-01-01 00:00,promo')).toBe(false);
        });

        it('builds the configuration key of the scheduled widget', () => {
            expect(getWidgetContainerWidgetKey('promo')).toBe('landing.view.promo.widget');
        });

        it('lists widgetcontainer among the official widget types', () => {
            expect(isHotelViewOfficialWidgetType('widgetcontainer')).toBe(true);
        });
    });
});
