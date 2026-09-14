import { GetAvatarRenderManager, GetSessionDataManager, Vector3d } from '@octane/renderer';
import { FC, useEffect } from 'react';
import { FurniCategory, GetProductIconUrl, Offer, ProductTypeEnum } from '../../../../../api';
import { AutoGrid, Column, LayoutGridItem, LayoutHabbiconImageView, LayoutRoomPreviewerView } from '../../../../../common';
import { useCatalogData, useCatalogUiState } from '../../../../../hooks';

const PREVIEW_LIFT = 21;

const NEUTRAL_FLOOR = 'default';
const NEUTRAL_WALL = 'default';
const NEUTRAL_LANDSCAPE = 'default';

export const CatalogViewProductWidgetView: FC<{ height?: number }> = (props) => {
    const { height = 240 } = props;
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const { purchaseOptions = null } = useCatalogUiState();
    const { previewStuffData = null } = purchaseOptions;

    useEffect(() => {
        if (!currentOffer || currentOffer.pricingModel === Offer.PRICING_MODEL_BUNDLE || !roomPreviewer) return;

        const product = currentOffer.product;

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

                        roomPreviewer.updateObjectRoom(NEUTRAL_FLOOR, NEUTRAL_WALL, NEUTRAL_LANDSCAPE);
                        roomPreviewer.addAvatarIntoRoom(figureString || sessionDataManager.figure, 0);
                        roomPreviewer.zoomIn();
                    } else {
                        roomPreviewer.reset(true);
                        roomPreviewer.updateObjectRoom(NEUTRAL_FLOOR, NEUTRAL_WALL, NEUTRAL_LANDSCAPE);
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
                            roomPreviewer.updateObjectRoom(product.extraParam, NEUTRAL_WALL, NEUTRAL_LANDSCAPE);
                            return;
                        case FurniCategory.WALL_PAPER:
                            roomPreviewer.reset(true);
                            roomPreviewer.updateObjectRoom(NEUTRAL_FLOOR, product.extraParam, NEUTRAL_LANDSCAPE);
                            return;
                        case FurniCategory.LANDSCAPE: {
                            roomPreviewer.updateObjectRoom(NEUTRAL_FLOOR, NEUTRAL_WALL, product.extraParam);

                            const furniData = GetSessionDataManager().getWallItemDataByName('window_double_default');

                            if (furniData) roomPreviewer.addWallItemIntoRoom(furniData.id, new Vector3d(90), furniData.customParams);
                            else roomPreviewer.reset(false);
                            return;
                        }
                        default:
                            roomPreviewer.updateObjectRoom(NEUTRAL_FLOOR, NEUTRAL_WALL, NEUTRAL_LANDSCAPE);
                            roomPreviewer.addWallItemIntoRoom(product.productClassId, new Vector3d(90), product.extraParam);
                            animateFurnitureState = true;
                            return;
                    }
                }
                case ProductTypeEnum.ROBOT:
                    roomPreviewer.updateObjectRoom(NEUTRAL_FLOOR, NEUTRAL_WALL, NEUTRAL_LANDSCAPE);
                    roomPreviewer.addAvatarIntoRoom(product.extraParam, 0);
                    roomPreviewer.zoomIn();
                    return;
                case ProductTypeEnum.EFFECT:
                    roomPreviewer.updateObjectRoom(NEUTRAL_FLOOR, NEUTRAL_WALL, NEUTRAL_LANDSCAPE);
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
                                    {product.productType === ProductTypeEnum.HABBICON ? (
                                        <LayoutHabbiconImageView id={product.productClassId} />
                                    ) : (
                                        iconUrl && <img alt="" className="octane-catalog-grid-offer-icon" draggable={false} src={iconUrl} />
                                    )}
                                </LayoutGridItem>
                            );
                        })}
                </AutoGrid>
            </Column>
        );
    }

    if (currentOffer.product?.productType === ProductTypeEnum.HABBICON)
        return (
            <Column center style={{ height }}>
                <LayoutHabbiconImageView id={currentOffer.product.productClassId} size={80} />
            </Column>
        );

    return <LayoutRoomPreviewerView height={height} roomPreviewer={roomPreviewer} />;
};
