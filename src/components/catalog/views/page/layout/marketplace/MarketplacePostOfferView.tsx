import { MakeMultipleOffersMessageComposer, MakeOfferMessageComposer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FurnitureItem, LocalizeText, localizeWithFallback, ProductTypeEnum, SendMessageComposer } from '../../../../../../api';
import { Button, Column, Grid, LayoutFurniImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../../../common';
import { CatalogPostMarketplaceOfferEvent } from '../../../../../../events';
import { getMarketplaceStatsCategory, useMarketplaceConfiguration, useMarketplaceItemStats, useNotification, useUiEvent } from '../../../../../../hooks';
import { OctaneInput } from '../../../../../../layout';
import { getMarketplacePriceWithoutCommission, resolveCopiedSuggestedPrice } from './marketplacePostOffer.helpers';

let isPostingMarketplaceOffer = false;

export const MarketplacePostOfferView: FC<{}> = (props) => {
    const [item, setItem] = useState<FurnitureItem>(null);
    // Every copy of the same furni the player could put in this offer, newest last, as the
    // official window keeps the inventory selection in `MarketplaceModel._offerItems`.
    const [sellableItems, setSellableItems] = useState<FurnitureItem[]>([]);
    const [offerCount, setOfferCount] = useState(1);
    const [askingPrice, setAskingPrice] = useState(0);
    const [tempAskingPrice, setTempAskingPrice] = useState('0');
    const { data: marketplaceConfiguration = null } = useMarketplaceConfiguration({ enabled: !!item });
    const isUniqueLimitedItem = !!item?.stuffData && item.stuffData.uniqueNumber > 0;
    const { data: itemStats = null } = useMarketplaceItemStats(getMarketplaceStatsCategory(!!item?.isWallItem, isUniqueLimitedItem), item?.type ?? 0, {
        enabled: !!item
    });
    const { showConfirm = null } = useNotification();

    const updateAskingPrice = (price: string) => {
        setTempAskingPrice(price);

        const newValue = parseInt(price);

        if (isNaN(newValue) || newValue === askingPrice) return;

        setAskingPrice(parseInt(price));
    };

    useUiEvent<CatalogPostMarketplaceOfferEvent>(CatalogPostMarketplaceOfferEvent.POST_MARKETPLACE, (event) => {
        setItem(event.item);
        setSellableItems(event.sellableItems);
        setOfferCount(1);
    });

    useEffect(() => {
        if (!item) return;

        return () => setAskingPrice(0);
    }, [item]);

    if (!marketplaceConfiguration || !item) return null;

    const getFurniTitle = item ? LocalizeText(item.isWallItem ? 'wallItem.name.' + item.type : 'roomItem.name.' + item.type) : '';
    const getFurniDescription = item ? LocalizeText(item.isWallItem ? 'wallItem.desc.' + item.type : 'roomItem.desc.' + item.type) : '';

    const getCommission = () => Math.max(Math.ceil(marketplaceConfiguration.commission * 0.01 * askingPrice), 1);

    // The official make-offer window hides each stat line while its value is 0; the lowest and
    // suggested prices stay 0 until the renderer parser carries the AIR 13 fields.
    const averagePrice = itemStats?.averagePrice ?? 0;
    const lowestPrice = itemStats?.lowestCurrentPrice ?? 0;
    const suggestedPrice = itemStats?.suggestedPrice ?? 0;
    const averagePriceDays = itemStats?.historyLength > 0 ? itemStats.historyLength : 30;

    const copySuggestedPrice = () => updateAskingPrice(resolveCopiedSuggestedPrice(suggestedPrice, askingPrice).toString());

    // `MarketplaceModel.makeOffer` clamps the amount to what the selection actually holds.
    const maximumOfferCount = Math.max(1, sellableItems.length);
    const requestedCount = Math.max(1, Math.min(offerCount, maximumOfferCount));

    const postItem = () => {
        if (!item || askingPrice < marketplaceConfiguration.minimumPrice || isPostingMarketplaceOffer) return;

        const furniType = item.isWallItem ? 2 : 1;
        const itemIds = (sellableItems.length ? sellableItems : [item]).slice(0, requestedCount).map((sellable) => sellable.id);

        showConfirm(
            requestedCount > 1
                ? localizeWithFallback(
                      'inventory.marketplace.confirm_offer.info.multiple',
                      'Do you want to sell %count% x %furniname% for %price% credits each?',
                      ['count', 'furniname', 'price'],
                      [requestedCount.toString(), getFurniTitle, askingPrice.toString()]
                  )
                : LocalizeText('inventory.marketplace.confirm_offer.info', ['furniname', 'price'], [getFurniTitle, askingPrice.toString()]),
            () => {
                if (isPostingMarketplaceOffer) return;

                isPostingMarketplaceOffer = true;
                setTimeout(() => (isPostingMarketplaceOffer = false), 5000);

                // One item still goes through the single-item composer the hotel has always
                // used; several go in one request, which is what header 1551 exists for.
                SendMessageComposer(
                    itemIds.length > 1
                        ? new MakeMultipleOffersMessageComposer(askingPrice, furniType, itemIds)
                        : new MakeOfferMessageComposer(askingPrice, furniType, itemIds[0])
                );
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
                            {averagePrice > 0 && (
                                <Text small data-testid="marketplace-average-price">
                                    {localizeWithFallback(
                                        'inventory.marketplace.make_offer.average_price',
                                        'Average price in last %days% days: %price% credits (%price_no_commission% without the commission).',
                                        ['days', 'price', 'price_no_commission'],
                                        [
                                            averagePriceDays.toString(),
                                            averagePrice.toString(),
                                            getMarketplacePriceWithoutCommission(averagePrice, marketplaceConfiguration.commission).toString()
                                        ]
                                    )}
                                </Text>
                            )}
                            {lowestPrice > 0 && (
                                <Text small data-testid="marketplace-lowest-price">
                                    {localizeWithFallback(
                                        'inventory.marketplace.make_offer.lowest_price',
                                        'Lowest current price: %price% credits',
                                        ['price'],
                                        [lowestPrice.toString()]
                                    )}
                                </Text>
                            )}
                            {suggestedPrice > 0 && (
                                <div className="flex items-center gap-1">
                                    <Text small data-testid="marketplace-suggested-price">
                                        {localizeWithFallback(
                                            'inventory.marketplace.make_offer.suggested_price',
                                            'Suggested price: %price% credits',
                                            ['price'],
                                            [suggestedPrice.toString()]
                                        )}
                                    </Text>
                                    <Button variant="secondary" onClick={copySuggestedPrice}>
                                        {localizeWithFallback('inventory.marketplace.make_offer.copy_suggested_price', 'Copy suggested price')}
                                    </Button>
                                </div>
                            )}
                            {maximumOfferCount > 1 && (
                                <div className="flex items-center gap-1">
                                    <Text small shrink>
                                        {LocalizeText('sellinmarketplace.amount', ['max_amount'], [maximumOfferCount.toString()])}
                                    </Text>
                                    <OctaneInput
                                        data-testid="marketplace-offer-count"
                                        max={maximumOfferCount}
                                        min={1}
                                        type="number"
                                        value={offerCount}
                                        onChange={(event) => setOfferCount(Math.max(1, Math.min(event.target.valueAsNumber || 1, maximumOfferCount)))}
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
