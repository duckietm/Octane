import { FC, useEffect } from 'react';
import { LayoutRoomPreviewerView } from '../../../../../common';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { useCatalogData } from '../../../../../hooks';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogProductDetailsView } from '../widgets/CatalogProductDetailsView';
import { CatalogPurchaseSelectionPrompt } from '../widgets/CatalogPurchaseSelectionPrompt';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { buildPetCustomizationPreviewFigure, PET_CUSTOMIZATION_DEFAULT_FIGURE } from './petCustomization.helpers';

export const CatalogLayoutPetCustomizationView: FC<CatalogLayoutProps> = ({ page }) => {
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const selectedOffer = currentOffer && page.offers.includes(currentOffer) ? currentOffer : null;

    useEffect(() => {
        if (!roomPreviewer) return;

        const furnitureData = selectedOffer?.product?.furnitureData;
        const figure = furnitureData ? buildPetCustomizationPreviewFigure(furnitureData) : PET_CUSTOMIZATION_DEFAULT_FIGURE;

        roomPreviewer.reset(false);
        roomPreviewer.updateRoomWallsAndFloorVisibility(false, false);

        if (figure) roomPreviewer.addPetIntoRoom(figure);
    }, [roomPreviewer, selectedOffer]);

    return (
        <NativeTextTree>
            <div className="octane-catalog-pet-customization-layout">
                <div className="octane-catalog-pet-customization-preview">
                    <LayoutRoomPreviewerView height={240} roomPreviewer={roomPreviewer} />
                    {selectedOffer && (
                        <>
                            <div className="octane-catalog-pet-customization-copy">
                                <CatalogProductDetailsView offer={selectedOffer} />
                            </div>
                            <div className="octane-catalog-pet-customization-price">
                                <CatalogTotalPriceWidget />
                            </div>
                        </>
                    )}
                </div>
                <div className="octane-catalog-pet-customization-grid">
                    <CatalogItemGridWidgetView columnCount={6} columnMinHeight={74} columnMinWidth={53} />
                </div>
                <div className="octane-catalog-pet-customization-purchase">{selectedOffer ? <CatalogPurchaseWidgetView /> : <CatalogPurchaseSelectionPrompt />}</div>
            </div>
        </NativeTextTree>
    );
};
