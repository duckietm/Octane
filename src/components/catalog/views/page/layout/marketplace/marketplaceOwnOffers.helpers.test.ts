import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    MarketPlaceOfferState: { ONGOING: 1, ONGOING_OWN: 1, SOLD: 2, EXPIRED: 3 }
}));

import {
    filterOwnOffers,
    getOwnOfferCategory,
    getOwnOfferCategoryLabel,
    getRecallableOfferIds,
    isOwnOfferCategoryClearable,
    normalizeOwnOfferSearch,
    OWN_OFFER_CATEGORY_EXPIRED,
    OWN_OFFER_CATEGORY_OPEN,
    OWN_OFFER_CATEGORY_SOLD
} from './marketplaceOwnOffers.helpers';

const offer = (offerId: number, status: number, timeLeftMinutes = 10) => ({ offerId, status, timeLeftMinutes }) as any;

describe('marketplace own offers helpers', () => {
    it('labels the three categories with English fallbacks', () => {
        expect(getOwnOfferCategoryLabel(OWN_OFFER_CATEGORY_OPEN)).toBe('OPEN');
        expect(getOwnOfferCategoryLabel(OWN_OFFER_CATEGORY_SOLD)).toBe('SOLD');
        expect(getOwnOfferCategoryLabel(OWN_OFFER_CATEGORY_EXPIRED)).toBe('EXPIRED');
    });

    it('files an open offer with no time left under expired', () => {
        expect(getOwnOfferCategory(offer(1, 1))).toBe(OWN_OFFER_CATEGORY_OPEN);
        expect(getOwnOfferCategory(offer(2, 1, 0))).toBe(OWN_OFFER_CATEGORY_EXPIRED);
        expect(getOwnOfferCategory(offer(3, 2))).toBe(OWN_OFFER_CATEGORY_SOLD);
        expect(getOwnOfferCategory(offer(4, 3))).toBe(OWN_OFFER_CATEGORY_EXPIRED);
    });

    it('clips and lowercases the search the way the official input does', () => {
        expect(normalizeOwnOfferSearch('  Sofa ')).toBe('sofa');
        expect(normalizeOwnOfferSearch('a'.repeat(50))).toHaveLength(40);
    });

    it('filters by category and by name or description text', () => {
        const offers = [offer(1, 1), offer(2, 1), offer(3, 2)];
        const names: Record<number, string> = { 1: 'Red sofa Comfortable', 2: 'Blue chair', 3: 'Red sofa' };

        expect(filterOwnOffers(offers, OWN_OFFER_CATEGORY_OPEN, '', (entry) => names[entry.offerId])).toEqual([offers[0], offers[1]]);
        expect(filterOwnOffers(offers, OWN_OFFER_CATEGORY_OPEN, 'SOFA', (entry) => names[entry.offerId])).toEqual([offers[0]]);
        expect(filterOwnOffers(offers, OWN_OFFER_CATEGORY_SOLD, 'sofa', (entry) => names[entry.offerId])).toEqual([offers[2]]);
    });

    it('recalls only open offers and clears only sold or expired lists', () => {
        expect(getRecallableOfferIds([offer(1, 1), offer(2, 2), offer(3, 1, 0)])).toEqual([1]);
        expect(isOwnOfferCategoryClearable(OWN_OFFER_CATEGORY_OPEN)).toBe(false);
        expect(isOwnOfferCategoryClearable(OWN_OFFER_CATEGORY_SOLD)).toBe(true);
        expect(isOwnOfferCategoryClearable(OWN_OFFER_CATEGORY_EXPIRED)).toBe(true);
    });
});
