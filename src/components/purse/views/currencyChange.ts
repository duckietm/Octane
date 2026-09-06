// CurrencyIndicatorBase.onOverlayTimer advances 0.025 per 40ms tick, so the "+N" flyover lives
// for 40 ticks = 1.6 seconds before the indicator settles on the new amount.
export const CURRENCY_CHANGE_OVERLAY_MS = 1600;

/**
 * Text for the flyover the official purse shows when a balance changes: the signed difference,
 * with an explicit plus for gains. Returns null when nothing changed or there is no previous
 * value to compare against (the first amount is a load, not a change).
 */
export const formatCurrencyChange = (previousAmount: number | null, nextAmount: number): string | null => {
    if (previousAmount === null || previousAmount === undefined) return null;
    if (!Number.isFinite(previousAmount) || !Number.isFinite(nextAmount)) return null;

    const difference = nextAmount - previousAmount;

    if (difference === 0) return null;

    return (difference > 0 ? '+' : '') + difference.toString();
};
