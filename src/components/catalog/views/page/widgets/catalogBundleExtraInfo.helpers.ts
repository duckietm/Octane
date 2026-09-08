import { getCatalogBundleDiscountFlatPriceSteps, getCatalogBundlePrice, ICatalogBundleDiscountRuleset } from '../../../../../api/catalog/CatalogBundleDiscount';

// BundlePurchaseExtraInfoWidget.PROMO_ITEM_DROP_DELAY_MS: the promo drops in four seconds after an offer is selected.
export const BUNDLE_PROMO_DROP_DELAY_MS = 4000;
// ExtraInfoPromoItem.createNextDiscountMap scans quantities 1..100.
const MAX_SCANNED_QUANTITY = 100;

export interface ICatalogBundleDiscountLevel {
    quantity: number;
    freeItemCount: number;
}

export interface ICatalogBundleDiscountValue {
    credits: { total: number; saved: number } | null;
    activityPoints: { total: number; saved: number } | null;
}

/**
 * ExtraInfoPromoItem.createNextDiscountMap + resolveNextDiscountLevel: every quantity whose free
 * item count beats the previous best (skipping the flat price steps the spinner also skips), then
 * the first of them above the current quantity, i.e. the "Buy %quantity%, %discount% free
 * included!" promo line.
 */
export const getNextCatalogBundleDiscountLevel = (quantity: number, ruleset: ICatalogBundleDiscountRuleset | null): ICatalogBundleDiscountLevel | null => {
    if (!ruleset) return null;

    const flatPriceSteps = new Set<number>(getCatalogBundleDiscountFlatPriceSteps(ruleset));
    const maxQuantity = Math.min(MAX_SCANNED_QUANTITY, Math.max(1, Math.trunc(ruleset.maxPurchaseSize || MAX_SCANNED_QUANTITY)));
    let bestFreeItemCount = 0;

    for (let candidate = 1; candidate <= maxQuantity; candidate++) {
        const freeItemCount = getCatalogBundlePrice(1, candidate, true, ruleset).freeItemCount;

        if (freeItemCount <= bestFreeItemCount || flatPriceSteps.has(candidate)) continue;

        bestFreeItemCount = freeItemCount;

        if (candidate > quantity) return { quantity: candidate, freeItemCount };
    }

    return null;
};

/**
 * ExtraInfoDiscountValueItem: "Total" is the undiscounted quantity x unit price (struck through),
 * "Save" the difference to the discounted price, per currency the offer costs.
 */
export const getCatalogBundleDiscountValue = (
    unitCredits: number,
    unitActivityPoints: number,
    quantity: number,
    ruleset: ICatalogBundleDiscountRuleset | null
): ICatalogBundleDiscountValue => {
    const value = (unitPrice: number) => {
        if (!(unitPrice > 0)) return null;

        const price = getCatalogBundlePrice(unitPrice, quantity, true, ruleset);

        return { total: price.originalPrice, saved: Math.max(0, price.originalPrice - price.price) };
    };

    return { credits: value(unitCredits), activityPoints: value(unitActivityPoints) };
};

/** ExtraInfoDiscountValueItem appears once the quantity reaches the ruleset's bundle size. */
export const isCatalogBundleDiscountValueVisible = (quantity: number, ruleset: ICatalogBundleDiscountRuleset | null): boolean =>
    !!ruleset && ruleset.bundleSize > 0 && quantity >= ruleset.bundleSize;
