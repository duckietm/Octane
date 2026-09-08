import {
    BuyMarketplaceOfferMessageComposer,
    GetMarketplaceOffersMessageComposer,
    MarketPlaceOffersEvent,
    MarketplaceBuyOfferResultEvent
} from '@octane/renderer';
import { FC, useCallback, useMemo, useRef, useState } from 'react';
import {
    IMarketplaceSearchOptions,
    LocalizeText,
    MarketplaceOfferData,
    MarketplaceSearchType,
    NotificationAlertType,
    SendMessageComposer
} from '../../../../../../api';
import { Button, Column, Text } from '../../../../../../common';
import { useMessageEvent, useNotification, usePurse } from '../../../../../../hooks';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { CatalogLayoutMarketplaceItemView, PUBLIC_OFFER } from './CatalogLayoutMarketplaceItemView';
import { SearchFormView } from './CatalogLayoutMarketplaceSearchFormView';
import { MarketplaceOfferDetailsView } from './MarketplaceOfferDetailsView';
import { MARKETPLACE_CONFIRM_MODE_BUY, MARKETPLACE_CONFIRM_MODE_PRICE_CHANGED, MarketplacePurchaseConfirmView } from './MarketplacePurchaseConfirmView';

const SORT_TYPES_VALUE = [1, 2];
const SORT_TYPES_ACTIVITY = [3, 4, 5, 6];
const SORT_TYPES_ADVANCED = [1, 2, 3, 4, 5, 6];
export interface CatalogLayoutMarketplacePublicItemsViewProps extends CatalogLayoutProps {}

export const CatalogLayoutMarketplacePublicItemsView: FC<CatalogLayoutMarketplacePublicItemsViewProps> = (props) => {
    const [searchType, setSearchType] = useState(MarketplaceSearchType.BY_ACTIVITY);
    const [totalItemsFound, setTotalItemsFound] = useState(0);
    const [offers, setOffers] = useState(new Map<number, MarketplaceOfferData>());
    const [detailsOffer, setDetailsOffer] = useState<MarketplaceOfferData>(null);
    const [confirmOffer, setConfirmOffer] = useState<{ offer: MarketplaceOfferData; mode: number }>(null);
    const [lastSearch, setLastSearch] = useState<IMarketplaceSearchOptions>({ minPrice: -1, maxPrice: -1, query: '', type: 3, combineUniques: true });
    const { getCurrencyAmount = null } = usePurse();
    const { simpleAlert = null } = useNotification();
    const isBuyingRef = useRef<boolean>(false);

    const requestOffers = useCallback((options: IMarketplaceSearchOptions) => {
        setLastSearch(options);
        // The official composer (header 2407) carries options.combineUniques as a fifth boolean;
        // the workspace renderer composer stops at the sort type, so the flag stays client-side.
        SendMessageComposer(new GetMarketplaceOffersMessageComposer(options.minPrice, options.maxPrice, options.query, options.type));
    }, []);

    const confirmPurchase = useCallback((offerData: MarketplaceOfferData) => {
        setConfirmOffer(null);

        if (isBuyingRef.current) return;

        isBuyingRef.current = true;
        SendMessageComposer(new BuyMarketplaceOfferMessageComposer(offerData.offerId));
    }, []);

    const getSortTypes = useMemo(() => {
        switch (searchType) {
            case MarketplaceSearchType.BY_ACTIVITY:
                return SORT_TYPES_ACTIVITY;
            case MarketplaceSearchType.BY_VALUE:
                return SORT_TYPES_VALUE;
            case MarketplaceSearchType.ADVANCED:
                return SORT_TYPES_ADVANCED;
        }
        return [];
    }, [searchType]);

    const purchaseItem = useCallback(
        (offerData: MarketplaceOfferData) => {
            if (offerData.price > getCurrencyAmount(-1)) {
                simpleAlert(
                    LocalizeText('catalog.alert.notenough.credits.description'),
                    NotificationAlertType.DEFAULT,
                    null,
                    null,
                    LocalizeText('catalog.alert.notenough.title')
                );
                return;
            }

            setConfirmOffer({ offer: offerData, mode: MARKETPLACE_CONFIRM_MODE_BUY });
        },
        [getCurrencyAmount, simpleAlert]
    );

    useMessageEvent<MarketPlaceOffersEvent>(MarketPlaceOffersEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const latestOffers = new Map<number, MarketplaceOfferData>();
        parser.offers.forEach((entry) => {
            const offerEntry = new MarketplaceOfferData(
                entry.offerId,
                entry.furniId,
                entry.furniType,
                entry.extraData,
                entry.stuffData,
                entry.price,
                entry.status,
                entry.averagePrice,
                entry.offerCount
            );
            offerEntry.timeLeftMinutes = entry.timeLeftMinutes;
            latestOffers.set(entry.offerId, offerEntry);
        });

        setTotalItemsFound(parser.totalItemsFound);
        setOffers(latestOffers);
        // A fresh list means the details page could be describing an offer that no longer exists.
        setDetailsOffer(null);
    });

    useMessageEvent<MarketplaceBuyOfferResultEvent>(MarketplaceBuyOfferResultEvent, (event) => {
        const parser = event.getParser();

        isBuyingRef.current = false;

        if (!parser) return;

        switch (parser.result) {
            case 1:
                requestOffers(lastSearch);
                break;
            case 2:
                setOffers((prev) => {
                    const newVal = new Map(prev);
                    newVal.delete(parser.requestedOfferId);
                    return newVal;
                });
                simpleAlert(
                    LocalizeText('catalog.marketplace.not_available_header'),
                    NotificationAlertType.DEFAULT,
                    null,
                    null,
                    LocalizeText('catalog.marketplace.not_available_title')
                );
                break;
            case 3: {
                // Someone bought the cheapest copy: the offer moves to the next id / price and the
                // "price changed" confirmation (MarketplaceConfirmationDialog mode 2) asks again.
                const repricedOffer = offers.get(parser.requestedOfferId) ?? null;

                if (repricedOffer) {
                    repricedOffer.offerId = parser.offerId;
                    repricedOffer.price = parser.newPrice;
                    repricedOffer.offerCount--;
                }

                setOffers((prev) => {
                    const newVal = new Map(prev);

                    // Delete the OLD key first, then set under the (possibly
                    // unchanged) new id. The old code did set()-then-delete(),
                    // so when the server returned the same id for the re-priced
                    // offer the set was immediately undone and the offer vanished.
                    newVal.delete(parser.requestedOfferId);

                    if (repricedOffer) newVal.set(repricedOffer.offerId, repricedOffer);

                    return newVal;
                });

                if (repricedOffer) setConfirmOffer({ offer: repricedOffer, mode: MARKETPLACE_CONFIRM_MODE_PRICE_CHANGED });
                break;
            }
            case 4:
                simpleAlert(
                    LocalizeText('catalog.alert.notenough.credits.description'),
                    NotificationAlertType.DEFAULT,
                    null,
                    null,
                    LocalizeText('catalog.alert.notenough.title')
                );
                break;
        }
    });

    const confirmView = confirmOffer ? (
        <MarketplacePurchaseConfirmView mode={confirmOffer.mode} offer={confirmOffer.offer} onCancel={() => setConfirmOffer(null)} onConfirm={confirmPurchase} />
    ) : null;

    if (detailsOffer) {
        return (
            <>
                {confirmView}
                <MarketplaceOfferDetailsView offerData={detailsOffer} onBack={() => setDetailsOffer(null)} onBuy={purchaseItem} />
            </>
        );
    }

    return (
        <>
            {confirmView}
            <div className="relative inline-flex align-middle">
                <Button active={searchType === MarketplaceSearchType.BY_ACTIVITY} onClick={() => setSearchType(MarketplaceSearchType.BY_ACTIVITY)}>
                    {LocalizeText('catalog.marketplace.search_by_activity')}
                </Button>
                <Button active={searchType === MarketplaceSearchType.BY_VALUE} onClick={() => setSearchType(MarketplaceSearchType.BY_VALUE)}>
                    {LocalizeText('catalog.marketplace.search_by_value')}
                </Button>
                <Button active={searchType === MarketplaceSearchType.ADVANCED} onClick={() => setSearchType(MarketplaceSearchType.ADVANCED)}>
                    {LocalizeText('catalog.marketplace.search_advanced')}
                </Button>
            </div>
            <SearchFormView searchType={searchType} sortTypes={getSortTypes} onSearch={requestOffers} />
            <Column gap={1} overflow="hidden">
                <Text shrink truncate fontWeight="bold">
                    {LocalizeText('catalog.marketplace.items_found', ['count'], [offers.size.toString()])}
                </Text>
                <Column className="octane-catalog-layout-marketplace-grid" overflow="auto">
                    {Array.from(offers.values()).map((entry, index) => (
                        <CatalogLayoutMarketplaceItemView
                            key={index}
                            offerData={entry}
                            type={PUBLIC_OFFER}
                            onClick={purchaseItem}
                            onViewMore={setDetailsOffer}
                        />
                    ))}
                </Column>
            </Column>
        </>
    );
};
