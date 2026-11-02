import {
    IWheelAdminPrize,
    IWheelAdminPrizeEdit,
    IWheelPrize,
    IWheelRecentWin,
    WheelAdminGetPrizesComposer,
    WheelAdminPrizesEvent,
    WheelAdminSavePrizesComposer,
    WheelBuySpinComposer,
    WheelDataEvent,
    WheelOpenComposer,
    WheelRecentWinsEvent,
    WheelResultEvent,
    WheelSpinComposer
} from '@octane/renderer';
import { useCallback, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/** How long a spin or a purchase waits for the server before the buttons come back. */
const REQUEST_TIMEOUT_MS = 5000;

// Fortune wheel state + actions. Shared via the Zustand bridge so the event listeners
// register once regardless of how many components read it.
export const useFortuneWheelState = () => {
    const [freeSpins, setFreeSpins] = useState(0);
    const [extraSpins, setExtraSpins] = useState(0);
    const [spinCost, setSpinCost] = useState(0);
    const [spinCostType, setSpinCostType] = useState(-1);
    const [prizes, setPrizes] = useState<IWheelPrize[]>([]);
    const [recentWins, setRecentWins] = useState<IWheelRecentWin[]>([]);
    const [pendingPrizeId, setPendingPrizeId] = useState<number>(-1);
    const [isSpinning, setIsSpinning] = useState(false);
    const isSpinningRef = useRef(false);
    isSpinningRef.current = isSpinning;
    const [adminPrizes, setAdminPrizes] = useState<IWheelAdminPrize[]>([]);

    // One spin or purchase at a time, until the server answers: a double click used to send two, spending two spins
    // or paying twice. The wait ends on the answer, or after a few seconds if none comes.
    const [isRequestPending, setIsRequestPending] = useState(false);
    const requestPendingRef = useRef(false);
    const requestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const settleRequest = useCallback(() => {
        if (requestTimerRef.current) clearTimeout(requestTimerRef.current);
        requestTimerRef.current = null;
        requestPendingRef.current = false;
        setIsRequestPending(false);
    }, []);
    const sendOnce = useCallback(
        (composer: WheelSpinComposer | WheelBuySpinComposer) => {
            if (requestPendingRef.current) return;
            requestPendingRef.current = true;
            setIsRequestPending(true);
            requestTimerRef.current = setTimeout(settleRequest, REQUEST_TIMEOUT_MS);
            SendMessageComposer(composer);
        },
        [settleRequest]
    );

    // While the wheel is animating we hold back the recent-wins refresh: the
    // server pushes the updated list (which already contains the just-won
    // prize) the instant it answers the spin, ~5s before the wheel actually
    // stops. Showing it immediately would spoil the result in the winners
    // panel. We buffer it here and flush it in finishSpin (called when the
    // reveal fires).
    const spinAnimatingRef = useRef(false);
    const bufferedWinsRef = useRef<IWheelRecentWin[] | null>(null);

    useMessageEvent<WheelAdminPrizesEvent>(WheelAdminPrizesEvent, (event) => {
        setAdminPrizes(event.getParser().prizes);
    });

    useMessageEvent<WheelDataEvent>(WheelDataEvent, (event) => {
        settleRequest();
        const parser = event.getParser();
        setFreeSpins(parser.freeSpins);
        setExtraSpins(parser.extraSpins);
        setSpinCost(parser.spinCost);
        setSpinCostType(parser.spinCostType);
        setPrizes(parser.prizes);
    });

    useMessageEvent<WheelResultEvent>(WheelResultEvent, (event) => {
        // Set synchronously before the recent-wins packet (sent right after by
        // the server) is processed, so its handler knows a spin is animating.
        spinAnimatingRef.current = true;
        settleRequest();
        setPendingPrizeId(event.getParser().prizeId);
        setIsSpinning(true);
    });

    useMessageEvent<WheelRecentWinsEvent>(WheelRecentWinsEvent, (event) => {
        const wins = event.getParser().wins;

        // Mid-spin: stash the refreshed list and reveal it once the wheel
        // stops. Otherwise (initial open, other refreshes) apply immediately.
        if (spinAnimatingRef.current) bufferedWinsRef.current = wins;
        else setRecentWins(wins);
    });

    const open = useCallback(() => SendMessageComposer(new WheelOpenComposer()), []);
    // Read from a ref, not inside a state updater: an updater may run twice (StrictMode) and sent the spin twice.
    const spin = useCallback(() => {
        if (!isSpinningRef.current) sendOnce(new WheelSpinComposer());
    }, [sendOnce]);
    const buySpin = useCallback(() => sendOnce(new WheelBuySpinComposer()), [sendOnce]);
    const finishSpin = useCallback(() => {
        spinAnimatingRef.current = false;
        setIsSpinning(false);
        setPendingPrizeId(-1);

        // Flush the winners list that arrived during the spin, now that the
        // reveal has happened.
        if (bufferedWinsRef.current) {
            setRecentWins(bufferedWinsRef.current);
            bufferedWinsRef.current = null;
        }
    }, []);

    const loadAdminPrizes = useCallback(() => SendMessageComposer(new WheelAdminGetPrizesComposer()), []);
    const saveAdminPrizes = useCallback((prizes: IWheelAdminPrizeEdit[]) => SendMessageComposer(new WheelAdminSavePrizesComposer(prizes)), []);

    return {
        freeSpins,
        extraSpins,
        spinCost,
        spinCostType,
        prizes,
        recentWins,
        pendingPrizeId,
        isSpinning,
        isRequestPending,
        open,
        spin,
        buySpin,
        finishSpin,
        adminPrizes,
        loadAdminPrizes,
        saveAdminPrizes
    };
};

export const useFortuneWheel = () => useSharedHook(useFortuneWheelState);

registerSharedHook(useFortuneWheelState);
