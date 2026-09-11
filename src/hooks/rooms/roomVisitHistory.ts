/**
 * Browser-like room visit history, modelled on the official client's
 * `RoomVisitHistory` (AIR 13, `ui/widget/roomtools/RoomVisitHistory.as`):
 * a linear list of at most twenty entries with a cursor. Going back moves
 * the cursor; entering a new room while the cursor is not at the end drops
 * the forward entries, the way a browser does.
 *
 * Kept pure (no React, no storage) so the rules can be unit tested; the
 * store in `useRoomVisitHistory.ts` owns persistence and reactivity.
 */

export interface RoomVisitHistoryEntry {
    roomId: number;
    roomName: string;
}

export interface RoomVisitHistoryState {
    entries: RoomVisitHistoryEntry[];
    currentIndex: number;
}

export const ROOM_VISIT_HISTORY_MAX = 20;
const ROOM_NAME_MAX = 80;

export const createEmptyRoomVisitHistory = (): RoomVisitHistoryState => ({ entries: [], currentIndex: -1 });

const normalizeIndex = (state: RoomVisitHistoryState): RoomVisitHistoryState => {
    if (!state.entries.length) return { entries: [], currentIndex: -1 };
    if (state.currentIndex < 0) return { ...state, currentIndex: 0 };
    if (state.currentIndex >= state.entries.length) return { ...state, currentIndex: state.entries.length - 1 };

    return state;
};

const trimToMax = (state: RoomVisitHistoryState): RoomVisitHistoryState => {
    let { entries, currentIndex } = state;

    // The oldest entries fall off the front, the cursor follows them.
    while (entries.length > ROOM_VISIT_HISTORY_MAX) {
        entries = entries.slice(1);
        currentIndex -= 1;
    }

    return normalizeIndex({ entries, currentIndex });
};

const cleanName = (roomName: string): string => (roomName || '').slice(0, ROOM_NAME_MAX);

export const getCurrentRoomVisit = (state: RoomVisitHistoryState): RoomVisitHistoryEntry | null =>
    state.currentIndex >= 0 && state.currentIndex < state.entries.length ? state.entries[state.currentIndex] : null;

export const canGoBackInHistory = (state: RoomVisitHistoryState): boolean => state.currentIndex > 0 && state.entries.length > 0;

export const canGoForwardInHistory = (state: RoomVisitHistoryState): boolean => state.currentIndex >= 0 && state.currentIndex < state.entries.length - 1;

export const goBackInHistory = (state: RoomVisitHistoryState): RoomVisitHistoryState =>
    canGoBackInHistory(state) ? { ...state, currentIndex: state.currentIndex - 1 } : state;

export const goForwardInHistory = (state: RoomVisitHistoryState): RoomVisitHistoryState =>
    canGoForwardInHistory(state) ? { ...state, currentIndex: state.currentIndex + 1 } : state;

export const updateRoomNameInHistory = (state: RoomVisitHistoryState, roomId: number, roomName: string): RoomVisitHistoryState => {
    if (!state.entries.some((entry) => entry.roomId === roomId)) return state;

    return {
        ...state,
        entries: state.entries.map((entry) => (entry.roomId === roomId ? { ...entry, roomName: cleanName(roomName) } : entry))
    };
};

/**
 * Records a room entry. Re-entering the room under the cursor only refreshes
 * its name (the back/forward navigation itself lands here, and must not grow
 * the list); anything else becomes the new head of the history.
 */
export const recordRoomVisit = (state: RoomVisitHistoryState, roomId: number, roomName: string): RoomVisitHistoryState => {
    if (!Number.isInteger(roomId) || roomId <= 0) return state;

    const named = normalizeIndex(updateRoomNameInHistory(state, roomId, roomName));
    const current = getCurrentRoomVisit(named);

    if (current && current.roomId === roomId) return named;

    const kept = named.currentIndex >= 0 ? named.entries.slice(0, named.currentIndex + 1) : [];
    const entries = [...kept, { roomId, roomName: cleanName(roomName) }];

    return trimToMax({ entries, currentIndex: entries.length - 1 });
};

/**
 * The list shown to the user: every room once, in visit order, keeping the
 * most recent visit of a room that appears several times.
 */
export const getRoomVisitHistoryView = (state: RoomVisitHistoryState): RoomVisitHistoryEntry[] => {
    const seen = new Set<number>();
    const view: RoomVisitHistoryEntry[] = [];

    for (let index = state.entries.length - 1; index >= 0; index--) {
        const entry = state.entries[index];

        if (seen.has(entry.roomId)) continue;

        seen.add(entry.roomId);
        view.unshift({ ...entry });
    }

    return view;
};

/**
 * Rooms ordered by how often they appear in the history, most visited first;
 * ties keep the most recently visited room first.
 */
export const getFrequentRoomVisits = (state: RoomVisitHistoryState): RoomVisitHistoryEntry[] => {
    const counts = new Map<number, number>();

    for (const entry of state.entries) counts.set(entry.roomId, (counts.get(entry.roomId) ?? 0) + 1);

    return getRoomVisitHistoryView(state)
        .map((entry, order) => ({ entry, order, count: counts.get(entry.roomId) ?? 0 }))
        .sort((a, b) => b.count - a.count || b.order - a.order)
        .map((item) => item.entry);
};

export const parseStoredRoomVisitHistory = (raw: unknown): RoomVisitHistoryState => {
    if (!raw || typeof raw !== 'object') return createEmptyRoomVisitHistory();

    const candidate = raw as Partial<RoomVisitHistoryState>;

    if (!Array.isArray(candidate.entries)) return createEmptyRoomVisitHistory();

    const entries = candidate.entries
        .filter((entry) => entry && Number.isInteger(entry.roomId) && entry.roomId > 0 && typeof entry.roomName === 'string')
        .map((entry) => ({ roomId: entry.roomId, roomName: cleanName(entry.roomName) }));
    const currentIndex = Number.isInteger(candidate.currentIndex) ? candidate.currentIndex : entries.length - 1;

    return trimToMax({ entries, currentIndex });
};
