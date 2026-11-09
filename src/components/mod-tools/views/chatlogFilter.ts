/** A chatlog row as the filter sees it: a room heading or one line said in it. */
export interface ChatlogRecord {
    timestamp?: string;
    habboId?: number;
    username?: string;
    message?: string;
    hasHighlighting?: boolean;
    isRoomInfo?: boolean;
    roomId?: number;
    roomName?: string;
}

/** Whether a line said by `username` matches what the moderator typed (speaker or message, any case). An empty query matches everything. */
export const chatlineMatches = (username: string, message: string, query: string): boolean => {
    const needle = query.trim().toLowerCase();

    if (!needle.length) return true;

    return (message ?? '').toLowerCase().includes(needle) || (username ?? '').toLowerCase().includes(needle);
};

/**
 * Keeps the rows a moderator is looking for, and the room heading above each surviving
 * group. Filtering the flat list on its own would leave headings for rooms that matched
 * nothing, so a heading is only emitted once something under it survives.
 */
export const filterChatlogRecords = (records: ChatlogRecord[], query: string): ChatlogRecord[] => {
    if (!query.trim().length) return records;

    const results: ChatlogRecord[] = [];
    let pendingRoom: ChatlogRecord = null;

    for (const record of records) {
        if (record.isRoomInfo) {
            pendingRoom = record;
            continue;
        }

        if (!chatlineMatches(record.username, record.message, query)) continue;

        if (pendingRoom) {
            results.push(pendingRoom);
            pendingRoom = null;
        }

        results.push(record);
    }

    return results;
};
