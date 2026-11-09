import { GetSessionDataManager } from '@octane/renderer';
import { localizeWithFallback } from '../utils/localizeWithFallback';
import { getMarketplaceOfferRevenue } from './MarketplacePostOffer';

/**
 * AIR's Collectibles marketplace (build of 4 November 2026): nft_* furni offered one at a time and sold for emeralds,
 * next to the furni marketplace. Off unless the server's marketplace configuration says so (nftEnabled).
 */

/** AIR's "Type" menu of the search (`offer_source_dropmenu`): every offer, collectibles only, furni only. */
export const MarketplaceOfferSource = {
    ALL: 0,
    COLLECTIBLES: 1,
    FURNI: 2
} as const;

export const MARKETPLACE_OFFER_SOURCES: number[] = [MarketplaceOfferSource.ALL, MarketplaceOfferSource.COLLECTIBLES, MarketplaceOfferSource.FURNI];

/** A collectible is a furni whose class name starts with this, as in AIR (`GroupItem.isNft`). */
export const MARKETPLACE_COLLECTIBLE_PREFIX = 'nft_';

/** The buy results AIR handles; any other one shows "purchase failed". */
export const NFT_BUY_RESULT_SUCCESS = 'SUCCESS';
export const NFT_BUY_RESULT_NOT_ENOUGH_EMERALDS = 'NOT_ENOUGH_EMERALDS';
/** Polaris: the only open offer of the product is the buyer's own (AIR shows any other result as a failure). */
export const NFT_BUY_RESULT_OWN_OFFER = 'OWN_OFFER';

/** The texts AIR ships in its default localizations for the Collectibles marketplace, used when the hotel lacks them. */
const FALLBACKS: Record<string, string> = {
    'catalog.marketplace.offer_source': 'Type',
    'catalog.marketplace.offer_source.0': 'All',
    'catalog.marketplace.offer_source.1': 'Collectibles',
    'catalog.marketplace.offer_source.2': 'Furni',
    'shop.marketplace.invalid.price.emeralds': 'You can make offers between %minPrice% and %maxPrice% Emeralds.',
    'inventory.marketplace.confirm_offer.info.emeralds': 'You are selling %furniname%. If someone buys this offer, you will receive: %price% Emerald(s).',
    'inventory.marketplace.currency.emeralds': 'Emeralds',
    'catalog.marketplace.offer.credits': 'Credits',
    'catalog.marketplace.offer.emeralds': 'Emeralds',
    'catalog.marketplace.offer.price_public_item.currency': 'Price: %price% %currency% (Average: %average%)',
    'catalog.marketplace.offer_details.price.emeralds': 'Cheapest price: %price% Emeralds',
    'catalog.marketplace.offer_details.average_price.emeralds': 'Average price in last %days% days: %average% Emeralds',
    'catalog.marketplace.confirm_price.emeralds': 'Price: %price% Emeralds',
    'catalog.alert.notenough.emeralds.title': 'Not enough Emeralds',
    'catalog.alert.notenough.emeralds.description': 'You do not have enough Emeralds to purchase this Collectible.',
    'catalog.marketplace.nft_purchase_failed': 'Unable to buy the Collectible. Please try again.',
    'catalog.marketplace.nft_own_offer': 'This is your own offer. You cannot buy your own Collectible.',
    'catalog.marketplace.operation_failed.topic': 'Operation failed'
};

/** A Collectibles marketplace text, with AIR's English default when the hotel's texts lack the key. */
export const collectiblesMarketplaceText = (key: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(key, FALLBACKS[key] ?? key, parameters, replacements);

/** The furni's class name from the furnidata, or '' when it is unknown. */
export const getMarketplaceFurniClassName = (isWallItem: boolean, type: number): string => {
    const session = GetSessionDataManager();
    const data = isWallItem ? session?.getWallItemData?.(type) : session?.getFloorItemData?.(type);

    return data?.className ?? '';
};

/** A collectible: an nft_* furni. */
export const isMarketplaceCollectibleClass = (className: string): boolean => !!className && className.startsWith(MARKETPLACE_COLLECTIBLE_PREFIX);

/** An inventory furni the Collectibles marketplace sells. */
export const isMarketplaceCollectibleItem = (item: { isWallItem: boolean; type: number }): boolean =>
    !!item && isMarketplaceCollectibleClass(getMarketplaceFurniClassName(item.isWallItem, item.type));

/** The part of the configuration the Collectibles marketplace reads. */
export interface ICollectiblesMarketplaceSettings {
    nftEnabled: boolean;
    nftMinimumPrice: number;
    nftMaximumPrice: number;
    nftOfferMinutes: number;
    nftSellingFeePercentage: number;
    nftHalfTaxLimit: number;
}

/** The Collectibles marketplace is on (the server sends nftEnabled in the marketplace configuration). */
export const isCollectiblesMarketplaceEnabled = (configuration: Partial<ICollectiblesMarketplaceSettings>): boolean => !!configuration?.nftEnabled;

/** What the seller receives for a collectible at this price: AIR's calculateFinalPrice with the collectibles fee. */
export const getCollectibleOfferRevenue = (price: number, configuration: ICollectiblesMarketplaceSettings): number =>
    getMarketplaceOfferRevenue(price, configuration?.nftSellingFeePercentage ?? 0, configuration?.nftHalfTaxLimit ?? 0);

/** AIR MarketplaceModel.expirationDays for a collectible: the offer time in days. */
export const getCollectibleOfferDays = (configuration: ICollectiblesMarketplaceSettings): number => (configuration?.nftOfferMinutes ?? 0) / 1440;
