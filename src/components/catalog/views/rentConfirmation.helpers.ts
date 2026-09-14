/**
 * Pure decisions of the official RentConfirmationWindow (catalog/purchase):
 * which caption the dialog gets, which price line it shows and whether the
 * viewer can pay before it opens.
 */

export const CREDITS_CURRENCY_TYPE = -1;

export interface RentOrBuyoutOffer {
    isWallItem: boolean;
    furniTypeName: string;
    buyout: boolean;
    priceInCredits: number;
    priceInActivityPoints: number;
    activityPointType: number;
}

export interface RentConfirmationPresentation {
    titleKey: string;
    okKey: string;
    showRentalDescription: boolean;
}

export interface RentConfirmationPrice {
    amount: number;
    currencyType: number;
}

export type RentConfirmationAffordability = 'ok' | 'credits' | 'activity_points';

/** Extend keeps the rental description and the plain OK, buy-out becomes a purchase. */
export const getRentConfirmationPresentation = (buyout: boolean): RentConfirmationPresentation =>
    buyout
        ? { titleKey: 'rent.confirmation.title.buyout', okKey: 'catalog.purchase_confirmation.buy', showRentalDescription: false }
        : { titleKey: 'rent.confirmation.title.extend', okKey: 'generic.ok', showRentalDescription: true };

/** The official window shows credits when the offer costs any, the activity points otherwise. */
export const getRentConfirmationPrice = (offer: RentOrBuyoutOffer): RentConfirmationPrice =>
    offer.priceInCredits > 0
        ? { amount: offer.priceInCredits, currencyType: CREDITS_CURRENCY_TYPE }
        : { amount: Math.max(0, offer.priceInActivityPoints), currencyType: offer.activityPointType };

/** Credits are checked first, then the activity points of the offer's type, like the official window. */
export const getRentConfirmationAffordability = (offer: RentOrBuyoutOffer, getCurrencyAmount: (type: number) => number): RentConfirmationAffordability => {
    if (getCurrencyAmount(CREDITS_CURRENCY_TYPE) < offer.priceInCredits) return 'credits';

    if (offer.priceInActivityPoints > 0 && getCurrencyAmount(offer.activityPointType) < offer.priceInActivityPoints) return 'activity_points';

    return 'ok';
};

/** The offer answers the request only when it names the furni type that was asked for. */
export const isOfferForFurniType = (offer: RentOrBuyoutOffer, furniTypeName: string): boolean =>
    !!offer && !!furniTypeName && offer.furniTypeName === furniTypeName;
