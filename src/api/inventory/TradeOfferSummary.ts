import { localizeWithFallback } from '../utils/localizeWithFallback';

interface ITradeOfferTotals {
    itemCount: number;
    creditsCount: number;
}

/** AIR TradingView.showOfferInfo: the two lines under one side of the trade. */
export const getTradeOfferSummary = (user: ITradeOfferTotals): { items: string; credits: string } => {
    const items = String(user?.itemCount ?? 0);
    const credits = String(user?.creditsCount ?? 0);

    return {
        items: localizeWithFallback('inventory.trading.info.itemcount', `${ items } items`, ['value'], [items]),
        credits: localizeWithFallback('inventory.trading.info.creditvalue', `${ credits } credits`, ['value'], [credits])
    };
};

/** AIR TradingModel: the credit furni warning shows as soon as either side offers credit furni. */
export const isTradeOfferingCredits = (ownUser: ITradeOfferTotals, otherUser: ITradeOfferTotals): boolean =>
    (ownUser?.creditsCount ?? 0) > 0 || (otherUser?.creditsCount ?? 0) > 0;
