/**
 * The quantity a capacity purchase actually asks for: the one picked, held inside what the chest still has room for.
 * After a purchase the options shrink, and a pick above the new limit would otherwise stay selected and be sent.
 */
export const clampUpgradeQuantity = (chosen: number, upgradesLeft: number, maxPerPurchase: number): number =>
    Math.max(1, Math.min(chosen, upgradesLeft, maxPerPurchase));
