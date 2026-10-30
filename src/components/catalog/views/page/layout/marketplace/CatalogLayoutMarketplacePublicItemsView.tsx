import {
    BuyMarketplaceOfferMessageComposer,
    GetMarketplaceOffersMessageComposer,
    MarketPlaceOffersEvent,
    MarketplaceBuyOfferResultEvent
} from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import {
    getMarketplaceListStatusText,
    IMarketplaceSearchOptions,
    LocalizeText,
    localizeWithFallback,
    MARKETPLACE_SORT_TYPES,
    MarketplaceOfferData,
    MarketplaceSearchType,
    NotificationAlertType,
    parseMarketplacePriceInput,
    SendMessageComposer
} from '../../../../../../api';
import { BaseButton, ClassicScrollAreaView } from '../../../../../../common';
import { NativeTextTree } from '../../../../../../common/native-text/NativeTextTree';
import { useMessageEvent, useNotification, usePurse } from '../../../../../../hooks';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import { CatalogLayoutMarketplaceItemView, PUBLIC_OFFER } from './CatalogLayoutMarketplaceItemView';
import { CatalogLayoutMarketplaceOfferDetailsView } from './CatalogLayoutMarketplaceOfferDetailsView';
import { MarketplaceSearchFormState, SearchFormView } from './CatalogLayoutMarketplaceSearchFormView';

export interface CatalogLayoutMarketplacePublicItemsViewProps extends CatalogLayoutProps {}

/** AIR search_selector: button_group_left / center / right, 107 + 106 + 107 wide. */
const SEARCH_TABS: { type: number; key: string; fallback: string; position: string }[] = [
    { type: MarketplaceSearchType.BY_ACTIVITY, key: 'catalog.marketplace.search_by_activity', fallback: 'By popularity', position: 'is-left' },
    { type: MarketplaceSearchType.BY_VALUE, key: 'catalog.marketplace.search_by_value', fallback: 'By value', position: 'is-center' },
    { type: MarketplaceSearchType.ADVANCED, key: 'catalog.marketplace.search_advanced', fallback: 'Advanced', position: 'is-right' }
];

const STATUS_FALLBACKS: Record<string, string> = {
    'catalog.marketplace.searching': 'Searching...',
    'catalog.marketplace.items_found': '%count% furni found',
    'catalog.marketplace.items_shown': 'showing the first %count%',
    'catalog.marketplace.no_items': 'No furni found'
};

const statusText = (key: string) => localizeWithFallback(key, STATUS_FALLBACKS[key] ?? key);

const EMPTY_FORM: MarketplaceSearchFormState = { query: '', minPrice: '', maxPrice: '' };

/**
 * AIR layout_marketplace (ctlg_marketplace, MarketPlaceCatalogWidget): the three search tabs, the
 * 360x120 search_container, the status line at y 155 and the 340x58 offer rows from y 170. "Meubi Info"
 * hides all of it under marketplace_offer_details.
 */
export const CatalogLayoutMarketplacePublicItemsView: FC<CatalogLayoutMarketplacePublicItemsViewProps> = () => {
    const [searchType, setSearchType] = useState(MarketplaceSearchType.BY_ACTIVITY);
    const [sortType, setSortType] = useState(MARKETPLACE_SORT_TYPES[MarketplaceSearchType.BY_ACTIVITY][0]);
    const [combineUniques, setCombineUniques] = useState(true);
    const [form, setForm] = useState<MarketplaceSearchFormState>(EMPTY_FORM);
    const [searching, setSearching] = useState(true);
    const [totalItemsFound, setTotalItemsFound] = useState(0);
    const [offers, setOffers] = useState(new Map<number, MarketplaceOfferData>());
    const [detailsOffer, setDetailsOffer] = useState<MarketplaceOfferData>(null);
    const lastSearchRef = useRef<IMarketplaceSearchOptions & { combineUniques: boolean }>(null);
    const { getCurrencyAmount = null } = usePurse();
    const { simpleAlert = null, showConfirm = null } = useNotification();
    const isBuyingRef = useRef<boolean>(false);
    const sortTypes = MARKETPLACE_SORT_TYPES[searchType];

    // AIR MarketPlaceLogic.requestOffers: remember the search so a purchase can refresh it.
    const requestOffers = (options: IMarketplaceSearchOptions & { combineUniques: boolean }) => {
        lastSearchRef.current = options;
        setSearching(true);
        SendMessageComposer(new GetMarketplaceOffersMessageComposer(options.minPrice, options.maxPrice, options.query, options.type, options.combineUniques));
    };

    // AIR doSearch: the inputs of the current panel (only the advanced one has them), the sort and the combine box.
    const doSearch = (next: { searchType?: number; sortType?: number; combineUniques?: boolean; form?: MarketplaceSearchFormState } = {}) => {
        const type = next.searchType ?? searchType;
        const values = type === MarketplaceSearchType.ADVANCED ? (next.form ?? form) : EMPTY_FORM;

        requestOffers({
            minPrice: parseMarketplacePriceInput(values.minPrice),
            maxPrice: parseMarketplacePriceInput(values.maxPrice),
            query: values.query,
            type: next.sortType ?? sortType,
            combineUniques: next.combineUniques ?? combineUniques
        });
    };

    // AIR displayMainView: select "by activity" and search once.
    useEffect(() => {
        requestOffers({ minPrice: -1, maxPrice: -1, query: '', type: MARKETPLACE_SORT_TYPES[MarketplaceSearchType.BY_ACTIVITY][0], combineUniques: true });
    }, []);

    // AIR selectSearchCategory: a fresh search panel with the first sort selected; the simple tabs search right away.
    const selectSearchType = (type: number) => {
        if (type === searchType) return;

        const firstSort = MARKETPLACE_SORT_TYPES[type][0];

        setSearchType(type);
        setSortType(firstSort);
        setForm(EMPTY_FORM);

        if (type !== MarketplaceSearchType.ADVANCED) doSearch({ searchType: type, sortType: firstSort, form: EMPTY_FORM });
    };

    // AIR: a new sort searches on the simple tabs; the advanced tab waits for its search button.
    const changeSort = (type: number) => {
        setSortType(type);

        if (searchType !== MarketplaceSearchType.ADVANCED) doSearch({ sortType: type });
    };

    // AIR combine_uniques_checkbox: every change searches again.
    const changeCombineUniques = (value: boolean) => {
        setCombineUniques(value);
        doSearch({ combineUniques: value });
    };

    const purchaseItem = (offerData: MarketplaceOfferData) => {
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

        const offerId = offerData.offerId;

        showConfirm(
            LocalizeText('catalog.marketplace.confirm_header'),
            () => {
                if (isBuyingRef.current) return;

                isBuyingRef.current = true;
                SendMessageComposer(new BuyMarketplaceOfferMessageComposer(offerId));
            },
            null,
            null,
            null,
            LocalizeText('catalog.marketplace.confirm_title')
        );
    };

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

        setSearching(false);
        setTotalItemsFound(parser.totalItemsFound);
        setOffers(latestOffers);
        // AIR: a new offer list closes the details panel (MarketPlaceCatalogWidget offersReceived -> hideDetails).
        setDetailsOffer(null);
    });

    useMessageEvent<MarketplaceBuyOfferResultEvent>(MarketplaceBuyOfferResultEvent, (event) => {
        const parser = event.getParser();

        isBuyingRef.current = false;

        if (!parser) return;

        switch (parser.result) {
            case 1:
                if (lastSearchRef.current) requestOffers(lastSearchRef.current);
                break;
            case 2:
                setOffers((prev) => {
                    const newVal = new Map(prev);
                    newVal.delete(parser.requestedOfferId);
                    return newVal;
                });
                setDetailsOffer(null);
                simpleAlert(
                    LocalizeText('catalog.marketplace.not_available_header'),
                    NotificationAlertType.DEFAULT,
                    null,
                    null,
                    LocalizeText('catalog.marketplace.not_available_title')
                );
                break;
            case 3:
                setOffers((prev) => {
                    const newVal = new Map(prev);

                    const item = newVal.get(parser.requestedOfferId);
                    if (item) {
                        // Delete the OLD key first, then set under the (possibly
                        // unchanged) new id. The old code did set()-then-delete(),
                        // so when the server returned the same id for the re-priced
                        // offer the set was immediately undone and the offer vanished.
                        newVal.delete(parser.requestedOfferId);

                        item.offerId = parser.offerId;
                        item.price = parser.newPrice;
                        item.offerCount--;
                        newVal.set(item.offerId, item);
                    }

                    return newVal;
                });
                setDetailsOffer(null);

                showConfirm(
                    LocalizeText('catalog.marketplace.confirm_higher_header') +
                        '\n' +
                        LocalizeText('catalog.marketplace.confirm_price', ['price'], [parser.newPrice.toString()]),
                    () => {
                        SendMessageComposer(new BuyMarketplaceOfferMessageComposer(parser.offerId));
                    },
                    null,
                    null,
                    null,
                    LocalizeText('catalog.marketplace.confirm_higher_title')
                );
                break;
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

    const status = searching
        ? statusText('catalog.marketplace.searching')
        : getMarketplaceListStatusText(statusText, offers.size, Math.max(totalItemsFound, offers.size));

    // AIR hides the list (window child 0) under the details panel instead of rebuilding it, so the
    // search form keeps its state and does not search again on the way back.
    return (
        <NativeTextTree>
            <div className="octane-marketplace-page is-public">
                {detailsOffer && (
                    <CatalogLayoutMarketplaceOfferDetailsView offerData={detailsOffer} onBack={() => setDetailsOffer(null)} onBuy={purchaseItem} />
                )}
                <div className="octane-marketplace-main" style={{ display: detailsOffer ? 'none' : undefined }}>
                    <div className="octane-marketplace-selector" role="tablist">
                        {SEARCH_TABS.map((tab) => (
                            <BaseButton
                                key={tab.type}
                                aria-selected={searchType === tab.type}
                                className={`octane-marketplace-group-button ${tab.position}${searchType === tab.type ? ' is-selected' : ''}`}
                                role="tab"
                                onClick={() => selectSearchType(tab.type)}
                            >
                                {localizeWithFallback(tab.key, tab.fallback)}
                            </BaseButton>
                        ))}
                    </div>
                    <div className="octane-marketplace-search-container">
                        <SearchFormView
                            key={searchType}
                            combineUniques={combineUniques}
                            form={form}
                            searchType={searchType}
                            sortType={sortType}
                            sortTypes={sortTypes}
                            onCombineUniquesChange={changeCombineUniques}
                            onFormChange={setForm}
                            onSearch={() => doSearch()}
                            onSortChange={changeSort}
                        />
                    </div>
                    <span className="octane-marketplace-status" data-testid="marketplace-status" role="status">
                        {status}
                    </span>
                    <ClassicScrollAreaView className="octane-marketplace-list" contentClassName="octane-marketplace-list-content">
                        {Array.from(offers.values()).map((entry) => (
                            <CatalogLayoutMarketplaceItemView
                                key={entry.offerId}
                                offerData={entry}
                                type={PUBLIC_OFFER}
                                onClick={purchaseItem}
                                onMore={setDetailsOffer}
                            />
                        ))}
                    </ClassicScrollAreaView>
                </div>
            </div>
        </NativeTextTree>
    );
};
