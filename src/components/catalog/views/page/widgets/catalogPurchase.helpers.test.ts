import { describe, expect, it } from 'vitest';
import { canPurchaseCatalogOffer } from './catalogPurchase.helpers';

describe('catalog offer purchase eligibility', () => {
    it('blocks unresolved lazy search offers until the server returns the real offer', () => {
        expect(canPurchaseCatalogOffer({ isLazy: true, haveOffer: false } as any)).toBe(false);
    });

    it('blocks offers explicitly disabled by the catalog', () => {
        expect(canPurchaseCatalogOffer({ isLazy: false, haveOffer: false } as any)).toBe(false);
    });

    it('allows a resolved enabled offer', () => {
        expect(canPurchaseCatalogOffer({ isLazy: false, haveOffer: true } as any)).toBe(true);
    });
});
