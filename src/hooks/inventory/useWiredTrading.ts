import {
    ItemDataStructure,
    IWiredTradeRule,
    WIRED_TRADE_FAILURE_SILENT,
    WIRED_TRADE_REQUIREMENT_ANY,
    WIRED_TRADE_REQUIREMENT_RULES,
    WIRED_TRADE_RULES_NORMAL,
    WiredTradeAcceptComposer,
    WiredTradeCancelComposer,
    WiredTradeCancelledEvent,
    WiredTradeCompletedEvent,
    WiredTradeItemsEvent,
    WiredTradeOfferItemsComposer,
    WiredTradeOpenEvent,
} from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { localizeWithFallback, SendMessageComposer, wiredTradeInitialSecondsLeft } from '../../api';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';
import { useInventoryFurni } from './useInventoryFurni';

/**
 * The client-side trade states of AIR WiredTradingModel. The server sends no state (WiredTradeItems 705 only carries
 * the table, canAccept and extra), so the client keeps its own: adding items -> accept sends 609(false) and starts the
 * countdown -> confirming -> confirm sends 609(true).
 */
export const WIRED_TRADING_STATE_CLOSED = 0;
export const WIRED_TRADING_STATE_ADDING_ITEMS = 1;
export const WIRED_TRADING_STATE_COUNTDOWN = 2;
export const WIRED_TRADING_STATE_CONFIRMING = 3;
export const WIRED_TRADING_STATE_CONFIRMED = 4;

/** The client half of the countdown between accepting and being allowed to confirm. */
export const WIRED_TRADING_COUNTDOWN_SECONDS = 3;

const sameItems = (left: ItemDataStructure[], right: ItemDataStructure[]): boolean =>
    left.length === right.length && left.every((item, index) => item.itemId === right[index].itemId);

const useWiredTradingState = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [requirementType, setRequirementType] = useState(WIRED_TRADE_REQUIREMENT_ANY);
    const [youGetText, setYouGetText] = useState('');
    const [layoutType, setLayoutType] = useState('');
    const [giveRules, setGiveRules] = useState<IWiredTradeRule[]>([]);
    const [getRule, setGetRule] = useState<IWiredTradeRule>(null);
    const [rulesType, setRulesType] = useState(WIRED_TRADE_RULES_NORMAL);
    const [multiplier, setMultiplier] = useState(1);
    const [autoMultiplierMax, setAutoMultiplierMax] = useState(0);
    const [showRequirements, setShowRequirements] = useState(false);
    const [requirementsHighlight, setRequirementsHighlight] = useState(0);

    const [state, setState] = useState(WIRED_TRADING_STATE_CLOSED);
    const [canAccept, setCanAccept] = useState(false);
    const [extra, setExtra] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [offeredItems, setOfferedItems] = useState<ItemDataStructure[]>([]);
    const [offeredCredits, setOfferedCredits] = useState(0);
    const [rewardItems, setRewardItems] = useState<ItemDataStructure[]>([]);
    const [rewardCredits, setRewardCredits] = useState(0);
    const [countdown, setCountdown] = useState(0);

    const { simpleAlert = null } = useNotification();
    const { setGroupItems = null, activate = null, deactivate = null } = useInventoryFurni();

    const secondsLeftRef = useRef(0);
    secondsLeftRef.current = secondsLeft;

    const reset = useCallback(() => {
        setIsOpen(false);
        setState(WIRED_TRADING_STATE_CLOSED);
        setCountdown(0);
        setCanAccept(false);
        setExtra(0);
        setOfferedItems([]);
        setOfferedCredits(0);
        setRewardItems([]);
        setRewardCredits(0);
    }, []);

    useMessageEvent<WiredTradeOpenEvent>(WiredTradeOpenEvent, (event) => {
        const parser = event.getParser();
        if (!parser) return;

        // AIR ignores a rules requirement that has no give side.
        if (parser.requirementType === WIRED_TRADE_REQUIREMENT_RULES && !parser.giveRules) return;

        // A second trade only replaces an open one when the server says so.
        if (isOpen && !parser.overridePreviousTrade) return;

        // AIR WiredTradingModel.onWiredTradeInitiate: a trade that replaces the open one (Initiate Transaction stacked on
        // Cancel Transaction) swaps the requirements in the same window and highlights them.
        if (isOpen) setRequirementsHighlight((value) => value + 1);

        setRequirementType(parser.requirementType);
        setYouGetText(parser.youGetText);
        setLayoutType(parser.layoutType);
        setGiveRules(parser.giveRules ?? []);
        setGetRule(parser.getRule);
        setRulesType(parser.rulesType);
        setMultiplier(parser.multiplier);
        setAutoMultiplierMax(parser.autoMultiplierMax);
        setShowRequirements(parser.showRequirementsImmediate);
        setSecondsLeft(wiredTradeInitialSecondsLeft(parser.timeoutSeconds));
        setCanAccept(false);
        setExtra(0);
        setOfferedItems([]);
        setOfferedCredits(0);
        setRewardItems([]);
        setRewardCredits(0);
        setCountdown(0);
        setState(WIRED_TRADING_STATE_ADDING_ITEMS);
        setIsOpen(true);
    });

    useMessageEvent<WiredTradeItemsEvent>(WiredTradeItemsEvent, (event) => {
        const parser = event.getParser();
        if (!parser) return;

        const nextOffered = parser.firstUserItemArray ?? [];

        // A changed table or requirements that stop being met take back an acceptance that has not been confirmed.
        if (!sameItems(offeredItems, nextOffered) || !parser.canAccept) {
            setState((current) => (current === WIRED_TRADING_STATE_COUNTDOWN || current === WIRED_TRADING_STATE_CONFIRMING)
                ? WIRED_TRADING_STATE_ADDING_ITEMS
                : current);
            setCountdown(0);
        }

        setOfferedItems(nextOffered);
        setOfferedCredits(parser.firstUserNumCredits);
        setRewardItems(parser.secondUserItemArray ?? []);
        setRewardCredits(parser.secondUserNumCredits);
        setCanAccept(parser.canAccept);
        setExtra(parser.extra);
    });

    useMessageEvent<WiredTradeCancelledEvent>(WiredTradeCancelledEvent, (event) => {
        const parser = event.getParser();
        if (!parser) return;

        reset();

        // AIR tradeIsCancelled -> alertTradeCancelled(reason). Zero is the player closing it themselves.
        if (parser.failureId === WIRED_TRADE_FAILURE_SILENT || !simpleAlert) return;

        simpleAlert(
            localizeWithFallback(
                `wired_transactions.notification.fail.${ parser.failureId }`,
                'The transaction could not be completed.',
            ),
            null,
            null,
            null,
            localizeWithFallback('wired_transactions.notification.fail.popup.title', 'Transaction failed'),
        );
    });

    useMessageEvent<WiredTradeCompletedEvent>(WiredTradeCompletedEvent, () => reset());

    // The furni come from the inventory, as in a user trade: while the trade is open the furni list is live, so the
    // server's refresh after every offer (the offered items leave the inventory) reaches the grid.
    useEffect(() => {
        if (!isOpen || !activate) return;

        const id = activate();

        return () => deactivate(id);
    }, [isOpen, activate, deactivate]);

    // What is on the table is locked in the inventory grid until the server's refresh takes it out, so the same item
    // can not be offered twice (AIR locks the offered items in the furni view the same way).
    useEffect(() => {
        if (!setGroupItems) return;

        const tableIds = isOpen ? offeredItems.map((item) => item.ref) : [];

        setGroupItems((previous) => {
            let changed = false;
            const next = previous.map((group) => {
                const copy = group.clone();

                if (!copy.lockItemIds(tableIds)) return group;

                changed = true;
                return copy;
            });

            return changed ? next : previous;
        });
    }, [isOpen, offeredItems, setGroupItems]);

    // The trade time-out from WiredTradeOpen (84) runs locally; a trade without one has none to run.
    const hasTimeout = secondsLeft >= 0;
    useEffect(() => {
        if (!isOpen || !hasTimeout) return;

        const handle = window.setInterval(() => {
            setSecondsLeft(Math.max(0, secondsLeftRef.current - 1));
        }, 1000);

        return () => window.clearInterval(handle);
    }, [isOpen, hasTimeout]);

    useEffect(() => {
        if (state !== WIRED_TRADING_STATE_COUNTDOWN) return;

        const handle = window.setTimeout(() => {
            setCountdown((value) => value - 1);
            if (countdown <= 1) setState(WIRED_TRADING_STATE_CONFIRMING);
        }, 1000);

        return () => window.clearTimeout(handle);
    }, [state, countdown]);

    const offerItems = useCallback((itemIds: number[]) => {
        if (!itemIds.length || state !== WIRED_TRADING_STATE_ADDING_ITEMS) return;

        SendMessageComposer(new WiredTradeOfferItemsComposer(false, ...itemIds));
    }, [state]);

    const withdrawItem = useCallback((itemId: number) => {
        if (state !== WIRED_TRADING_STATE_ADDING_ITEMS) return;

        SendMessageComposer(new WiredTradeOfferItemsComposer(true, itemId));
    }, [state]);

    /** Accept (609 false) while adding items, confirm (609 true) once the countdown has run out. */
    const progress = useCallback(() => {
        if (state === WIRED_TRADING_STATE_ADDING_ITEMS) {
            if (!canAccept) return;

            SendMessageComposer(new WiredTradeAcceptComposer(false));
            setCountdown(WIRED_TRADING_COUNTDOWN_SECONDS);
            setState(WIRED_TRADING_STATE_COUNTDOWN);
            return;
        }

        if (state === WIRED_TRADING_STATE_CONFIRMING) {
            SendMessageComposer(new WiredTradeAcceptComposer(true));
            setState(WIRED_TRADING_STATE_CONFIRMED);
        }
    }, [canAccept, state]);

    const cancel = useCallback(() => {
        SendMessageComposer(new WiredTradeCancelComposer());
        reset();
    }, [reset]);

    return {
        isOpen,
        requirementType,
        youGetText,
        layoutType,
        giveRules,
        getRule,
        rulesType,
        multiplier,
        autoMultiplierMax,
        showRequirements,
        setShowRequirements,
        requirementsHighlight,
        state,
        canAccept,
        extra,
        secondsLeft,
        countdown,
        offeredItems,
        offeredCredits,
        rewardItems,
        rewardCredits,
        offerItems,
        withdrawItem,
        progress,
        cancel,
    };
};

export const useWiredTrading = () => useSharedHook(useWiredTradingState);

registerSharedHook(useWiredTradingState);
