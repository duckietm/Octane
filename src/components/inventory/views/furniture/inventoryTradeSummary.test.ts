import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string, parameters: string[] = [], replacements: string[] = []) =>
        parameters.reduce((text, parameter, index) => text.replace(`%${parameter}%`, replacements[index]), fallback)
}));

import { TradeState } from '../../../../api/inventory/TradeState';
import {
    formatTradeOfferSummary,
    getTradeAccountWarnings,
    getTradeHelpText,
    hasTradeCreditFurni,
    TRADE_GRID_COLUMNS,
    TRADE_SLOT_COUNT
} from './inventoryTradeSummary';

describe('inventory trade summary', () => {
    it('offers nine slots laid out three per row like inventory_trading.xml (TradingModel.MAX_ITEMS_TO_TRADE)', () => {
        expect(TRADE_SLOT_COUNT).toBe(9);
        expect(TRADE_GRID_COLUMNS).toBe(3);
        expect(TRADE_SLOT_COUNT % TRADE_GRID_COLUMNS).toBe(0);
    });

    it('formats the item count and credit value lines for one side', () => {
        expect(formatTradeOfferSummary(3, 25)).toEqual({ itemCount: '3 items', creditValue: '25 credits' });
    });

    it('never shows negative or missing counts', () => {
        expect(formatTradeOfferSummary(undefined, -4)).toEqual({ itemCount: '0 items', creditValue: '0 credits' });
    });

    it('replaces the disabled side of the trade with its account warning (TradingView.setup)', () => {
        expect(getTradeAccountWarnings(true, true)).toEqual({ infoMessage: null, ownNotification: null, otherNotification: null });

        const ownDisabled = getTradeAccountWarnings(false, true);
        expect(ownDisabled.infoMessage).toBeNull();
        expect(ownDisabled.ownNotification).toContain('This account does not have trading in use');
        expect(ownDisabled.otherNotification).toBeNull();

        const otherDisabled = getTradeAccountWarnings(true, false);
        expect(otherDisabled.ownNotification).toBeNull();
        expect(otherDisabled.otherNotification).toContain('This user does not have trading in use');
    });

    it('hides both grids behind the shared warning when neither account can trade', () => {
        expect(getTradeAccountWarnings(false, false)).toEqual({
            infoMessage: 'Trading is not in use for either of you, check your trading settings.',
            ownNotification: '',
            otherNotification: ''
        });
    });

    it('follows the official help line per trade state', () => {
        expect(getTradeHelpText(TradeState.TRADING_STATE_RUNNING)).toContain('Add the items');
        expect(getTradeHelpText(TradeState.TRADING_STATE_COUNTDOWN)).toContain('WARNING');
        expect(getTradeHelpText(TradeState.TRADING_STATE_CONFIRMING)).toContain('WARNING');
        expect(getTradeHelpText(TradeState.TRADING_STATE_CONFIRMED)).toContain('Waiting for other user');
        expect(getTradeHelpText(TradeState.TRADING_STATE_READY)).toBe('');
    });

    it('raises the credits warning as soon as either side offers credit furni', () => {
        expect(hasTradeCreditFurni(0, 0)).toBe(false);
        expect(hasTradeCreditFurni(5, 0)).toBe(true);
        expect(hasTradeCreditFurni(0, 1)).toBe(true);
        expect(hasTradeCreditFurni(undefined, null)).toBe(false);
    });
});
