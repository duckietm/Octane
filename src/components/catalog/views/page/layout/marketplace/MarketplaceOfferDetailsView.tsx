import { FC, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, MarketplaceOfferData, ProductTypeEnum } from '../../../../../../api';
import { Button, Column, LayoutFurniImageView, LayoutGridItem, Text } from '../../../../../../common';
import { getMarketplaceStatsCategory, useMarketplaceItemStats } from '../../../../../../hooks';
import { MarketplaceChartView } from './MarketplaceChartView';
import { buildMarketplaceChartPoints } from './marketplaceChart.helpers';

export type MarketplaceChartSeries = 'price_development' | 'trade_volume';

interface MarketplaceOfferDetailsViewProps {
    offerData: MarketplaceOfferData;
    onBack: () => void;
    onBuy: (offerData: MarketplaceOfferData) => void;
}

// The official client reads the period from the marketplace configuration packet; the workspace
// renderer parser does not expose it, so the stats history length stands in once it arrives.
const DEFAULT_AVERAGE_PRICE_PERIOD = 30;

const CHART_WIDTH = 300;
const CHART_HEIGHT = 150;

/**
 * `marketplace_offer_details_xml`: the "Item info" page behind the view-more button. Shows the
 * cheapest open offer, how many offers exist, the average price, and a switchable chart of the
 * average sale price / trade volume per day.
 */
export const MarketplaceOfferDetailsView: FC<MarketplaceOfferDetailsViewProps> = (props) => {
    const { offerData = null, onBack = null, onBuy = null } = props;
    const [series, setSeries] = useState<MarketplaceChartSeries>('price_development');
    const isWallItem = offerData?.furniType === MarketplaceOfferData.TYPE_WALL;
    const statsCategory = getMarketplaceStatsCategory(isWallItem, !!offerData?.isUniqueLimitedItem);
    const { data: stats = null } = useMarketplaceItemStats(statsCategory, offerData?.furniId ?? 0, { enabled: !!offerData });

    const chartPoints = useMemo(() => {
        if (!stats) return [];

        return buildMarketplaceChartPoints(stats.dayOffsets, series === 'price_development' ? stats.averagePrices : stats.soldAmounts);
    }, [stats, series]);

    if (!offerData) return null;

    const localizationPrefix = isWallItem ? 'wallItem' : 'roomItem';
    const itemName = LocalizeText(`${localizationPrefix}.name.${offerData.furniId}`);
    const itemDescription = localizeWithFallback(`${localizationPrefix}.desc.${offerData.furniId}`, '');
    const averagePricePeriod = stats?.historyLength > 0 ? stats.historyLength : DEFAULT_AVERAGE_PRICE_PERIOD;
    const offerCount = stats ? stats.offerCount : offerData.offerCount;
    const chartTitle = localizeWithFallback(
        `catalog.marketplace.offer_details.chart_title.${series}`,
        series === 'price_development' ? 'Average sale price during last %days% days' : 'Trade volumes during last %days% days',
        ['days'],
        [averagePricePeriod.toString()]
    );

    return (
        <Column className="octane-marketplace-offer-details" data-testid="marketplace-offer-details" gap={1} overflow="hidden">
            <Button variant="secondary" onClick={onBack}>
                {localizeWithFallback('catalog.marketplace.offer_details.back', 'Back to item list')}
            </Button>
            <div className="flex gap-2">
                <div className="octane-catalog-marketplace-item-icon shrink-0">
                    <LayoutGridItem column={false} itemUniqueNumber={offerData.isUniqueLimitedItem ? offerData.stuffData.uniqueNumber : 0}>
                        <LayoutFurniImageView
                            extraData={offerData.extraData}
                            productClassId={offerData.furniId}
                            productType={isWallItem ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR}
                        />
                    </LayoutGridItem>
                </div>
                <Column grow gap={0} overflow="hidden">
                    <Text fontWeight="bold">{itemName}</Text>
                    {itemDescription.length > 0 && (
                        <Text italics small>
                            {itemDescription}
                        </Text>
                    )}
                    <Text small>
                        {localizeWithFallback(
                            'catalog.marketplace.offer_details.price',
                            'Cheapest price: %price% Credits',
                            ['price'],
                            [offerData.price.toString()]
                        )}
                    </Text>
                    <Text small>
                        {localizeWithFallback('catalog.marketplace.offer_details.offer_count', 'Offer count: %count%', ['count'], [offerCount.toString()])}
                    </Text>
                    <Text small>
                        {localizeWithFallback(
                            'catalog.marketplace.offer_details.average_price',
                            'Average price in last %days% days: %average% Credits',
                            ['days', 'average'],
                            [averagePricePeriod.toString(), offerData.averagePrice > 0 ? offerData.averagePrice.toString() : ' - ']
                        )}
                    </Text>
                    {offerData.isUniqueLimitedItem && (
                        <Text small>
                            {localizeWithFallback(
                                'catalog.marketplace.offer_details.limited_edition_short',
                                'Limited edition number: %number%',
                                ['number'],
                                [offerData.stuffData.uniqueNumber.toString()]
                            )}
                        </Text>
                    )}
                </Column>
                <div className="shrink-0">
                    <Button variant="secondary" onClick={() => onBuy?.(offerData)}>
                        {LocalizeText('buy')}
                    </Button>
                </div>
            </div>
            <div className="flex" role="group">
                <Button active={series === 'price_development'} className="flex-1" variant="secondary" onClick={() => setSeries('price_development')}>
                    {localizeWithFallback('catalog.marketplace.offer_details.price_development', 'Price development')}
                </Button>
                <Button active={series === 'trade_volume'} className="flex-1" variant="secondary" onClick={() => setSeries('trade_volume')}>
                    {localizeWithFallback('catalog.marketplace.offer_details.trade_volume', 'Trade volume')}
                </Button>
            </div>
            <Column className="bg-white rounded p-2" overflow="auto">
                <MarketplaceChartView height={CHART_HEIGHT} points={chartPoints} title={chartTitle} width={CHART_WIDTH} />
            </Column>
        </Column>
    );
};
