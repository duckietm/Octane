import { localizeWithFallback } from '../../../../api';

// TradingView.as opens ten slots per side (item_grid_0 / item_grid_1 are 5 x 2).
export const TRADE_SLOT_COUNT = 10;
export const TRADE_GRID_COLUMNS = 5;

export interface ITradeOfferSummary {
    itemCount: string;
    creditValue: string;
}

/**
 * The two lines under each trader's name (TradingView.showOfferInfo): how many items are on the
 * table and how many credits' worth of credit furni they add up to, both counted by the server.
 */
export const formatTradeOfferSummary = (itemCount: number, creditValue: number): ITradeOfferSummary => ({
    itemCount: localizeWithFallback('inventory.trading.info.itemcount', '%value% items', ['value'], [Math.max(0, itemCount ?? 0).toString()]),
    creditValue: localizeWithFallback('inventory.trading.info.creditvalue', '%value% credits', ['value'], [Math.max(0, creditValue ?? 0).toString()])
});
