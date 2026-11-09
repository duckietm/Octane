import { GetMarketplaceItemStatsComposer, MarketplaceItemStatsEvent } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { SendMessageComposer, sortMarketplaceHistory } from '../../api';
import { useMessageEvent } from '../events';

export interface MarketplaceItemStats {
    averagePrice: number;
    offerCount: number;
    historyLength: number;
    dayOffsets: number[];
    averagePrices: number[];
    soldAmounts: number[];
    /** Lowest price an open offer asks now; 0 when the server does not send it. */
    lowestCurrentPrice: number;
    /** Suggested asking price for a new offer; 0 when the server does not send it. */
    suggestedPrice: number;
}

/**
 * AIR MarketplaceModel item stats: asks for a furni's price stats (category + sprite id) and keeps
 * only the answer for exactly that furni. Used by the offer details panel and the make-offer window.
 * A category or sprite id of 0 sends nothing.
 */
export const useMarketplaceItemStats = (category: number, furniId: number) => {
    const [stats, setStats] = useState<MarketplaceItemStats>(null);

    useEffect(() => {
        setStats(null);

        if (!category || !furniId) return;

        SendMessageComposer(new GetMarketplaceItemStatsComposer(category, furniId));
    }, [category, furniId]);

    useMessageEvent<MarketplaceItemStatsEvent>(MarketplaceItemStatsEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !category) return;

        if (parser.furniCategoryId !== category || parser.furniTypeId !== furniId) return;

        setStats({
            averagePrice: parser.averagePrice,
            offerCount: parser.offerCount,
            historyLength: parser.historyLength,
            ...sortMarketplaceHistory(parser.dayOffsets, parser.averagePrices, parser.soldAmounts),
            lowestCurrentPrice: parser.lowestCurrentPrice ?? 0,
            suggestedPrice: parser.suggestedPrice ?? 0
        });
    });

    return stats;
};
