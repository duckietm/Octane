/**
 * What the housekeeping global search box asks for:
 *   "#12" -> user 12, "s:411" / "stanza:411" / "room:411" -> room 411,
 *   anything else of two or more characters -> a name search,
 *   empty -> show the recent lookups.
 */
export type HousekeepingSearchQuery =
    | { kind: 'empty' }
    | { kind: 'user-id'; id: number }
    | { kind: 'room-id'; id: number }
    | { kind: 'text'; text: string }
    | { kind: 'too-short' };

const ROOM_PREFIX = /^(?:s|stanza|room|r):\s*#?(\d+)$/i;
const USER_ID = /^#(\d+)$/;

export const parseHousekeepingSearch = (raw: string): HousekeepingSearchQuery => {
    const text = (raw || '').trim();

    if (!text) return { kind: 'empty' };

    const room = ROOM_PREFIX.exec(text);

    if (room) {
        const id = parseInt(room[1]);

        return id > 0 ? { kind: 'room-id', id } : { kind: 'too-short' };
    }

    const user = USER_ID.exec(text);

    if (user) {
        const id = parseInt(user[1]);

        return id > 0 ? { kind: 'user-id', id } : { kind: 'too-short' };
    }

    return text.length >= 2 ? { kind: 'text', text } : { kind: 'too-short' };
};
