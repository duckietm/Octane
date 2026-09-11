import { describe, expect, it } from 'vitest';
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
    ROOM_VISIT_HISTORY_MAX, 
    recordRoomVisit
} from './roomVisitHistory';

const visit = (rooms: number[]) => rooms.reduce((state, roomId) => recordRoomVisit(state, roomId, `Room ${roomId}`), createEmptyRoomVisitHistory());

describe('roomVisitHistory', () => {
    it('appends visited rooms and keeps the cursor on the latest one', () => {
        const state = visit([1, 2, 3]);

        expect(state.entries.map((entry) => entry.roomId)).toEqual([1, 2, 3]);
        expect(getCurrentRoomVisit(state)?.roomId).toBe(3);
        expect(canGoBackInHistory(state)).toBe(true);
        expect(canGoForwardInHistory(state)).toBe(false);
    });

    it('moves the cursor back and forward without growing the list when the room is re-entered', () => {
        let state = goBackInHistory(visit([1, 2, 3]));

        expect(getCurrentRoomVisit(state)?.roomId).toBe(2);
        expect(canGoForwardInHistory(state)).toBe(true);

        // The navigation lands in room 2, which the server reports as a room entry.
        state = recordRoomVisit(state, 2, 'Room 2');

        expect(state.entries).toHaveLength(3);
        expect(state.currentIndex).toBe(1);

        state = goForwardInHistory(state);

        expect(getCurrentRoomVisit(state)?.roomId).toBe(3);
    });

    it('drops the forward entries when a new room is entered after going back', () => {
        let state = goBackInHistory(goBackInHistory(visit([1, 2, 3, 4])));

        state = recordRoomVisit(state, 9, 'Room 9');

        expect(state.entries.map((entry) => entry.roomId)).toEqual([1, 2, 9]);
        expect(state.currentIndex).toBe(2);
        expect(canGoForwardInHistory(state)).toBe(false);
    });

    it('keeps at most twenty entries, forgetting the oldest', () => {
        const rooms = Array.from({ length: ROOM_VISIT_HISTORY_MAX + 5 }, (_, index) => index + 1);
        const state = visit(rooms);

        expect(state.entries).toHaveLength(ROOM_VISIT_HISTORY_MAX);
        expect(state.entries[0].roomId).toBe(6);
        expect(state.currentIndex).toBe(ROOM_VISIT_HISTORY_MAX - 1);
    });

    it('lists every room once with its latest name and ranks rooms by visit count', () => {
        let state = visit([1, 2, 1, 3]);

        state = recordRoomVisit(state, 2, 'Renamed 2');

        expect(getRoomVisitHistoryView(state).map((entry) => `${entry.roomId}:${entry.roomName}`)).toEqual(['1:Room 1', '3:Room 3', '2:Renamed 2']);
        expect(getFrequentRoomVisits(state).map((entry) => entry.roomId)).toEqual([2, 1, 3]);
    });

    it('ignores invalid room ids and restores only sane stored data', () => {
        expect(recordRoomVisit(createEmptyRoomVisitHistory(), 0, 'x').entries).toHaveLength(0);

        const restored = parseStoredRoomVisitHistory({ entries: [{ roomId: 4, roomName: 'Four' }, { roomId: -1, roomName: 'Bad' }, null], currentIndex: 7 });

        expect(restored.entries).toEqual([{ roomId: 4, roomName: 'Four' }]);
        expect(restored.currentIndex).toBe(0);
        expect(parseStoredRoomVisitHistory('garbage')).toEqual(createEmptyRoomVisitHistory());
    });
});
