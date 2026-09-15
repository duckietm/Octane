import { localizeWithFallback, MarketPlaceOfferState, MarketplaceOfferData } from '../../../../../../api';

// Mirrors the official `offer_category_dropmenu` (MarketPlaceOwnItemsCatalogWidget): the three
// categories map straight onto the offer status the server sends.
export const OWN_OFFER_CATEGORY_OPEN = MarketPlaceOfferState.ONGOING;
export const OWN_OFFER_CATEGORY_SOLD = MarketPlaceOfferState.SOLD;
export const OWN_OFFER_CATEGORY_EXPIRED = MarketPlaceOfferState.EXPIRED;

export const OWN_OFFER_CATEGORIES = [OWN_OFFER_CATEGORY_OPEN, OWN_OFFER_CATEGORY_SOLD, OWN_OFFER_CATEGORY_EXPIRED];

// The official search field clips what the player types at 40 characters.
export const OWN_OFFER_SEARCH_MAX_LENGTH = 40;

const CATEGORY_FALLBACKS: Record<number, string> = {
    [OWN_OFFER_CATEGORY_OPEN]: 'OPEN',
    [OWN_OFFER_CATEGORY_SOLD]: 'SOLD',
    [OWN_OFFER_CATEGORY_EXPIRED]: 'EXPIRED'
};

const CATEGORY_KEYS: Record<number, string> = {
    [OWN_OFFER_CATEGORY_OPEN]: 'shop.marketplace.own.offers.category.open',
    [OWN_OFFER_CATEGORY_SOLD]: 'shop.marketplace.own.offers.category.sold',
    [OWN_OFFER_CATEGORY_EXPIRED]: 'shop.marketplace.own.offers.category.expired'
};

export const getOwnOfferCategoryLabel = (category: number): string => localizeWithFallback(CATEGORY_KEYS[category] ?? '', CATEGORY_FALLBACKS[category] ?? '');

/**
 * An open offer whose timer has run out is shown under "expired" even before the server flips
 * its status, otherwise the player sees a countdown at zero in the open list.
 */
export const getOwnOfferCategory = (offer: MarketplaceOfferData): number => {
    if (offer.status === MarketPlaceOfferState.SOLD) return OWN_OFFER_CATEGORY_SOLD;
    if (offer.status === MarketPlaceOfferState.EXPIRED) return OWN_OFFER_CATEGORY_EXPIRED;
    if (offer.timeLeftMinutes === 0) return OWN_OFFER_CATEGORY_EXPIRED;

    return OWN_OFFER_CATEGORY_OPEN;
};

export const normalizeOwnOfferSearch = (search: string): string => (search ?? '').slice(0, OWN_OFFER_SEARCH_MAX_LENGTH).trim().toLocaleLowerCase();

/**
 * Keeps the offers of one category whose name or description contains the search text; the
 * text lookup is injected so the filter stays free of the localization manager.
 */
export const filterOwnOffers = (
    offers: MarketplaceOfferData[],
    category: number,
    search: string,
    getSearchText: (offer: MarketplaceOfferData) => string
): MarketplaceOfferData[] => {
    const comparison = normalizeOwnOfferSearch(search);

    return offers.filter((offer) => {
        if (getOwnOfferCategory(offer) !== category) return false;
        if (!comparison.length) return true;

        return (getSearchText(offer) ?? '').toLocaleLowerCase().includes(comparison);
    });
};

/** Only open offers can be recalled; sold and expired ones are collected through "get credits". */
export const getRecallableOfferIds = (offers: MarketplaceOfferData[]): number[] =>
    offers.filter((offer) => getOwnOfferCategory(offer) === OWN_OFFER_CATEGORY_OPEN).map((offer) => offer.offerId);

/** The official widget only lets the sold and expired lists be marked as seen. */
export const isOwnOfferCategoryClearable = (category: number): boolean => category === OWN_OFFER_CATEGORY_SOLD || category === OWN_OFFER_CATEGORY_EXPIRED;
