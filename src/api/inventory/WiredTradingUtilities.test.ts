import { describe, expect, it } from 'vitest';
import {
    canOfferToWiredTrade,
    groupWiredTradeItems,
    isWiredTradePaymentOnly,
    IWiredTradeCandidate,
    WIRED_TRADE_ANY,
    WIRED_TRADE_ANY_COINS,
    WIRED_TRADE_ANY_FURNI,
    WIRED_TRADE_ERROR_ALREADY_MET,
    WIRED_TRADE_ERROR_EXCEEDS_REQUIREMENTS,
    WIRED_TRADE_ERROR_ICON,
    WIRED_TRADE_RULES,
    wiredTradeErrorMessage,
    wiredTradeInitialSecondsLeft,
    wiredTradePaymentLayout,
    wiredTradeTimeLeft,
} from './WiredTradingUtilities';

const chair: IWiredTradeCandidate = { className: 'chair_basic', isWallItem: false, typeId: 30, posterId: '', isPoster: false, unlockedCount: 3 };
const goldBar: IWiredTradeCandidate = { className: 'CF_50_goldbar', isWallItem: false, typeId: 90, posterId: '', isPoster: false, unlockedCount: 2 };
const poster: IWiredTradeCandidate = { className: 'poster', isWallItem: true, typeId: 4001, posterId: '23', isPoster: true, unlockedCount: 1 };

describe('wired trade: what may go on the table', () => {
    it('a furni chest deposit takes any furni but credit furni', () => {
        expect(canOfferToWiredTrade(WIRED_TRADE_ANY_FURNI, null, chair)).toBe(true);
        expect(canOfferToWiredTrade(WIRED_TRADE_ANY_FURNI, null, goldBar)).toBe(false);
    });

    it('a coin chest deposit takes credit furni only', () => {
        expect(canOfferToWiredTrade(WIRED_TRADE_ANY_COINS, null, goldBar)).toBe(true);
        expect(canOfferToWiredTrade(WIRED_TRADE_ANY_COINS, null, { ...goldBar, className: 'CFC_200_moneybag' })).toBe(true);
        expect(canOfferToWiredTrade(WIRED_TRADE_ANY_COINS, null, chair)).toBe(false);
    });

    it('a donation takes anything, but nothing that is all locked', () => {
        expect(canOfferToWiredTrade(WIRED_TRADE_ANY, null, chair)).toBe(true);
        expect(canOfferToWiredTrade(WIRED_TRADE_ANY, null, { ...chair, unlockedCount: 0 })).toBe(false);
    });

    it('a contract takes the furni types and coins its rules name', () => {
        const rules = [
            { nodes: [{ type: 1, itemType: { isWallItem: false, typeId: 30, legacyPosterId: '' } }] },
            { nodes: [{ type: 1, itemType: { isWallItem: true, typeId: 4001, legacyPosterId: '23' } }] },
        ];

        expect(canOfferToWiredTrade(WIRED_TRADE_RULES, rules, chair)).toBe(true);
        expect(canOfferToWiredTrade(WIRED_TRADE_RULES, rules, { ...chair, typeId: 31 })).toBe(false);
        expect(canOfferToWiredTrade(WIRED_TRADE_RULES, rules, poster)).toBe(true);
        expect(canOfferToWiredTrade(WIRED_TRADE_RULES, rules, { ...poster, posterId: '24' })).toBe(false);
        expect(canOfferToWiredTrade(WIRED_TRADE_RULES, rules, goldBar)).toBe(false);
        expect(canOfferToWiredTrade(WIRED_TRADE_RULES, [{ nodes: [{ type: 0 }] }], goldBar)).toBe(true);
    });
});

describe('wired trade: the panel', () => {
    it('a deposit or a rules trade without a reward is a payment', () => {
        expect(isWiredTradePaymentOnly(WIRED_TRADE_ANY_FURNI, null)).toBe(true);
        expect(isWiredTradePaymentOnly(WIRED_TRADE_ANY_COINS, null)).toBe(true);
        expect(isWiredTradePaymentOnly(WIRED_TRADE_RULES, null)).toBe(true);
        expect(isWiredTradePaymentOnly(WIRED_TRADE_RULES, { nodes: [] })).toBe(true);
        expect(isWiredTradePaymentOnly(WIRED_TRADE_RULES, { nodes: [{ type: 0 }] })).toBe(false);
    });

    it('shows AIR\'s games payment picture only for the games layout', () => {
        expect(wiredTradePaymentLayout('games')).toBe('games');
        expect(wiredTradePaymentLayout('generic')).toBe('generic');
        expect(wiredTradePaymentLayout('')).toBe('generic');
    });

    it('shows the time left under two minutes only', () => {
        expect(wiredTradeTimeLeft(300)).toBeNull();
        expect(wiredTradeTimeLeft(-1)).toBeNull();
        expect(wiredTradeTimeLeft(65)).toEqual({ minutes: '1', seconds: '05', time: '1:05' });
        expect(wiredTradeTimeLeft(0)).toEqual({ minutes: '0', seconds: '00', time: '0:00' });
    });

    it('a trade without a timeout never shows 0:00 left', () => {
        // Initiate Transaction with its timeout off sends 0: AIR's secondsLeft is -1 then and hides the text.
        expect(wiredTradeInitialSecondsLeft(0)).toBe(-1);
        expect(wiredTradeInitialSecondsLeft(-5)).toBe(-1);
        expect(wiredTradeTimeLeft(wiredTradeInitialSecondsLeft(0))).toBeNull();
        expect(wiredTradeInitialSecondsLeft(90)).toBe(90);
        expect(wiredTradeTimeLeft(wiredTradeInitialSecondsLeft(90))).toEqual({ minutes: '1', seconds: '30', time: '1:30' });
    });

    it('groups the table into a slot per kind', () => {
        const slots = groupWiredTradeItems([
            { itemId: 1, isWallItem: false, spriteId: 30, isGroupable: true },
            { itemId: 2, isWallItem: false, spriteId: 30, isGroupable: true },
            { itemId: 3, isWallItem: true, spriteId: 30, isGroupable: true },
            { itemId: 4, isWallItem: false, spriteId: 30, isGroupable: false },
            { itemId: 5, isWallItem: true, spriteId: 4001, isGroupable: true, posterId: '23' },
            { itemId: 6, isWallItem: true, spriteId: 4001, isGroupable: true, posterId: '24' },
        ]);

        expect(slots.map((slot) => slot.items.map((item) => item.itemId))).toEqual([[1, 2], [3], [4], [5], [6]]);
    });
});

describe('wired trade: refused offers (AIR onWiredTradeError)', () => {
    const texts: Record<string, string> = {
        'wired_transactions.notification.trade_error': 'Wired ruil error: %error%',
        'wired_transactions.notification.trade_error.4': 'Je hebt al voldaan aan de ruil vereisten',
        'wired_transactions.notification.trade_error.5': 'Overschrijdt de aanbiedings vereisten'
    };
    const localize = (key: string, parameters: string[] = [], replacements: string[] = []) =>
        (parameters ?? []).reduce((text, parameter, index) => text.replace(`%${ parameter }%`, replacements[index]), texts[key] ?? key);

    it('error 5 reads "exceeds the offering requirements" inside the trade error text', () => {
        expect(WIRED_TRADE_ERROR_EXCEEDS_REQUIREMENTS).toBe(5);
        expect(wiredTradeErrorMessage(5, localize)).toBe('Wired ruil error: Overschrijdt de aanbiedings vereisten');
    });

    it('error 4 reads "already met"', () => {
        expect(WIRED_TRADE_ERROR_ALREADY_MET).toBe(4);
        expect(wiredTradeErrorMessage(4, localize)).toBe('Wired ruil error: Je hebt al voldaan aan de ruil vereisten');
    });

    it('the bubble carries AIR\'s trading error icon', () => {
        expect(WIRED_TRADE_ERROR_ICON).toContain('chests_icon_trading_error');
    });
});
