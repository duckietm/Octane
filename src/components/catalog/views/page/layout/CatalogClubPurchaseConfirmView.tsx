import { ClubOfferData } from '@octane/renderer';
import { FC, MutableRefObject, useEffect, useMemo, useState } from 'react';
import { GetConfigurationValue, LocalizeText } from '../../../../../api';
import { LayoutCurrencyIcon, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../../common';
import { Checkbox } from '../../../../../common/Checkbox';
import { InlineDialog } from '../../../../../common/InlineDialog';
import { BaseButton } from '../../../../../common/BaseButton';

interface CatalogClubPurchaseConfirmViewProps {
    offer: ClubOfferData;
    productText: string;
    validUntilText: string;
    onCancel: () => void;
    onConfirm: () => void;
}

export const CatalogClubPurchaseConfirmView: FC<CatalogClubPurchaseConfirmViewProps> = (props) => {
    const { offer, productText, validUntilText, onCancel, onConfirm } = props;
    const disclaimerEnabled = useMemo(() => GetConfigurationValue<boolean>('disclaimer.credit_spending.enabled', false), []);
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(!disclaimerEnabled);
    const showCredits = offer.priceCredits > 0 || offer.priceActivityPoints <= 0;

    useEffect(() => setDisclaimerAccepted(!disclaimerEnabled), [disclaimerEnabled, offer.offerId]);

    const title = LocalizeText('catalog.club.buy.confirm');

    return (
        <InlineDialog
            aria-label={title}
            aria-modal="true"
            modal="trap-focus"
            render={({ ref, ...popupProps }) => (
                <OctaneCardView {...popupProps} innerRef={ref as MutableRefObject<HTMLDivElement>} classNames={['octane-club-purchase-confirm']} frameStyle={3} isResizable={false} theme="primary-slim" />
            )}
            onClose={onCancel}
        >
            <OctaneCardHeaderView headerText={title} onCloseClick={onCancel} />
            <OctaneCardContentView
                classNames={['octane-club-purchase-confirm-content', disclaimerEnabled ? 'has-disclaimer' : ''].filter(Boolean)}
                overflow="hidden"
            >
                <div className="octane-club-purchase-confirm-product">
                    <span aria-hidden="true" className="octane-club-purchase-confirm-icon" />
                    <div className="octane-club-purchase-confirm-copy">
                        <strong>{productText}</strong>
                        <span>{validUntilText}</span>
                        <div className="octane-club-purchase-confirm-cost-row">
                            <span>{LocalizeText('catalog.purchase.confirmation.dialog.cost')}</span>
                            <span className="octane-club-purchase-confirm-price">
                                {showCredits && (
                                    <span className="octane-club-purchase-confirm-price-part" data-currency-type="-1">
                                        <strong>{offer.priceCredits}</strong>
                                        <LayoutCurrencyIcon type={-1} />
                                    </span>
                                )}
                                {offer.priceActivityPoints > 0 && (
                                    <span className="octane-club-purchase-confirm-price-part" data-currency-type={offer.priceActivityPointsType}>
                                        <strong>{`${offer.priceCredits > 0 ? '+ ' : ''}${offer.priceActivityPoints}`}</strong>
                                        <LayoutCurrencyIcon type={offer.priceActivityPointsType} />
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {disclaimerEnabled && (
                    <label className="octane-club-purchase-confirm-disclaimer">
                        <Checkbox checked={disclaimerAccepted} onCheckedChange={(nextChecked) => setDisclaimerAccepted(nextChecked)} />
                        <span>{LocalizeText('disclaimer.credit_spending')}</span>
                    </label>
                )}

                <div className="octane-club-purchase-confirm-actions">
                    <BaseButton className="octane-club-purchase-confirm-cancel" type="button" onClick={onCancel}>
                        {LocalizeText('cancel')}
                    </BaseButton>
                    <BaseButton className="octane-club-purchase-confirm-submit" disabled={!disclaimerAccepted} type="button" onClick={onConfirm}>
                        {LocalizeText('catalog.club.buy.subscribe')}
                    </BaseButton>
                </div>
            </OctaneCardContentView>
        </InlineDialog>
    );
};
