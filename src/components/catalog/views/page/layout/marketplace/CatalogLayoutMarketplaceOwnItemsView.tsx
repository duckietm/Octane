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
import { FC, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
    filterMarketplaceOwnOffers,
    getMarketplaceListStatusText,
    getMarketplaceOfferText,
    getMarketplaceOwnBottomButton,
    localizeWithFallback,
    MARKETPLACE_MAX_SEARCH_LENGTH,
    MARKETPLACE_OWN_CATEGORIES,
    MARKETPLACE_OWN_CATEGORY_KEYS,
    MarketPlaceOfferState,
    MarketplaceOfferData,
    NotificationAlertType,
    normalizeMarketplaceSearchText,
    SendMessageComposer
} from '../../../../../../api';
import { BaseButton, ClassicScrollAreaView } from '../../../../../../common';
import { UbuntuDropmenuView } from '../../../../../../common/dropmenu/UbuntuDropmenuView';
import { NativeTextTree } from '../../../../../../common/native-text/NativeTextTree';
import { useMessageEvent, useNotification } from '../../../../../../hooks';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { CatalogLayoutMarketplaceItemView, OWN_OFFER } from './CatalogLayoutMarketplaceItemView';

/** English fallbacks for the page texts, used only when the external texts lack the key. */
const FALLBACKS: Record<string, string> = {
    'catalog.marketplace.redeem.no_sold_items':
        "You haven't sold any furni yet. Once you have put something on the Marketplace, come back here to see the state of your offers. You put furni on the Marketplace from your inventory.",
    'catalog.marketplace.redeem.get_credits': '%count% of your offered furni have been sold. Credits earned: %credits%',
    'catalog.marketplace.offer.redeem': 'Collect credits',
    'catalog.marketplace.searching': 'Searching...',
    'catalog.marketplace.items_found': '%count% furni found',
    'catalog.marketplace.no_items': 'No furni found',
    'catalog.search': 'Search...',
    'generic.search': 'Search',
    'shop.marketplace.recall.all.button': 'Recall all',
    'shop.marketplace.recall.all.items': 'Are you sure you want to recall all your offers from the marketplace?',
    'shop.marketplace.recall.failed': 'Recall failed.',
    'shop.marketplace.mark.as.seen.button': 'Mark as seen',
    'shop.marketplace.mark.as.seen.items': 'Are you sure you want to mark all items on this marketplace history page as seen?',
    'shop.marketplace.mark.as.seen.failed': 'Mark as seen failed.',
    'catalog.marketplace.cancel_failed': 'Cancelling the offer failed.',
    'catalog.marketplace.operation_failed.topic': 'Marketplace'
};

const text = (key: string, parameters: string[] = null, replacements: string[] = null) => {
    let fallback = FALLBACKS[key] ?? key;

    if (parameters && replacements) parameters.forEach((parameter, index) => (fallback = fallback.split(`%${parameter}%`).join(replacements[index] ?? '')));

    return localizeWithFallback(key, fallback, parameters, replacements);
};

const offerSearchText = (offer: MarketplaceOfferData) => `${getMarketplaceOfferText(offer, 'name')} ${getMarketplaceOfferText(offer, 'desc')}`;

/**
 * AIR layout_marketplace_own_items (ctlg_marketplace_own_items, MarketPlaceOwnItemsCatalogWidget): the
 * info text, the category drop menu with the search field, the ongoing / sold / expired rows, the
 * status line and "recall all" / "mark as seen" at the bottom. The server pays sold offers out on the
 * redeem button, so the info text carries the credits waiting and that button.
 */
export const CatalogLayoutMarketplaceOwnItemsView: FC<CatalogLayoutProps> = () => {
    const [creditsWaiting, setCreditsWaiting] = useState(0);
    const [offers, setOffers] = useState<MarketplaceOfferData[]>(null);
    const [category, setCategory] = useState<number>(MarketPlaceOfferState.ONGOING);
    const [searchInput, setSearchInput] = useState('');
    const [searchText, setSearchText] = useState('');
    const { simpleAlert = null, showConfirm = null } = useNotification();
    const isRedeemingRef = useRef<boolean>(false);
    const isBulkActionRef = useRef<boolean>(false);
    const pendingCancelsRef = useRef<Set<number>>(new Set());

    const requestOwnOffers = () => {
        setOffers(null);
        SendMessageComposer(new GetMarketplaceOwnOffersMessageComposer());
    };

    useEffect(() => {
        SendMessageComposer(new GetMarketplaceOwnOffersMessageComposer());
    }, []);

    useMessageEvent<MarketplaceOwnOffersEvent>(MarketplaceOwnOffersEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const latestOffers = parser.offers.map((offer) => {
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
        setOffers(latestOffers);
    });

    const showFailure = (key: string) => simpleAlert(text(key), NotificationAlertType.DEFAULT, null, null, text('catalog.marketplace.operation_failed.topic'));

    useMessageEvent<MarketplaceCancelOfferResultEvent>(MarketplaceCancelOfferResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        if (!parser.success) {
            showFailure('catalog.marketplace.cancel_failed');

            return;
        }

        setOffers((prevValue) => prevValue?.filter((value) => value.offerId !== parser.offerId) ?? prevValue);
    });

    useMessageEvent<MarketplaceCancelAllOffersResultEvent>(MarketplaceCancelAllOffersResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        if (!parser.success) {
            showFailure('shop.marketplace.recall.failed');

            return;
        }

        const recalled = new Set(parser.offerIds);

        setOffers((prevValue) => prevValue?.filter((value) => !recalled.has(value.offerId)) ?? prevValue);
    });

    // AIR onClearOwnHistoryResult: success empties the tab (the server also resends the list), failure alerts.
    useMessageEvent<MarketplaceClearOwnHistoryResultEvent>(MarketplaceClearOwnHistoryResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        if (!parser.success) {
            showFailure('shop.marketplace.mark.as.seen.failed');

            return;
        }

        setOffers((prevValue) => prevValue?.filter((value) => value.status !== category) ?? prevValue);
    });

    // The server rate-limits bulk actions; one in flight at a time.
    const runBulkAction = (send: () => void) => {
        if (isBulkActionRef.current) return;

        isBulkActionRef.current = true;
        send();
        setTimeout(() => (isBulkActionRef.current = false), 2000);
    };

    const recallAllOffers = () => {
        showConfirm(
            text('shop.marketplace.recall.all.items'),
            () => runBulkAction(() => SendMessageComposer(new CancelAllMarketplaceOffersMessageComposer())),
            null,
            null,
            null,
            text('shop.marketplace.recall.all.button')
        );
    };

    // AIR mark_as_seen_button: clears the selected tab (sold pays out, expired furni go back to the inventory).
    const markAsSeen = () => {
        const state = category;

        showConfirm(
            text('shop.marketplace.mark.as.seen.items'),
            () => runBulkAction(() => SendMessageComposer(new ClearOwnMarketplaceHistoryMessageComposer(state))),
            null,
            null,
            null,
            text('shop.marketplace.mark.as.seen.button')
        );
    };

    const soldOffers = (offers ?? []).filter((value) => value.status === MarketPlaceOfferState.SOLD);

    const redeemSoldOffers = () => {
        if (isRedeemingRef.current) return;

        isRedeemingRef.current = true;

        const idsToDelete = new Set(soldOffers.map((value) => value.offerId));

        setOffers((prevValue) => prevValue?.filter((value) => !idsToDelete.has(value.offerId)) ?? prevValue);

        // Without this the redeem box stays visible (creditsWaiting > 0) after
        // the sold offers are optimistically removed, showing "get 0 sold items".
        setCreditsWaiting(0);

        SendMessageComposer(new RedeemMarketplaceOfferCreditsMessageComposer());
        // The list above is a guess: the server's own list follows the redeem, so a refused redeem shows its sold
        // offers and credits again instead of zero until the page is reopened.
        SendMessageComposer(new GetMarketplaceOwnOffersMessageComposer());

        setTimeout(() => (isRedeemingRef.current = false), 3000);
    };

    const takeItemBack = (offerData: MarketplaceOfferData) => {
        if (pendingCancelsRef.current.has(offerData.offerId)) return;

        pendingCancelsRef.current.add(offerData.offerId);

        SendMessageComposer(new CancelMarketplaceOfferMessageComposer(offerData.offerId));

        setTimeout(() => pendingCancelsRef.current.delete(offerData.offerId), 2000);
    };

    // AIR setSelectedCategory: clear the view and ask the server again.
    const selectCategory = (next: number) => {
        if (next === category) return;

        setCategory(next);
        requestOwnOffers();
    };

    const performSearch = () => setSearchText(normalizeMarketplaceSearchText(searchInput));

    const clearSearch = () => {
        setSearchInput('');
        setSearchText('');
    };

    const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') performSearch();
    };

    const categoryOffers = offers ? offers.filter((offer) => offer.status === category) : [];
    const shownOffers = offers ? filterMarketplaceOwnOffers(offers, category, searchText, offerSearchText) : [];
    const status = offers ? getMarketplaceListStatusText(text, shownOffers.length, shownOffers.length) : text('catalog.marketplace.searching');
    const bottomButton = getMarketplaceOwnBottomButton(category);
    const actionsEnabled = categoryOffers.length > 0;
    const categoryOptions = MARKETPLACE_OWN_CATEGORIES.map((value) => ({
        value: value as number,
        label: localizeWithFallback(MARKETPLACE_OWN_CATEGORY_KEYS[value][0], MARKETPLACE_OWN_CATEGORY_KEYS[value][1])
    }));

    return (
        <NativeTextTree>
            <div className="octane-marketplace-page is-own">
                <div className="octane-marketplace-own-info" data-testid="marketplace-own-info">
                    {creditsWaiting > 0 ? (
                        <>
                            <span>
                                {text('catalog.marketplace.redeem.get_credits', ['count', 'credits'], [String(soldOffers.length), String(creditsWaiting)])}
                            </span>
                            <BaseButton className="octane-marketplace-button is-green marketplace-own-redeem" onClick={redeemSoldOffers}>
                                {text('catalog.marketplace.offer.redeem')}
                            </BaseButton>
                        </>
                    ) : (
                        <span>{text('catalog.marketplace.redeem.no_sold_items')}</span>
                    )}
                </div>
                <div className="octane-marketplace-own-search">
                    <UbuntuDropmenuView
                        className="marketplace-own-category"
                        label={localizeWithFallback('shop.marketplace.own.offers.category', 'Category')}
                        options={categoryOptions}
                        value={category}
                        onSelect={selectCategory}
                    />
                    <span className="marketplace-own-search-input">
                        <input
                            aria-label={text('catalog.search')}
                            autoComplete="off"
                            maxLength={MARKETPLACE_MAX_SEARCH_LENGTH}
                            placeholder={text('catalog.search')}
                            type="text"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value.substring(0, MARKETPLACE_MAX_SEARCH_LENGTH))}
                            onKeyDown={onSearchKeyDown}
                        />
                        {searchInput.length > 0 && <BaseButton aria-label="clear" className="marketplace-own-search-clear" onClick={clearSearch} />}
                    </span>
                    <BaseButton className="octane-marketplace-button marketplace-own-search-button" onClick={performSearch}>
                        {text('generic.search')}
                    </BaseButton>
                </div>
                <ClassicScrollAreaView className="octane-marketplace-list is-own" contentClassName="octane-marketplace-list-content">
                    {shownOffers.map((offer) => (
                        <CatalogLayoutMarketplaceItemView key={offer.offerId} offerData={offer} type={OWN_OFFER} onClick={takeItemBack} />
                    ))}
                </ClassicScrollAreaView>
                <div className="octane-marketplace-own-bottom">
                    <span className="octane-marketplace-status" data-testid="marketplace-status" role="status">
                        {status}
                    </span>
                    {bottomButton === 'recall' ? (
                        <BaseButton className="octane-marketplace-button is-red marketplace-own-recall" disabled={!actionsEnabled} onClick={recallAllOffers}>
                            {text('shop.marketplace.recall.all.button')}
                        </BaseButton>
                    ) : (
                        <BaseButton className="octane-marketplace-button marketplace-own-seen" disabled={!actionsEnabled} onClick={markAsSeen}>
                            {text('shop.marketplace.mark.as.seen.button')}
                        </BaseButton>
                    )}
                </div>
            </div>
        </NativeTextTree>
    );
};
