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

// Fortune wheel state + actions. Shared via the Zustand bridge so the event listeners
// register once regardless of how many components read it.
const useFortuneWheelState = () => {
    const [freeSpins, setFreeSpins] = useState(0);
    const [extraSpins, setExtraSpins] = useState(0);
    const [spinCost, setSpinCost] = useState(0);
    const [spinCostType, setSpinCostType] = useState(-1);
    const [prizes, setPrizes] = useState<IWheelPrize[]>([]);
    const [recentWins, setRecentWins] = useState<IWheelRecentWin[]>([]);
    const [pendingPrizeId, setPendingPrizeId] = useState<number>(-1);
    const [isSpinning, setIsSpinning] = useState(false);
    const [adminPrizes, setAdminPrizes] = useState<IWheelAdminPrize[]>([]);

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
    const spin = useCallback(() => {
        setIsSpinning((prev) => {
            if (!prev) SendMessageComposer(new WheelSpinComposer());
            return prev;
        });
    }, []);
    const buySpin = useCallback(() => SendMessageComposer(new WheelBuySpinComposer()), []);
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
