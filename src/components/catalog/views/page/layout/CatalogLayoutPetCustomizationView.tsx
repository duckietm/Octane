import { FC, useEffect } from 'react';
import { SanitizeHtml } from '../../../../../api';
import { LayoutRoomPreviewerView } from '../../../../../common';
import { useCatalogData } from '../../../../../hooks';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogProductDetailsView } from '../widgets/CatalogProductDetailsView';
import { CatalogPurchaseSelectionPrompt } from '../widgets/CatalogPurchaseSelectionPrompt';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { buildPetCustomizationPreviewFigure } from './petCustomization.helpers';

export const CatalogLayoutPetCustomizationView: FC<CatalogLayoutProps> = ({ page }) => {
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const selectedOffer = currentOffer && page.offers.includes(currentOffer) ? currentOffer : null;

    useEffect(() => {
        if (!selectedOffer?.product?.furnitureData || !roomPreviewer) return;

        const figure = buildPetCustomizationPreviewFigure(selectedOffer.product.furnitureData);

        roomPreviewer.reset(false);
        roomPreviewer.updateRoomWallsAndFloorVisibility(false, false);

        if (figure) roomPreviewer.addPetIntoRoom(figure);
    }, [roomPreviewer, selectedOffer]);

    return (
        <div className="octane-catalog-pet-customization-layout">
            <div className="octane-catalog-pet-customization-preview">
                {selectedOffer ? (
                    <>
                        <LayoutRoomPreviewerView height={240} roomPreviewer={roomPreviewer} />
                        <div className="octane-catalog-pet-customization-copy">
                            <CatalogProductDetailsView offer={selectedOffer} />
                        </div>
                        <div className="octane-catalog-pet-customization-price">
                            <CatalogTotalPriceWidget />
                        </div>
                    </>
                ) : (
                    <>
                        {!!page.localization.getImage(1) && <img alt="" src={page.localization.getImage(1)} />}
                        {!!page.localization.getText(0) && <div dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(0)) }} />}
                    </>
                )}
            </div>
            <div className="octane-catalog-pet-customization-grid">
                <CatalogItemGridWidgetView columnCount={6} columnMinHeight={74} columnMinWidth={53} />
            </div>
            <div className="octane-catalog-pet-customization-purchase">{selectedOffer ? <CatalogPurchaseWidgetView /> : <CatalogPurchaseSelectionPrompt />}</div>
        </div>
    );
};
