import { FC } from 'react';
import { SanitizeHtml } from '../../../../../api';
import { useCatalogData } from '../../../../../hooks';
import { CatalogBadgeSelectorWidgetView } from '../widgets/CatalogBadgeSelectorWidgetView';
import { CatalogFirstProductSelectorWidgetView } from '../widgets/CatalogFirstProductSelectorWidgetView';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogLimitedItemWidgetView } from '../widgets/CatalogLimitedItemWidgetView';
import { CatalogPreviewControls } from '../widgets/CatalogPreviewControls';
import { CatalogProductDetailsView } from '../widgets/CatalogProductDetailsView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutBadgeDisplayView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();

    return (
        <div className="octane-catalog-badge-display-layout">
            <CatalogFirstProductSelectorWidgetView />
            <section className={`octane-catalog-badge-preview ${currentOffer ? '' : 'is-empty'}`.trim()}>
                {!currentOffer && (
                    <div className="octane-catalog-badge-intro">
                        {!!page.localization.getImage(1) && <img alt="" src={page.localization.getImage(1)} />}
                        <span dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(0)) }} />
                    </div>
                )}
                {currentOffer && (
                    <>
                        <div className="octane-catalog-badge-product-render">
                            <CatalogViewProductWidgetView height={240} />
                        </div>
                        <div className="octane-catalog-badge-product-copy octane-catalog-preview-details">
                            <CatalogProductDetailsView offer={currentOffer} />
                        </div>
                        <CatalogPreviewControls productType={currentOffer.product.productType} roomPreviewer={roomPreviewer} />
                        <div className="octane-catalog-badge-limited">
                            <CatalogLimitedItemWidgetView />
                        </div>
                        <div className="octane-catalog-badge-total-price octane-catalog-preview-price octane-catalog-price-frame">
                            <CatalogTotalPriceWidget alignItems="end" />
                        </div>
                    </>
                )}
            </section>

            <section className="octane-catalog-badge-product-picker">
                <CatalogItemGridWidgetView
                    className="octane-catalog-badge-offer-list"
                    columnCount={1}
                    columnMinHeight={70}
                    columnMinWidth={70}
                />
            </section>

            <section className="octane-catalog-badge-picker">
                <CatalogBadgeSelectorWidgetView />
            </section>

            <div className="octane-catalog-badge-purchase">{currentOffer && <CatalogPurchaseWidgetView />}</div>
        </div>
    );
};
