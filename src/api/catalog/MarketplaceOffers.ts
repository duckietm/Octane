import { GetSessionDataManager } from '@octane/renderer';
import { LocalizeText } from '../utils/LocalizeText';
import { isMarketplaceWallOffer, MarketplaceOfferData } from './MarketplaceOfferData';
import { MarketPlaceOfferState } from './MarketplaceOfferState';
import { getFurnidataText, getMarketplaceFurniTextKeys, pickMarketplaceFurniText } from './MarketplacePostOffer';
import { MarketplaceSearchType } from './MarketplaceSearchType';

/**
 * Pure rules of AIR's marketplace catalog pages (com.sulake.habbo.catalog.marketplace.MarketPlaceLogic,
 * catalog.viewer.widgets.MarketPlaceCatalogWidget / MarketPlaceOwnItemsCatalogWidget).
 */

/** AIR MarketPlaceCatalogWidget.selectSearchCategory: the sort types each search tab offers, in drop menu order. */
export const MARKETPLACE_SORT_TYPES: Record<number, number[]> = {
    [MarketplaceSearchType.BY_ACTIVITY]: [3, 4, 5, 6],
    [MarketplaceSearchType.BY_VALUE]: [1, 2],
    [MarketplaceSearchType.ADVANCED]: [1, 2, 3, 4, 5, 6]
};

/** AIR MarketPlaceCatalogWidget.MAX_SEARCH_STRING_LENGTH / MAX_PRICE_STRING_LENGTH. */
export const MARKETPLACE_MAX_SEARCH_LENGTH = 40;
export const MARKETPLACE_MAX_PRICE_LENGTH = 10;

/** AIR usable_used / usable_unused text colours (0xFFCC0000 / 0xFF1D4A39). */
export const MARKETPLACE_USED_TEXT_COLOR = '#cc0000';
export const MARKETPLACE_UNUSED_TEXT_COLOR = '#1d4a39';

/** AIR doSearch: an empty price input is "no limit" (-1). */
export const parseMarketplacePriceInput = (text: string): number => {
    const digits = (text ?? '').replace(/[^0-9]/g, '');

    if (!digits.length) return -1;

    const value = Number.parseInt(digits, 10);

    return Number.isNaN(value) ? -1 : value;
};

/** The localizer the status texts are built with: AIR's `getLocalization`, tests pass their own. */
export type MarketplaceLocalize = (key: string) => string;

/**
 * AIR MarketPlaceCatalogWidget.updateStatusDisplay(STATUS_LIST_AVAILABLE, shown, total): "%count% found",
 * plus ". first %count% shown." when the server sent fewer rows than it found, or no_items.
 */
export const getMarketplaceListStatusText = (localize: MarketplaceLocalize, shown: number, total: number): string => {
    if (total <= 0) return localize('catalog.marketplace.no_items');

    let text = localize('catalog.marketplace.items_found').replace('%count%', String(total));

    if (shown > 0 && shown < total) text = `${text}. ${localize('catalog.marketplace.items_shown')}.`.replace('%count%', String(shown));

    return text;
};

/** AIR updateList (own items): `max(1, minutes)` split into "<h> hours <m> minutes" inside offer.time_left. */
export const getMarketplaceTimeLeftText = (localize: MarketplaceLocalize, timeLeftMinutes: number): string => {
    const time = Math.max(1, timeLeftMinutes);
    const hours = Math.floor(time / 60);
    let text = `${time - hours * 60} ${localize('catalog.marketplace.offer.minutes')}`;

    if (hours > 0) text = `${hours} ${localize('catalog.marketplace.offer.hours')} ${text}`;

    return localize('catalog.marketplace.offer.time_left').replace('%time%', text);
};

/** AIR MarketPlaceOwnItemsCatalogWidget categories (the offer_category_dropmenu), in drop menu order. */
export const MARKETPLACE_OWN_CATEGORIES = [MarketPlaceOfferState.ONGOING, MarketPlaceOfferState.SOLD, MarketPlaceOfferState.EXPIRED] as const;

export const MARKETPLACE_OWN_CATEGORY_KEYS: Record<number, [string, string]> = {
    [MarketPlaceOfferState.ONGOING]: ['shop.marketplace.own.offers.category.open', 'OPEN'],
    [MarketPlaceOfferState.SOLD]: ['shop.marketplace.own.offers.category.sold', 'SOLD'],
    [MarketPlaceOfferState.EXPIRED]: ['shop.marketplace.own.offers.category.expired', 'EXPIRED']
};

/** AIR normalizeSearchText. */
export const normalizeMarketplaceSearchText = (text: string): string => (text ?? '').toLowerCase();

/**
 * AIR applySearchFilter of the own items page: the offers of the selected category whose name and
 * description contain the search text (already normalized); an empty search keeps them all.
 */
export const filterMarketplaceOwnOffers = <T extends { status: number }>(
    offers: readonly T[],
    category: number,
    search: string,
    getText: (offer: T) => string
): T[] => offers.filter((offer) => offer.status === category && (!search || normalizeMarketplaceSearchText(getText(offer)).indexOf(search) >= 0));

/** AIR updateBottomActionButtons: "recall all" on the open tab, "mark as seen" on the sold / expired tabs. */
export const getMarketplaceOwnBottomButton = (category: number): 'recall' | 'seen' => (category === MarketPlaceOfferState.ONGOING ? 'recall' : 'seen');

/** AIR MarketPlaceLogic.isPosterItem: a wall item with extra data whose product is the "poster" class. */
export const isMarketplacePosterOffer = (offer: Pick<MarketplaceOfferData, 'furniType' | 'furniId' | 'extraData'> & { nftFurniType?: number }): boolean => {
    if (!offer || offer.furniType !== MarketplaceOfferData.TYPE_WALL || !offer.extraData) return false;

    return GetSessionDataManager()?.getWallItemData?.(offer.furniId)?.className === 'poster';
};

/**
 * The name / description of an offer: AIR's localization key (MarketPlaceLogic.getNameLocalizationKey /
 * getDescriptionLocalizationKey), then the furnidata text (furni names are furnidata-driven here), then
 * the class name for the name. Never the raw `roomItem.name.<id>` key.
 */
export const getMarketplaceOfferText = (
    offer: Pick<MarketplaceOfferData, 'furniType' | 'furniId' | 'extraData'> & { nftFurniType?: number },
    field: 'name' | 'desc'
): string => {
    if (!offer) return '';

    // AIR: a collectible is named by its furni kind (nftFurniType), like a floor or wall furni.
    const isWall = isMarketplaceWallOffer(offer);
    const keys = getMarketplaceFurniTextKeys(isWall, offer.furniId, isMarketplacePosterOffer(offer) ? offer.extraData : null);
    const key = field === 'name' ? keys.name : keys.desc;
    const session = GetSessionDataManager();
    const furniData = isWall ? session?.getWallItemData?.(offer.furniId) : session?.getFloorItemData?.(offer.furniId);
    const furniText = getFurnidataText(furniData, isWall, session, field);

    return pickMarketplaceFurniText(LocalizeText(key), key, furniText);
};
