import { describe, expect, it } from 'vitest';
import { canPurchaseCatalogOffer } from './catalogPurchase.helpers';

describe('catalog offer purchase eligibility', () => {
    it('blocks unresolved lazy search offers until the server returns the real offer', () => {
        expect(canPurchaseCatalogOffer({ isLazy: true, haveOffer: false } as any)).toBe(false);
    });

    it('sells an offer without the multi-buy flag one at a time', () => {
        // have_offer = 0 is common on bundles and pet eggs: the server sells them, only not several at once.
        expect(canPurchaseCatalogOffer({ isLazy: false, haveOffer: false } as any)).toBe(true);
    });

    it('has nothing to sell without an offer', () => {
        expect(canPurchaseCatalogOffer(null)).toBe(false);
        expect(canPurchaseCatalogOffer(undefined)).toBe(false);
    });

    it('allows a resolved enabled offer', () => {
        expect(canPurchaseCatalogOffer({ isLazy: false, haveOffer: true } as any)).toBe(true);
    });
});
