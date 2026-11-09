import { CalendarItemState } from './CalendarItemState';

/** One day column of AIR's calendar spinner (`btn_slot`, campaign_calendar_day_generic_bg). */
export const CALENDAR_ITEM_WIDTH = 202;

/** Spacing of AIR's `calendar_itemlist`. */
export const CALENDAR_ITEM_GAP = 4;

/** AIR keeps 75 px free on both sides of the stage when it works out how many days fit. */
const CALENDAR_STAGE_MARGIN = 75;

/** AIR's layout is five days wide. */
const CALENDAR_MAX_ITEMS = 5;

/** The state of one day, the way AIR's CalendarItem resolves it: opened, then future, then missed, else available. */
export const getCalendarDayState = (day: number, currentDay: number, openedDays: number[], missedDays: number[]): number => {
    if (openedDays.includes(day)) return CalendarItemState.STATE_UNLOCKED;
    if (day > currentDay) return CalendarItemState.STATE_LOCKED_FUTURE;
    if (missedDays.includes(day)) return CalendarItemState.STATE_LOCKED_EXPIRED;

    return CalendarItemState.STATE_LOCKED_AVAILABLE;
};

/** How many day columns fit next to each other on a stage this wide (at least one, at most AIR's five). */
export const getCalendarItemsOnScreen = (stageWidth: number): number =>
    Math.max(1, Math.min(CALENDAR_MAX_ITEMS, Math.floor((stageWidth - CALENDAR_STAGE_MARGIN * 2) / (CALENDAR_ITEM_WIDTH + CALENDAR_ITEM_GAP))));

/** Width of `count` day columns with the gaps between them. */
export const getCalendarListWidth = (count: number): number => count * CALENDAR_ITEM_WIDTH + Math.max(0, count - 1) * CALENDAR_ITEM_GAP;

export interface CalendarSpinnerLayout {
    /** Horizontal shift of the row of days, so the selected day sits in the middle of the spinner. */
    offset: number;
    /** Widths of the two shading gradients, left and right of the selected day. */
    leftShade: number;
    rightShade: number;
}

/**
 * AIR's spinner scrolls the row of days so the selected one is centred, and shades everything left of it
 * (0.6 to 0.2 alpha) and right of it (0.2 to 0.6) with the navy of the window.
 */
export const getCalendarSpinnerLayout = (selectedDay: number, spinnerWidth: number): CalendarSpinnerLayout => {
    const itemLeft = (spinnerWidth - CALENDAR_ITEM_WIDTH) / 2;
    const offset = itemLeft - selectedDay * (CALENDAR_ITEM_WIDTH + CALENDAR_ITEM_GAP);

    return {
        offset,
        leftShade: Math.max(0, itemLeft),
        rightShade: Math.max(0, spinnerWidth - (itemLeft + CALENDAR_ITEM_WIDTH + CALENDAR_ITEM_GAP))
    };
};
