import { describe, expect, it } from 'vitest';
import {
    discoverHabboWayPageCount,
    getHabboWayIllustrationPath,
    getHabboWayIndicatorPosition,
    getHabboWayPageKeys,
    HABBO_WAY_DEFAULT_PAGE_COUNT,
    isHabboWayFinalPage,
    nextHabboWayPage,
    previousHabboWayPage,
    resolveHabboWayPageCount
} from './habboWay';
import { getWelcomeTourDelayMs, shouldOfferWelcomeTour, WELCOME_TOUR_DEFAULT_DELAY_SECONDS } from './welcomeTour';

const withPages = (count: number) => (key: string) =>
    /^habbo\.way\.page\.(\d+)\.correct\.title$/.test(key) && Number(key.split('.')[3]) < count ? 'title' : key;

describe('habboWay pages', () => {
    it('builds the four text keys of a page', () => {
        expect(getHabboWayPageKeys(3)).toEqual({
            correctTitle: 'habbo.way.page.3.correct.title',
            correctDescription: 'habbo.way.page.3.correct.description',
            wrongTitle: 'habbo.way.page.3.wrong.title',
            wrongDescription: 'habbo.way.page.3.wrong.description'
        });
    });

    it('prefers the configured count, then the texts, then the official default', () => {
        expect(discoverHabboWayPageCount(withPages(8))).toBe(8);
        expect(resolveHabboWayPageCount(4, withPages(8))).toBe(4);
        expect(resolveHabboWayPageCount(0, withPages(8))).toBe(8);
        expect(resolveHabboWayPageCount(null, withPages(0))).toBe(HABBO_WAY_DEFAULT_PAGE_COUNT);
    });

    it('steps between the first page and the closing page', () => {
        expect(previousHabboWayPage(0)).toBe(0);
        expect(nextHabboWayPage(5, 6)).toBe(6);
        expect(nextHabboWayPage(6, 6)).toBe(6);
        expect(isHabboWayFinalPage(6, 6)).toBe(true);
        expect(isHabboWayFinalPage(5, 6)).toBe(false);
    });

    it('lights the page dot while reading and none on the closing page', () => {
        expect(getHabboWayIndicatorPosition(0, 6)).toBe(1);
        expect(getHabboWayIndicatorPosition(6, 6)).toBe(0);
        expect(getHabboWayIllustrationPath(2, 6)).toBe('habboway/page_2.png');
        expect(getHabboWayIllustrationPath(6, 6)).toBe('habboway/page_end.png');
    });
});

describe('welcomeTour gate', () => {
    const open = { tourEnabled: true, newIdentity: true, isRealNoob: false, alreadyOffered: false };

    it('offers the tour once to an enabled new identity that is not a real noob', () => {
        expect(shouldOfferWelcomeTour(open)).toBe(true);
        expect(shouldOfferWelcomeTour({ ...open, tourEnabled: false })).toBe(false);
        expect(shouldOfferWelcomeTour({ ...open, newIdentity: false })).toBe(false);
        expect(shouldOfferWelcomeTour({ ...open, isRealNoob: true })).toBe(false);
        expect(shouldOfferWelcomeTour({ ...open, alreadyOffered: true })).toBe(false);
    });

    it('waits the configured seconds, 30 by default', () => {
        expect(getWelcomeTourDelayMs(5)).toBe(5000);
        expect(getWelcomeTourDelayMs(0)).toBe(0);
        expect(getWelcomeTourDelayMs(null)).toBe(WELCOME_TOUR_DEFAULT_DELAY_SECONDS * 1000);
        expect(getWelcomeTourDelayMs(Number.NaN)).toBe(WELCOME_TOUR_DEFAULT_DELAY_SECONDS * 1000);
    });
});
