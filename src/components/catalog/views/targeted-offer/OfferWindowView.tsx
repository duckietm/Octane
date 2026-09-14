import { GetTargetedOfferComposer, PurchaseTargetedOfferComposer, TargetedOfferData } from '@octane/renderer';
import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { CreateLinkEvent, FriendlyTime, GetConfigurationValue, LocalizeText, localizeWithFallback, SanitizeHtml, SendMessageComposer } from '../../../../api';
import { Button, Column, Flex, LayoutCurrencyIcon, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { usePurse } from '../../../../hooks';

let isBuyingOffer = false;

export const OfferWindowView = (props: { offer: TargetedOfferData; setOpen: Dispatch<SetStateAction<boolean>> }) => {
    const { offer = null, setOpen = null } = props;

    const { getCurrencyAmount } = usePurse();

    const [amount, setAmount] = useState<number>(1);

    // TargetedOffer.checkPurseBalance: the whole quantity has to be affordable in every currency.
    const canAfford = useMemo(() => {
        if (!offer) return false;

        const quantity = Math.max(1, amount || 1);

        if (offer.priceInCredits > 0 && getCurrencyAmount(-1) < offer.priceInCredits * quantity) return false;
        if (offer.priceInActivityPoints > 0 && getCurrencyAmount(offer.activityPointType) < offer.priceInActivityPoints * quantity) return false;

        return true;
    }, [offer, amount, getCurrencyAmount]);

    const canPurchase = useMemo(() => {
        if (!offer || !canAfford) return false;

        const quantity = amount || 0;

        return offer.purchaseLimit > 0 && quantity >= 1 && quantity <= offer.purchaseLimit;
    }, [offer, amount, canAfford]);

    // TargetedOfferDialogView.btn_get_credits sends the player to the credits catalog page.
    const goGetCredits = () => CreateLinkEvent('catalog/open/credits');

    const expirationTime = () => {
        let expirationTime = Math.max(0, (offer.expirationTime - Date.now()) / 1000);

        return FriendlyTime.format(expirationTime);
    };

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
            <OctaneCardHeaderView headerText={LocalizeText(offer.title)} onCloseClick={(event) => setOpen(false)} />
            <div className="container-fluid p-1 relative justify-center items-center cursor-pointer gap-3 bg-danger">
                {LocalizeText('targeted.offer.timeleft', ['timeleft'], [expirationTime()])}
            </div>
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
                            <Button disabled={!canPurchase} variant="primary" onClick={() => buyOffer()}>
                                {LocalizeText('targeted.offer.button.buy')}
                            </Button>
                            {!canAfford && (
                                <Button variant="secondary" onClick={goGetCredits}>
                                    {localizeWithFallback('targeted.offer.button.credits', 'Go get credits')}
                                </Button>
                            )}
                        </Flex>
                        {!canAfford && (
                            <Text center bold className="text-danger" data-testid="targeted-offer-status" role="status">
                                {localizeWithFallback('targeted.offer.not_enough.credits', "You don't have enough credits or diamonds yet!")}
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
