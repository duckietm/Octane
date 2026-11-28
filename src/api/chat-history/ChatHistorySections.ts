import { ChatEntryType } from './ChatEntryType';
import { IChatEntry } from './IChatEntry';

export interface ChatHistorySectionRow {
    entry: IChatEntry;
    /** Place in the whole history: the desktop keys its rows by `${id}-${index}`, the phone list does the same. */
    index: number;
    /** The line starts a new minute in its room, so its time is shown; later lines of the same minute leave it out. */
    showTime: boolean;
}

export interface ChatHistorySection {
    key: string;
    /** -1 for the lines kept from before the first room entry still in the history. */
    roomId: number;
    /** The room's name from its entry row, or null for those earlier lines. */
    name: string | null;
    /** When the room was entered (its entry row's time), or the first line's time for the earlier lines. */
    timestamp: string;
    rows: ChatHistorySectionRow[];
    /** Chat lines in the section (room events not counted). */
    chatCount: number;
}

/** A room entry row: the history writes one, without a message, each time a room is entered. Rows with a message are events in it. */
export const isChatHistoryRoomEntry = (entry: Pick<IChatEntry, 'type' | 'message'>): boolean => entry.type === ChatEntryType.TYPE_ROOM_INFO && !entry.message;

/**
 * Splits the chat history into one section per room visit, in the history's own order (oldest first): a section starts at
 * each room entry row and holds every row after it up to the next one; the entry row itself becomes the section's header.
 * Rows before the first entry row still in the history (the oldest were dropped at the limit) form a section of their own.
 */
export const buildChatHistorySections = (entries: ReadonlyArray<IChatEntry>): ChatHistorySection[] => {
    const sections: ChatHistorySection[] = [];
    let current: ChatHistorySection | null = null;
    let lastTime: string | null = null;

    entries.forEach((entry, index) => {
        if (isChatHistoryRoomEntry(entry)) {
            current = { key: `room-${entry.id}-${index}`, roomId: entry.roomId, name: entry.name ?? '', timestamp: entry.timestamp, rows: [], chatCount: 0 };
            sections.push(current);
            lastTime = entry.timestamp;

            return;
        }

        if (!current) {
            current = { key: 'earlier', roomId: -1, name: null, timestamp: entry.timestamp, rows: [], chatCount: 0 };
            sections.push(current);
        }

        current.rows.push({ entry, index, showTime: entry.timestamp !== lastTime });
        if (entry.type === ChatEntryType.TYPE_CHAT) current.chatCount++;
        lastTime = entry.timestamp;
    });

    return sections;
};
