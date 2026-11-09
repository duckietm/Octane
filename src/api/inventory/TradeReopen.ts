import { TradeState } from './TradeState';

/**
 * The trade state once the offer changes or one side takes back its acceptance. Polaris then clears
 * both acceptances and confirmations (RoomTrade.clearAccepted) without saying so, so a trade already
 * counting down or confirming has to go back to running: left in CONFIRMING, the confirm click was
 * ignored by the server and the trade stayed stuck until cancelled.
 */
export const reopenedTradeState = (state: number): number =>
    state >= TradeState.TRADING_STATE_COUNTDOWN && state <= TradeState.TRADING_STATE_CONFIRMED ? TradeState.TRADING_STATE_RUNNING : state;
