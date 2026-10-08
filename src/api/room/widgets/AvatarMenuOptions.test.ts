import { describe, expect, it } from 'vitest';
import { AvatarInfoUser } from './AvatarInfoUser';
import { AMBASSADOR_MUTE_MINUTES, canReplenishRespect, getMuteLabelKey, getTradeBlockedKey } from './AvatarMenuOptions';

describe('AvatarMenuOptions', () => {
    it('labels every ambassador mute with an existing text key', () => {
        expect(AMBASSADOR_MUTE_MINUTES.map(getMuteLabelKey)).toEqual([
            'infostand.button.mute_15min',
            'infostand.button.mute_60min',
            'infostand.button.mute_18hour',
            'infostand.button.mute_36hour',
            'infostand.button.mute_72hour'
        ]);
    });

    it('explains why trading is off', () => {
        expect(getTradeBlockedKey(true, AvatarInfoUser.TRADE_REASON_NO_TRADING)).toBeNull();
        expect(getTradeBlockedKey(false, AvatarInfoUser.TRADE_REASON_SHUTDOWN)).toBe('infostand.button.trade.tooltip.shutdown');
        expect(getTradeBlockedKey(false, AvatarInfoUser.TRADE_REASON_NO_TRADING)).toBe('infostand.button.trade.tooltip.tradingroom');
    });

    it('offers a replenish only when respects are gone and one is left', () => {
        expect(canReplenishRespect(0, 1)).toBe(true);
        expect(canReplenishRespect(1, 1)).toBe(false);
        expect(canReplenishRespect(0, 0)).toBe(false);
    });
});
