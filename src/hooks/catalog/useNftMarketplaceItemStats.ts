import { GetNftMarketplaceItemStatsComposer, NftMarketplaceItemStatsEvent } from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { SendMessageComposer, sortMarketplaceHistory } from '../../api';
import { useMessageEvent } from '../events';
import { MarketplaceItemStats } from './useMarketplaceItemStats';

/**
 * AIR's Collectibles marketplace item stats (MarketPlaceLogic / MarketplaceModel.getNftItemStats): asks for a
 * collectible's prices by product code. The answer names no product, so it is kept only while the request for
 * this product is the one outstanding. An empty product code sends nothing.
 */
export const useNftMarketplaceItemStats = (productCode: string) => {
    const [stats, setStats] = useState<MarketplaceItemStats>(null);
    const requestedRef = useRef<string>(null);

    useEffect(() => {
        setStats(null);
        requestedRef.current = productCode || null;

        if (!productCode) return;

        SendMessageComposer(new GetNftMarketplaceItemStatsComposer(productCode));

        return () => {
            requestedRef.current = null;
        };
    }, [productCode]);

    useMessageEvent<NftMarketplaceItemStatsEvent>(NftMarketplaceItemStatsEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !requestedRef.current) return;

        setStats({
            averagePrice: parser.averagePrice,
            offerCount: parser.offerCount,
            historyLength: parser.historyLength,
            ...sortMarketplaceHistory(parser.dayOffsets, parser.averagePrices, parser.soldAmounts),
            lowestCurrentPrice: parser.lowestCurrentPrice,
            suggestedPrice: parser.suggestedPrice
        });
    });

    return stats;
};
