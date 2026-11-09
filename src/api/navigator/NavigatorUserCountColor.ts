/**
 * Habbo AIR `class_3949.getUserCountColor` (WIN63 new navigator occupancy chip).
 * 0xFFC2332C / 0xFFFFB11B / 0xFF63B162 / 0xFFCBCAC1.
 */
export const NAVIGATOR_USERCOUNT_RED = '#C2332C';
export const NAVIGATOR_USERCOUNT_YELLOW = '#FFB11B';
export const NAVIGATOR_USERCOUNT_GREEN = '#63B162';
export const NAVIGATOR_USERCOUNT_EMPTY = '#CBCAC1';

export const getNavigatorUserCountColor = (userCount: number, maxUserCount: number): string => {
    if (maxUserCount <= 0) return userCount > 0 ? NAVIGATOR_USERCOUNT_GREEN : NAVIGATOR_USERCOUNT_EMPTY;

    const percent = 100 * (userCount / maxUserCount);

    if (percent >= 92) return NAVIGATOR_USERCOUNT_RED;
    if (percent >= 50) return NAVIGATOR_USERCOUNT_YELLOW;
    if (userCount > 0) return NAVIGATOR_USERCOUNT_GREEN;

    return NAVIGATOR_USERCOUNT_EMPTY;
};
