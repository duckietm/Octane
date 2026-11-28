import { FC, memo } from 'react';
import { CatalogType, GetConfigurationValue, GetProductIconUrl, IPurchasableOffer, Offer, ProductTypeEnum } from '../../../../../api';
import { LayoutAvatarImageView, LayoutChatStyleImageView, LayoutHabbiconImageView } from '../../../../../common';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

export interface HandheldCatalogOfferTileViewProps {
    offer: IPurchasableOffer;
    index: number;
    isActive: boolean;
    currentType: string;
    showPrices: boolean;
    onSelect: (offer: IPurchasableOffer) => void;
}

const currencyIconUrl = (type: number) => (GetConfigurationValue<string>('currency.asset.icon.url', '') || '').replace('%type%', type.toString());

/**
 * Phone catalogue: one tile of the item grid, drawn in the Octane handheld look: the item's icon over its price
 * (credits, an activity currency, or both), with marks for a limited edition, a club offer and a pack of several. A
 * tap chooses the offer; the bottom panel then shows it while the grid stays where it is.
 */
const HandheldCatalogOfferTile: FC<HandheldCatalogOfferTileViewProps> = ({ offer, index, isActive, currentType, showPrices, onSelect }) => {
    const product = offer?.product;

    if (!product) return null;

    const iconUrl = offer.pricingModel === Offer.PRICING_MODEL_BUNDLE ? null : GetProductIconUrl(product, offer);
    const prices: { amount: number; type: number }[] = [];

    if (offer.priceInCredits > 0) prices.push({ amount: offer.priceInCredits, type: -1 });
    if (offer.priceInActivityPoints > 0) prices.push({ amount: offer.priceInActivityPoints, type: offer.activityPointType });

    const isLimited = !!product.uniqueLimitedItemSeriesSize;
    const isSoldOut = isLimited && !product.uniqueLimitedItemsLeft;
    const packSize = offer.pricingModel === Offer.PRICING_MODEL_MULTI ? product.productCount : 1;
    const withPrices = showPrices && currentType !== CatalogType.BUILDER;

    return (
        <NativeTextTree>
            <BaseButton
                aria-label={offer.localizationName || product.furnitureData?.name || ''}
                aria-selected={isActive}
                className={`octane-handheld-shop__tile${isActive ? ' is-active' : ''}${isSoldOut ? ' is-sold-out' : ''}${withPrices ? '' : ' is-plain'}`}
                data-offer-index={index}
                role="option"
                onClick={() => onSelect(offer)}
            >
                <span className="octane-handheld-shop__tile-art">
                    {iconUrl && product.productType !== ProductTypeEnum.HABBICON && product.productType !== ProductTypeEnum.ROBOT && (
                        <img
                            alt=""
                            draggable={false}
                            loading="lazy"
                            src={iconUrl}
                            onError={(event) => {
                                const fallback = typeof product.getIconUrl === 'function' ? product.getIconUrl(offer) : null;

                                if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
                            }}
                        />
                    )}
                    {product.productType === ProductTypeEnum.HABBICON && <LayoutHabbiconImageView id={product.productClassId} />}
                    {product.productType === ProductTypeEnum.ROBOT && <LayoutAvatarImageView direction={2} figure={product.extraParam} fit />}
                    {product.productType === ProductTypeEnum.CHAT_STYLE && <LayoutChatStyleImageView styleId={product.extraParam} />}
                </span>
                {isLimited && <span className="octane-handheld-shop__tile-mark is-limited">LTD</span>}
                {offer.clubLevel > 0 && (
                    <span aria-label="Habbo Club" className="octane-handheld-shop__tile-mark is-club" role="img">
                        <i aria-hidden="true" className="octane-icon icon-catalogue-hc_small" />
                    </span>
                )}
                {packSize > 1 && <span className="octane-handheld-shop__tile-mark is-pack">{`x${packSize}`}</span>}
                {withPrices && (
                    <span className="octane-handheld-shop__tile-price">
                        {prices.map((price, priceIndex) => (
                            <span key={`${price.type}-${priceIndex}`} className="octane-handheld-shop__tile-price-entry">
                                <span className="octane-handheld-shop__tile-price-amount">{price.amount}</span>
                                {!!currencyIconUrl(price.type) && <img alt="" draggable={false} src={currencyIconUrl(price.type)} />}
                            </span>
                        ))}
                    </span>
                )}
            </BaseButton>
        </NativeTextTree>
    );
};

export const HandheldCatalogOfferTileView = memo(HandheldCatalogOfferTile);
