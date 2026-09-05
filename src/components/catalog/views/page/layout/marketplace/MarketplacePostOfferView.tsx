import { MakeOfferMessageComposer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FurnitureItem, LocalizeText, ProductTypeEnum, SendMessageComposer } from '../../../../../../api';
import { Button, Column, Grid, LayoutFurniImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../../../common';
import { CatalogPostMarketplaceOfferEvent } from '../../../../../../events';
import { useMarketplaceConfiguration, useNotification, useUiEvent } from '../../../../../../hooks';
import { OctaneInput } from '../../../../../../layout';

let isPostingMarketplaceOffer = false;

export const MarketplacePostOfferView: FC<{}> = (props) => {
    const [item, setItem] = useState<FurnitureItem>(null);
    const [askingPrice, setAskingPrice] = useState(0);
    const [tempAskingPrice, setTempAskingPrice] = useState('0');
    const { data: marketplaceConfiguration = null } = useMarketplaceConfiguration({ enabled: !!item });
    const { showConfirm = null } = useNotification();

    const updateAskingPrice = (price: string) => {
        setTempAskingPrice(price);

        const newValue = parseInt(price);

        if (isNaN(newValue) || newValue === askingPrice) return;

        setAskingPrice(parseInt(price));
    };

    useUiEvent<CatalogPostMarketplaceOfferEvent>(CatalogPostMarketplaceOfferEvent.POST_MARKETPLACE, (event) => setItem(event.item));

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

        showConfirm(
            LocalizeText('inventory.marketplace.confirm_offer.info', ['furniname', 'price'], [getFurniTitle, askingPrice.toString()]),
            () => {
                if (isPostingMarketplaceOffer) return;

                isPostingMarketplaceOffer = true;
                setTimeout(() => (isPostingMarketplaceOffer = false), 5000);

                SendMessageComposer(new MakeOfferMessageComposer(askingPrice, item.isWallItem ? 2 : 1, item.id));
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
