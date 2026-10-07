const STORAGE_KEY = 'octane.soundboard.silenced';
const MAX_SILENCED = 200;

export const normalizeSilencedUserIds = (input: unknown): number[] => {
    if (!Array.isArray(input)) return [];

    const ids: number[] = [];

    for (const value of input) {
        if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0 || ids.includes(value)) continue;

        ids.push(value);
        if (ids.length >= MAX_SILENCED) break;
    }

    return ids;
};

export const addSilencedUserId = (ids: number[], userId: number): number[] => normalizeSilencedUserIds([...ids, userId]);

export const loadSilencedUserIds = (): number[] => {
    try {
        return normalizeSilencedUserIds(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]'));
    } catch {
        return [];
    }
};

export const saveSilencedUserIds = (ids: number[]): void => {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
        // Storage can be unavailable (private mode, blocked site data); the choice then lasts the session.
    }
};
