import { CatalogPageMessageOfferData, GetSessionDataManager } from '@octane/renderer';
import { FC } from 'react';
import { LocalizeText, ProductImageUtility } from '../../../../../../api';
import vipIcon from '../../../../../../assets/images/catalog/air/vip-icon-medium.png';
import { LayoutImage } from '../../../../../../common';
import { BaseButton } from '../../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../../common/native-text/NativeTextTree';
import { getClubGiftFurniText } from './clubGifts.helpers';

export interface VipGiftItemViewProps {
    offer: CatalogPageMessageOfferData;
    isAvailable: boolean;
    isVip?: boolean;
    requirementText?: string;
    onSelect(localizationId: string): void;
}

const getGiftFurniData = (offer: CatalogPageMessageOfferData) => {
    const product = offer?.products?.[0];

    if (!product) return null;

    const session = GetSessionDataManager();
    const isWall = ProductImageUtility.getProductCategory(product.productType, product.furniClassId) === 2;

    return isWall ? session?.getWallItemData?.(product.furniClassId) : session?.getFloorItemData?.(product.furniClassId);
};

/**
 * AIR club_gift_list_item_xml (320 x 58): the product image (52 x 46) with the VIP mark on its corner, the
 * furnidata name (bold) and description (small), the requirement line under them and the select button at the
 * bottom right. Name and description come from the product data, as AIR's ClubGiftWidget does.
 */
export const VipGiftItem: FC<VipGiftItemViewProps> = (props) => {
    const { offer = null, isAvailable = false, isVip = false, requirementText = '', onSelect = null } = props;
    const product = offer?.products?.[0];
    const imageUrl = product ? ProductImageUtility.getProductImageUrl(product.productType, product.furniClassId, product.extraParam) : '';
    const furniData = offer ? getGiftFurniData(offer) : null;
    const name = getClubGiftFurniText(furniData, 'name', (key) => LocalizeText(key));
    const description = getClubGiftFurniText(furniData, 'desc', (key) => LocalizeText(key));

    return (
        <NativeTextTree>
            <div className="octane-catalog-club-gift">
                <div className="octane-catalog-club-gift__image">
                    <LayoutImage imageUrl={imageUrl} />
                </div>
                {isVip && <img src={vipIcon} alt="" className="octane-catalog-club-gift__vip" />}
                <div className="octane-catalog-club-gift__name">{name}</div>
                <div className="octane-catalog-club-gift__desc">{description}</div>
                <div className="octane-catalog-club-gift__requirement">{requirementText}</div>
                <BaseButton
                    className="octane-catalog-club-gift__select"
                    aria-disabled={!isAvailable}
                    disabled={!isAvailable}
                    onClick={() => {
                        if (!isAvailable) return;

                        onSelect(offer.localizationId);
                    }}
                >
                    {LocalizeText('catalog.club_gift.select')}
                </BaseButton>
            </div>
        </NativeTextTree>
    );
};
