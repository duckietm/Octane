import { FC } from 'react';
import { CatalogType, GetConfigurationValue, LocalizeText, ProductTypeEnum, SanitizeHtml } from '../../../../../api';
import { Text } from '../../../../../common';
import { getCatalogGridMetrics, useCatalogData, useCatalogDisplayPreferences, useCatalogUiState } from '../../../../../hooks';
import { CatalogHeaderView } from '../../catalog-header/CatalogHeaderView';
import { CatalogAddOnBadgeWidgetView } from '../widgets/CatalogAddOnBadgeWidgetView';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogLimitedItemWidgetView } from '../widgets/CatalogLimitedItemWidgetView';
import { CatalogPreviewControls } from '../widgets/CatalogPreviewControls';
import { CatalogProductDetailsView } from '../widgets/CatalogProductDetailsView';
import { CatalogPurchaseSelectionPrompt } from '../widgets/CatalogPurchaseSelectionPrompt';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogSpinnerWidgetView } from '../widgets/CatalogSpinnerWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutDefaultView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null, currentPage = null, roomPreviewer = null } = useCatalogData();
    const { currentType = CatalogType.NORMAL } = useCatalogUiState();
    const { density = 'standard', showTilePrices = true } = useCatalogDisplayPreferences();
    const gridMetrics = getCatalogGridMetrics(density);

    const teaserText = page?.localization.getText(0) ?? '';
    const hasTeaserText = !!teaserText.replace(/<[^>]*>/g, '').trim();
    const showBundlePurchase =
        !!currentOffer?.bundlePurchaseAllowed &&
        currentType !== CatalogType.BUILDER &&
        GetConfigurationValue<boolean>('catalog.multiple.purchase.enabled', true);

    return (
        <div className="octane-catalog-default-layout flex flex-col h-full gap-2">
            <div className="octane-catalog-product-view">
                {currentOffer && (
                    <div className="octane-catalog-offer-panel flex gap-0">
                        <div
                            className={`octane-catalog-offer-preview relative flex items-center justify-center ${currentOffer.product.productType === ProductTypeEnum.BADGE ? 'is-badge' : ''}`}
                            style={{ flex: '1 1 auto', minWidth: 0, width: '100%' }}
                        >
                            <div className="octane-catalog-preview-details">
                                <CatalogProductDetailsView offer={currentOffer} />
                            </div>
                            <div className="octane-catalog-preview-limited">
                                <CatalogLimitedItemWidgetView />
                            </div>
                            {currentOffer.product.productType !== ProductTypeEnum.BADGE && (
                                <>
                                    <CatalogPreviewControls productType={currentOffer.product.productType} roomPreviewer={roomPreviewer} />
                                    <CatalogViewProductWidgetView height={348} />
                                    <CatalogAddOnBadgeWidgetView className="bg-muted rounded bottom-1 right-1 absolute" />
                                </>
                            )}
                            {currentOffer.product.productType === ProductTypeEnum.BADGE && <CatalogAddOnBadgeWidgetView className="scale-200" />}
                        </div>
                    </div>
                )}

                {!currentOffer && (
                    <div className={`octane-catalog-welcome flex items-center gap-3 ${hasTeaserText ? '' : 'justify-center is-image-only'}`}>
                        {!!page.localization.getImage(1) && (
                            <img alt="" className="w-[70px] h-[70px] object-contain rounded shrink-0" src={page.localization.getImage(1)} />
                        )}
                        {hasTeaserText && <Text className="text-[11px]! text-muted" dangerouslySetInnerHTML={{ __html: SanitizeHtml(teaserText) }} />}
                    </div>
                )}
            </div>

            <div className="octane-catalog-grid-shell flex-1 overflow-auto min-h-0">
                {GetConfigurationValue('catalog.headers') && <CatalogHeaderView imageUrl={currentPage.localization.getImage(0)} />}
                <CatalogItemGridWidgetView
                    className={`octane-catalog-grid octane-catalog-grid-density-${density}`}
                    showPrices={showTilePrices}
                    {...gridMetrics}
                />
            </div>

            {showBundlePurchase && (
                <div className="octane-catalog-price-row flex items-center justify-between gap-2">
                    <div className="octane-catalog-spinner-slot">
                        <CatalogSpinnerWidgetView />
                    </div>
                    <div className="octane-catalog-total-price-slot">
                        <span className="octane-catalog-total-price-label">{LocalizeText('catalog.bundlewidget.price')}</span>
                        <CatalogTotalPriceWidget classNames={['octane-catalog-total-price-value']} />
                    </div>
                </div>
            )}

            <div className="octane-catalog-purchase-row flex items-start justify-end">
                {currentOffer ? (
                    <div className="octane-catalog-offer-actions flex gap-1.5">
                        <CatalogPurchaseWidgetView />
                    </div>
                ) : (
                    <CatalogPurchaseSelectionPrompt />
                )}
            </div>
        </div>
    );
};
