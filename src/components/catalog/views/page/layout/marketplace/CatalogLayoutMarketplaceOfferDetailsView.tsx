import { FC, useState } from 'react';
import {
    getMarketplaceOfferText,
    getMarketplaceStatsCategory,
    isMarketplaceChartAvailable,
    localizeWithFallback,
    MarketplaceChartType,
    MarketplaceOfferData,
    ProductTypeEnum
} from '../../../../../../api';
import { Button, LayoutFurniImageView, LayoutLimitedEditionCompactPlateView, Text } from '../../../../../../common';
import { NativeTextTree } from '../../../../../../common/native-text/NativeTextTree';
import { useMarketplaceConfiguration, useMarketplaceItemStats } from '../../../../../../hooks';
import { MarketplaceChartView } from './MarketplaceChartView';

export interface CatalogLayoutMarketplaceOfferDetailsViewProps {
    offerData: MarketplaceOfferData;
    onBack(): void;
    onBuy(offerData: MarketplaceOfferData): void;
}

const NO_POINTS: number[] = [];

const CHART_TYPES: MarketplaceChartType[] = ['price_development', 'trade_volume'];
const CHART_FALLBACKS: Record<MarketplaceChartType, string> = { price_development: 'Price development', trade_volume: 'Trade volume' };
const CHART_TITLE_FALLBACKS: Record<MarketplaceChartType, string> = {
    price_development: 'Average sale price over the last %days% days',
    trade_volume: 'Trade volume over the last %days% days'
};

/** AIR marketplace_offer_details: the panel MarketPlaceCatalogWidget.showDetails puts over the offer list. */
export const CatalogLayoutMarketplaceOfferDetailsView: FC<CatalogLayoutMarketplaceOfferDetailsViewProps> = (props) => {
    const { offerData = null, onBack = null, onBuy = null } = props;
    const [chartType, setChartType] = useState<MarketplaceChartType>('price_development');
    const stats = useMarketplaceItemStats(
        offerData ? getMarketplaceStatsCategory(offerData.furniType, offerData.isUniqueLimitedItem) : 0,
        offerData ? offerData.furniId : 0
    );
    const { data: configuration = null } = useMarketplaceConfiguration();

    if (!offerData) return null;

    const averageDays = (configuration?.displayTime ?? 7).toString();
    const average = offerData.averagePrice ? offerData.averagePrice.toString() : ' - ';
    const values = stats ? (chartType === 'price_development' ? stats.averagePrices : stats.soldAmounts) : NO_POINTS;
    const chartAvailable = !!stats && isMarketplaceChartAvailable(stats.dayOffsets, values);
    const historyDays = (stats?.historyLength ?? 0).toString();

    const chartTitle = !stats
        ? ''
        : chartAvailable
          ? localizeWithFallback(
                `catalog.marketplace.offer_details.chart_title.${chartType}`,
                CHART_TITLE_FALLBACKS[chartType].replace('%days%', historyDays),
                ['days'],
                [historyDays]
            )
          : localizeWithFallback('catalog.marketplace.offer_details.chart_title.not_available', 'No data (at least two days of trading are needed)');

    return (
        <NativeTextTree>
            <div className="octane-marketplace-offer-details">
                <Button className="marketplace-details-back" onClick={onBack}>
                    {localizeWithFallback('catalog.marketplace.offer_details.back', 'Back to the Marketplace')}
                </Button>
                <div className="marketplace-details-head">
                    <div className="marketplace-details-image">
                        <LayoutFurniImageView
                            direction={2}
                            extraData={offerData.extraData}
                            productClassId={offerData.furniId}
                            productType={offerData.furniType === MarketplaceOfferData.TYPE_WALL ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR}
                        />
                        {offerData.isUniqueLimitedItem && (
                            <div className="marketplace-details-unique">
                                <LayoutLimitedEditionCompactPlateView
                                    uniqueNumber={offerData.stuffData.uniqueNumber}
                                    uniqueSeries={offerData.stuffData.uniqueSeries}
                                />
                            </div>
                        )}
                    </div>
                    <div className="marketplace-details-text">
                        <Text bold>{getMarketplaceOfferText(offerData, 'name')}</Text>
                        <Text italics>{getMarketplaceOfferText(offerData, 'desc')}</Text>
                        <Text className="marketplace-details-price marketplace-details-small">
                            {localizeWithFallback(
                                'catalog.marketplace.offer_details.price',
                                `Cheapest price: ${offerData.price} credits`,
                                ['price'],
                                [offerData.price.toString()]
                            )}
                        </Text>
                        {stats && (
                            <Text className="marketplace-details-small">
                                {localizeWithFallback(
                                    'catalog.marketplace.offer_details.offer_count',
                                    `Offers: ${stats.offerCount}`,
                                    ['count'],
                                    [stats.offerCount.toString()]
                                )}
                            </Text>
                        )}
                        <Text className="marketplace-details-small">
                            {localizeWithFallback(
                                'catalog.marketplace.offer_details.average_price',
                                `Average price over the last ${averageDays} days: ${average} credits`,
                                ['days', 'average'],
                                [averageDays, average]
                            )}
                        </Text>
                    </div>
                    <Button className="marketplace-details-buy" onClick={() => onBuy(offerData)}>
                        {localizeWithFallback('buy', 'Buy')}
                    </Button>
                </div>
                <div className="marketplace-details-chart-selector">
                    {CHART_TYPES.map((type) => (
                        <Button key={type} active={chartType === type} onClick={() => setChartType(type)}>
                            {localizeWithFallback(`catalog.marketplace.offer_details.${type}`, CHART_FALLBACKS[type])}
                        </Button>
                    ))}
                </div>
                <Text className="marketplace-details-chart-title">{chartTitle}</Text>
                <div className="marketplace-details-chart">
                    <MarketplaceChartView dayOffsets={chartAvailable ? stats.dayOffsets : NO_POINTS} values={chartAvailable ? values : NO_POINTS} />
                </div>
            </div>
        </NativeTextTree>
    );
};
