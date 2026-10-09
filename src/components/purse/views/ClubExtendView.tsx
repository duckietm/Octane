import { ClubOfferExtendData, HabboClubExtendOfferMessageEvent, PurchaseVipMembershipExtensionComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../api';
import { Button, LayoutCurrencyIcon, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';
import { useMessageEvent, usePurse } from '../../../hooks';

const PriceRow: FC<{ label: string; credits: number; points: number; pointsType: number; bold?: boolean }> = ({ label, credits, points, pointsType, bold = false }) => (
    <div className="flex items-center justify-between gap-2">
        <Text bold={bold}>{label}</Text>
        <div className="flex items-center gap-1">
            {credits > 0 && (
                <>
                    <Text bold={bold}>{credits}</Text>
                    <LayoutCurrencyIcon type={-1} />
                </>
            )}
            {points > 0 && (
                <>
                    <Text bold={bold}>{points}</Text>
                    <LayoutCurrencyIcon type={pointsType} />
                </>
            )}
        </div>
    </div>
);

/** Habbo's "extend your HC" confirmation, opened when the server sends the extend offer. */
export const ClubExtendView: FC = () => {
    const [offer, setOffer] = useState<ClubOfferExtendData>(null);
    const [error, setError] = useState('');
    const { getCurrencyAmount = null } = usePurse();

    useMessageEvent<HabboClubExtendOfferMessageEvent>(HabboClubExtendOfferMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser?.offer) return;

        setError('');
        setOffer(parser.offer);
    });

    if (!offer) return null;

    const buy = () => {
        const notEnoughCredits = getCurrencyAmount(-1) < offer.priceCredits;
        const notEnoughPoints = offer.priceActivityPoints > 0 && getCurrencyAmount(offer.priceActivityPointsType) < offer.priceActivityPoints;

        if (notEnoughCredits || notEnoughPoints) {
            setError(LocalizeText(notEnoughCredits ? 'catalog.alert.notenough.credits.description' : `catalog.alert.notenough.activitypoints.description.${offer.priceActivityPointsType}`));

            return;
        }

        SendMessageComposer(new PurchaseVipMembershipExtensionComposer(offer.offerId));
        setOffer(null);
    };

    const saving = Math.max(0, offer.discountCreditAmount);
    const daysLeft = Math.max(0, offer.subscriptionDaysLeft);

    return (
        <OctaneCardView className="octane-club-extend" theme="primary-slim">
            <OctaneCardHeaderView headerText={localizeWithFallback('catalog.club.extend.confirm.caption', 'Extend your HC subscription')} onCloseClick={() => setOffer(null)} />
            <OctaneCardContentView gap={2}>
                <Text bold>{localizeWithFallback('catalog.club.extend.confirm.title', 'Extend your HC subscription')}</Text>
                <PriceRow
                    label={localizeWithFallback('catalog.club.extend.normal.label', 'Normal price')}
                    credits={offer.originalPrice}
                    points={offer.originalActivityPointPrice}
                    pointsType={offer.originalActivityPointType}
                />
                {saving > 0 && <PriceRow label={localizeWithFallback('catalog.club.extend.save.label', 'You will save')} credits={saving} points={0} pointsType={0} />}
                <PriceRow
                    bold
                    label={localizeWithFallback('catalog.club.extend.price.label', 'Your price')}
                    credits={offer.priceCredits}
                    points={offer.priceActivityPoints}
                    pointsType={offer.priceActivityPointsType}
                />
                <Text small variant="muted">
                    {daysLeft > 0
                        ? localizeWithFallback('catalog.club.extend.expiration_days_left', `The offer is only available for ${daysLeft} days`, ['day'], [daysLeft.toString()])
                        : localizeWithFallback('catalog.club.extend.expires_today', 'This offer ends today!')}
                </Text>
                {error && <Text small className="text-[#a81a12]">{error}</Text>}
                <div className="flex items-center justify-between mt-auto">
                    <Text pointer small underline onClick={() => setOffer(null)}>
                        {localizeWithFallback('catalog.club.extend.later.link', 'Ask Later')}
                    </Text>
                    <Button variant="success" onClick={buy}>
                        {localizeWithFallback('catalog.club.extend.buy.button', 'Buy Now')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
