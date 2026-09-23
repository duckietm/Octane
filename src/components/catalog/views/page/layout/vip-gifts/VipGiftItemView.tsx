import { CatalogPageMessageOfferData } from '@octane/renderer';
import { FC, useCallback } from 'react';
import { LocalizeText, ProductImageUtility } from '../../../../../../api';
import { Button, LayoutGridItem, LayoutImage, Text } from '../../../../../../common';

export interface VipGiftItemViewProps {
    offer: CatalogPageMessageOfferData;
    isAvailable: boolean;
    isVip?: boolean;
    requirementText?: string;
    onSelect(localizationId: string): void;
}

export const VipGiftItem: FC<VipGiftItemViewProps> = (props) => {
    const { offer = null, isAvailable = false, isVip = false, requirementText = '', onSelect = null } = props;

    const getImageUrlForOffer = useCallback(() => {
        if (!offer || !offer.products.length) return '';

        const productData = offer.products[0];

        return ProductImageUtility.getProductImageUrl(productData.productType, productData.furniClassId, productData.extraParam);
    }, [offer]);

    const getItemTitle = useCallback(() => {
        if (!offer || !offer.products.length) return '';

        const productData = offer.products[0];

        const localizationKey =
            ProductImageUtility.getProductCategory(productData.productType, productData.furniClassId) === 2
                ? 'wallItem.name.' + productData.furniClassId
                : 'roomItem.name.' + productData.furniClassId;

        return LocalizeText(localizationKey);
    }, [offer]);

    const getItemDesc = useCallback(() => {
        if (!offer || !offer.products.length) return '';

        const productData = offer.products[0];

        const localizationKey =
            ProductImageUtility.getProductCategory(productData.productType, productData.furniClassId) === 2
                ? 'wallItem.desc.' + productData.furniClassId
                : 'roomItem.desc.' + productData.furniClassId;

        return LocalizeText(localizationKey);
    }, [offer]);

    const description = getItemDesc();

    return (
        <LayoutGridItem alignItems="center" center={false} className="octane-catalog-club-gift p-1" column={false} gap={2}>
            <LayoutImage imageUrl={getImageUrlForOffer()} />
            <div className="flex min-w-0 grow flex-col gap-0.5">
                <div className="flex items-center gap-1">
                    {isVip && <span aria-hidden="true" className="octane-club-compact-mark is-vip relative! top-0! left-0! shrink-0" />}
                    <Text truncate fontWeight="bold">
                        {getItemTitle()}
                    </Text>
                </div>
                {!!requirementText && <Text small>{requirementText}</Text>}
                {!!description && (
                    <Text small variant="gray">
                        {description}
                    </Text>
                )}
            </div>
            <Button
                aria-disabled={!isAvailable}
                disabled={!isAvailable}
                role="button"
                variant="secondary"
                onClick={() => {
                    if (!isAvailable) return;

                    onSelect(offer.localizationId);
                }}
            >
                {LocalizeText('catalog.club_gift.select')}
            </Button>
        </LayoutGridItem>
    );
};
