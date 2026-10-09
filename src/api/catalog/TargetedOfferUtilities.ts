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

/** What stops a purchase: nothing, no purchases left, too few credits, or too few activity points. */
export const getTargetedOfferPurchaseBlock = (
    offer: ITargetedOfferPrice,
    credits: number,
    activityPoints: number
): null | 'limit' | 'credits' | 'points' => {
    if (offer.purchaseLimit <= 0) return 'limit';
    if (offer.priceInCredits > 0 && credits < offer.priceInCredits) return 'credits';
    if (offer.priceInActivityPoints > 0 && activityPoints < offer.priceInActivityPoints) return 'points';

    return null;
};
