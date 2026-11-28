import { describe, expect, it } from 'vitest';
import { ChatEntryType } from './ChatEntryType';
import { buildChatHistorySections, isChatHistoryRoomEntry } from './ChatHistorySections';
import { IChatEntry } from './IChatEntry';

let nextId = 0;

const entry = (type: number, name: string, timestamp: string, message?: string, roomId = 1): IChatEntry => ({
    id: nextId++,
    webId: 5,
    entityId: 5,
    name,
    message,
    roomId,
    timestamp,
    type
});

describe('buildChatHistorySections', () => {
    it('starts a section at each room entry and keeps the lines in their order', () => {
        const history = [
            entry(ChatEntryType.TYPE_ROOM_INFO, 'Lobby', '10:00'),
            entry(ChatEntryType.TYPE_CHAT, 'ann', '10:00', 'hi'),
            entry(ChatEntryType.TYPE_CHAT, 'bob', '10:01', 'yo'),
            entry(ChatEntryType.TYPE_ROOM_INFO, 'Pool', '10:05', undefined, 2),
            entry(ChatEntryType.TYPE_CHAT, 'ann', '10:05', 'splash', 2)
        ];

        const sections = buildChatHistorySections(history);

        expect(sections.map((section) => [section.name, section.roomId, section.timestamp, section.chatCount])).toEqual([
            ['Lobby', 1, '10:00', 2],
            ['Pool', 2, '10:05', 1]
        ]);
        expect(sections[0].rows.map((row) => row.index)).toEqual([1, 2]);
        expect(sections[1].rows[0].entry.message).toBe('splash');
    });

    it('shows a time once per minute, counting the room entry', () => {
        const sections = buildChatHistorySections([
            entry(ChatEntryType.TYPE_ROOM_INFO, 'Lobby', '10:00'),
            entry(ChatEntryType.TYPE_CHAT, 'ann', '10:00', 'a'),
            entry(ChatEntryType.TYPE_CHAT, 'ann', '10:01', 'b'),
            entry(ChatEntryType.TYPE_CHAT, 'ann', '10:01', 'c')
        ]);

        expect(sections[0].rows.map((row) => row.showTime)).toEqual([false, true, false]);
    });

    it('keeps room events (a row with a message) as lines of the room, not as new sections', () => {
        const sections = buildChatHistorySections([
            entry(ChatEntryType.TYPE_ROOM_INFO, 'Lobby', '10:00'),
            entry(ChatEntryType.TYPE_ROOM_INFO, 'Soundboard', '10:02', 'ann played Bell')
        ]);

        expect(sections).toHaveLength(1);
        expect(sections[0].rows).toHaveLength(1);
        expect(sections[0].chatCount).toBe(0);
        expect(isChatHistoryRoomEntry({ type: ChatEntryType.TYPE_ROOM_INFO, message: 'ann played Bell' })).toBe(false);
        expect(isChatHistoryRoomEntry({ type: ChatEntryType.TYPE_ROOM_INFO })).toBe(true);
    });

    it('puts lines from before the first room entry still kept in an earlier section without a name', () => {
        const sections = buildChatHistorySections([
            entry(ChatEntryType.TYPE_CHAT, 'ann', '09:58', 'old'),
            entry(ChatEntryType.TYPE_ROOM_INFO, 'Lobby', '10:00')
        ]);

        expect(sections[0]).toMatchObject({ key: 'earlier', name: null, roomId: -1, timestamp: '09:58' });
        expect(sections[1].name).toBe('Lobby');
        expect(buildChatHistorySections([])).toEqual([]);
    });
});
