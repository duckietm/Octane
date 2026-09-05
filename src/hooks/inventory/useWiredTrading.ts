import {
    IWiredTradeNode,
    IWiredTradeOfferedItem,
    IWiredTradeRewardCurrency,
    IWiredTradeRewardFurni,
    IWiredTradeRule,
    WIRED_TRADE_FAILURE_SILENT,
    WIRED_TRADE_STATE_ADDING_ITEMS,
    WIRED_TRADE_STATE_CONFIRMING,
    WIRED_TRADE_STATE_COUNTDOWN,
    WIRED_TRADE_STATE_READY,
    WiredTradeAcceptComposer,
    WiredTradeCancelComposer,
    WiredTradeCancelledEvent,
    WiredTradeCompletedEvent,
    WiredTradeItemsEvent,
    WiredTradeOfferItemsComposer,
    WiredTradeOpenEvent,
} from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../api';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

/** The client half of the countdown between accepting and being allowed to confirm. */
const CONFIRM_COUNTDOWN_SECONDS = 3;

const useWiredTradingState = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [contractType, setContractType] = useState(0);
    const [rewardText, setRewardText] = useState('');
    const [giveRules, setGiveRules] = useState<IWiredTradeRule[]>([]);
    const [rewardRule, setRewardRule] = useState<IWiredTradeRule>(null);
    const [showRequirements, setShowRequirements] = useState(false);

    const [state, setState] = useState(WIRED_TRADE_STATE_READY);
    const [canAccept, setCanAccept] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [offeredItems, setOfferedItems] = useState<IWiredTradeOfferedItem[]>([]);
    const [rewardFurni, setRewardFurni] = useState<IWiredTradeRewardFurni[]>([]);
    const [rewardCurrency, setRewardCurrency] = useState<IWiredTradeRewardCurrency[]>([]);
    const [missing, setMissing] = useState<IWiredTradeNode[]>([]);
    const [countdown, setCountdown] = useState(0);

    const { simpleAlert = null } = useNotification();

    // The server sends the clock once per change; ticking it locally keeps the window honest between
    // pushes without asking the server for a number it already knows.
    const secondsLeftRef = useRef(0);
    secondsLeftRef.current = secondsLeft;

    useMessageEvent<WiredTradeOpenEvent>(WiredTradeOpenEvent, (event) => {
        const parser = event.getParser();
        if (!parser) return;

        setContractType(parser.contractType);
        setRewardText(parser.rewardText);
        setGiveRules(parser.giveRules);
        setRewardRule(parser.rewardRule);
        setShowRequirements(parser.showRequirementsImmediate);
        setSecondsLeft(parser.timeoutSeconds);
        setCountdown(0);
        setIsOpen(true);
    });

    useMessageEvent<WiredTradeItemsEvent>(WiredTradeItemsEvent, (event) => {
        const parser = event.getParser();
        if (!parser) return;

        setState(parser.state);
        setCanAccept(parser.canAccept);
        setSecondsLeft(parser.secondsLeft);
        setOfferedItems(parser.offeredItems);
        setRewardFurni(parser.rewardFurni);
        setRewardCurrency(parser.rewardCurrency);
        setMissing(parser.missing);

        // The countdown belongs to an acceptance; any state that is not the countdown clears it, so a
        // withdrawn item cannot leave a stale timer running towards a confirm.
        if (parser.state !== WIRED_TRADE_STATE_COUNTDOWN) setCountdown(0);
    });

    useMessageEvent<WiredTradeCancelledEvent>(WiredTradeCancelledEvent, (event) => {
        const parser = event.getParser();
        if (!parser) return;

        setIsOpen(false);
        setState(WIRED_TRADE_STATE_READY);

        // Zero means the player closed it themselves. Telling somebody what they just did would be
        // noise, so only the reasons they did not choose are shown.
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

    useMessageEvent<WiredTradeCompletedEvent>(WiredTradeCompletedEvent, () => {
        setIsOpen(false);
        setState(WIRED_TRADE_STATE_READY);
        setCountdown(0);
    });

    useEffect(() => {
        if (!isOpen) return;

        const handle = window.setInterval(() => {
            setSecondsLeft(Math.max(0, secondsLeftRef.current - 1));
        }, 1000);

        return () => window.clearInterval(handle);
    }, [isOpen]);

    useEffect(() => {
        if (state !== WIRED_TRADE_STATE_COUNTDOWN || countdown <= 0) return;

        const handle = window.setTimeout(() => setCountdown((value) => value - 1), 1000);

        return () => window.clearTimeout(handle);
    }, [state, countdown]);

    const offerItems = useCallback((itemIds: number[]) => {
        if (!itemIds.length) return;

        SendMessageComposer(new WiredTradeOfferItemsComposer(false, ...itemIds));
    }, []);

    const withdrawItem = useCallback((itemId: number) => {
        SendMessageComposer(new WiredTradeOfferItemsComposer(true, itemId));
    }, []);

    /**
     * One button, two meanings. The first press agrees and starts the countdown; the second, once it
     * has run out, is the one that settles.
     */
    const progress = useCallback(() => {
        if (state === WIRED_TRADE_STATE_ADDING_ITEMS) {
            if (!canAccept) return;

            SendMessageComposer(new WiredTradeAcceptComposer(false));
            setCountdown(CONFIRM_COUNTDOWN_SECONDS);
            return;
        }

        if (state === WIRED_TRADE_STATE_CONFIRMING || (state === WIRED_TRADE_STATE_COUNTDOWN && countdown <= 0)) {
            SendMessageComposer(new WiredTradeAcceptComposer(true));
        }
    }, [canAccept, countdown, state]);

    const cancel = useCallback(() => {
        SendMessageComposer(new WiredTradeCancelComposer());
        setIsOpen(false);
        setState(WIRED_TRADE_STATE_READY);
    }, []);

    return {
        isOpen,
        contractType,
        rewardText,
        giveRules,
        rewardRule,
        showRequirements,
        setShowRequirements,
        state,
        canAccept,
        secondsLeft,
        countdown,
        offeredItems,
        rewardFurni,
        rewardCurrency,
        missing,
        offerItems,
        withdrawItem,
        progress,
        cancel,
    };
};

export const useWiredTrading = () => useSharedHook(useWiredTradingState);

registerSharedHook(useWiredTradingState);
