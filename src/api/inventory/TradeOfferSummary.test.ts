import { describe, expect, it } from 'vitest';
import { getTradeOfferSummary, isTradeOfferingCredits } from './TradeOfferSummary';

describe('trade offer summary (AIR TradingView.showOfferInfo)', () => {
    it('counts the items and the credit value of one side', () => {
        expect(getTradeOfferSummary({ itemCount: 3, creditsCount: 25 })).toEqual({ items: '3 items', credits: '25 credits' });
    });

    it('reads an empty side as zero', () => {
        expect(getTradeOfferSummary(null)).toEqual({ items: '0 items', credits: '0 credits' });
    });

    it('warns when either side offers credit furni', () => {
        expect(isTradeOfferingCredits({ itemCount: 1, creditsCount: 0 }, { itemCount: 1, creditsCount: 0 })).toBe(false);
        expect(isTradeOfferingCredits({ itemCount: 1, creditsCount: 5 }, { itemCount: 0, creditsCount: 0 })).toBe(true);
        expect(isTradeOfferingCredits({ itemCount: 0, creditsCount: 0 }, { itemCount: 2, creditsCount: 10 })).toBe(true);
    });
});
