/**
 * Pure rules of AIR's make-offer window (com.sulake.habbo.inventory.marketplace.MarketplaceView /
 * MarketplaceModel): price and amount parsing, the revenue formula, the price stat lines and the
 * confirmation text.
 */

/** The server takes at most this many items in one multi-offer packet (SellMultipleItemsEvent). */
export const MARKETPLACE_MAX_OFFER_AMOUNT = 100;

/** AIR MarketplaceView.showMakeOffer: `restrict = "0-9"` on both inputs. */
export const sanitizeMarketplaceDigits = (text: string): string => (text ?? '').replace(/[^0-9]/g, '');

export interface MarketplacePriceCheck {
    /** The price the window works with (NaN reads as 0, above the maximum it is the maximum). */
    price: number;
    /** The text AIR writes back into the price input; only differs from the typed text when clamped. */
    text: string;
    /** Post is enabled and the revenue shown when the price is at least the minimum. */
    valid: boolean;
}

/** AIR MarketplaceView.checkPrice: clamp to the maximum, then the minimum decides validity. */
export const checkMarketplaceOfferPrice = (text: string, minimumPrice: number, maximumPrice: number): MarketplacePriceCheck => {
    const digits = sanitizeMarketplaceDigits(text);
    let price = Number.parseInt(digits, 10);
    let nextText = digits;

    if (Number.isNaN(price)) price = 0;

    if (price > maximumPrice) {
        price = maximumPrice;
        nextText = String(maximumPrice);
    }

    return { price, text: nextText, valid: price >= minimumPrice };
};

/** AIR MarketplaceView.parseOfferAmount: anything below 1 or unreadable becomes 1, above the maximum the maximum. */
export const parseMarketplaceOfferAmount = (text: string, maximumAmount: number): number => {
    const amount = Number.parseInt(sanitizeMarketplaceDigits(text), 10);

    if (Number.isNaN(amount) || amount < 1) return 1;

    return Math.min(amount, Math.max(1, maximumAmount));
};

/**
 * AIR MarketplaceView's revenue: `price - ceil(round(1000 * price * (fee / 100 + 0.5 * price / halfTaxLimit)) / 1000)`,
 * with the selling fee percentage and half-tax limit from the configuration packet. A configuration
 * without AIR's fee fields (the Arcturus-family one this server sends) has no seller fee: the seller
 * receives the asking price and buyers pay the commission on top, so the revenue is the price.
 */
export const getMarketplaceOfferRevenue = (price: number, sellingFeePercentage = 0, halfTaxLimit = 0): number => {
    if (!(price > 0)) return 0;

    const progressive = halfTaxLimit > 0 ? (0.5 * price) / halfTaxLimit : 0;
    const fee = Math.ceil(Math.round(1000 * (price * (sellingFeePercentage / 100 + progressive))) / 1000);

    return price - fee;
};

/** AIR MarketplaceView.updatePriceStatLine: a stat line only shows for a price above zero. */
export const isMarketplacePriceStatVisible = (price: number): boolean => price > 0;

export interface MarketplaceConfirmText {
    key: string;
    parameters: string[];
    replacements: string[];
}

/**
 * AIR MarketplaceView.showConfirmation. One item: `price` is the revenue. Several: `price` is the
 * asking price per item and `total` the revenue of all of them.
 */
export const getMarketplaceConfirmText = (amount: number, furniName: string, askingPrice: number, revenue: number): MarketplaceConfirmText => {
    if (amount > 1) {
        return {
            key: 'inventory.marketplace.confirm_offer.info.multiple',
            parameters: ['amount', 'furniname', 'price', 'total'],
            replacements: [String(amount), furniName, String(askingPrice), String(revenue * amount)]
        };
    }

    return {
        key: 'inventory.marketplace.confirm_offer.info',
        parameters: ['furniname', 'price'],
        replacements: [furniName, String(revenue)]
    };
};

/** AIR showMakeOffer: posters read `poster_<id>_name`, every other furni `roomItem` / `wallItem.name.<type>`. */
export const getMarketplaceFurniTextKeys = (isWallItem: boolean, type: number, posterId: string | null): { name: string; desc: string } => {
    if (posterId) return { name: `poster_${posterId}_name`, desc: `poster_${posterId}_desc` };

    const prefix = isWallItem ? 'wallItem' : 'roomItem';

    return { name: `${prefix}.name.${type}`, desc: `${prefix}.desc.${type}` };
};

/**
 * The furni's display text: a resolved localization wins (posters only have those), then the
 * furnidata value (furni names are furnidata-driven here), then whatever is left (never the raw key).
 */
export const pickMarketplaceFurniText = (localized: string, key: string, furnidataValue: string, fallback = ''): string => {
    if (localized && localized !== key) return localized;
    if (furnidataValue) return furnidataValue;

    return fallback;
};

type FurniTextData = { name?: string; description?: string; className?: string } | null | undefined;
type FurniDataLookup = { getFloorItemDataByName?: (name: string) => FurniTextData; getWallItemDataByName?: (name: string) => FurniTextData } | null | undefined;

/**
 * Furnidata text for a furni. A colour variant (`bed_budget_one*1`) often has an empty name and
 * description of its own; it then takes its base furni's, and the name finally falls back to the
 * class name.
 */
export const getFurnidataText = (furniData: FurniTextData, isWallItem: boolean, lookup: FurniDataLookup, field: 'name' | 'desc'): string => {
    const own = field === 'name' ? furniData?.name : furniData?.description;

    if (own) return own;

    const className = furniData?.className ?? '';
    const star = className.indexOf('*');

    if (star > 0) {
        const baseName = className.substring(0, star);
        const base = isWallItem ? lookup?.getWallItemDataByName?.(baseName) : lookup?.getFloorItemDataByName?.(baseName);
        const baseText = field === 'name' ? base?.name : base?.description;

        if (baseText) return baseText;
        if (field === 'name') return baseName;
    }

    return field === 'name' ? className : '';
};
