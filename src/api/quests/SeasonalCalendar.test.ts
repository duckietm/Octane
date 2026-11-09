import { describe, expect, it } from 'vitest';
import {
    adjustSeasonalBrightness,
    buildSeasonalCalendarDays,
    getFlashingSeasonalDay,
    getHighestSeasonalDay,
    getInitialSeasonalOffset,
    getRareTeaserState,
    getSeasonalBackgroundCount,
    getSeasonalDayImageName,
    getSeasonalImageHost,
    getSeasonalScrollLimits,
    isSeasonalQuest,
    parseSeasonalIntList,
    pickSeasonalQuestRoomId,
    SEASONAL_DAY_ACTIVE,
    SEASONAL_DAY_COMPLETED,
    SEASONAL_DAY_INACTIVE,
    SEASONAL_DAY_UNAVAILABLE,
    toCssColor
} from './SeasonalCalendar';

const quest = (campaignCode: string, sortOrder: number, completedCampaign = false) => ({ campaignCode, sortOrder, completedCampaign });

describe('seasonal quest calendar', () => {
    it('only counts the campaigns of the configured prefix', () => {
        expect(isSeasonalQuest(quest('xmas13_4', 4), 'xmas13')).toBe(true);
        expect(isSeasonalQuest(quest('chat', 1), 'xmas13')).toBe(false);
        expect(isSeasonalQuest(quest('xmas13_4', 4), '')).toBe(false);
        expect(getHighestSeasonalDay([quest('xmas13_1', 1), quest('xmas13_5', 5), quest('chat', 9)], 'xmas13')).toBe(5);
    });

    it('lays out done, open, missed and coming days', () => {
        const days = buildSeasonalCalendarDays([quest('xmas13_1', 1, true), quest('xmas13_3', 3), quest('other', 2)], 'xmas13', 42);

        expect(days.map((day) => day.state)).toEqual([
            SEASONAL_DAY_COMPLETED,
            SEASONAL_DAY_UNAVAILABLE,
            SEASONAL_DAY_ACTIVE,
            SEASONAL_DAY_INACTIVE,
            SEASONAL_DAY_INACTIVE
        ]);
        expect(days[2].quest?.campaignCode).toBe('xmas13_3');
        expect(getFlashingSeasonalDay(days, 3)).toBe(3);
        expect(getFlashingSeasonalDay(days, 1)).toBe(-1);
    });

    it('caps the strip at the maximum number of days', () => {
        expect(buildSeasonalCalendarDays([quest('x_42', 42)], 'x', 42)).toHaveLength(42);
    });

    it('opens three days before today and scrolls within the strip', () => {
        expect(getInitialSeasonalOffset(2, 42)).toBe(0);
        expect(getInitialSeasonalOffset(10, 42)).toBe(7);
        expect(getInitialSeasonalOffset(42, 42)).toBe(35);
        expect(getSeasonalScrollLimits(0, 12, 42, 10)).toEqual({ canScrollBack: false, canScrollForward: true });
        expect(getSeasonalScrollLimits(8, 12, 42, 10)).toEqual({ canScrollBack: true, canScrollForward: false });
    });

    it('names the images of the gallery', () => {
        expect(getSeasonalDayImageName(4, SEASONAL_DAY_COMPLETED)).toBe('day4_completed');
        expect(getSeasonalDayImageName(4, SEASONAL_DAY_INACTIVE)).toBe('day4_uncomplete');
        expect(getSeasonalImageHost('https://img/c_images/', 'xmas13')).toBe('https://img/c_images/xmas13_quest_calendar/');
        expect(getSeasonalBackgroundCount(12)).toBe(3);
    });

    it('brightens the indicator per channel', () => {
        expect(adjustSeasonalBrightness(0x20911d, 0x20)).toBe(0x40b13d);
        expect(adjustSeasonalBrightness(0xf0f0f0, 100)).toBe(0xffffff);
        expect(toCssColor(0x20911d)).toBe('#20911d');
    });

    it('counts down to the next rare of the teaser', () => {
        expect(parseSeasonalIntList('8, 16,24,')).toEqual([8, 16, 24]);
        expect(getRareTeaserState([8, 16, 24], 10)).toEqual({ locked: [false, true, true], daysUntilNext: 6 });
        expect(getRareTeaserState([8, 16, 24], 30).daysUntilNext).toBe(-1);
    });

    it('picks one of the quest rooms', () => {
        expect(pickSeasonalQuestRoomId('', 0.5)).toBeNull();
        expect(pickSeasonalQuestRoomId('123,456', 0)).toBe(123);
        expect(pickSeasonalQuestRoomId('123,456', 0.99)).toBe(456);
    });
});
