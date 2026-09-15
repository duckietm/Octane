import { GetMarketplaceItemStatsComposer, MarketplaceItemStatsEvent } from '@octane/renderer';
import { UseQueryResult } from '@tanstack/react-query';
import { useOctaneQuery } from '../../api/octane-query';

export interface IMarketplaceItemStats {
    averagePrice: number;
    offerCount: number;
    historyLength: number;
    dayOffsets: number[];
    averagePrices: number[];
    soldAmounts: number[];
    furniTypeId: number;
    furniCategoryId: number;
    /** Cheapest open offer right now. 0 while the renderer parser does not carry the AIR 13 field. */
    lowestCurrentPrice: number;
    /** Server suggested asking price. 0 while the renderer parser does not carry the AIR 13 field. */
    suggestedPrice: number;
}

// The stats request is keyed the way MarketPlaceLogic.resolveStatsRequestCategory keys it:
// limited editions are their own category, then wall items, then everything else.
export const MARKETPLACE_STATS_CATEGORY_FLOOR = 1;
export const MARKETPLACE_STATS_CATEGORY_WALL = 2;
export const MARKETPLACE_STATS_CATEGORY_LIMITED = 3;

export const getMarketplaceStatsCategory = (isWallItem: boolean, isUniqueLimitedItem: boolean): number => {
    if (isUniqueLimitedItem) return MARKETPLACE_STATS_CATEGORY_LIMITED;

    return isWallItem ? MARKETPLACE_STATS_CATEGORY_WALL : MARKETPLACE_STATS_CATEGORY_FLOOR;
};

interface IMarketplaceItemStatsParserLike {
    averagePrice: number;
    offerCount: number;
    historyLength: number;
    dayOffsets: number[];
    averagePrices: number[];
    soldAmounts: number[];
    furniTypeId: number;
    furniCategoryId: number;
    lowestCurrentPrice?: number;
    suggestedPrice?: number;
}

/**
 * Copies the parser into a plain object so React Query can cache it after the renderer recycles
 * the parser. The two AIR 13 price hints are read defensively: the workspace renderer parser
 * does not have them yet, and the views hide those lines while they read 0.
 */
export const selectMarketplaceItemStats = (parser: IMarketplaceItemStatsParserLike): IMarketplaceItemStats => ({
    averagePrice: parser.averagePrice,
    offerCount: parser.offerCount,
    historyLength: parser.historyLength,
    dayOffsets: [...parser.dayOffsets],
    averagePrices: [...parser.averagePrices],
    soldAmounts: [...parser.soldAmounts],
    furniTypeId: parser.furniTypeId,
    furniCategoryId: parser.furniCategoryId,
    lowestCurrentPrice: Math.max(0, parser.lowestCurrentPrice ?? 0),
    suggestedPrice: Math.max(0, parser.suggestedPrice ?? 0)
});

/**
 * Marketplace statistics for one furni type (the official `marketplace_offer_details` and
 * `make_marketplace_offer` layouts both read them): the average sale price, how many offers are
 * open right now and the per-day price/volume history behind the chart.
 *
 * The server answers with the furni type id it was asked about, so several stat requests can be
 * in flight at once without one component picking up another's answer.
 */
export const useMarketplaceItemStats = (
    statsCategory: number,
    furniTypeId: number,
    options: { enabled?: boolean } = {}
): UseQueryResult<IMarketplaceItemStats> =>
    useOctaneQuery<MarketplaceItemStatsEvent, IMarketplaceItemStats>({
        key: ['octane', 'catalog', 'marketplaceItemStats', statsCategory, furniTypeId],
        request: () => new GetMarketplaceItemStatsComposer(statsCategory, furniTypeId),
        parser: MarketplaceItemStatsEvent,
        accept: (event) => {
            const parser = event.getParser();

            return !!parser && parser.furniTypeId === furniTypeId;
        },
        select: (event) => selectMarketplaceItemStats(event.getParser()),
        enabled: options.enabled !== false && furniTypeId > 0,
        staleTime: 60_000
    });
