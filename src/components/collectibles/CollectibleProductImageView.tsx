import { CollectibleProductData } from '@octane/renderer';
import { FC } from 'react';
import { ProductTypeEnum } from '../../api';
import { LayoutBadgeImageView, LayoutFurniIconImageView, LayoutFurniImageView, LayoutPetImageView } from '../../common';
import { CollectibleProductType } from '../../hooks/collectibles/collectibles.helpers';
import unknownIcon from '../../assets/images/collectibles/collectables_icon_curator_stamp_small.png';
import unknownImage from '../../assets/images/collectibles/image_frank_dont_know.png';

/**
 * `CollectibleProductPreviewer`: a collectible's picture. Furni and clothing furni show the furni, a
 * badge its badge, a pet its pet; anything else (effects, chat styles) the "don't know" image.
 */
export const CollectibleProductImageView: FC<{ product: CollectibleProductData; icon?: boolean }> = ({ product, icon = false }) => {
    if (!product) return <img alt="" className="octane-collectibles-unknown" draggable={false} src={icon ? unknownIcon : unknownImage} />;

    const classId = Number(product.itemTypeId);

    switch (product.productTypeId) {
        case CollectibleProductType.FLOOR:
        case CollectibleProductType.CLOTHING:
        case CollectibleProductType.WALL: {
            if (!Number.isFinite(classId)) break;

            const productType = product.productTypeId === CollectibleProductType.WALL ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR;

            return icon ? (
                <LayoutFurniIconImageView productClassId={classId} productType={productType} />
            ) : (
                <LayoutFurniImageView direction={2} productClassId={classId} productType={productType} />
            );
        }
        case CollectibleProductType.BADGE:
            return <LayoutBadgeImageView badgeCode={product.itemTypeId} scale={icon ? 1 : 2} />;
        case CollectibleProductType.PET:
            if (product.petFigure) return <LayoutPetImageView direction={2} figure={product.petFigure} headOnly={icon} />;
            break;
    }

    return <img alt="" className="octane-collectibles-unknown" draggable={false} src={icon ? unknownIcon : unknownImage} />;
};
