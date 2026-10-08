import { GetTargetedOfferComposer, PurchaseTargetedOfferComposer, TargetedOfferData } from '@octane/renderer';
import { useMemo, useState } from 'react';
import {
    FriendlyTime,
    GetConfigurationValue,
    getTargetedOfferPurchaseBlock,
    LocalizeText,
    localizeWithFallback,
    SanitizeHtml,
    SendMessageComposer
} from '../../../../api';
import { Button, Column, Flex, LayoutCurrencyIcon, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { usePurse } from '../../../../hooks';

let isBuyingOffer = false;

export const OfferWindowView = (props: { offer: TargetedOfferData; secondsLeft: number | null; onMinimize: () => void }) => {
    const { offer = null, secondsLeft = null, onMinimize = null } = props;

    const { getCurrencyAmount } = usePurse();

    const [amount, setAmount] = useState<number>(1);

    // An offer priced only in activity points needs no credits.
    const purchaseBlock = useMemo(
        () => getTargetedOfferPurchaseBlock(offer, getCurrencyAmount(-1), getCurrencyAmount(offer.activityPointType)),
        [offer, getCurrencyAmount]
    );

    const buyOffer = () => {
        if (isBuyingOffer) return;

        isBuyingOffer = true;

        SendMessageComposer(new PurchaseTargetedOfferComposer(offer.id, amount));
        SendMessageComposer(new GetTargetedOfferComposer());

        setTimeout(() => (isBuyingOffer = false), 5000);
    };

    if (!offer) return;

    return (
        <OctaneCardView className="octane-targeted-offer" theme="primary-slim" uniqueKey="targeted-offer">
            <OctaneCardHeaderView headerText={LocalizeText(offer.title)} onCloseClick={() => onMinimize()} />
            {secondsLeft !== null && (
                <div className="container-fluid p-1 relative justify-center items-center cursor-pointer gap-3 bg-danger">
                    {LocalizeText('targeted.offer.timeleft', ['timeleft'], [FriendlyTime.format(secondsLeft)])}
                </div>
            )}
            <OctaneCardContentView gap={1}>
                <Flex fullHeight gap={1}>
                    <Flex column className="w-75 text-black" gap={1}>
                        <Column fullHeight className="bg-warning p-2">
                            <h4>{LocalizeText(offer.title)}</h4>
                            <div dangerouslySetInnerHTML={{ __html: SanitizeHtml(offer.description) }} />
                        </Column>
                        <Flex alignItems="center" alignSelf="center" gap={2} justifyContent="center">
                            {offer.purchaseLimit > 1 && (
                                <div className="flex gap-1">
                                    <Text variant="muted">{LocalizeText('catalog.bundlewidget.quantity')}</Text>
                                    <input
                                        max={offer.purchaseLimit}
                                        min={1}
                                        type="number"
                                        value={amount}
                                        onChange={(evt) => setAmount(parseInt(evt.target.value))}
                                    />
                                </div>
                            )}
                            <Button disabled={purchaseBlock !== null} variant="primary" onClick={() => buyOffer()}>
                                {LocalizeText('targeted.offer.button.buy')}
                            </Button>
                        </Flex>
                        {(purchaseBlock === 'credits' || purchaseBlock === 'points') && (
                            <Text center small variant="danger">
                                {purchaseBlock === 'credits'
                                    ? localizeWithFallback('catalog.alert.notenough.credits.description', 'You do not have enough credits for this offer.')
                                    : localizeWithFallback('catalog.alert.notenough.activitypoints.description', 'You do not have enough points for this offer.')}
                            </Text>
                        )}
                    </Flex>
                    <div
                        className="w-50 h-full"
                        style={{ background: `url(${GetConfigurationValue('image.library.url') + offer.imageUrl}) no-repeat center` }}
                    />
                </Flex>
                <Flex column alignItems="center" className="price-ray absolute" justifyContent="center">
                    <Text>{LocalizeText('targeted.offer.price.label')}</Text>
                    {offer.priceInCredits > 0 && (
                        <div className="flex gap-1">
                            <Text variant="light">{offer.priceInCredits}</Text>
                            <LayoutCurrencyIcon type={-1} />
                        </div>
                    )}
                    {offer.priceInActivityPoints > 0 && (
                        <div className="flex gap-1">
                            <Text className="ubuntu-bold" variant="light">
                                +{offer.priceInActivityPoints}
                            </Text>{' '}
                            <LayoutCurrencyIcon type={offer.activityPointType} />
                        </div>
                    )}
                </Flex>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
