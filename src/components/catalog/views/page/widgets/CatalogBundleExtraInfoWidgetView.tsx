import { FC, useEffect, useState } from 'react';
import { CatalogType, GetConfigurationValue, LocalizeText, localizeWithFallback } from '../../../../../api';
import { LayoutCurrencyIcon } from '../../../../../common';
import { useCatalogBundleDiscountRuleset, useCatalogData, useCatalogUiState } from '../../../../../hooks';
import {
    BUNDLE_PROMO_DROP_DELAY_MS,
    getCatalogBundleDiscountValue,
    getNextCatalogBundleDiscountLevel,
    isCatalogBundleDiscountValueVisible
} from './catalogBundleExtraInfo.helpers';

/**
 * bundlePurchaseExtraInfoWidget (BundlePurchaseExtraInfoWidget.as, 360x155 over the product view):
 * the "Buy N, M free included!" promo bar (drops in after four seconds, click opens the bundles
 * info chalkboard), the Total / Save discount value box once a full bundle is selected, and the
 * chalkboard explaining the bundle rule. Everything resets when another offer is selected.
 */
export const CatalogBundleExtraInfoWidgetView: FC<{}> = () => {
    const { currentOffer = null } = useCatalogData();
    const { currentType = CatalogType.NORMAL, purchaseOptions = null } = useCatalogUiState();
    const { data: bundleDiscountRuleset = null } = useCatalogBundleDiscountRuleset();
    const [promoDropped, setPromoDropped] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    const quantity = Math.max(1, purchaseOptions?.quantity ?? 1);
    const offerId = currentOffer?.offerId ?? -1;

    useEffect(() => {
        // CWPPEIE_RESET: a new offer clears every item and restarts the promo drop timer.
        setPromoDropped(false);
        setInfoOpen(false);

        if (offerId < 0) return;

        const timeout = setTimeout(() => setPromoDropped(true), BUNDLE_PROMO_DROP_DELAY_MS);

        return () => clearTimeout(timeout);
    }, [offerId]);

    useEffect(() => {
        // Every spinner change removes the bundles info item (onSpinnerEvent -> removeBundleInfoItem).
        setInfoOpen(false);
    }, [quantity]);

    if (
        !currentOffer?.bundlePurchaseAllowed ||
        currentType === CatalogType.BUILDER ||
        !bundleDiscountRuleset ||
        !GetConfigurationValue<boolean>('catalog.multiple.purchase.enabled', true)
    )
        return null;

    const nextLevel = getNextCatalogBundleDiscountLevel(quantity, bundleDiscountRuleset);
    const showPromo = promoDropped && !!nextLevel;
    const showDiscountValue = isCatalogBundleDiscountValueVisible(quantity, bundleDiscountRuleset);
    const discountValue = showDiscountValue
        ? getCatalogBundleDiscountValue(currentOffer.priceInCredits, currentOffer.priceInActivityPoints, quantity, bundleDiscountRuleset)
        : null;

    const renderValueRow = (labelKey: string, labelFallback: string, field: 'total' | 'saved', rowClassName: string) => (
        <div className={`octane-catalog-bundle-value-row ${rowClassName}`}>
            <span className="octane-catalog-bundle-value-label">{localizeWithFallback(labelKey, labelFallback)}</span>
            {discountValue.credits && (
                <span className={`octane-catalog-bundle-value-amount ${field === 'total' ? 'is-struck' : ''}`}>
                    {discountValue.credits[field]}
                    <LayoutCurrencyIcon type={-1} />
                </span>
            )}
            {discountValue.activityPoints && (
                <span className={`octane-catalog-bundle-value-amount ${field === 'total' ? 'is-struck' : ''}`}>
                    {discountValue.activityPoints[field]}
                    <LayoutCurrencyIcon type={currentOffer.activityPointType} />
                </span>
            )}
        </div>
    );

    return (
        <div className="octane-catalog-bundle-extra-info" data-testid="catalog-bundle-extra-info">
            {showPromo && (
                <button
                    className="octane-catalog-bundle-promo"
                    data-testid="catalog-bundle-promo"
                    type="button"
                    onClick={() => setInfoOpen((prevValue) => !prevValue)}
                >
                    <span aria-hidden="true" className="octane-catalog-bundle-thumb" />
                    <span className="octane-catalog-bundle-promo-text">
                        {LocalizeText(
                            'catalog.bundlewidget.discount.promo',
                            ['quantity', 'discount'],
                            [nextLevel.quantity.toString(), nextLevel.freeItemCount.toString()]
                        )}
                    </span>
                </button>
            )}
            {showDiscountValue && (
                <div className="octane-catalog-bundle-value" data-testid="catalog-bundle-discount-value">
                    <span aria-hidden="true" className="octane-catalog-bundle-thumb has-splash" />
                    <div className="octane-catalog-bundle-value-rows">
                        {renderValueRow('catalog.bundlewidget.discount.total', 'Total', 'total', 'is-total')}
                        {renderValueRow('catalog.bundlewidget.discount.save', 'Save', 'saved', 'is-save')}
                    </div>
                </div>
            )}
            {infoOpen && (
                <button className="octane-catalog-bundle-info" data-testid="catalog-bundle-info" type="button" onClick={() => setInfoOpen(false)}>
                    <span className="octane-catalog-bundle-info-header">
                        {localizeWithFallback('catalog.bundlewidget.info.header', 'For every 5 items, you get 1 free')}
                    </span>
                    <span className="octane-catalog-bundle-info-formula">
                        <span className="octane-catalog-bundle-info-formula-items">
                            {bundleDiscountRuleset.bundleSize - bundleDiscountRuleset.bundleDiscountSize} + {bundleDiscountRuleset.bundleDiscountSize}
                        </span>
                        <span className="octane-catalog-bundle-info-free">{localizeWithFallback('catalog.bundlewidget.info.for.free', 'For free')}</span>
                    </span>
                    <span className="octane-catalog-bundle-info-equals">
                        = {bundleDiscountRuleset.bundleSize}
                        {localizeWithFallback('catalog.bundlewidget.info.equals.bundle', ', 1 BUNDLE')}
                    </span>
                    <span className="octane-catalog-bundle-info-footer">
                        {localizeWithFallback('catalog.bundlewidget.info.footer', 'More bundles , more items for free!')}
                    </span>
                </button>
            )}
        </div>
    );
};
