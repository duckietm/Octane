import { FC } from 'react';
import { LocalizeText, SanitizeHtml } from '../../../../../api';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { getCatalogGridMetrics, useCatalogData, useCatalogDisplayPreferences } from '../../../../../hooks';
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

/**
 * AIR layout_badge_display (360 x 460): the product view (0,0 360 x 240) with the limited plaque over it, the page's
 * item grid (0,245 95 x 175, the same itemGridWidget every page uses), the badge selector with its search field
 * (105,245 255 x 175) and the purchase row (0,430). The layout also keeps a "select badge" label at 190,401, under
 * the badge grid: it shows only where no badge tile covers it. Its "select product" label lies under the item grid's
 * frame and is never seen, so it is not drawn.
 */
export const CatalogLayoutBadgeDisplayView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const { density = 'standard', showTilePrices = true } = useCatalogDisplayPreferences();
    const gridMetrics = getCatalogGridMetrics(density);

    return (
        <NativeTextTree>
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
                        className={`octane-catalog-grid octane-catalog-grid-density-${density} octane-catalog-badge-offer-list`}
                        showPrices={showTilePrices}
                        {...gridMetrics}
                    />
                </section>

                <span className="octane-catalog-badge-select-label">{LocalizeText('catalog_selectbadge')}</span>

                <section className="octane-catalog-badge-picker">
                    <CatalogBadgeSelectorWidgetView />
                </section>

                <div className="octane-catalog-badge-purchase">{currentOffer && <CatalogPurchaseWidgetView />}</div>
            </div>
        </NativeTextTree>
    );
};
