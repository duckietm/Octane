export const LOCK_KEY = 'nitro.login.lock';
export const MAX_ATTEMPTS = 5;
export const LOCK_WINDOW_MS = 60_000;
export const LOCK_DURATION_MS = 2 * 60_000;

export type AttemptState = { attempts: number; firstAt: number; lockedUntil: number };

const EMPTY_LOCK: AttemptState = { attempts: 0, firstAt: 0, lockedUntil: 0 };

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * The stored lock, or an empty one when the value is missing or not a lock. A stored "null" made the login screen
 * throw while rendering, and a stored string or number turned the lock off.
 */
export const readLock = (): AttemptState => {
    try {
        const raw = sessionStorage.getItem(LOCK_KEY);
        if (!raw) return { ...EMPTY_LOCK };
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return { ...EMPTY_LOCK };
        const { attempts, firstAt, lockedUntil } = parsed as Record<string, unknown>;
        if (!isCount(attempts) || !isCount(firstAt) || !isCount(lockedUntil)) return { ...EMPTY_LOCK };
        return { attempts, firstAt, lockedUntil };
    } catch {
        return { ...EMPTY_LOCK };
    }
};

export const writeLock = (state: AttemptState) => {
    try {
        sessionStorage.setItem(LOCK_KEY, JSON.stringify(state));
    } catch {}
};
