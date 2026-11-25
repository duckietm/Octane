import { localizeWithFallback } from '../../api';

const METHOD_FALLBACKS = ['MANUAL', 'WIRED', 'CONTRACT_PAYMENT', 'CONTRACT_REWARD', 'CONTRACT_TRADE', 'AUTO_WITHDRAW'];

/** AIR `wired_transactions.type.N`: how the transaction came about. */
export const chestTransactionMethodText = (method: number): string => localizeWithFallback(`wired_transactions.type.${method}`, METHOD_FALLBACKS[method] ?? String(method));

/**
 * AIR TransactionTableObject.summarize: what one side of a transaction moved. "-" for nothing, else the furni,
 * the coins, or both.
 */
export const summarizeChestTransaction = (furni: number, coins: number): string => {
    if (furni <= 0 && coins <= 0) return '-';
    if (furni > 0 && coins <= 0) return localizeWithFallback('wiredchests.logs.only_furni', '%amount% furni', ['amount'], [String(furni)]);
    if (furni <= 0 && coins > 0) return localizeWithFallback('wiredchests.logs.only_coins', '%amount% coins', ['amount'], [String(coins)]);

    return localizeWithFallback('wiredchests.logs.furni_and_coins', '%amount% furni + %amount2%c', ['amount', 'amount2'], [String(furni), String(coins)]);
};

/** AIR WiredTransactionLogsView.calculateLastPage: the list message carries the total, not the page count. */
export const lastChestLogPage = (total: number, pageSize: number): number => Math.floor(Math.max(total - 1, 0) / Math.max(pageSize, 1)) + 1;
