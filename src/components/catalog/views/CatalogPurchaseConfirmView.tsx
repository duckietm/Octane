import { FC, MutableRefObject, useState } from 'react';
import { GetConfigurationValue, IPurchasableOffer, LocalizeText, ProductTypeEnum } from '../../../api';
import { getCatalogBundlePrice, ICatalogBundleDiscountRuleset } from '../../../api/catalog/CatalogBundleDiscount';
import { LayoutCurrencyIcon, LayoutFurniImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { Checkbox } from '../../../common/Checkbox';
import { InlineDialog } from '../../../common/InlineDialog';
import { BaseButton } from '../../../common/BaseButton';

interface CatalogPurchaseConfirmViewProps {
    offer: IPurchasableOffer;
    quantity: number;
    bundleDiscountRuleset?: ICatalogBundleDiscountRuleset;
    isGift?: boolean;
    isSubmitting?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const CatalogPurchaseConfirmView: FC<CatalogPurchaseConfirmViewProps> = (props) => {
    const { offer = null, quantity = 1, bundleDiscountRuleset = null, isGift = false, isSubmitting = false, onConfirm = null, onCancel = null } = props;
    const spendingDisclaimerEnabled = GetConfigurationValue<boolean>('disclaimer.credit_spending.enabled', false) === true;
    const [spendingDisclaimerAccepted, setSpendingDisclaimerAccepted] = useState(!spendingDisclaimerEnabled);

    if (!offer) return null;

    const credits = getCatalogBundlePrice(offer.priceInCredits, quantity, offer.bundlePurchaseAllowed, bundleDiscountRuleset).price;
    const activityPoints = getCatalogBundlePrice(offer.priceInActivityPoints, quantity, offer.bundlePurchaseAllowed, bundleDiscountRuleset).price;
    const freeItemCount = offer.bundlePurchaseAllowed ? getCatalogBundlePrice(1, quantity, true, bundleDiscountRuleset).freeItemCount : 0;
    const hasCredits = credits > 0;
    const hasActivityPoints = activityPoints > 0;
    const title = LocalizeText(isGift ? 'catalog.purchase_confirmation.gift.title' : 'catalog.purchase_confirmation.title');
    const iconUrl = typeof offer.product?.getIconUrl === 'function' ? offer.product.getIconUrl(offer) : null;
    const isFurniture = offer.product?.productType === ProductTypeEnum.FLOOR || offer.product?.productType === ProductTypeEnum.WALL;
    const isLimited = !!offer.product?.isUniqueLimitedItem;
    const contentClassNames = [
        'octane-catalog-purchase-confirm-content',
        spendingDisclaimerEnabled ? 'has-disclaimer' : '',
        isLimited ? 'has-limited' : ''
    ].filter(Boolean);

    return (
        <InlineDialog
            aria-label={title}
            aria-modal="true"
            modal="trap-focus"
            render={({ ref, ...popupProps }) => (
                <OctaneCardView {...popupProps} innerRef={ref as MutableRefObject<HTMLDivElement>} classNames={['octane-catalog-purchase-confirm']} frameStyle={3} isResizable={false} theme="primary-slim" />
            )}
            onClose={onCancel}
        >
            <OctaneCardHeaderView headerText={title} onCloseClick={onCancel} />
            <OctaneCardContentView classNames={contentClassNames} overflow="hidden">
                <div className="octane-catalog-purchase-confirm-preview">
                    {isFurniture ? (
                        <LayoutFurniImageView
                            aria-label={offer.localizationName}
                            direction={90}
                            extraData={offer.product.extraParam}
                            productClassId={offer.product.productClassId}
                            productType={offer.product.productType}
                            role="img"
                            scale={0.5}
                        />
                    ) : (
                        !!iconUrl && <img alt={offer.localizationName} src={iconUrl} />
                    )}
                </div>
                <div className="octane-catalog-purchase-confirm-properties">
                    <strong className="octane-catalog-purchase-confirm-product">{offer.localizationName}</strong>
                    {quantity > 1 && <strong className="octane-catalog-purchase-confirm-quantity">X {quantity}</strong>}
                    {freeItemCount > 0 && (
                        <strong className="octane-catalog-purchase-confirm-free-quantity">
                            {LocalizeText('shop.bonus.items.count', ['amount'], [freeItemCount.toString()])}
                        </strong>
                    )}
                    <div className="octane-catalog-purchase-confirm-summary">
                        <span>{LocalizeText('catalog.purchase.confirmation.dialog.cost')}</span>
                        <span className="octane-catalog-purchase-confirm-cost">
                            {hasCredits && (
                                <span className="octane-catalog-purchase-confirm-price" data-currency-type="-1">
                                    <strong>{credits}</strong>
                                    <LayoutCurrencyIcon type={-1} />
                                </span>
                            )}
                            {hasActivityPoints && (
                                <span className="octane-catalog-purchase-confirm-price" data-currency-type={offer.activityPointType}>
                                    <strong>{hasCredits ? `+ ${activityPoints}` : activityPoints}</strong>
                                    <LayoutCurrencyIcon type={offer.activityPointType} />
                                </span>
                            )}
                            {!hasCredits && !hasActivityPoints && (
                                <span className="octane-catalog-purchase-confirm-price" data-currency-type="-1">
                                    <strong>0</strong>
                                    <LayoutCurrencyIcon type={-1} />
                                </span>
                            )}
                        </span>
                    </div>
                </div>
                {spendingDisclaimerEnabled && (
                    <label className="octane-catalog-purchase-confirm-disclaimer">
                        <Checkbox checked={spendingDisclaimerAccepted} onCheckedChange={(nextChecked) => setSpendingDisclaimerAccepted(nextChecked)} />
                        <span>{LocalizeText('disclaimer.credit_spending')}</span>
                    </label>
                )}
                {isLimited && (
                    <div className="octane-catalog-purchase-confirm-limited" role="status">
                        <span>
                            {LocalizeText('unique.items.left')} <strong>{offer.product.uniqueLimitedItemsLeft}</strong>
                            {' / '}
                            {LocalizeText('unique.items.number.sold')} <strong>{offer.product.uniqueLimitedItemSeriesSize}</strong>
                        </span>
                    </div>
                )}
                <div className="octane-catalog-purchase-confirm-actions">
                    <BaseButton className="octane-catalog-purchase-confirm-button is-cancel" disabled={isSubmitting} type="button" onClick={onCancel}>
                        {LocalizeText('catalog.purchase_confirmation.cancel')}
                    </BaseButton>
                    <BaseButton
                        className="octane-catalog-purchase-confirm-button is-buy"
                        disabled={isSubmitting || !spendingDisclaimerAccepted}
                        type="button"
                        onClick={onConfirm}
                    >
                        {LocalizeText(isGift ? 'catalog.purchase_confirmation.gift' : `catalog.purchase_confirmation.${offer.isRentOffer ? 'rent' : 'buy'}`)}
                    </BaseButton>
                </div>
            </OctaneCardContentView>
        </InlineDialog>
    );
};
