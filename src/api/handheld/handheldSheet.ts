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

/** A drag shorter than this is a tap on the grip. */
export const SHEET_TAP_SLOP_PX = 6;
/** Pulling the peeking drawer up by this much opens it. */
export const SHEET_EXPAND_MIN_PX = 28;

export type SheetDragIntent = 'toggle' | 'expand' | 'collapse' | 'dismiss' | 'none';

/**
 * What a finished drag on the drawer's grip means. `deltaY` is where the finger ended minus where it started
 * (down is positive): a tap toggles the drawer, a pull up opens the peeking drawer, a pull down folds the open
 * drawer back to its peek, and a pull down on the peek far enough (see `shouldDismissSheet`) closes it.
 */
export const sheetDragIntent = (deltaY: number, expanded: boolean, sheetHeight: number): SheetDragIntent => {
    if (Math.abs(deltaY) < SHEET_TAP_SLOP_PX) return 'toggle';

    if (deltaY < 0) return !expanded && -deltaY >= SHEET_EXPAND_MIN_PX ? 'expand' : 'none';

    if (expanded) return deltaY >= SHEET_EXPAND_MIN_PX ? 'collapse' : 'none';

    return shouldDismissSheet(Math.round(deltaY), sheetHeight) ? 'dismiss' : 'none';
};
