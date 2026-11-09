import { describe, expect, it } from 'vitest';
import { ChatlogRecord, chatlineMatches, filterChatlogRecords } from './chatlogFilter';

const room = (roomId: number, roomName: string): ChatlogRecord => ({ isRoomInfo: true, roomId, roomName });

const line = (username: string, message: string): ChatlogRecord => ({
    isRoomInfo: false,
    timestamp: '12:00',
    habboId: 1,
    username,
    hasHighlighting: false,
    message
});

describe('filterChatlogRecords', () => {
    const records = [
        room(1, 'Lobby'),
        line('alice', 'hello there'),
        line('bob', 'selling furni'),
        room(2, 'Cafe'),
        line('carol', 'good morning')
    ];

    it('returns everything when nothing is typed', () => {
        expect(filterChatlogRecords(records, '   ')).toBe(records);
    });

    it('keeps the room heading above a surviving line', () => {
        expect(filterChatlogRecords(records, 'furni')).toEqual([room(1, 'Lobby'), line('bob', 'selling furni')]);
    });

    it('drops the heading of a room where nothing matched', () => {
        const result = filterChatlogRecords(records, 'morning');

        expect(result).toEqual([room(2, 'Cafe'), line('carol', 'good morning')]);
        expect(result.some((r) => r.isRoomInfo && r.roomName === 'Lobby')).toBe(false);
    });

    it('matches the speaker as well as what was said', () => {
        expect(filterChatlogRecords(records, 'alice')).toEqual([room(1, 'Lobby'), line('alice', 'hello there')]);
    });

    it('ignores case', () => {
        expect(filterChatlogRecords(records, 'HELLO')).toHaveLength(2);
    });

    it('emits a heading once, however many lines match under it', () => {
        const result = filterChatlogRecords(records, 'e');

        expect(result.filter((r) => r.isRoomInfo && r.roomId === 1)).toHaveLength(1);
    });

    it('returns nothing when a room heading is the only thing that would match', () => {
        expect(filterChatlogRecords(records, 'Lobby')).toEqual([]);
    });

    it('matches a single line the way the evidence list filters it', () => {
        expect(chatlineMatches('alice', 'hello there', 'ALI')).toBe(true);
        expect(chatlineMatches('alice', 'hello there', 'there')).toBe(true);
        expect(chatlineMatches('alice', 'hello there', 'bob')).toBe(false);
        expect(chatlineMatches('alice', 'hello there', '  ')).toBe(true);
    });
});
