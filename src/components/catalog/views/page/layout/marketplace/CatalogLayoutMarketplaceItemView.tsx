import { FC, useState } from 'react';
import {
    GetImageIconUrlForProduct,
    getMarketplaceOfferText,
    getMarketplaceTimeLeftText,
    localizeWithFallback,
    MarketPlaceOfferState,
    MarketplaceOfferData,
    ProductTypeEnum
} from '../../../../../../api';
import { BaseButton, LayoutLimitedEditionStyledNumberView, LayoutRarityLevelView } from '../../../../../../common';
import { NativeTextTree } from '../../../../../../common/native-text/NativeTextTree';

export interface MarketplaceItemViewProps {
    offerData: MarketplaceOfferData;
    type?: number;
    /** Public row: buy_button. Own row: pick_button (cancel the offer). */
    onClick(offerData: MarketplaceOfferData): void;
    /** AIR more_button: opens the offer details panel (price history chart). */
    onMore?(offerData: MarketplaceOfferData): void;
}

export const OWN_OFFER = 1;
export const PUBLIC_OFFER = 2;

/** English fallbacks for the row texts, used only when the external texts lack the key. */
const FALLBACKS: Record<string, string> = {
    buy: 'Buy',
    'catalog.marketplace.view_more': 'Furni info',
    'catalog.marketplace.offer.pick': 'Cancel',
    'catalog.marketplace.offer.price_public_item': 'Price: %price% (Average: %average%)',
    'catalog.marketplace.offer.price_own_item': 'Price: %price% credits',
    'catalog.marketplace.offer_count': 'Offers: %count%',
    'catalog.marketplace.offer.sold': 'This furni has been sold!',
    'catalog.marketplace.offer.expired': 'This furni was not sold.',
    'catalog.marketplace.offer.time_left': 'Time left: %time%',
    'catalog.marketplace.offer.hours': 'hours',
    'catalog.marketplace.offer.minutes': 'minutes'
};

/** AIR `getLocalization(key)`, with the English fallback when the key is missing. */
export const marketplaceText = (key: string): string => localizeWithFallback(key, FALLBACKS[key] ?? key);

/** AIR `image_container`: 40x40, the unique label behind and the serial overlay on top for an LTD, the rarity overlay. */
export const MarketplaceOfferImageView: FC<{ offerData: MarketplaceOfferData }> = ({ offerData }) => {
    const [failed, setFailed] = useState(false);
    const isWall = offerData.furniType === MarketplaceOfferData.TYPE_WALL;
    const imageUrl = GetImageIconUrlForProduct(isWall ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR, offerData.furniId, offerData.extraData);
    const rarityLevel = offerData.stuffData?.rarityLevel ?? -1;

    return (
        <NativeTextTree>
            <div className="marketplace-row-image">
                {offerData.isUniqueLimitedItem && <span className="marketplace-row-unique-label" />}
                {imageUrl && !failed && <img alt="" draggable={false} src={imageUrl} onError={() => setFailed(true)} />}
                {offerData.isUniqueLimitedItem && (
                    <span className="marketplace-row-unique-number" data-testid="marketplace-row-unique">
                        <LayoutLimitedEditionStyledNumberView value={offerData.stuffData.uniqueNumber} />
                    </span>
                )}
                {rarityLevel >= 0 && <LayoutRarityLevelView className="marketplace-row-rarity" level={rarityLevel} />}
            </div>
        </NativeTextTree>
    );
};

const getOwnStateText = (offerData: MarketplaceOfferData): string => {
    switch (offerData.status) {
        case MarketPlaceOfferState.SOLD:
            return marketplaceText('catalog.marketplace.offer.sold');
        case MarketPlaceOfferState.EXPIRED:
            return marketplaceText('catalog.marketplace.offer.expired');
        default:
            return getMarketplaceTimeLeftText(marketplaceText, offerData.timeLeftMinutes);
    }
};

const OWN_ROW_CLASS: Record<number, string> = {
    [MarketPlaceOfferState.ONGOING]: 'is-ongoing',
    [MarketPlaceOfferState.SOLD]: 'is-sold',
    [MarketPlaceOfferState.EXPIRED]: 'is-expired'
};

/**
 * AIR offer rows (habbo-catalog-com): `offer_item` of layout_marketplace for the public list and
 * `ongoing_item` / `sold_item` / `expired_item` of layout_marketplace_own_items, all 340x58.
 */
export const CatalogLayoutMarketplaceItemView: FC<MarketplaceItemViewProps> = (props) => {
    const { offerData = null, type = PUBLIC_OFFER, onClick = null, onMore = null } = props;

    if (!offerData) return null;

    const name = getMarketplaceOfferText(offerData, 'name');

    if (type === OWN_OFFER) {
        const status = offerData.status;

        return (
            <NativeTextTree>
                <div className={`octane-marketplace-row is-own ${OWN_ROW_CLASS[status] ?? 'is-ongoing'}`} data-testid="marketplace-own-row">
                    <MarketplaceOfferImageView offerData={offerData} />
                    <span className="marketplace-row-name">{name}</span>
                    <span className="marketplace-row-desc">{getMarketplaceOfferText(offerData, 'desc')}</span>
                    {status !== MarketPlaceOfferState.EXPIRED && (
                        <span className="marketplace-row-price">
                            {marketplaceText('catalog.marketplace.offer.price_own_item').replace('%price%', String(offerData.price))}
                        </span>
                    )}
                    <span className="marketplace-row-state">{getOwnStateText(offerData)}</span>
                    {status === MarketPlaceOfferState.ONGOING && (
                        <BaseButton className="octane-marketplace-button marketplace-row-pick" onClick={() => onClick?.(offerData)}>
                            {marketplaceText('catalog.marketplace.offer.pick')}
                        </BaseButton>
                    )}
                </div>
            </NativeTextTree>
        );
    }

    const average = offerData.averagePrice !== 0 ? String(offerData.averagePrice) : ' - ';

    return (
        <NativeTextTree>
            <div className="octane-marketplace-row is-public" data-testid="marketplace-public-row">
                <MarketplaceOfferImageView offerData={offerData} />
                <span className="marketplace-row-name">{name}</span>
                <span className="marketplace-row-price is-public">
                    {marketplaceText('catalog.marketplace.offer.price_public_item').replace('%price%', String(offerData.price)).replace('%average%', average)}
                </span>
                <span className="marketplace-row-count">
                    {marketplaceText('catalog.marketplace.offer_count').replace('%count%', String(offerData.offerCount))}
                </span>
                <BaseButton className="octane-marketplace-button marketplace-row-buy" onClick={() => onClick?.(offerData)}>
                    {marketplaceText('buy')}
                </BaseButton>
                <BaseButton className="octane-marketplace-button marketplace-row-more" disabled={!onMore} onClick={() => onMore?.(offerData)}>
                    {marketplaceText('catalog.marketplace.view_more')}
                </BaseButton>
            </div>
        </NativeTextTree>
    );
};
