import {
    CancelAllMarketplaceOffersMessageComposer,
    CancelMarketplaceOfferMessageComposer,
    ClearOwnMarketplaceHistoryMessageComposer,
    GetMarketplaceOwnOffersMessageComposer,
    MarketplaceCancelAllOffersResultEvent,
    MarketplaceCancelOfferResultEvent,
    MarketplaceClearOwnHistoryResultEvent,
    MarketplaceOwnOffersEvent,
    RedeemMarketplaceOfferCreditsMessageComposer
} from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText, localizeWithFallback, MarketPlaceOfferState, MarketplaceOfferData, NotificationAlertType, SendMessageComposer } from '../../../../../../api';
import { Button, Column, Text } from '../../../../../../common';
import { useMessageEvent, useNotification } from '../../../../../../hooks';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { CatalogLayoutMarketplaceItemView, OWN_OFFER } from './CatalogLayoutMarketplaceItemView';

export const CatalogLayoutMarketplaceOwnItemsView: FC<CatalogLayoutProps> = (props) => {
    const [creditsWaiting, setCreditsWaiting] = useState(0);
    const [offers, setOffers] = useState<MarketplaceOfferData[]>([]);
    const { simpleAlert = null, showConfirm = null } = useNotification();
    const isRedeemingRef = useRef<boolean>(false);
    const isBulkActionRef = useRef<boolean>(false);
    const pendingCancelsRef = useRef<Set<number>>(new Set());

    useMessageEvent<MarketplaceOwnOffersEvent>(MarketplaceOwnOffersEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const offers = parser.offers.map((offer) => {
            const newOffer = new MarketplaceOfferData(
                offer.offerId,
                offer.furniId,
                offer.furniType,
                offer.extraData,
                offer.stuffData,
                offer.price,
                offer.status,
                offer.averagePrice,
                offer.offerCount
            );

            newOffer.timeLeftMinutes = offer.timeLeftMinutes;

            return newOffer;
        });

        setCreditsWaiting(parser.creditsWaiting);
        setOffers(offers);
    });

    useMessageEvent<MarketplaceCancelOfferResultEvent>(MarketplaceCancelOfferResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        if (!parser.success) {
            simpleAlert(
                LocalizeText('catalog.marketplace.cancel_failed'),
                NotificationAlertType.DEFAULT,
                null,
                null,
                LocalizeText('catalog.marketplace.operation_failed.topic')
            );

            return;
        }

        setOffers((prevValue) => prevValue.filter((value) => value.offerId !== parser.offerId));
    });

    const showFailure = (key: string, fallback: string) =>
        simpleAlert(localizeWithFallback(key, fallback), NotificationAlertType.DEFAULT, null, null, LocalizeText('catalog.marketplace.operation_failed.topic'));

    useMessageEvent<MarketplaceCancelAllOffersResultEvent>(MarketplaceCancelAllOffersResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        if (!parser.success) {
            showFailure('shop.marketplace.recall.failed', 'Recall failed.');

            return;
        }

        const recalled = new Set(parser.offerIds);

        setOffers((prevValue) => prevValue.filter((value) => !recalled.has(value.offerId)));
    });

    useMessageEvent<MarketplaceClearOwnHistoryResultEvent>(MarketplaceClearOwnHistoryResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser || parser.success) return;

        showFailure('shop.marketplace.mark.as.seen.failed', 'Mark as seen failed.');
    });

    const openOffers = useMemo(() => offers.filter((value) => value.status === MarketPlaceOfferState.ONGOING), [offers]);

    const expiredOffers = useMemo(() => offers.filter((value) => value.status === MarketPlaceOfferState.EXPIRED), [offers]);

    // The server rate-limits bulk actions; one in flight at a time.
    const runBulkAction = (send: () => void) => {
        if (isBulkActionRef.current) return;

        isBulkActionRef.current = true;
        send();
        setTimeout(() => (isBulkActionRef.current = false), 2000);
    };

    const recallAllOffers = () => {
        showConfirm(
            localizeWithFallback('shop.marketplace.recall.all.items', 'Are you sure you want to recall all your offers from the marketplace?'),
            () => runBulkAction(() => SendMessageComposer(new CancelAllMarketplaceOffersMessageComposer())),
            null,
            null,
            null,
            localizeWithFallback('shop.marketplace.recall.all.button', 'Recall all')
        );
    };

    // Expired offers go back to the inventory; the server then resends the own offers list.
    const clearExpiredOffers = () => {
        showConfirm(
            localizeWithFallback('shop.marketplace.mark.as.seen.items', 'Are you sure you want to mark all items on this marketplace history page as seen?'),
            () => runBulkAction(() => SendMessageComposer(new ClearOwnMarketplaceHistoryMessageComposer(MarketPlaceOfferState.EXPIRED))),
            null,
            null,
            null,
            localizeWithFallback('shop.marketplace.mark.as.seen.button', 'Mark as seen')
        );
    };

    const soldOffers = useMemo(() => {
        return offers.filter((value) => value.status === MarketPlaceOfferState.SOLD);
    }, [offers]);

    const redeemSoldOffers = useCallback(() => {
        if (isRedeemingRef.current) return;

        isRedeemingRef.current = true;

        setOffers((prevValue) => {
            const idsToDelete = soldOffers.map((value) => value.offerId);

            return prevValue.filter((value) => idsToDelete.indexOf(value.offerId) === -1);
        });

        // Without this the redeem panel stays visible (creditsWaiting > 0) after
        // the sold offers are optimistically removed, showing "get 0 sold items".
        setCreditsWaiting(0);

        SendMessageComposer(new RedeemMarketplaceOfferCreditsMessageComposer());

        setTimeout(() => (isRedeemingRef.current = false), 3000);
    }, [soldOffers]);

    const takeItemBack = (offerData: MarketplaceOfferData) => {
        if (pendingCancelsRef.current.has(offerData.offerId)) return;

        pendingCancelsRef.current.add(offerData.offerId);

        SendMessageComposer(new CancelMarketplaceOfferMessageComposer(offerData.offerId));

        setTimeout(() => pendingCancelsRef.current.delete(offerData.offerId), 2000);
    };

    useEffect(() => {
        SendMessageComposer(new GetMarketplaceOwnOffersMessageComposer());
    }, []);

    return (
        <Column overflow="hidden">
            {creditsWaiting <= 0 && (
                <Text center className="bg-muted rounded p-1">
                    {LocalizeText('catalog.marketplace.redeem.no_sold_items')}
                </Text>
            )}
            {creditsWaiting > 0 && (
                <Column center className="bg-muted rounded p-2" gap={1}>
                    <Text>
                        {LocalizeText(
                            'catalog.marketplace.redeem.get_credits',
                            ['count', 'credits'],
                            [soldOffers.length.toString(), creditsWaiting.toString()]
                        )}
                    </Text>
                    <Button className="mt-1" onClick={redeemSoldOffers}>
                        {LocalizeText('catalog.marketplace.offer.redeem')}
                    </Button>
                </Column>
            )}
            <Column gap={1} overflow="hidden">
                <div className="flex items-center gap-1">
                    <Text shrink truncate fontWeight="bold" className="grow">
                        {LocalizeText('catalog.marketplace.items_found', ['count'], [offers.length.toString()])}
                    </Text>
                    {openOffers.length > 0 && (
                        <Button variant="secondary" onClick={recallAllOffers}>
                            {localizeWithFallback('shop.marketplace.recall.all.button', 'Recall all')}
                        </Button>
                    )}
                    {expiredOffers.length > 0 && (
                        <Button variant="secondary" title={localizeWithFallback('catalog.marketplace.clear_expired.info', 'Return expired furni to your inventory')} onClick={clearExpiredOffers}>
                            {localizeWithFallback('shop.marketplace.mark.as.seen.button', 'Mark as seen')}
                        </Button>
                    )}
                </div>
                <Column className="octane-catalog-layout-marketplace-grid" overflow="auto">
                    {offers.length > 0 &&
                        offers.map((offer) => (
                            <CatalogLayoutMarketplaceItemView key={offer.offerId} offerData={offer} type={OWN_OFFER} onClick={takeItemBack} />
                        ))}
                </Column>
            </Column>
        </Column>
    );
};
