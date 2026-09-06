/** Marketplace commission for one asking price: a percentage of the price, never below 1 credit. */
export const getMarketplaceCommission = (price: number, commissionPercent: number): number => {
    if (!(price > 0)) return 0;

    return Math.max(Math.ceil(commissionPercent * 0.01 * price), 1);
};

/**
 * The official average-price line shows the sale price next to what the seller actually keeps
 * (`%price_no_commission%`), so the buyer-facing average is stripped of the commission here.
 */
export const getMarketplacePriceWithoutCommission = (price: number, commissionPercent: number): number =>
    Math.max(0, price - getMarketplaceCommission(price, commissionPercent));

/**
 * Pure decision behind "copy suggested price": the input only takes the value when the server
 * actually suggested one, otherwise the seller keeps what they typed.
 */
export const resolveCopiedSuggestedPrice = (suggestedPrice: number, currentPrice: number): number => (suggestedPrice > 0 ? suggestedPrice : currentPrice);
