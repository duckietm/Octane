import { FC } from 'react';
import { CatalogType, IPurchasableOffer, LocalizeText, ProductTypeEnum } from '../../../../../api';
import noRecycleIcon from '../../../../../assets/images/catalog/air/inventory-furni-no-recycle.png';
import noTradeIcon from '../../../../../assets/images/catalog/air/inventory-furni-no-trade.png';
import { useCatalogProductMetadata, useCatalogUiState } from '../../../../../hooks';

export const CatalogProductDetailsView: FC<{ offer: IPurchasableOffer }> = ({ offer }) => {
    const { currentType = 'NORMAL' } = useCatalogUiState();
    const metadata = useCatalogProductMetadata(offer?.page?.pageId ?? 0, currentType);

    if (!offer) return null;

    const product = offer.product;
    const name = offer.localizationName || product?.productData?.name || '';
    const description = offer.localizationDescription || product?.productData?.description || '';
    const isFurniture = product?.productType === ProductTypeEnum.FLOOR || product?.productType === ProductTypeEnum.WALL;
    const offerMetadata = metadata?.filter((entry) => entry.offerId === offer.offerId) ?? [];
    const productMetadata =
        offerMetadata.find((entry) => entry.itemBaseId === product?.furnitureData?.id) ??
        offerMetadata.find((entry) => entry.productClassId === product?.productClassId);
    const hasMetadata = currentType !== CatalogType.BUILDER && isFurniture && !!productMetadata;
    const tradeable = hasMetadata && productMetadata.tradeable;
    const recyclable = hasMetadata && productMetadata.recyclable;
    const showNoTrade = hasMetadata && !tradeable;
    const showNoRecycle = hasMetadata && (!recyclable || !tradeable);
    const tradeableLabel = LocalizeText('shop.marketplace.item.not.tradeable');
    const recyclableLabel = LocalizeText('recycler.alert.non.recyclable');

    return (
        <div aria-label={name} className="octane-catalog-product-details" role="group">
            <strong className="octane-catalog-product-details-name">{name}</strong>
            <span className="octane-catalog-product-details-description">{description}</span>
            {(showNoTrade || showNoRecycle) && (
                <div className="octane-catalog-product-details-badges" role="list">
                    {showNoTrade && (
                        <span
                            aria-label={tradeableLabel}
                            className="octane-catalog-product-capability is-no-trade"
                            data-capability="tradeable"
                            role="listitem"
                            title={tradeableLabel}
                        >
                            <img alt="" aria-hidden="true" src={noTradeIcon} />
                        </span>
                    )}
                    {showNoRecycle && (
                        <span
                            aria-label={recyclableLabel}
                            className="octane-catalog-product-capability is-no-recycle"
                            data-capability="recyclable"
                            role="listitem"
                            title={recyclableLabel}
                        >
                            <img alt="" aria-hidden="true" src={noRecycleIcon} />
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
