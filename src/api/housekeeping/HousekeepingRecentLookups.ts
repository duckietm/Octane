const STORAGE_KEY = 'nitro.housekeeping.recent';
const MAX_ENTRIES = 8;

export interface RecentLookupEntry {
    kind: 'user' | 'room';
    id: number;
    label: string;
    at: number;
}

const isEntry = (value: unknown): value is RecentLookupEntry => {
    if (!value || typeof value !== 'object') return false;

    const obj = value as Record<string, unknown>;

    return (obj.kind === 'user' || obj.kind === 'room') && Number.isFinite(obj.id) && typeof obj.label === 'string' && Number.isFinite(obj.at);
};

const readStore = (): RecentLookupEntry[] => {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);

        if (!raw) return [];

        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) return [];

        return parsed.filter(isEntry);
    } catch {
        return [];
    }
};

const writeStore = (entries: RecentLookupEntry[]): void => {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {}
};

export const loadRecentLookups = (): RecentLookupEntry[] => readStore();

/**
 * Push an entry to the front of the recent-lookups stack. Existing
 * entries with the same kind+id are deduped (so reopening the same
 * user doesn't bury fresher entries), and the list is trimmed to
 * MAX_ENTRIES. Pure for the in-memory transform — the persistence is
 * a side effect on top.
 */
export const pushRecentLookup = (current: RecentLookupEntry[], entry: RecentLookupEntry): RecentLookupEntry[] => {
    const filtered = current.filter((item) => !(item.kind === entry.kind && item.id === entry.id));
    const next = [entry, ...filtered].slice(0, MAX_ENTRIES);

    return next;
};

export const persistRecentLookups = (entries: RecentLookupEntry[]): void => writeStore(entries);

export const RECENT_LOOKUPS_LIMIT = MAX_ENTRIES;
