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
import { FC, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    LocalizeText,
    localizeWithFallback,
    MarketPlaceOfferState,
    MarketplaceOfferData,
    NotificationAlertType,
    SendMessageComposer
} from '../../../../../../api';
import { Button, Column, Text } from '../../../../../../common';
import { useMessageEvent, useNotification } from '../../../../../../hooks';
import { OctaneInput } from '../../../../../../layout';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { CatalogLayoutMarketplaceItemView, OWN_OFFER } from './CatalogLayoutMarketplaceItemView';
import {
    filterOwnOffers,
    getOwnOfferCategory,
    getOwnOfferCategoryLabel,
    getRecallableOfferIds,
    isOwnOfferCategoryClearable,
    OWN_OFFER_CATEGORIES,
    OWN_OFFER_CATEGORY_OPEN,
    OWN_OFFER_SEARCH_MAX_LENGTH
} from './marketplaceOwnOffers.helpers';

const getOfferSearchText = (offer: MarketplaceOfferData): string => {
    const prefix = offer.furniType === MarketplaceOfferData.TYPE_WALL ? 'wallItem' : 'roomItem';

    return `${localizeWithFallback(`${prefix}.name.${offer.furniId}`, '')} ${localizeWithFallback(`${prefix}.desc.${offer.furniId}`, '')}`;
};

/**
 * `layout_marketplace_own_items_xml`: the player's own offers with the open/sold/expired
 * dropdown, a name search, "recall all" for the open list and "mark as seen" for the others.
 *
 * Both buttons are one request, exactly as the official widget sends them
 * (`MarketPlaceLogic.recallAllOffers` and `clearOwnHistory`): the server answers with the
 * offers it recalled, respectively with whether the tab was cleared, and the list is
 * redrawn from that answer instead of being hidden locally.
 */
export const CatalogLayoutMarketplaceOwnItemsView: FC<CatalogLayoutProps> = (props) => {
    const [creditsWaiting, setCreditsWaiting] = useState(0);
    const [offers, setOffers] = useState<MarketplaceOfferData[]>([]);
    const [category, setCategory] = useState(OWN_OFFER_CATEGORY_OPEN);
    const [searchInput, setSearchInput] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const { simpleAlert = null, showConfirm = null } = useNotification();
    const isRedeemingRef = useRef<boolean>(false);
    const pendingCancelsRef = useRef<Set<number>>(new Set());
    const isRecallingAllRef = useRef<boolean>(false);
    const pendingClearCategoryRef = useRef<number>(null);

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

        pendingCancelsRef.current.delete(parser.offerId);

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

    useMessageEvent<MarketplaceCancelAllOffersResultEvent>(MarketplaceCancelAllOffersResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        isRecallingAllRef.current = false;

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

        // The server says which offers it actually pulled back, so only those disappear.
        setOffers((prevValue) => prevValue.filter((value) => parser.offerIds.indexOf(value.offerId) === -1));
    });

    useMessageEvent<MarketplaceClearOwnHistoryResultEvent>(MarketplaceClearOwnHistoryResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const clearedCategory = pendingClearCategoryRef.current;

        pendingClearCategoryRef.current = null;

        if (!parser.success || clearedCategory === null) {
            simpleAlert(
                LocalizeText('catalog.marketplace.cancel_failed'),
                NotificationAlertType.DEFAULT,
                null,
                null,
                LocalizeText('catalog.marketplace.operation_failed.topic')
            );

            return;
        }

        setOffers((prevValue) => prevValue.filter((value) => getOwnOfferCategory(value) !== clearedCategory));
    });

    const soldOffers = useMemo(() => {
        return offers.filter((value) => value.status === MarketPlaceOfferState.SOLD);
    }, [offers]);

    const visibleOffers = useMemo(
        () => filterOwnOffers(offers, category, activeSearch, getOfferSearchText),
        [offers, category, activeSearch]
    );

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

    const cancelOffer = useCallback((offerId: number) => {
        if (pendingCancelsRef.current.has(offerId)) return;

        pendingCancelsRef.current.add(offerId);

        SendMessageComposer(new CancelMarketplaceOfferMessageComposer(offerId));

        setTimeout(() => pendingCancelsRef.current.delete(offerId), 2000);
    }, []);

    const takeItemBack = (offerData: MarketplaceOfferData) => cancelOffer(offerData.offerId);

    const recallAllOffers = () => {
        if (isRecallingAllRef.current || !getRecallableOfferIds(offers).length) return;

        showConfirm(
            localizeWithFallback('shop.marketplace.recall.all.items', 'Are you sure you want to recall all your offers from the marketplace?'),
            () => {
                isRecallingAllRef.current = true;

                SendMessageComposer(new CancelAllMarketplaceOffersMessageComposer());
            },
            null,
            null,
            null,
            localizeWithFallback('shop.marketplace.recall.all.button', 'Recall all')
        );
    };

    const markAsSeen = () => {
        if (!isOwnOfferCategoryClearable(category) || !visibleOffers.length || pendingClearCategoryRef.current !== null) return;

        showConfirm(
            localizeWithFallback('shop.marketplace.mark.as.seen.items', 'Are you sure you want to mark all these offers as seen?'),
            () => {
                pendingClearCategoryRef.current = category;

                SendMessageComposer(new ClearOwnMarketplaceHistoryMessageComposer(category));
            },
            null,
            null,
            null,
            localizeWithFallback('shop.marketplace.mark.as.seen.button', 'Mark as seen')
        );
    };

    const performSearch = () => setActiveSearch(searchInput);

    const clearSearch = () => {
        setSearchInput('');
        setActiveSearch('');
    };

    const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') performSearch();
    };

    useEffect(() => {
        SendMessageComposer(new GetMarketplaceOwnOffersMessageComposer());
    }, []);

    const statusText = visibleOffers.length
        ? LocalizeText('catalog.marketplace.items_found', ['count'], [visibleOffers.length.toString()])
        : LocalizeText('catalog.marketplace.no_items');

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
            <div className="flex items-center gap-1">
                <select
                    aria-label={localizeWithFallback('shop.marketplace.own.offers.category', 'Offer status')}
                    className="form-select form-select-sm"
                    data-testid="marketplace-own-category"
                    value={category}
                    onChange={(event) => setCategory(parseInt(event.target.value))}
                >
                    {OWN_OFFER_CATEGORIES.map((value) => (
                        <option key={value} value={value}>
                            {getOwnOfferCategoryLabel(value)}
                        </option>
                    ))}
                </select>
                <OctaneInput
                    aria-label={LocalizeText('generic.search')}
                    maxLength={OWN_OFFER_SEARCH_MAX_LENGTH}
                    placeholder={LocalizeText('catalog.search')}
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    onKeyDown={onSearchKeyDown}
                />
                {searchInput.length > 0 && (
                    <Button aria-label={LocalizeText('generic.cancel')} variant="secondary" onClick={clearSearch}>
                        &times;
                    </Button>
                )}
                <Button variant="secondary" onClick={performSearch}>
                    {LocalizeText('generic.search')}
                </Button>
            </div>
            <Column gap={1} overflow="hidden">
                <Column className="octane-catalog-layout-marketplace-grid" overflow="auto">
                    {visibleOffers.map((offer) => (
                        <CatalogLayoutMarketplaceItemView key={offer.offerId} offerData={offer} type={OWN_OFFER} onClick={takeItemBack} />
                    ))}
                </Column>
                <div className="flex items-center justify-between gap-1">
                    <Text shrink truncate fontWeight="bold">
                        {statusText}
                    </Text>
                    {category === OWN_OFFER_CATEGORY_OPEN ? (
                        <Button disabled={!getRecallableOfferIds(offers).length} variant="secondary" onClick={recallAllOffers}>
                            {localizeWithFallback('shop.marketplace.recall.all.button', 'Recall all')}
                        </Button>
                    ) : (
                        <Button disabled={!visibleOffers.length} variant="secondary" onClick={markAsSeen}>
                            {localizeWithFallback('shop.marketplace.mark.as.seen.button', 'Mark as seen')}
                        </Button>
                    )}
                </div>
            </Column>
        </Column>
    );
};
