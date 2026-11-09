/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { adoptsEnteredRoom } from './useNavigatorStore';

/**
 * The server answers roomEnter for any GetGuestRoom request that is not exactly
 * (roomId, false, true), so an answer about another room used to point room info,
 * settings, the word filter and favourites at a room the user is not in.
 */
describe('adoptsEnteredRoom', () => {
    it('takes the answer for the room we are in', () => {
        expect(adoptsEnteredRoom(12, 12)).toBe(true);
    });

    it('ignores an answer about another room', () => {
        expect(adoptsEnteredRoom(12, 99)).toBe(false);
    });

    it('takes the first answer when no room is current yet', () => {
        // Entering a room: RoomEntryInfo has not set currentRoomId yet.
        expect(adoptsEnteredRoom(0, 99)).toBe(true);
    });
});