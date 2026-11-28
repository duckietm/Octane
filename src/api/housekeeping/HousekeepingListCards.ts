/**
 * How a row of a server list (chat log, visits, online players, ...) reads as a card on a phone: which column
 * heads the card, which time sits beside it, which text runs under it and which short values become chips.
 * Everything else is only on the row's own page. Columns are the server's names (see `housekeeping.list.column.*`).
 */

export interface HousekeepingListCardFields {
    /** Column index of the card's title, or -1. */
    title: number;
    /** Column index of the time beside the title, or -1. */
    time: number;
    /** Column index of the text under the title (a message or a reason), or -1. */
    body: number;
    /** Column indexes shown as small chips, at most three. */
    chips: number[];
}

const TITLE_COLUMNS = ['user', 'username', 'name', 'room', 'owner', 'id', 'room_id'];
const TIME_COLUMNS = ['time', 'enter', 'since', 'last_online', 'expires', 'probation_until', 'trade_locked_until'];
const BODY_COLUMNS = ['message', 'reason'];
const CHIP_COLUMNS = ['type', 'rank', 'users', 'max', 'state', 'level', 'mute_minutes', 'staff', 'ip'];
const MAX_CHIPS = 3;

const firstOf = (columns: readonly string[], wanted: readonly string[], taken: ReadonlySet<number>): number => {
    for (const name of wanted) {
        const index = columns.indexOf(name);

        if (index >= 0 && !taken.has(index)) return index;
    }

    return -1;
};

export const pickHousekeepingListCardFields = (columns: readonly string[]): HousekeepingListCardFields => {
    const taken = new Set<number>();
    const take = (index: number) => {
        if (index >= 0) taken.add(index);

        return index;
    };

    const known = firstOf(columns, TITLE_COLUMNS, taken);
    const title = take(known >= 0 ? known : columns.length ? 0 : -1);
    const time = take(firstOf(columns, TIME_COLUMNS, taken));
    const body = take(firstOf(columns, BODY_COLUMNS, taken));
    const chips: number[] = [];

    for (const name of CHIP_COLUMNS) {
        if (chips.length >= MAX_CHIPS) break;

        const index = columns.indexOf(name);

        if (index >= 0 && !taken.has(index)) chips.push(take(index));
    }

    return { title, time, body, chips };
};
