export interface ICatalogBundleDiscountRuleset {
    maxPurchaseSize: number;
    bundleSize: number;
    bundleDiscountSize: number;
    bonusThreshold: number;
    additionalBonusDiscountThresholdQuantities: number[];
}

export interface ICatalogBundlePrice {
    originalPrice: number;
    price: number;
    freeItemCount: number;
    payableQuantity: number;
    hasDiscount: boolean;
}

const normalizeWholeNumber = (value: number): number => (Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0);

/**
 * Mirrors AIR's bundle-discount item count and Polaris' server-side
 * CatalogManager.calculateDiscountedPrice implementation.
 */
export const getCatalogBundleDiscountItemCount = (quantity: number, ruleset: ICatalogBundleDiscountRuleset = null): number => {
    const purchaseQuantity = normalizeWholeNumber(quantity);
    const bundleSize = normalizeWholeNumber(ruleset?.bundleSize);

    if (!purchaseQuantity || !ruleset || !bundleSize) return 0;

    const bundleCount = Math.floor(purchaseQuantity / bundleSize);
    const bundleDiscountSize = normalizeWholeNumber(ruleset.bundleDiscountSize);
    const bonusThreshold = normalizeWholeNumber(ruleset.bonusThreshold);
    let freeItemCount = bundleCount * bundleDiscountSize;

    if (bundleCount >= bonusThreshold) {
        if (purchaseQuantity % bundleSize === bundleSize - 1) freeItemCount++;

        freeItemCount += bundleCount - bonusThreshold;
    }

    for (const threshold of ruleset.additionalBonusDiscountThresholdQuantities ?? []) {
        if (purchaseQuantity >= normalizeWholeNumber(threshold)) freeItemCount++;
    }

    return freeItemCount;
};

export const getCatalogBundlePrice = (
    unitPrice: number,
    quantity: number,
    bundlePurchaseAllowed: boolean,
    ruleset: ICatalogBundleDiscountRuleset = null
): ICatalogBundlePrice => {
    const purchaseQuantity = normalizeWholeNumber(quantity);
    const normalizedUnitPrice = normalizeWholeNumber(unitPrice);
    const freeItemCount = bundlePurchaseAllowed ? getCatalogBundleDiscountItemCount(purchaseQuantity, ruleset) : 0;
    const payableQuantity = Math.max(0, purchaseQuantity - freeItemCount);
    const originalPrice = normalizedUnitPrice * purchaseQuantity;
    const price = normalizedUnitPrice * payableQuantity;

    return {
        originalPrice,
        price,
        freeItemCount,
        payableQuantity,
        hasDiscount: originalPrice !== price
    };
};

/**
 * Uses AIR's flat-price-step derivation with Polaris' discounted payable
 * price. The ruleset packet does not send this list; the client derives it
 * locally before configuring the spinner.
 */
export const getCatalogBundleDiscountFlatPriceSteps = (ruleset: ICatalogBundleDiscountRuleset = null): number[] => {
    if (!ruleset) return [];

    const flatPriceSteps: number[] = [];
    const comparableQuantityCount = Math.min(99, normalizeWholeNumber(ruleset.maxPurchaseSize));

    for (let quantity = 0; quantity < comparableQuantityCount; quantity++) {
        const currentPrice = getCatalogBundlePrice(1, quantity, true, ruleset).price;
        const nextPrice = getCatalogBundlePrice(1, quantity + 1, true, ruleset).price;

        if (currentPrice === nextPrice) flatPriceSteps.push(quantity);
    }

    return flatPriceSteps;
};
