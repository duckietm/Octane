import { describe, expect, it } from 'vitest';
import { CalendarItemState } from './CalendarItemState';
import { getCalendarDayState, getCalendarItemsOnScreen, getCalendarListWidth, getCalendarSpinnerLayout } from './CalendarLayout';

describe('campaign calendar layout (AIR CalendarView / CalendarItem)', () => {
    it('resolves a day as opened, then future, then missed, else available', () => {
        expect(getCalendarDayState(2, 1, [2], [])).toBe(CalendarItemState.STATE_UNLOCKED);
        expect(getCalendarDayState(5, 3, [], [5])).toBe(CalendarItemState.STATE_LOCKED_FUTURE);
        expect(getCalendarDayState(1, 3, [], [1])).toBe(CalendarItemState.STATE_LOCKED_EXPIRED);
        expect(getCalendarDayState(3, 3, [], [])).toBe(CalendarItemState.STATE_LOCKED_AVAILABLE);
    });

    it('fits (stage - 150) / 206 days, between one and five', () => {
        expect(getCalendarItemsOnScreen(1920)).toBe(5);
        expect(getCalendarItemsOnScreen(1000)).toBe(4);
        expect(getCalendarItemsOnScreen(400)).toBe(1);
        expect(getCalendarItemsOnScreen(100)).toBe(1);
    });

    it('is 1026 px wide for five days, as AIR draws its 1033 px layout', () => {
        expect(getCalendarListWidth(5)).toBe(1026);
        expect(getCalendarListWidth(1)).toBe(202);
    });

    it('centres the selected day and shades both sides of it', () => {
        expect(getCalendarSpinnerLayout(0, 1026)).toEqual({ offset: 412, leftShade: 412, rightShade: 408 });
        expect(getCalendarSpinnerLayout(3, 1026)).toEqual({ offset: 412 - 3 * 206, leftShade: 412, rightShade: 408 });
        expect(getCalendarSpinnerLayout(0, 202)).toEqual({ offset: 0, leftShade: 0, rightShade: 0 });
    });
});
