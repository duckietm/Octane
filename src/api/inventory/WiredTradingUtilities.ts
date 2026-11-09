import tradingErrorIcon from '../../assets/images/notifications/wired/chests_icon_trading_error.png';

/**
 * The rules of AIR's wired trade panel (inventory/wired_trading: WiredTradingModel, WiredTradingView,
 * WiredTradeRequirementsModel), kept apart from the view so they can be tested without a room.
 */

/** AIR TradeRequirement types, as the renderer's WIRED_TRADE_REQUIREMENT_* constants. */
export const WIRED_TRADE_ANY_COINS = 0;
export const WIRED_TRADE_ANY_FURNI = 1;
export const WIRED_TRADE_ANY = 2;
export const WIRED_TRADE_RULES = 4;

/** Node types of a rule, as the renderer's WIRED_TRADE_NODE_* constants. */
const NODE_COINS = 0;
const NODE_FURNI = 1;

export interface IWiredTradeRuleLike {
    nodes: { type: number; itemType?: { isWallItem: boolean; typeId: number; legacyPosterId: string } | null }[];
}

/** What the inventory furni grid knows about a group, enough to decide whether it may go on the table. */
export interface IWiredTradeCandidate {
    className: string;
    isWallItem: boolean;
    typeId: number;
    /** The poster id of a poster, else empty. */
    posterId: string;
    isPoster: boolean;
    unlockedCount: number;
}

/** Credit furni (the server also takes the CFC_ kind as coins). */
export const isCreditFurniClass = (className: string): boolean =>
    !!className && (className.startsWith('CF_') || className.startsWith('CFC_'));

/**
 * AIR TradeRequirement.isPaymentOnly: a trade that hands nothing back, which is every plain requirement (a chest
 * deposit, a donation) and a rules trade without a "you get" rule. AIR's WiredTradingModel.canAccept() is this.
 */
export const isWiredTradePaymentOnly = (requirementType: number, getRule: IWiredTradeRuleLike | null): boolean =>
    requirementType !== WIRED_TRADE_RULES || !getRule || !getRule.nodes || getRule.nodes.length === 0;

/**
 * AIR WiredTradeRequirementsModel.canOfferFurni: whether a group of the inventory may go on the table. Nothing
 * locked, then by the requirement: anything; any furni but credit furni; credit furni only (a coin chest takes
 * credit furni, which become its coins); or for rules, credit furni when a rule asks for coins and other furni of
 * a type a rule names (a poster by its poster id).
 */
export const canOfferToWiredTrade = (
    requirementType: number,
    giveRules: IWiredTradeRuleLike[] | null,
    candidate: IWiredTradeCandidate): boolean => {
    if (!candidate || candidate.unlockedCount <= 0) return false;

    const credit = isCreditFurniClass(candidate.className);

    switch (requirementType) {
        case WIRED_TRADE_ANY:
            return true;
        case WIRED_TRADE_ANY_FURNI:
            return !credit;
        case WIRED_TRADE_ANY_COINS:
            return credit;
        case WIRED_TRADE_RULES: {
            const nodes = (giveRules ?? []).flatMap((rule) => rule?.nodes ?? []);

            if (credit) return nodes.some((node) => node.type === NODE_COINS);

            return nodes.some((node) => {
                if (node.type !== NODE_FURNI || !node.itemType) return false;
                if (node.itemType.isWallItem !== candidate.isWallItem) return false;
                if (node.itemType.typeId !== candidate.typeId) return false;
                if (candidate.isWallItem && candidate.isPoster) return (node.itemType.legacyPosterId ?? '') === candidate.posterId;

                return true;
            });
        }
        default:
            return true;
    }
};

/** AIR WiredTradingView: the payment placeholder is `wired_chests_images_<layoutType>_payments`. */
export const wiredTradePaymentLayout = (layoutType: string): 'generic' | 'games' => (layoutType === 'games' ? 'games' : 'generic');

/**
 * AIR WiredTradingModel.secondsLeft at the start of a trade: the server's timeout, or -1 for a trade without one (an
 * Initiate Transaction with the timeout off sends 0), which keeps the time left hidden instead of showing 0:00.
 */
export const wiredTradeInitialSecondsLeft = (timeoutSeconds: number): number =>
    (Number.isFinite(timeoutSeconds) && timeoutSeconds > 0) ? Math.trunc(timeoutSeconds) : -1;

/**
 * AIR WiredTradingView.updateSecondsLeftUI: the time left shows only under two minutes, as minutes and two-digit
 * seconds; null hides it.
 */
export const wiredTradeTimeLeft = (secondsLeft: number): { minutes: string; seconds: string; time: string } | null => {
    if (!(secondsLeft >= 0 && secondsLeft < 120)) return null;

    const minutes = Math.trunc(secondsLeft / 60);
    const rest = secondsLeft - (minutes * 60);
    const seconds = rest < 10 ? `0${ rest }` : String(rest);

    return { minutes: String(minutes), seconds, time: `${ minutes }:${ seconds }` };
};

/** One slot of the table: items of one kind, as AIR groups them, in the order they were put down. */
export interface IWiredTradeSlot<T> {
    key: string;
    items: T[];
}

/**
 * Groups the table into slots the way the client groups trade items: one per furni type (a poster per poster id),
 * and one of its own for anything that does not stack.
 */
export const groupWiredTradeItems = <T extends { itemId: number; isWallItem: boolean; spriteId: number; isGroupable: boolean; posterId?: string }>(
    items: T[]): IWiredTradeSlot<T>[] => {
    const slots = new Map<string, IWiredTradeSlot<T>>();

    for (const item of items ?? []) {
        const key = !item.isGroupable
            ? `item:${ item.itemId }`
            : `${ item.isWallItem ? 'I' : 'S' }${ item.spriteId }${ item.posterId ? `:${ item.posterId }` : '' }`;
        const slot = slots.get(key) ?? { key, items: [] };

        slot.items.push(item);
        slots.set(key, slot);
    }

    return [...slots.values()];
};

/** AIR's icon on a refused trade action (the notifications asset `chests_icon_trading_error`). */
export const WIRED_TRADE_ERROR_ICON: string = tradingErrorIcon;

/** Trade error 4: the table already meets every requirement. */
export const WIRED_TRADE_ERROR_ALREADY_MET = 4;

/** Trade error 5: the item would put more on the table than the requirements ask (a coin past the price, a furni not asked). */
export const WIRED_TRADE_ERROR_EXCEEDS_REQUIREMENTS = 5;

/**
 * AIR notifications onWiredTradeError: `wired_transactions.notification.trade_error` with %error% the text of the
 * error id (`.trade_error.<id>`), shown as an info bubble with {@link WIRED_TRADE_ERROR_ICON}.
 */
export const wiredTradeErrorMessage = (errorId: number, localize: (key: string, parameters?: string[], replacements?: string[]) => string): string =>
    localize('wired_transactions.notification.trade_error', ['error'], [localize(`wired_transactions.notification.trade_error.${ errorId }`)]);
