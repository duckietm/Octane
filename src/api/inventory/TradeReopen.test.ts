import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { reopenedTradeState } from './TradeReopen';
import { TradeState } from './TradeState';

/**
 * Polaris clears both acceptances and confirmations whenever the offer changes and tells the client
 * nothing but the new list. A trade already counting down went on to CONFIRMING, the confirm click was
 * ignored by the server (it needs a fresh acceptance) and the trade stayed stuck until cancelled.
 */
describe('reopenedTradeState', () => {
    it('sends a trade counting down or confirming back to running', () => {
        expect(reopenedTradeState(TradeState.TRADING_STATE_COUNTDOWN)).toBe(TradeState.TRADING_STATE_RUNNING);
        expect(reopenedTradeState(TradeState.TRADING_STATE_CONFIRMING)).toBe(TradeState.TRADING_STATE_RUNNING);
        expect(reopenedTradeState(TradeState.TRADING_STATE_CONFIRMED)).toBe(TradeState.TRADING_STATE_RUNNING);
    });

    it('leaves every other state alone', () => {
        expect(reopenedTradeState(TradeState.TRADING_STATE_READY)).toBe(TradeState.TRADING_STATE_READY);
        expect(reopenedTradeState(TradeState.TRADING_STATE_RUNNING)).toBe(TradeState.TRADING_STATE_RUNNING);
        expect(reopenedTradeState(TradeState.TRADING_STATE_COMPLETED)).toBe(TradeState.TRADING_STATE_COMPLETED);
        expect(reopenedTradeState(TradeState.TRADING_STATE_CANCELLED)).toBe(TradeState.TRADING_STATE_CANCELLED);
    });

    it('the trade hook reopens on a new offer and on a withdrawn acceptance', () => {
        const hook = readFileSync(new URL('../../hooks/inventory/useInventoryTrade.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

        expect(hook).toContain('if (!parser.userAccepts) setTradeState(reopenedTradeState);');
        expect(hook.match(/newValue\.accepts = false;/g)?.length).toBe(2);
        expect(hook).toContain('        setTradeState(reopenedTradeState);\n    });');
    });
});
