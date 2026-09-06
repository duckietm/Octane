import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string, parameters: string[], replacements: string[]) =>
        parameters.reduce((text, parameter, index) => text.replace(`%${parameter}%`, replacements[index]), fallback)
}));

import { formatTradeOfferSummary, TRADE_GRID_COLUMNS, TRADE_SLOT_COUNT } from './inventoryTradeSummary';

describe('inventory trade summary', () => {
    it('offers ten slots laid out five per row like the official trading window', () => {
        expect(TRADE_SLOT_COUNT).toBe(10);
        expect(TRADE_SLOT_COUNT % TRADE_GRID_COLUMNS).toBe(0);
    });

    it('formats the item count and credit value lines for one side', () => {
        expect(formatTradeOfferSummary(3, 25)).toEqual({ itemCount: '3 items', creditValue: '25 credits' });
    });

    it('never shows negative or missing counts', () => {
        expect(formatTradeOfferSummary(undefined, -4)).toEqual({ itemCount: '0 items', creditValue: '0 credits' });
    });
});
