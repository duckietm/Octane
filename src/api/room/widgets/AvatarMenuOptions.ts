import { AvatarInfoUser } from './AvatarInfoUser';

/** Flash's ambassador mute rows: 15 and 60 minutes, 18, 36 and 72 hours. */
export const AMBASSADOR_MUTE_MINUTES: ReadonlyArray<number> = [15, 60, 1080, 2160, 4320];

/** The infostand text of a mute row (`infostand.button.mute_15min`, `..._18hour`). */
export const getMuteLabelKey = (minutes: number): string =>
    minutes > 60 && minutes % 60 === 0 ? `infostand.button.mute_${minutes / 60}hour` : `infostand.button.mute_${minutes}min`;

/** Why the trade row is off, or null while trading is possible. */
export const getTradeBlockedKey = (canTrade: boolean, canTradeReason: number): string => {
    if (canTrade) return null;

    if (canTradeReason === AvatarInfoUser.TRADE_REASON_SHUTDOWN) return 'infostand.button.trade.tooltip.shutdown';

    return 'infostand.button.trade.tooltip.tradingroom';
};

/** The "more respect" row shows once the day's respects are gone and a replenish is left. */
export const canReplenishRespect = (respectsLeft: number, replenishesLeft: number): boolean => respectsLeft <= 0 && replenishesLeft > 0;
