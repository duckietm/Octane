/**
 * How many of a stack to offer: the typed amount, held between one and what is still unlocked. An
 * empty or unreadable field (NaN), zero or a negative amount offers nothing. The view used to offer the
 * raw field, and GroupItem.getTradeItems compared `found >= NaN`, which is never true, so clearing the
 * field to retype it offered the whole stack.
 */
export const clampTradeQuantity = (value: number, available: number): number => {
    if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(available) || available <= 0) return 0;

    return Math.min(Math.floor(value), Math.floor(available));
};
