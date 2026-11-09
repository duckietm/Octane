const STORAGE_KEY = 'octane.soundboard.favorites';
const MAX_FAVORITES = 100;

export const normalizeFavoriteIds = (input: unknown): number[] => {
    if (!Array.isArray(input)) return [];

    const ids: number[] = [];

    for (const value of input) {
        if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0 || ids.includes(value)) continue;

        ids.push(value);
        if (ids.length >= MAX_FAVORITES) break;
    }

    return ids;
};

export const toggleFavoriteId = (ids: number[], soundId: number): number[] =>
    ids.includes(soundId) ? ids.filter((id) => id !== soundId) : normalizeFavoriteIds([...ids, soundId]);

export const loadFavoriteIds = (): number[] => {
    try {
        return normalizeFavoriteIds(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]'));
    } catch {
        return [];
    }
};

export const saveFavoriteIds = (ids: number[]): void => {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
        // Storage can be unavailable (private mode, blocked site data); favourites then last the session.
    }
};
