/** A bottom sheet pulled down by at least this share of its height (or this many px) closes on release. */
export const SHEET_DISMISS_SHARE = 0.3;
export const SHEET_DISMISS_MIN_PX = 64;

/** Only downward pulls move the sheet; pulling up is ignored. */
export const sheetPullDistance = (startY: number, currentY: number): number => Math.max(0, Math.round(currentY - startY));

export const shouldDismissSheet = (pulled: number, sheetHeight: number): boolean => {
    if (pulled <= 0) return false;

    const threshold = Math.max(SHEET_DISMISS_MIN_PX, Math.max(0, sheetHeight) * SHEET_DISMISS_SHARE);

    return pulled >= threshold;
};
