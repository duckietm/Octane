import { GetAvatarRenderManager, GetSessionDataManager, Vector3d } from '@octane/renderer';
import { FC, useEffect } from 'react';
import { FurniCategory, GetProductIconUrl, Offer, ProductTypeEnum } from '../../../../../api';
import { AutoGrid, Column, LayoutGridItem, LayoutRoomPreviewerView } from '../../../../../common';
import { useCatalogData, useCatalogUiState } from '../../../../../hooks';

/**
 * How much higher than dead centre anything in this box sits.
 *
 * The original lifts its zoomed avatar preview by 41 in
 * `ProductViewCatalogWidget.applyRoomCanvasZoom`, on a canvas that same step has already scaled
 * by two - half that in the engine's own pixels, which is what this offset is in. It gives
 * furniture no lift of its own, but our canvas is centred in a box shorter than itself where
 * the original's is top-aligned, so furniture came out sitting low in the same way. One number
 * for the whole box rather than a rule per product type.
 *
 * A unique limited item keeps the original's extra -15 on top.
 */
const PREVIEW_LIFT = 21;

export const CatalogViewProductWidgetView: FC<{ height?: number }> = (props) => {
    const { height = 240 } = props;
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const { purchaseOptions = null } = useCatalogUiState();
    const { previewStuffData = null } = purchaseOptions;

    useEffect(() => {
        if (!currentOffer || currentOffer.pricingModel === Offer.PRICING_MODEL_BUNDLE || !roomPreviewer) return;

        const product = currentOffer.product;

        // The previewer is shared with every other catalog layout, and this offset is a live
        // Point on it: whatever is left here is inherited by the next thing drawn in it.
        const clearViewOffset = () => {
            roomPreviewer.addViewOffset.y = 0;
        };

        if (!product) {
            clearViewOffset();
            return;
        }

        roomPreviewer.addViewOffset.y = -(PREVIEW_LIFT + (product.isUniqueLimitedItem ? 15 : 0));
        roomPreviewer.centerWallItems = true;
        roomPreviewer.setAutomaticStateChange(false);
        roomPreviewer.updateRoomWallsAndFloorVisibility(true, true);

        let animateFurnitureState = false;

        const populate = () => {
            switch (product.productType) {
                case ProductTypeEnum.FLOOR: {
                    if (!product.furnitureData) {
                        roomPreviewer.reset(false);
                        return;
                    }

                    const furniData = GetSessionDataManager().getFloorItemData(product.furnitureData.id);
                    const isPurchasableClothing = product.furnitureData.specialType === FurniCategory.FIGURE_PURCHASABLE_SET;

                    if (isPurchasableClothing) {
                        const sessionDataManager = GetSessionDataManager();
                        const avatarRenderManager = GetAvatarRenderManager();
                        const customParams = furniData?.customParams ?? product.furnitureData.customParams ?? '';
                        const customParts = customParams
                            .split(',')
                            .map((value) => value.trim())
                            .filter((value) => /^\d+$/.test(value))
                            .map(Number);
                        const figureSets: number[] = [];

                        for (const part of customParts) {
                            if (!Number.isSafeInteger(part) || part <= 0) continue;

                            if (avatarRenderManager.isValidFigureSetForGender(part, sessionDataManager.gender)) figureSets.push(part);
                        }

                        const figureString = avatarRenderManager.getFigureStringWithFigureIds(sessionDataManager.figure, sessionDataManager.gender, figureSets);

                        roomPreviewer.addAvatarIntoRoom(figureString || sessionDataManager.figure, 0);
                        roomPreviewer.zoomIn();
                    } else {
                        // RoomPreviewer only keys its fast path by class/extra,
                        // so force a transactional refresh when stuff data
                        // changes for the same product.
                        roomPreviewer.reset(true);
                        roomPreviewer.addFurnitureIntoRoom(product.productClassId, new Vector3d(90), previewStuffData, product.extraParam);
                        animateFurnitureState = true;
                    }
                    return;
                }
                case ProductTypeEnum.WALL: {
                    if (!product.furnitureData) {
                        roomPreviewer.reset(false);
                        return;
                    }

                    roomPreviewer.updateRoomWallsAndFloorVisibility(true, true);

                    switch (product.furnitureData.specialType) {
                        case FurniCategory.FLOOR:
                            roomPreviewer.reset(true);
                            roomPreviewer.updateObjectRoom(product.extraParam);
                            return;
                        case FurniCategory.WALL_PAPER:
                            roomPreviewer.reset(true);
                            roomPreviewer.updateObjectRoom(null, product.extraParam);
                            return;
                        case FurniCategory.LANDSCAPE: {
                            roomPreviewer.updateObjectRoom(null, null, product.extraParam);

                            const furniData = GetSessionDataManager().getWallItemDataByName('window_double_default');

                            if (furniData) roomPreviewer.addWallItemIntoRoom(furniData.id, new Vector3d(90), furniData.customParams);
                            else roomPreviewer.reset(false);
                            return;
                        }
                        default:
                            roomPreviewer.updateObjectRoom('101', '101', '1.1');
                            roomPreviewer.addWallItemIntoRoom(product.productClassId, new Vector3d(90), product.extraParam);
                            animateFurnitureState = true;
                            return;
                    }
                }
                case ProductTypeEnum.ROBOT:
                    roomPreviewer.addAvatarIntoRoom(product.extraParam, 0);
                    roomPreviewer.zoomIn();
                    return;
                case ProductTypeEnum.EFFECT:
                    roomPreviewer.addAvatarIntoRoom(GetSessionDataManager().figure, product.productClassId);
                    roomPreviewer.zoomIn();
                    return;
                default:
                    roomPreviewer.reset(false);
                    return;
            }
        };

        populate();
        roomPreviewer.setAutomaticStateChange(animateFurnitureState);

        return clearViewOffset;
    }, [currentOffer, previewStuffData, roomPreviewer]);

    if (!currentOffer) return null;

    if (currentOffer.pricingModel === Offer.PRICING_MODEL_BUNDLE) {
        return (
            <Column fit className="bg-muted p-2 rounded" overflow="hidden">
                <AutoGrid fullWidth className="octane-catalog-layout-bundle-grid" columnCount={4}>
                    {currentOffer.products.length > 0 &&
                        currentOffer.products.map((product, index) => {
                            const iconUrl = GetProductIconUrl(product, currentOffer);

                            return (
                                <LayoutGridItem key={index} itemCount={product.productCount}>
                                    {iconUrl && <img alt="" className="octane-catalog-grid-offer-icon" draggable={false} src={iconUrl} />}
                                </LayoutGridItem>
                            );
                        })}
                </AutoGrid>
            </Column>
        );
    }

    return <LayoutRoomPreviewerView height={height} roomPreviewer={roomPreviewer} />;
};
