import { describe, expect, it } from 'vitest';
import {
    getRentConfirmationAffordability,
    getRentConfirmationPresentation,
    getRentConfirmationPrice,
    isOfferForFurniType,
    RentOrBuyoutOffer
} from './rentConfirmation.helpers';

const creditsOffer: RentOrBuyoutOffer = {
    isWallItem: false,
    furniTypeName: 'rentable_sofa',
    buyout: false,
    priceInCredits: 25,
    priceInActivityPoints: 0,
    activityPointType: 0
};

const ducketsOffer: RentOrBuyoutOffer = { ...creditsOffer, priceInCredits: 0, priceInActivityPoints: 60, activityPointType: 0 };

describe('getRentConfirmationPresentation', () => {
    it('titles an extension and keeps the rental description', () => {
        expect(getRentConfirmationPresentation(false)).toEqual({
            titleKey: 'rent.confirmation.title.extend',
            okKey: 'generic.ok',
            showRentalDescription: true
        });
    });

    it('turns a buy-out into a purchase confirmation', () => {
        expect(getRentConfirmationPresentation(true)).toEqual({
            titleKey: 'rent.confirmation.title.buyout',
            okKey: 'catalog.purchase_confirmation.buy',
            showRentalDescription: false
        });
    });
});

describe('getRentConfirmationPrice', () => {
    it('shows credits whenever the offer costs any', () => {
        expect(getRentConfirmationPrice({ ...creditsOffer, priceInActivityPoints: 10 })).toEqual({ amount: 25, currencyType: -1 });
    });

    it('falls back to the activity points of the offer type', () => {
        expect(getRentConfirmationPrice({ ...ducketsOffer, activityPointType: 5 })).toEqual({ amount: 60, currencyType: 5 });
    });
});

describe('getRentConfirmationAffordability', () => {
    const purse = (credits: number, duckets: number) => (type: number) => (type === -1 ? credits : duckets);

    it('accepts a viewer who can pay both prices', () => {
        expect(getRentConfirmationAffordability({ ...creditsOffer, priceInActivityPoints: 5 }, purse(25, 5))).toBe('ok');
    });

    it('reports missing credits before missing activity points', () => {
        expect(getRentConfirmationAffordability({ ...creditsOffer, priceInActivityPoints: 5 }, purse(24, 0))).toBe('credits');
        expect(getRentConfirmationAffordability({ ...creditsOffer, priceInActivityPoints: 5 }, purse(25, 4))).toBe('activity_points');
    });

    it('ignores activity points when the offer asks none', () => {
        expect(getRentConfirmationAffordability(creditsOffer, purse(25, 0))).toBe('ok');
    });
});

describe('isOfferForFurniType', () => {
    it('only matches the furni type that was requested', () => {
        expect(isOfferForFurniType(creditsOffer, 'rentable_sofa')).toBe(true);
        expect(isOfferForFurniType(creditsOffer, 'rentable_chair')).toBe(false);
        expect(isOfferForFurniType(null, 'rentable_sofa')).toBe(false);
    });
});
