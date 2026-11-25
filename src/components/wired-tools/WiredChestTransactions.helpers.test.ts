import { describe, expect, it, vi } from 'vitest';

vi.mock('../../api', () => ({
    localizeWithFallback: (key: string, _fallback: string, params?: string[], values?: string[]) => (params ? `${key}:${values.join('/')}` : key)
}));

import { chestTransactionMethodText, lastChestLogPage, summarizeChestTransaction } from './WiredChestTransactions.helpers';

describe('chest transaction log helpers (AIR TransactionTableObject)', () => {
    it('summarises one side of a transaction as AIR does', () => {
        expect(summarizeChestTransaction(0, 0)).toBe('-');
        expect(summarizeChestTransaction(3, 0)).toBe('wiredchests.logs.only_furni:3');
        expect(summarizeChestTransaction(0, 25)).toBe('wiredchests.logs.only_coins:25');
        expect(summarizeChestTransaction(3, 25)).toBe('wiredchests.logs.furni_and_coins:3/25');
    });

    it('names the method from the hotel texts', () => {
        expect(chestTransactionMethodText(4)).toBe('wired_transactions.type.4');
    });

    it('works out the last page from the total', () => {
        expect(lastChestLogPage(0, 10)).toBe(1);
        expect(lastChestLogPage(10, 10)).toBe(1);
        expect(lastChestLogPage(11, 10)).toBe(2);
        expect(lastChestLogPage(25, 10)).toBe(3);
    });
});
