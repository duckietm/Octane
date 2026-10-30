/** Targeted offer tracking states (official OfferController): the server remembers the last one. */
export const TargetedOfferTrackingState = {
    MAXIMIZED: 1,
    REJECTED: 2,
    MINIMIZED: 4
} as const;

/** Seconds left on an offer; null when it never expires (expiration time 0). */
export const getTargetedOfferSecondsLeft = (expirationTime: number, now: number): number | null =>
    expirationTime > 0 ? Math.max(0, Math.floor((expirationTime - now) / 1000)) : null;

export interface ITargetedOfferPrice {
    priceInCredits: number;
    priceInActivityPoints: number;
    purchaseLimit: number;
}

/** The quantity a purchase asks for: a whole number between 1 and the purchases left (an empty field counts as 1). */
export const clampTargetedOfferQuantity = (value: number, purchaseLimit: number): number => {
    if (!Number.isFinite(value)) return 1;

    return Math.max(1, Math.min(Math.floor(value), Math.max(1, purchaseLimit)));
};

/** What stops a purchase of `quantity` offers: nothing, no purchases left, too few credits, or too few activity points. */
export const getTargetedOfferPurchaseBlock = (
    offer: ITargetedOfferPrice,
    credits: number,
    activityPoints: number,
    quantity = 1
): null | 'limit' | 'credits' | 'points' => {
    if (offer.purchaseLimit <= 0) return 'limit';
    if (offer.priceInCredits > 0 && credits < offer.priceInCredits * quantity) return 'credits';
    if (offer.priceInActivityPoints > 0 && activityPoints < offer.priceInActivityPoints * quantity) return 'points';

    return null;
};
