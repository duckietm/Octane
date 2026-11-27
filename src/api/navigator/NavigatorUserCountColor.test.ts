import { describe, expect, it } from 'vitest';
import { getNavigatorUserCountColor, getNavigatorUserCountLevel, NAVIGATOR_USERCOUNT_EMPTY, NAVIGATOR_USERCOUNT_GREEN, NAVIGATOR_USERCOUNT_RED, NAVIGATOR_USERCOUNT_YELLOW } from './NavigatorUserCountColor';

describe('getNavigatorUserCountLevel', () => {
    it.each([
        [0, 25, 'empty', NAVIGATOR_USERCOUNT_EMPTY],
        [1, 25, 'open', NAVIGATOR_USERCOUNT_GREEN],
        [12, 25, 'open', NAVIGATOR_USERCOUNT_GREEN],
        [13, 25, 'busy', NAVIGATOR_USERCOUNT_YELLOW],
        [22, 25, 'busy', NAVIGATOR_USERCOUNT_YELLOW],
        [23, 25, 'full', NAVIGATOR_USERCOUNT_RED],
        [25, 25, 'full', NAVIGATOR_USERCOUNT_RED],
        [0, 0, 'empty', NAVIGATOR_USERCOUNT_EMPTY],
        [4, 0, 'open', NAVIGATOR_USERCOUNT_GREEN]
    ])('%i of %i is %s, the step of its colour', (userCount, maxUserCount, level, color) => {
        expect(getNavigatorUserCountLevel(userCount, maxUserCount)).toBe(level);
        expect(getNavigatorUserCountColor(userCount, maxUserCount)).toBe(color);
    });
});
