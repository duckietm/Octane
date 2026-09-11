import { localizeWithFallback } from '../../../../api';
import { TradeState } from '../../../../api/inventory/TradeState';

// TradingModel.MAX_ITEMS_TO_TRADE = 9: item_grid_0 / item_grid_1 of inventory_trading.xml are 3 x 3
// (nine 40px borders inside a 132px itemgrid_vertical).
export const TRADE_SLOT_COUNT = 9;
export const TRADE_GRID_COLUMNS = 3;

export interface ITradeOfferSummary {
    itemCount: string;
    creditValue: string;
}

export interface ITradeAccountWarnings {
    /** help_text line replacing the state message (TradingView.setup, both accounts disabled). */
    infoMessage: string | null;
    /** info_text_0 shown instead of item_grid_0; an empty string hides the grid without a message. */
    ownNotification: string | null;
    /** info_text_1 shown instead of item_grid_1. */
    otherNotification: string | null;
}

/**
 * The two lines under each trader's name (TradingView.showOfferInfo): how many items are on the
 * table and how many credits' worth of credit furni they add up to, both counted by the server.
 */
export const formatTradeOfferSummary = (itemCount: number, creditValue: number): ITradeOfferSummary => ({
    itemCount: localizeWithFallback('inventory.trading.info.itemcount', '%value% items', ['value'], [Math.max(0, itemCount ?? 0).toString()]),
    creditValue: localizeWithFallback('inventory.trading.info.creditvalue', '%value% credits', ['value'], [Math.max(0, creditValue ?? 0).toString()])
});

/**
 * TradingView.setup(ownUserId, ownCanTrade, otherUserId, otherCanTrade): when neither account can
 * trade the help line says so and both grids are hidden; otherwise only the disabled side loses
 * its grid to the matching warning.
 */
export const getTradeAccountWarnings = (ownCanTrade: boolean, otherCanTrade: boolean): ITradeAccountWarnings => {
    if (!ownCanTrade && !otherCanTrade) {
        return {
            infoMessage: localizeWithFallback(
                'inventory.trading.warning.both_accounts_disabled',
                'Trading is not in use for either of you, check your trading settings.'
            ),
            ownNotification: '',
            otherNotification: ''
        };
    }

    return {
        infoMessage: null,
        ownNotification: ownCanTrade
            ? null
            : localizeWithFallback(
                  'inventory.trading.warning.own_account_disabled',
                  'This account does not have trading in use. You can receive items from other users but you cannot give them anything. Check your trading settings and make sure your email address is activated.'
              ),
        otherNotification: otherCanTrade
            ? null
            : localizeWithFallback(
                  'inventory.trading.warning.others_account_disabled',
                  "This user does not have trading in use. You can give him/her items but he/she can't give you anything in return."
              )
    };
};

/** help_text per state, TradingView.updateActionState. */
export const getTradeHelpText = (tradeState: number): string => {
    switch (tradeState) {
        case TradeState.TRADING_STATE_RUNNING:
            return localizeWithFallback('inventory.trading.info.add', "Add the items you'd like to trade in the box below.");
        case TradeState.TRADING_STATE_COUNTDOWN:
        case TradeState.TRADING_STATE_CONFIRMING:
        case TradeState.TRADING_STATE_COMPLETED:
            return localizeWithFallback('inventory.trading.info.confirm', 'WARNING: ensure the items displayed are the ones you agreed to trade.');
        case TradeState.TRADING_STATE_CONFIRMED:
            return localizeWithFallback('inventory.trading.info.waiting', 'Waiting for other user to confirm the trade.');
        default:
            return '';
    }
};

/**
 * TradingModel.isCreditFurniPresent: either side's credit-furni value is above zero, which turns on
 * the highlighted `inventory.trading.warning.credits` strip (TradingView.updateActionState).
 */
export const hasTradeCreditFurni = (ownCreditsCount: number, otherCreditsCount: number): boolean => (ownCreditsCount ?? 0) > 0 || (otherCreditsCount ?? 0) > 0;
