import { GetMarketplaceCanMakeOfferComposer, MakeMultipleOffersMessageComposer, MakeOfferMessageComposer, MarketplaceCanMakeOfferResult } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { FurnitureItem, LocalizeText, localizeWithFallback, NotificationAlertType, ProductTypeEnum, SendMessageComposer } from '../../../../../../api';
import { Button, Column, Grid, LayoutFurniImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../../../common';
import { CatalogPostMarketplaceOfferEvent } from '../../../../../../events';
import { useMarketplaceConfiguration, useMessageEvent, useNotification, useUiEvent } from '../../../../../../hooks';
import { OctaneInput } from '../../../../../../layout';

let isPostingMarketplaceOffer = false;

// The server takes at most this many items in one multi-offer packet.
export const MARKETPLACE_MAX_OFFER_AMOUNT = 100;

/** Result codes of the can-make-offer check that stop the sale, with Habbo's text keys. */
const CAN_MAKE_OFFER_ERRORS: Record<number, [string, string]> = {
    2: ['inventory.marketplace.no_trading_privilege', 'Sorry, you are not allowed to make a marketplace offer.'],
    3: ['inventory.marketplace.no_trading_pass', 'Sorry, you need a trading pass to make a marketplace offer.'],
    6: ['inventory.marketplace.trading_lock', 'Your account is trade locked, so you can\'t sell on the marketplace right now.']
};

export const MarketplacePostOfferView: FC<{}> = (props) => {
    const [item, setItem] = useState<FurnitureItem>(null);
    const [items, setItems] = useState<FurnitureItem[]>([]);
    const [amount, setAmount] = useState(1);
    const [askingPrice, setAskingPrice] = useState(0);
    const [tempAskingPrice, setTempAskingPrice] = useState('0');
    const pendingOfferRef = useRef<{ item: FurnitureItem; items: FurnitureItem[] }>(null);
    const { data: marketplaceConfiguration = null } = useMarketplaceConfiguration({ enabled: !!item });
    const { showConfirm = null, simpleAlert = null } = useNotification();
    const maxAmount = Math.max(1, Math.min(items.length, MARKETPLACE_MAX_OFFER_AMOUNT));

    const updateAskingPrice = (price: string) => {
        setTempAskingPrice(price);

        const newValue = parseInt(price);

        if (isNaN(newValue) || newValue === askingPrice) return;

        setAskingPrice(parseInt(price));
    };

    // Ask the server first, like Habbo: the window only opens when selling is allowed.
    useUiEvent<CatalogPostMarketplaceOfferEvent>(CatalogPostMarketplaceOfferEvent.POST_MARKETPLACE, (event) => {
        if (!event.item || pendingOfferRef.current) return;

        pendingOfferRef.current = { item: event.item, items: event.items };
        SendMessageComposer(new GetMarketplaceCanMakeOfferComposer());
        setTimeout(() => (pendingOfferRef.current = null), 5000);
    });

    useMessageEvent<MarketplaceCanMakeOfferResult>(MarketplaceCanMakeOfferResult, (event) => {
        const parser = event.getParser();
        const pending = pendingOfferRef.current;

        pendingOfferRef.current = null;

        if (!parser || !pending) return;

        if (parser.resultCode === 1) {
            setItems(pending.items.filter((value) => value.type === pending.item.type && value.isWallItem === pending.item.isWallItem));
            setAmount(1);
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

    const updateAmount = (value: string) => {
        const parsed = parseInt(value);

        setAmount(isNaN(parsed) ? 1 : Math.min(Math.max(parsed, 1), maxAmount));
    };

    useEffect(() => {
        if (!item) return;

        return () => setAskingPrice(0);
    }, [item]);

    if (!marketplaceConfiguration || !item) return null;

    const getFurniTitle = item ? LocalizeText(item.isWallItem ? 'wallItem.name.' + item.type : 'roomItem.name.' + item.type) : '';
    const getFurniDescription = item ? LocalizeText(item.isWallItem ? 'wallItem.desc.' + item.type : 'roomItem.desc.' + item.type) : '';

    const getCommission = () => Math.max(Math.ceil(marketplaceConfiguration.commission * 0.01 * askingPrice), 1);

    const postItem = () => {
        if (!item || askingPrice < marketplaceConfiguration.minimumPrice || isPostingMarketplaceOffer) return;

        const offerAmount = Math.min(Math.max(amount, 1), maxAmount);
        const offerItems = items.slice(0, offerAmount);
        const message = (offerAmount > 1)
            ? LocalizeText(
                'inventory.marketplace.confirm_offer.info.multiple',
                ['amount', 'furniname', 'price', 'total'],
                [offerAmount.toString(), getFurniTitle, askingPrice.toString(), (askingPrice * offerAmount).toString()]
            )
            : LocalizeText('inventory.marketplace.confirm_offer.info', ['furniname', 'price'], [getFurniTitle, askingPrice.toString()]);

        showConfirm(
            message,
            () => {
                if (isPostingMarketplaceOffer) return;

                isPostingMarketplaceOffer = true;
                setTimeout(() => (isPostingMarketplaceOffer = false), 5000);

                const furniType = item.isWallItem ? 2 : 1;

                if (offerItems.length > 1) SendMessageComposer(new MakeMultipleOffersMessageComposer(askingPrice, furniType, offerItems.map((value) => value.id)));
                else SendMessageComposer(new MakeOfferMessageComposer(askingPrice, furniType, item.id));

                setItem(null);
            },
            () => {
                setItem(null);
            },
            null,
            null,
            LocalizeText('inventory.marketplace.confirm_offer.title')
        );
    };

    return (
        <OctaneCardView className="octane-catalog-layout-marketplace-post-offer" theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText('inventory.marketplace.make_offer.title')} onCloseClick={(event) => setItem(null)} />
            <OctaneCardContentView overflow="hidden">
                <Grid fullHeight>
                    <Column center className="bg-muted rounded p-2" overflow="hidden" size={4}>
                        <LayoutFurniImageView
                            extraData={item.extra.toString()}
                            productClassId={item.type}
                            productType={item.isWallItem ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR}
                        />
                    </Column>
                    <Column justifyContent="between" overflow="hidden" size={8}>
                        <Column grow gap={1}>
                            <Text fontWeight="bold">{getFurniTitle}</Text>
                            <Text shrink truncate>
                                {getFurniDescription}
                            </Text>
                        </Column>
                        <Column overflow="auto">
                            <Text italics>
                                {LocalizeText('inventory.marketplace.make_offer.expiration_info', ['time'], [marketplaceConfiguration.offerTime.toString()])}
                            </Text>
                            {maxAmount > 1 && (
                                <div className="flex items-center gap-1">
                                    <Text small>{localizeWithFallback('sellinmarketplace.amount', `Amount (max ${maxAmount})`, ['max_amount'], [maxAmount.toString()])}</Text>
                                    <OctaneInput
                                        className="w-[70px]"
                                        max={maxAmount}
                                        min={1}
                                        type="number"
                                        value={amount}
                                        onChange={(event) => updateAmount(event.target.value)}
                                    />
                                </div>
                            )}
                            <div className="input-group has-validation">
                                <OctaneInput
                                    min={0}
                                    placeholder={LocalizeText('inventory.marketplace.make_offer.price_request')}
                                    type="number"
                                    value={tempAskingPrice}
                                    onChange={(event) => updateAskingPrice(event.target.value)}
                                />
                                {(askingPrice < marketplaceConfiguration.minimumPrice || isNaN(askingPrice)) && (
                                    <div className="invalid-feedback d-block">
                                        {LocalizeText(
                                            'inventory.marketplace.make_offer.min_price',
                                            ['minprice'],
                                            [marketplaceConfiguration.minimumPrice.toString()]
                                        )}
                                    </div>
                                )}
                                {askingPrice > marketplaceConfiguration.maximumPrice && !isNaN(askingPrice) && (
                                    <div className="invalid-feedback d-block">
                                        {LocalizeText(
                                            'inventory.marketplace.make_offer.max_price',
                                            ['maxprice'],
                                            [marketplaceConfiguration.maximumPrice.toString()]
                                        )}
                                    </div>
                                )}
                                {!(
                                    askingPrice < marketplaceConfiguration.minimumPrice ||
                                    askingPrice > marketplaceConfiguration.maximumPrice ||
                                    isNaN(askingPrice)
                                ) && (
                                    <div className="invalid-feedback d-block">
                                        {LocalizeText(
                                            'inventory.marketplace.make_offer.final_price',
                                            ['commission', 'finalprice'],
                                            [getCommission().toString(), (askingPrice + getCommission()).toString()]
                                        )}
                                    </div>
                                )}
                            </div>
                            <Button
                                disabled={
                                    askingPrice < marketplaceConfiguration.minimumPrice ||
                                    askingPrice > marketplaceConfiguration.maximumPrice ||
                                    isNaN(askingPrice)
                                }
                                onClick={postItem}
                            >
                                {LocalizeText('inventory.marketplace.make_offer.post')}
                            </Button>
                        </Column>
                    </Column>
                </Grid>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
