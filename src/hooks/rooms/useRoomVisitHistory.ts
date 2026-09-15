import { GetGuestRoomResultEvent } from '@octane/renderer';
import { useEffect } from 'react';
import { createOctaneStore } from '@/state/createOctaneStore';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { GetLocalStorage, SetLocalStorage, TryVisitRoom } from '../../api';
import { useMessageEvent } from '../events';
import {
    canGoBackInHistory,
    canGoForwardInHistory,
    createEmptyRoomVisitHistory,
    getCurrentRoomVisit,
    getFrequentRoomVisits,
    getRoomVisitHistoryView,
    goBackInHistory,
    goForwardInHistory,
    parseStoredRoomVisitHistory,
    RoomVisitHistoryEntry,
    RoomVisitHistoryState, 
    recordRoomVisit
} from './roomVisitHistory';

const STORAGE_KEY = 'octane.room.visit.history';

// The official client re-enables the history buttons two seconds after a
// navigation starts, even when the room never loads (RoomToolsWidget.as).
const NAVIGATION_RELEASE_MS = 2000;

interface RoomVisitHistoryStore extends RoomVisitHistoryState {
    /** True between a back/forward click and the resulting room entry. */
    isNavigating: boolean;
    recordVisit: (roomId: number, roomName: string) => void;
    goBack: () => void;
    goForward: () => void;
    releaseNavigation: () => void;
}

const readStoredHistory = (): RoomVisitHistoryState => {
    try {
        return parseStoredRoomVisitHistory(GetLocalStorage<RoomVisitHistoryState>(STORAGE_KEY));
    } catch {
        return createEmptyRoomVisitHistory();
    }
};

const persist = (state: RoomVisitHistoryState) => {
    try {
        SetLocalStorage(STORAGE_KEY, { entries: state.entries, currentIndex: state.currentIndex });
    } catch {
        // Storage may be full or unavailable; the in-memory history still works.
    }
};

export const useRoomVisitHistoryStore = createOctaneStore<RoomVisitHistoryStore>((set, get) => ({
    ...readStoredHistory(),
    isNavigating: false,
    recordVisit: (roomId, roomName) => {
        const next = recordRoomVisit(get(), roomId, roomName);

        persist(next);
        set({ entries: next.entries, currentIndex: next.currentIndex, isNavigating: false });
    },
    goBack: () => {
        const state = get();

        if (state.isNavigating || !canGoBackInHistory(state)) return;

        const next = goBackInHistory(state);
        const target = getCurrentRoomVisit(next);

        persist(next);
        set({ currentIndex: next.currentIndex, isNavigating: true });

        if (target) TryVisitRoom(target.roomId);
    },
    goForward: () => {
        const state = get();

        if (state.isNavigating || !canGoForwardInHistory(state)) return;

        const next = goForwardInHistory(state);
        const target = getCurrentRoomVisit(next);

        persist(next);
        set({ currentIndex: next.currentIndex, isNavigating: true });

        if (target) TryVisitRoom(target.roomId);
    },
    releaseNavigation: () => {
        if (get().isNavigating) set({ isNavigating: false });
    }
}));

const useRoomVisitHistoryState = () => {
    const entries = useRoomVisitHistoryStore((state) => state.entries);
    const currentIndex = useRoomVisitHistoryStore((state) => state.currentIndex);
    const isNavigating = useRoomVisitHistoryStore((state) => state.isNavigating);
    const recordVisit = useRoomVisitHistoryStore((state) => state.recordVisit);
    const goBack = useRoomVisitHistoryStore((state) => state.goBack);
    const goForward = useRoomVisitHistoryStore((state) => state.goForward);
    const releaseNavigation = useRoomVisitHistoryStore((state) => state.releaseNavigation);

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser.roomEnter) return;

        recordVisit(parser.data.roomId, parser.data.roomName);
    });

    useEffect(() => {
        if (!isNavigating) return;

        const handle = window.setTimeout(releaseNavigation, NAVIGATION_RELEASE_MS);

        return () => window.clearTimeout(handle);
    }, [isNavigating, releaseNavigation]);

    const state: RoomVisitHistoryState = { entries, currentIndex };
    const historyView: RoomVisitHistoryEntry[] = getRoomVisitHistoryView(state);
    const frequentView: RoomVisitHistoryEntry[] = getFrequentRoomVisits(state);

    return {
        entries,
        currentIndex,
        currentRoom: getCurrentRoomVisit(state),
        historyView,
        frequentView,
        isNavigating,
        canGoBack: !isNavigating && canGoBackInHistory(state),
        canGoForward: !isNavigating && canGoForwardInHistory(state),
        goBack,
        goForward
    };
};

export const useRoomVisitHistory = () => useSharedHook(useRoomVisitHistoryState);

registerSharedHook(useRoomVisitHistoryState);
