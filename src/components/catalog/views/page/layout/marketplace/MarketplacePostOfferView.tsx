import {
    BuyMarketplaceTokensMessageComposer,
    GetMarketplaceCanMakeOfferComposer,
    GetSessionDataManager,
    MakeMultipleOffersMessageComposer,
    MakeOfferMessageComposer,
    MarketplaceCanMakeOfferResult,
    NotEnoughBalanceMessageEvent
} from '@octane/renderer';
import { FC, useRef, useState } from 'react';
import {
    checkMarketplaceOfferPrice,
    FurniCategory,
    FurnitureItem,
    GetConfigurationValue,
    getFurnidataText,
    getMarketplaceConfirmText,
    getMarketplaceFurniTextKeys,
    getMarketplaceOfferRevenue,
    getMarketplaceStatsCategory,
    isMarketplacePriceStatVisible,
    LocalizeText,
    localizeWithFallback,
    MARKETPLACE_MAX_OFFER_AMOUNT,
    NotificationAlertType,
    OpenUrl,
    ProductTypeEnum,
    parseMarketplaceOfferAmount,
    pickMarketplaceFurniText,
    SendMessageComposer
} from '../../../../../../api';
import {
    LayoutFurniImageView,
    LayoutLimitedEditionCompactPlateView,
    LayoutRarityLevelView,
    OctaneCardContentView,
    OctaneCardHeaderView,
    OctaneCardView
} from '../../../../../../common';
import { BaseButton } from '../../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../../common/native-text/NativeTextTree';
import { CatalogPostMarketplaceOfferEvent } from '../../../../../../events';
import { useMarketplaceConfiguration, useMarketplaceItemStats, useMessageEvent, useNotification, useUiEvent } from '../../../../../../hooks';
import { MarketplaceBuyTokensView, MarketplaceNoCreditsView } from './MarketplaceTokenDialogsView';

let isPostingMarketplaceOffer = false;

/** Can-make-offer answer 4: no selling tokens left, so AIR offers to buy a batch (MarketplaceView.showBuyTokens). */
const CAN_MAKE_OFFER_NO_TOKENS = 4;

/** Result codes of the can-make-offer check that stop the sale, with Habbo's text keys. */
const CAN_MAKE_OFFER_ERRORS: Record<number, [string, string]> = {
    2: ['inventory.marketplace.no_trading_privilege', 'Sorry, you are not allowed to make a marketplace offer.'],
    3: ['inventory.marketplace.no_trading_pass', 'Sorry, you need a trading pass to make a marketplace offer.'],
    6: ['inventory.marketplace.trading_lock', "Your account is trade locked, so you can't sell on the marketplace right now."]
};

/** English fallbacks for the AIR texts, used only when the external texts lack the key. */
const FALLBACKS: Record<string, string> = {
    'inventory.marketplace.make_offer.title': 'Marketplace offer',
    'inventory.marketplace.make_offer.expiration_info_days': 'Your offer will be visible to other users for %days% day(s).',
    'inventory.marketplace.make_offer.price_request': 'Asking price:',
    'sellinmarketplace.amount': 'Amount (max %max_amount%)',
    'inventory.marketplace.make_offer.average_price': 'Average price (%days% days): %price%',
    'inventory.marketplace.make_offer.lowest_price': 'Current lowest price: %price%',
    'inventory.marketplace.make_offer.suggested_price': 'Suggested price: %price%',
    'inventory.marketplace.make_offer.copy_suggested_price': 'Copy suggested price',
    'sell.in.marketplace.revenue.label': 'Expected revenue per item',
    'shop.marketplace.invalid.price': 'You can offer items for between %minPrice% and %maxPrice% credits.',
    'inventory.marketplace.make_offer.post': 'Post offer',
    'inventory.marketplace.make_offer.cancel': 'Cancel',
    'inventory.marketplace.confirm_offer.title': 'Confirm offer',
    'inventory.marketplace.confirm_offer.info': 'You are about to sell %furniname%. If someone buys it you will earn %price% credit(s).',
    'inventory.marketplace.confirm_offer.info.multiple':
        'You are about to sell %amount% x %furniname% for %price% credit(s) each. When all are sold you will earn %total% credit(s).'
};

/** `localizeWithFallback` with the English fallback filled in with the same parameters. */
const text = (key: string, parameters: string[] = null, replacements: string[] = null): string => {
    let fallback = FALLBACKS[key] ?? key;

    if (parameters && replacements) parameters.forEach((parameter, index) => (fallback = fallback.split(`%${parameter}%`).join(replacements[index] ?? '')));

    return localizeWithFallback(key, fallback, parameters, replacements);
};

const getFurniName = (item: FurnitureItem): string => {
    const posterId = item.category === FurniCategory.POSTER ? item.stuffData?.getLegacyString() || null : null;
    const keys = getMarketplaceFurniTextKeys(item.isWallItem, item.type, posterId);
    const session = GetSessionDataManager();
    const furniData = item.isWallItem ? session?.getWallItemData(item.type) : session?.getFloorItemData(item.type);

    return pickMarketplaceFurniText(LocalizeText(keys.name), keys.name, getFurnidataText(furniData, item.isWallItem, session, 'name'));
};

/**
 * AIR make_marketplace_offer (habbo-inventory-com, MarketplaceView.showMakeOffer): the 300x429 window
 * the inventory's "sell in marketplace" opens once the server says selling is allowed.
 */
export const MarketplacePostOfferView: FC<{}> = () => {
    const [item, setItem] = useState<FurnitureItem>(null);
    const [items, setItems] = useState<FurnitureItem[]>([]);
    const [priceText, setPriceText] = useState('');
    const [amountText, setAmountText] = useState('1');
    const [tokenDialog, setTokenDialog] = useState<'buy' | 'no_credits'>(null);
    const pendingOfferRef = useRef<{ item: FurnitureItem; items: FurnitureItem[] }>(null);
    // Set while a can-make-offer answer is due (after the check, or after buying tokens).
    const awaitingAnswerRef = useRef(false);
    const buyingTokensRef = useRef(false);
    const answerRequestRef = useRef(0);
    const { data: configuration = null } = useMarketplaceConfiguration({ enabled: !!item || !!tokenDialog });
    const { showConfirm = null, simpleAlert = null } = useNotification();
    const maxAmount = Math.max(1, Math.min(items.length, MARKETPLACE_MAX_OFFER_AMOUNT));
    const uniqueNumber = item?.stuffData?.uniqueNumber ?? 0;
    const stats = useMarketplaceItemStats(item ? getMarketplaceStatsCategory(item.isWallItem ? 2 : 1, uniqueNumber > 0) : 0, item ? item.type : 0);

    // Ask the server first, like Habbo: the window only opens when selling is allowed.
    useUiEvent<CatalogPostMarketplaceOfferEvent>(CatalogPostMarketplaceOfferEvent.POST_MARKETPLACE, (event) => {
        if (!event.item || pendingOfferRef.current) return;

        pendingOfferRef.current = { item: event.item, items: event.items };
        awaitAnswer();
        SendMessageComposer(new GetMarketplaceCanMakeOfferComposer());
    });

    useMessageEvent<MarketplaceCanMakeOfferResult>(MarketplaceCanMakeOfferResult, (event) => {
        const parser = event.getParser();
        const pending = pendingOfferRef.current;

        awaitingAnswerRef.current = false;
        buyingTokensRef.current = false;

        if (!parser || !pending) return;

        // AIR keeps the items while the buy-tokens window is open; the purchase answers this check again.
        if (parser.resultCode === CAN_MAKE_OFFER_NO_TOKENS) {
            setTokenDialog('buy');

            return;
        }

        pendingOfferRef.current = null;

        if (parser.resultCode === 1) {
            setItems(pending.items.filter((value) => value.type === pending.item.type && value.isWallItem === pending.item.isWallItem));
            setPriceText('');
            setAmountText('1');
            setItem(pending.item);

            return;
        }

        const error = CAN_MAKE_OFFER_ERRORS[parser.resultCode];

        if (!error) return;

        simpleAlert(
            localizeWithFallback(`${error[0]}.info`, error[1]),
            NotificationAlertType.DEFAULT,
            null,
            null,
            localizeWithFallback(`${error[0]}.title`, 'Marketplace')
        );
    });

    // The server refuses the token purchase for lack of credits (AIR marketplace_no_credits).
    useMessageEvent<NotEnoughBalanceMessageEvent>(NotEnoughBalanceMessageEvent, (event) => {
        if (!buyingTokensRef.current) return;

        buyingTokensRef.current = false;
        awaitingAnswerRef.current = false;

        if (!event.getParser()?.notEnoughCredits) {
            pendingOfferRef.current = null;

            return;
        }

        setTokenDialog('no_credits');
    });

    function awaitAnswer() {
        const request = ++answerRequestRef.current;

        awaitingAnswerRef.current = true;
        setTimeout(() => {
            if (!awaitingAnswerRef.current || answerRequestRef.current !== request) return;

            awaitingAnswerRef.current = false;
            buyingTokensRef.current = false;
            pendingOfferRef.current = null;
        }, 5000);
    }

    const closeTokenDialog = () => {
        setTokenDialog(null);
        pendingOfferRef.current = null;
    };

    const buyTokens = () => {
        setTokenDialog(null);
        buyingTokensRef.current = true;
        awaitAnswer();
        SendMessageComposer(new BuyMarketplaceTokensMessageComposer());
    };

    const getCredits = () => {
        closeTokenDialog();

        const shopUrl = GetConfigurationValue<string>('web.shop.relativeUrl', '');

        if (shopUrl) OpenUrl(shopUrl);
    };

    if (tokenDialog && configuration) {
        // The marketplace configuration's third and fourth fields are the token batch: its price and size.
        if (tokenDialog === 'buy')
            return (
                <NativeTextTree>
                    <MarketplaceBuyTokensView
                        count={configuration.advertisements}
                        price={configuration.credits}
                        onBuy={buyTokens}
                        onCancel={closeTokenDialog}
                    />
                </NativeTextTree>
            );

        return <MarketplaceNoCreditsView price={configuration.credits} onClose={closeTokenDialog} onGetCredits={getCredits} />;
    }

    if (!configuration || !item) return null;

    const minimumPrice = configuration.minimumPrice;
    const maximumPrice = configuration.maximumPrice;
    const priceCheck = checkMarketplaceOfferPrice(priceText, minimumPrice, maximumPrice);
    const revenue = getMarketplaceOfferRevenue(priceCheck.price);
    const furniName = getFurniName(item);
    const expirationDays = String(configuration.offerTime / 24);
    const averageDays = String(configuration.displayTime);
    // AIR only hides the copy button once the stats say there is no suggestion.
    const showCopySuggested = stats ? stats.suggestedPrice > 0 : true;

    const close = () => setItem(null);

    // AIR checkPrice runs on every change of either input: the price is clamped to the maximum and the amount to 1..max.
    const onPriceChange = (value: string) => {
        setPriceText(checkMarketplaceOfferPrice(value, minimumPrice, maximumPrice).text);
        setAmountText(String(parseMarketplaceOfferAmount(amountText, maxAmount)));
    };

    const onAmountChange = (value: string) => setAmountText(String(parseMarketplaceOfferAmount(value, maxAmount)));

    const copySuggestedPrice = () => {
        if (!stats || stats.suggestedPrice <= 0) return;

        const value = String(stats.suggestedPrice);

        onPriceChange(value);

        try {
            globalThis.navigator?.clipboard?.writeText(value).catch(() => {});
        } catch {
            // Clipboard access is optional, like AIR's.
        }
    };

    const postOffer = () => {
        if (!priceCheck.valid || isPostingMarketplaceOffer) return;

        const askingPrice = priceCheck.price;
        const offerAmount = parseMarketplaceOfferAmount(amountText, maxAmount);
        const offerItems = items.slice(0, offerAmount);
        const offerItem = item;
        const confirmText = getMarketplaceConfirmText(offerAmount, furniName, askingPrice, getMarketplaceOfferRevenue(askingPrice));

        // AIR disposes the window and opens the confirmation in its place.
        close();

        showConfirm(
            text(confirmText.key, confirmText.parameters, confirmText.replacements),
            () => {
                if (isPostingMarketplaceOffer) return;

                isPostingMarketplaceOffer = true;
                setTimeout(() => (isPostingMarketplaceOffer = false), 5000);

                const furniType = offerItem.isWallItem ? 2 : 1;

                if (offerItems.length > 1)
                    SendMessageComposer(
                        new MakeMultipleOffersMessageComposer(
                            askingPrice,
                            furniType,
                            offerItems.map((value) => value.id)
                        )
                    );
                else SendMessageComposer(new MakeOfferMessageComposer(askingPrice, furniType, offerItem.id));
            },
            null,
            null,
            null,
            text('inventory.marketplace.confirm_offer.title')
        );
    };

    const statLine = (name: string, key: string, price: number, days: string = null) =>
        isMarketplacePriceStatVisible(price) && (
            <span className={`octane-marketplace-post-offer-stat is-${name}`} data-testid={`marketplace-post-offer-${name}`}>
                {days === null ? text(key, ['price'], [String(price)]) : text(key, ['days', 'price'], [days, String(price)])}
            </span>
        );

    return (
        <NativeTextTree>
            <OctaneCardView
                classNames={['octane-marketplace-post-offer']}
                frameStyle={3}
                isResizable={false}
                theme="primary-slim"
                uniqueKey="marketplace-post-offer"
            >
                <OctaneCardHeaderView headerText={text('inventory.marketplace.make_offer.title')} onCloseClick={close} />
                <OctaneCardContentView classNames={['octane-marketplace-post-offer-content']} overflow="hidden">
                    <div className="octane-marketplace-post-offer-image">
                        <LayoutFurniImageView
                            direction={90}
                            extraData={item.isWallItem ? (item.stuffData?.getLegacyString() ?? '') : String(item.extra)}
                            productClassId={item.type}
                            productType={item.isWallItem ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR}
                        />
                    </div>
                    {uniqueNumber > 0 && (
                        <LayoutLimitedEditionCompactPlateView
                            className="octane-marketplace-post-offer-unique"
                            uniqueNumber={uniqueNumber}
                            uniqueSeries={item.stuffData.uniqueSeries}
                        />
                    )}
                    {(item.stuffData?.rarityLevel ?? -1) >= 0 && (
                        <LayoutRarityLevelView className="octane-marketplace-post-offer-rarity" level={item.stuffData.rarityLevel} />
                    )}
                    <span className="octane-marketplace-post-offer-name" data-testid="marketplace-post-offer-name">
                        {furniName}
                    </span>
                    <span className="octane-marketplace-post-offer-expiration">
                        {text('inventory.marketplace.make_offer.expiration_info_days', ['days'], [expirationDays])}
                    </span>
                    <label className="octane-marketplace-post-offer-label is-price" htmlFor="marketplace-post-offer-price">
                        {text('inventory.marketplace.make_offer.price_request')}
                    </label>
                    <span className="octane-marketplace-post-offer-input is-price">
                        <input
                            autoComplete="off"
                            id="marketplace-post-offer-price"
                            inputMode="numeric"
                            type="text"
                            value={priceText}
                            onChange={(event) => onPriceChange(event.target.value)}
                        />
                    </span>
                    <label className="octane-marketplace-post-offer-label is-amount" htmlFor="marketplace-post-offer-amount">
                        {text('sellinmarketplace.amount', ['max_amount'], [String(maxAmount)])}
                    </label>
                    <span className="octane-marketplace-post-offer-input is-amount">
                        <input
                            autoComplete="off"
                            id="marketplace-post-offer-amount"
                            inputMode="numeric"
                            type="text"
                            value={amountText}
                            onChange={(event) => onAmountChange(event.target.value)}
                        />
                    </span>
                    <div className="octane-marketplace-post-offer-list">
                        {stats && statLine('average', 'inventory.marketplace.make_offer.average_price', stats.averagePrice, averageDays)}
                        {stats && statLine('lowest', 'inventory.marketplace.make_offer.lowest_price', stats.lowestCurrentPrice)}
                        {stats && statLine('suggested', 'inventory.marketplace.make_offer.suggested_price', stats.suggestedPrice)}
                        {showCopySuggested && (
                            <BaseButton className="octane-marketplace-post-offer-button is-copy" onClick={copySuggestedPrice}>
                                {text('inventory.marketplace.make_offer.copy_suggested_price')}
                            </BaseButton>
                        )}
                        <div className="octane-marketplace-post-offer-final" data-testid="marketplace-post-offer-final" role="status">
                            <span>
                                {priceCheck.valid
                                    ? `${text('sell.in.marketplace.revenue.label')}: ${revenue}`
                                    : text('shop.marketplace.invalid.price', ['minPrice', 'maxPrice'], [String(minimumPrice), String(maximumPrice)])}
                            </span>
                        </div>
                        <div className="octane-marketplace-post-offer-buttons">
                            <BaseButton className="octane-marketplace-post-offer-button is-post" disabled={!priceCheck.valid} onClick={postOffer}>
                                {text('inventory.marketplace.make_offer.post')}
                            </BaseButton>
                            <BaseButton className="octane-marketplace-post-offer-button is-cancel" onClick={close}>
                                {text('inventory.marketplace.make_offer.cancel')}
                            </BaseButton>
                        </div>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
