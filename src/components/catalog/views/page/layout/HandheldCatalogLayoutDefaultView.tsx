import { FC, useState } from 'react';
import { localizeWithFallback, ProductTypeEnum, SanitizeHotelHtml } from '../../../../../api';
import { getCatalogBundlePrice } from '../../../../../api/catalog/CatalogBundleDiscount';
import { LayoutChatStyleImageView, LayoutCurrencyIcon } from '../../../../../common';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { ToggleButton } from '../../../../../common/ToggleButton';
import { useHandheldLayout } from '../../../../../hooks/handheld/useHandheldLayout';
import { useCatalogBundleDiscountRuleset, useCatalogData, useCatalogDisplayPreferences, useCatalogUiState } from '../../../../../hooks';
import { HandheldCatalogStripView } from '../../handheld/HandheldCatalogStripView';
import { CatalogAddOnBadgeWidgetView } from '../widgets/CatalogAddOnBadgeWidgetView';
import { CatalogAddOnChatStyleWidgetView } from '../widgets/CatalogAddOnChatStyleWidgetView';
import { CatalogLimitedItemWidgetView } from '../widgets/CatalogLimitedItemWidgetView';
import { CatalogPreviewControls } from '../widgets/CatalogPreviewControls';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogSpinnerWidgetView } from '../widgets/CatalogSpinnerWidgetView';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { HandheldCatalogGridView } from '../widgets/HandheldCatalogGridView';
import { CatalogLayoutProps } from './CatalogLayout.types';

/** The price of the chosen offer for the chosen quantity, with the bundle discount (the old price struck through). */
const HandheldCatalogPriceView: FC<{}> = () => {
    const { currentOffer = null } = useCatalogData();
    const { purchaseOptions = null } = useCatalogUiState();
    const { data: ruleset = null } = useCatalogBundleDiscountRuleset();
    const quantity = purchaseOptions?.quantity ?? 1;

    if (!currentOffer) return null;

    const entries = [
        { type: -1, unit: currentOffer.priceInCredits },
        { type: currentOffer.activityPointType, unit: currentOffer.priceInActivityPoints }
    ].filter((entry) => entry.unit > 0);

    return (
        <div className="octane-handheld-shop__price">
            {entries.map((entry) => {
                const price = getCatalogBundlePrice(entry.unit, quantity, currentOffer.bundlePurchaseAllowed, ruleset);

                return (
                    <span key={entry.type} className="octane-handheld-shop__price-entry" data-currency-type={entry.type}>
                        {price.hasDiscount && <s className="octane-handheld-shop__price-was">{price.originalPrice}</s>}
                        <span className="octane-handheld-shop__price-amount">{price.price}</span>
                        <LayoutCurrencyIcon type={entry.type} />
                    </span>
                );
            })}
        </div>
    );
};

/**
 * Phone catalogue: the default page. The item grid fills the page and scrolls; under it (beside it on a phone held
 * on its side) sits the product panel: a strip with "back" and the name of the chosen item, its preview with the
 * rotate / state buttons, and one row with the price, the quantity stepper, "buy as gift" and "buy". The grid ends
 * above the panel, so no row hides behind it. With nothing chosen the panel is the strip and the page's teaser.
 */
export const HandheldCatalogLayoutDefaultView: FC<CatalogLayoutProps> = ({ page = null }) => {
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const { showTilePrices = true } = useCatalogDisplayPreferences();
    const [folded, setPreviewFolded] = useState(false);
    // Only a phone held upright can fold the preview away; on its side the panel has a column of its own.
    const { orientation } = useHandheldLayout();
    const previewFolded = folded && orientation === 'portrait';
    const teaserText = page?.localization.getText(0) ?? '';
    const hasTeaserText = !!teaserText.replace(/<[^>]*>/g, '').trim();
    const productType = currentOffer?.product?.productType;
    const isBadge = productType === ProductTypeEnum.BADGE;
    const isChatStyle = productType === ProductTypeEnum.CHAT_STYLE;
    const description = currentOffer ? currentOffer.localizationDescription || currentOffer.product?.productData?.description || '' : '';

    return (
        <NativeTextTree>
            <div className={`octane-handheld-shop__layout${currentOffer ? ' has-offer' : ''}${previewFolded ? ' is-folded' : ''}`}>
                <HandheldCatalogGridView showPrices={showTilePrices} />
                <section aria-label={localizeWithFallback('octane.handheld.catalog.product', 'Chosen item')} className="octane-handheld-shop__product">
                    <HandheldCatalogStripView title={currentOffer?.localizationName || null}>
                        {currentOffer && (
                            <ToggleButton
                                aria-label={localizeWithFallback('octane.handheld.catalog.preview_fold', 'Hide the preview')}
                                className="octane-handheld-shop__fold"
                                pressed={previewFolded}
                                onPressedChange={setPreviewFolded}
                            >
                                <svg aria-hidden="true" viewBox="0 0 16 16">
                                    <path d="M3 6 L8 11 L13 6" />
                                </svg>
                            </ToggleButton>
                        )}
                    </HandheldCatalogStripView>
                    {!currentOffer && (hasTeaserText || !!page?.localization.getImage(1)) && (
                        <div className="octane-handheld-shop__teaser">
                            {!!page?.localization.getImage(1) && <img alt="" src={page.localization.getImage(1)} />}
                            {hasTeaserText && <p dangerouslySetInnerHTML={{ __html: SanitizeHotelHtml(teaserText) }} />}
                        </div>
                    )}
                    {currentOffer && !previewFolded && (
                        <div className={`octane-handheld-shop__preview${isBadge ? ' is-badge' : ''}${isChatStyle ? ' is-chat-style' : ''}`}>
                            {!isBadge && !isChatStyle && (
                                <>
                                    <CatalogViewProductWidgetView height={140} />
                                    <CatalogPreviewControls productType={productType} roomPreviewer={roomPreviewer} />
                                    <CatalogAddOnBadgeWidgetView className="octane-handheld-shop__addon" />
                                    <CatalogAddOnChatStyleWidgetView className="octane-handheld-shop__addon" />
                                </>
                            )}
                            {isBadge && <CatalogAddOnBadgeWidgetView className="octane-handheld-shop__badge" />}
                            {isChatStyle && (
                                <>
                                    <LayoutChatStyleImageView className="octane-catalog-chat-style-preview" styleId={currentOffer.product.extraParam} />
                                    <CatalogAddOnBadgeWidgetView className="octane-handheld-shop__addon" />
                                </>
                            )}
                            <div className="octane-handheld-shop__limited">
                                <CatalogLimitedItemWidgetView />
                            </div>
                        </div>
                    )}
                    {currentOffer && !previewFolded && !!description && <p className="octane-handheld-shop__description">{description}</p>}
                    {currentOffer && (
                        <div className="octane-handheld-shop__buy">
                            <HandheldCatalogPriceView />
                            <CatalogSpinnerWidgetView />
                            <div className="octane-handheld-shop__actions">
                                <CatalogPurchaseWidgetView />
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </NativeTextTree>
    );
};
