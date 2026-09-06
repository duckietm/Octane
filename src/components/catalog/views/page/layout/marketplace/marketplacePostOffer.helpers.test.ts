import { describe, expect, it } from 'vitest';
import { getMarketplaceCommission, getMarketplacePriceWithoutCommission, resolveCopiedSuggestedPrice } from './marketplacePostOffer.helpers';

describe('marketplace post offer helpers', () => {
    it('charges at least one credit of commission on any priced offer', () => {
        expect(getMarketplaceCommission(0, 1)).toBe(0);
        expect(getMarketplaceCommission(10, 1)).toBe(1);
        expect(getMarketplaceCommission(250, 1)).toBe(3);
    });

    it('strips the commission from the average price without going negative', () => {
        expect(getMarketplacePriceWithoutCommission(250, 1)).toBe(247);
        expect(getMarketplacePriceWithoutCommission(1, 1)).toBe(0);
    });

    it('copies the suggested price only when the server gave one', () => {
        expect(resolveCopiedSuggestedPrice(42, 7)).toBe(42);
        expect(resolveCopiedSuggestedPrice(0, 7)).toBe(7);
    });
});
