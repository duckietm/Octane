import { describe, expect, it } from 'vitest';
import { ICatalogBundleDiscountRuleset } from '../../../../../api/catalog/CatalogBundleDiscount';
import { getCatalogBundleDiscountValue, getNextCatalogBundleDiscountLevel, isCatalogBundleDiscountValueVisible } from './catalogBundleExtraInfo.helpers';

const ruleset: ICatalogBundleDiscountRuleset = {
    maxPurchaseSize: 100,
    bundleSize: 5,
    bundleDiscountSize: 1,
    bonusThreshold: 99,
    additionalBonusDiscountThresholdQuantities: []
};

describe('catalog bundle extra info', () => {
    it('promotes the next quantity that adds a free item (ExtraInfoPromoItem.resolveNextDiscountLevel)', () => {
        expect(getNextCatalogBundleDiscountLevel(1, ruleset)).toEqual({ quantity: 5, freeItemCount: 1 });
        expect(getNextCatalogBundleDiscountLevel(5, ruleset)).toEqual({ quantity: 10, freeItemCount: 2 });
        expect(getNextCatalogBundleDiscountLevel(7, ruleset)).toEqual({ quantity: 10, freeItemCount: 2 });
    });

    it('has nothing left to promote past the last discount level or without a ruleset', () => {
        expect(getNextCatalogBundleDiscountLevel(100, ruleset)).toBeNull();
        expect(getNextCatalogBundleDiscountLevel(1, null)).toBeNull();
        expect(getNextCatalogBundleDiscountLevel(1, { ...ruleset, bundleSize: 0 })).toBeNull();
    });

    it('shows the struck-through total and the saving per currency (ExtraInfoDiscountValueItem)', () => {
        expect(getCatalogBundleDiscountValue(10, 0, 5, ruleset)).toEqual({ credits: { total: 50, saved: 10 }, activityPoints: null });
        expect(getCatalogBundleDiscountValue(10, 4, 10, ruleset)).toEqual({ credits: { total: 100, saved: 20 }, activityPoints: { total: 40, saved: 8 } });
        expect(getCatalogBundleDiscountValue(0, 4, 3, ruleset)).toEqual({ credits: null, activityPoints: { total: 12, saved: 0 } });
    });

    it('only shows the discount value once a full bundle is in the spinner', () => {
        expect(isCatalogBundleDiscountValueVisible(4, ruleset)).toBe(false);
        expect(isCatalogBundleDiscountValueVisible(5, ruleset)).toBe(true);
        expect(isCatalogBundleDiscountValueVisible(5, null)).toBe(false);
    });
});
