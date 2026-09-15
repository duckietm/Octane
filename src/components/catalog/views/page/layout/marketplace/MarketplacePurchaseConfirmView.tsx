import { FC, useState } from 'react';
import {
    GetConfigurationValue,
    GetImageIconUrlForProduct,
    LocalizeText,
    localizeWithFallback,
    MarketplaceOfferData,
    ProductTypeEnum
} from '../../../../../../api';
import { Button, LayoutGridItem, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../../../common';

export const MARKETPLACE_CONFIRM_MODE_BUY = 1;
export const MARKETPLACE_CONFIRM_MODE_PRICE_CHANGED = 2;

// MarketplaceConfirmationDialog falls back to this period when no item stats have been loaded.
const DEFAULT_AVERAGE_PRICE_PERIOD = 30;

interface MarketplacePurchaseConfirmViewProps {
    offer: MarketplaceOfferData;
    /** 1 = plain confirmation, 2 = "someone already bought that, new price" (MarketplaceBuyOfferResult 3). */
    mode?: number;
    averagePricePeriod?: number;
    onConfirm: (offer: MarketplaceOfferData) => void;
    onCancel: () => void;
}

/**
 * marketplace_purchase_confirmation.xml (279x255, MarketplaceConfirmationDialog.as): item image with
 * the LTD overlay, item name, header line, price, average price over the period, offer count, the
 * optional spending disclaimer checkbox (disclaimer.credit_spending.enabled) and Buy / Cancel.
 */
export const MarketplacePurchaseConfirmView: FC<MarketplacePurchaseConfirmViewProps> = (props) => {
    const { offer = null, mode = MARKETPLACE_CONFIRM_MODE_BUY, averagePricePeriod = DEFAULT_AVERAGE_PRICE_PERIOD, onConfirm = null, onCancel = null } = props;
    const spendingDisclaimerEnabled = GetConfigurationValue<boolean>('disclaimer.credit_spending.enabled', false) === true;
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(!spendingDisclaimerEnabled);

    if (!offer) return null;

    const localizationPrefix = offer.furniType === MarketplaceOfferData.TYPE_WALL ? 'wallItem' : 'roomItem';
    const itemName = LocalizeText(`${localizationPrefix}.name.${offer.furniId}`);
    const headerText = LocalizeText(
        mode === MARKETPLACE_CONFIRM_MODE_PRICE_CHANGED ? 'catalog.marketplace.confirm_higher_header' : 'catalog.marketplace.confirm_header'
    );
    const title = LocalizeText(
        mode === MARKETPLACE_CONFIRM_MODE_PRICE_CHANGED ? 'catalog.marketplace.confirm_higher_title' : 'catalog.marketplace.confirm_title'
    );
    const offerCount = Math.max(0, offer.offerCount ?? 0);

    return (
        <OctaneCardView
            aria-label={title}
            aria-modal="true"
            classNames={['octane-marketplace-purchase-confirm']}
            frameStyle={3}
            isResizable={false}
            role="dialog"
            theme="primary-slim"
            uniqueKey="marketplace-purchase-confirm"
        >
            <OctaneCardHeaderView headerText={title} onCloseClick={onCancel} />
            <OctaneCardContentView classNames={['octane-marketplace-purchase-confirm-content']} overflow="hidden">
                <div className="octane-marketplace-purchase-confirm-item">
                    <div className="octane-marketplace-purchase-confirm-image">
                        <LayoutGridItem
                            column={false}
                            itemImage={GetImageIconUrlForProduct(
                                offer.furniType === MarketplaceOfferData.TYPE_FLOOR ? ProductTypeEnum.FLOOR : ProductTypeEnum.WALL,
                                offer.furniId,
                                offer.extraData
                            )}
                            itemUniqueNumber={offer.isUniqueLimitedItem ? offer.stuffData.uniqueNumber : 0}
                        />
                    </div>
                    <strong className="octane-marketplace-purchase-confirm-name" data-testid="marketplace-confirm-name">
                        {itemName}
                    </strong>
                </div>
                <p className="octane-marketplace-purchase-confirm-header" data-testid="marketplace-confirm-header">
                    {headerText}
                </p>
                <div className="octane-marketplace-purchase-confirm-lines">
                    <span data-testid="marketplace-confirm-price">
                        {LocalizeText('catalog.marketplace.confirm_price', ['price'], [offer.price.toString()])}
                    </span>
                    <span data-testid="marketplace-confirm-average">
                        {localizeWithFallback(
                            'catalog.marketplace.offer_details.average_price',
                            'Average price in last %days% days: %average% Credits',
                            ['days', 'average'],
                            [averagePricePeriod.toString(), offer.averagePrice > 0 ? offer.averagePrice.toString() : ' - ']
                        )}
                    </span>
                    <span data-testid="marketplace-confirm-offer-count">
                        {localizeWithFallback('catalog.marketplace.offer_details.offer_count', 'Offer count: %count%', ['count'], [offerCount.toString()])}
                    </span>
                </div>
                {spendingDisclaimerEnabled && (
                    <label className="octane-marketplace-purchase-confirm-disclaimer">
                        <input
                            checked={disclaimerAccepted}
                            data-testid="marketplace-confirm-disclaimer"
                            type="checkbox"
                            onChange={(event) => setDisclaimerAccepted(event.target.checked)}
                        />
                        <span>{LocalizeText('disclaimer.credit_spending')}</span>
                    </label>
                )}
                <div className="octane-marketplace-purchase-confirm-actions">
                    <Button disabled={!disclaimerAccepted} variant="success" onClick={() => onConfirm?.(offer)}>
                        {LocalizeText('catalog.purchase_confirmation.buy')}
                    </Button>
                    <Button variant="secondary" onClick={onCancel}>
                        {LocalizeText('catalog.purchase_confirmation.cancel')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
