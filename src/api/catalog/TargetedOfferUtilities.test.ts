import { describe, expect, it } from 'vitest';
import { getTargetedOfferPurchaseBlock, getTargetedOfferSecondsLeft } from './TargetedOfferUtilities';

describe('getTargetedOfferSecondsLeft', () => {
    it('counts down and stops at zero', () => {
        expect(getTargetedOfferSecondsLeft(10_000, 4_500)).toBe(5);
        expect(getTargetedOfferSecondsLeft(10_000, 20_000)).toBe(0);
    });

    it('has no countdown when the offer never expires', () => {
        expect(getTargetedOfferSecondsLeft(0, 4_500)).toBeNull();
    });
});

describe('getTargetedOfferPurchaseBlock', () => {
    const offer = { priceInCredits: 10, priceInActivityPoints: 5, purchaseLimit: 1 };

    it('allows a purchase the user can afford', () => {
        expect(getTargetedOfferPurchaseBlock(offer, 10, 5)).toBeNull();
    });

    it('allows an offer priced only in activity points', () => {
        expect(getTargetedOfferPurchaseBlock({ ...offer, priceInCredits: 0 }, 0, 5)).toBeNull();
    });

    it('names what is missing', () => {
        expect(getTargetedOfferPurchaseBlock({ ...offer, purchaseLimit: 0 }, 10, 5)).toBe('limit');
        expect(getTargetedOfferPurchaseBlock(offer, 9, 5)).toBe('credits');
        expect(getTargetedOfferPurchaseBlock(offer, 10, 4)).toBe('points');
    });
});
