import { OctaneLogger } from '@octane/renderer';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { GetLocalStorage, SetLocalStorage } from '../api';
import { useUserDataSnapshot } from './session/useSessionSnapshots';

const userId = new URLSearchParams(window.location.search).get('userid') || 0;

const storageKeyOf = (key: string): string => (userId ? `${key}.${userId}` : key);

// The live hooks of every storage key: discardLocalStorage resets them, so a value cleared at logout is not written
// back by a pending write, by the flush on page hide, or by the next update built on the old in-memory list.
const liveResets = new Map<string, Set<() => void>>();

/** Removes the stored values of these keys and resets every live hook on them to its initial value. */
export const discardLocalStorage = (keys: string[]): void => {
    for (const key of keys) {
        const storageKey = storageKeyOf(key);

        liveResets.get(storageKey)?.forEach((reset) => reset());

        try {
            window.localStorage.removeItem(storageKey);
        } catch {
            /* storage blocked: nothing to remove */
        }
    }
};

// Account values are stored under `key#<user id>`. Older clients stored `key` or `key.<id from the URL>`, which every
// account on one browser shared and a URL parameter could pick; the `#` keeps those apart.
const toAccountStorageKey = (key: string, userId: number): string => `${key}#${userId}`;
const accountResetKey = (key: string): string => `account:${key}`;

/**
 * Removes the stored values of these account keys for every account except `keepUserId` (0 keeps none), and the
 * values older clients stored under the bare key or `key.<id>`.
 */
const removeAccountLocalStorage = (keys: string[], keepUserId = 0): void => {
    try {
        const storage = window.localStorage;
        const isStale = (storageKey: string) =>
            keys.some(
                (key) =>
                    storageKey === key ||
                    storageKey.startsWith(`${key}.`) ||
                    (storageKey.startsWith(`${key}#`) && storageKey !== toAccountStorageKey(key, keepUserId))
            );
        const stale: string[] = [];

        for (let index = 0; index < storage.length; index++) {
            const storageKey = storage.key(index);

            if (storageKey && isStale(storageKey)) stale.push(storageKey);
        }

        for (const storageKey of stale) storage.removeItem(storageKey);
    } catch {
        /* storage blocked: nothing to remove */
    }
};

/**
 * Removes every account's stored values of these account keys and resets every live account hook on them to its
 * initial value (a logout, a session that ended, a ban).
 */
export const discardAccountLocalStorage = (keys: string[]): void => {
    for (const key of keys) liveResets.get(accountResetKey(key))?.forEach((reset) => reset());

    removeAccountLocalStorage(keys);
};

const STORAGE_WRITE_DEBOUNCE_MS = 250;
const QUOTA_TRIM_FACTOR = 0.5; // on quota error, keep the newest 50%.
const MIN_RETAINED_ENTRIES = 50;

const isQuotaError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;
    const name = (error as { name?: string }).name;
    if (name === 'QuotaExceededError') return true;
    // Firefox legacy:
    if (name === 'NS_ERROR_DOM_QUOTA_REACHED') return true;
    return false;
};

const trimArrayForQuota = <T>(value: T): T => {
    if (!Array.isArray(value)) return value;
    if (value.length <= MIN_RETAINED_ENTRIES) return [] as unknown as T;
    const keep = Math.max(MIN_RETAINED_ENTRIES, Math.floor(value.length * QUOTA_TRIM_FACTOR));
    return value.slice(value.length - keep) as unknown as T;
};

// A stored value of another shape than the initial one (an old format, a hand-edited or corrupted entry) would reach
// callers that rely on that shape - a history that is not an array threw on every render - so it is replaced by the
// initial value. An initial null or undefined accepts any stored value.
const matchesInitialShape = <T>(stored: unknown, initialValue: T): stored is T => {
    if (initialValue === null || initialValue === undefined) return true;
    if (Array.isArray(initialValue)) return Array.isArray(stored);
    if (typeof initialValue === 'object') return !!stored && typeof stored === 'object' && !Array.isArray(stored);

    return typeof stored === typeof initialValue;
};

interface UseLocalStorageOptions<T> {
    /**
     * Optional projection applied right before the value is written to
     * localStorage. The in-memory React state is unaffected. Use this to
     * strip heavy ephemeral fields (e.g. base64 image URLs) that would
     * otherwise blow past the storage quota.
     */
    toStorage?: (value: T) => unknown;
}

const readStoredValue = <T>(storageKey: string | null, initialValue: T): T => {
    if (!storageKey) return initialValue;

    try {
        const item = typeof window !== 'undefined' ? GetLocalStorage<unknown>(storageKey) : undefined;

        if (item === null || item === undefined) return initialValue;

        return matchesInitialShape(item, initialValue) ? item : initialValue;
    } catch (error) {
        return initialValue;
    }
};

interface StoredState<T> {
    storageKey: string | null;
    value: T;
}

/**
 * The stored state behind both hooks. `storageKey` null keeps the value in memory only. When the key changes (another
 * account logs in), the value of the new key is read and a write still waiting for the old key is dropped.
 */
const useStoredState = <T>(storageKey: string | null, resetKey: string, initialValue: T, options: UseLocalStorageOptions<T>): [T, Dispatch<SetStateAction<T>>] => {
    const [state, setState] = useState<StoredState<T>>(() => ({ storageKey, value: readStoredValue(storageKey, initialValue) }));

    // Event bursts and async callbacks can hold a setter from an earlier render. Every update is resolved
    // against the latest value, including updates React has not rendered yet, so none erases a newer one.
    const stateRef = useRef(state);
    // Boxed so that null is a value like any other: an empty ref means no write is pending.
    const pendingWriteRef = useRef<StoredState<T> | null>(null);
    const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const optionsRef = useRef(options);
    const storageKeyRef = useRef(storageKey);
    const initialValueRef = useRef(initialValue);

    // Keep the latest toStorage projection and key without re-running effects.
    optionsRef.current = options;
    storageKeyRef.current = storageKey;

    if (stateRef.current.storageKey !== storageKey) {
        stateRef.current = { storageKey, value: readStoredValue(storageKey, initialValueRef.current) };
        setState(stateRef.current);
    }

    const flushWrite = ({ storageKey: key, value }: StoredState<T>) => {
        if (typeof window === 'undefined' || !key || key !== storageKeyRef.current) return;

        const project = optionsRef.current.toStorage;
        const projected = project ? project(value) : value;

        try {
            SetLocalStorage(key, projected);
            return;
        } catch (error) {
            if (!isQuotaError(error)) {
                OctaneLogger.error(error);
                return;
            }
        }

        // Quota exceeded - trim and retry once. Anything that isn't an
        // array gets cleared, since we have no generic trimming rule.
        try {
            const trimmed = trimArrayForQuota(projected as T);
            SetLocalStorage(key, trimmed);
            OctaneLogger.warn(`[useLocalStorage] quota exceeded for ${key}, trimmed payload`);
        } catch (retryError) {
            OctaneLogger.error(retryError);
            // Last resort: drop the key entirely so future writes have room.
            try {
                window.localStorage.removeItem(key);
            } catch (_) {
                /* ignore */
            }
        }
    };

    // Debounce: high-frequency chat would otherwise trigger one full
    // JSON.stringify + setItem per message. We coalesce bursts into one
    // write per STORAGE_WRITE_DEBOUNCE_MS window with the latest value.
    const scheduleWrite = (next: StoredState<T>) => {
        pendingWriteRef.current = next;
        if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
        writeTimerRef.current = setTimeout(() => {
            writeTimerRef.current = null;
            const pending = pendingWriteRef.current;
            pendingWriteRef.current = null;
            if (pending) flushWrite(pending);
        }, STORAGE_WRITE_DEBOUNCE_MS);
    };

    // Flush a pending write on tab close / hide so we don't lose the last
    // burst of activity.
    useEffect(() => {
        const flushOnLeave = () => {
            const pending = pendingWriteRef.current;
            if (!pending) return;
            if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
            writeTimerRef.current = null;
            pendingWriteRef.current = null;
            flushWrite(pending);
        };

        window.addEventListener('pagehide', flushOnLeave);
        window.addEventListener('beforeunload', flushOnLeave);

        return () => {
            window.removeEventListener('pagehide', flushOnLeave);
            window.removeEventListener('beforeunload', flushOnLeave);
        };
    }, []);

    useEffect(() => {
        const reset = () => {
            if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
            writeTimerRef.current = null;
            pendingWriteRef.current = null;
            stateRef.current = { storageKey: storageKeyRef.current, value: initialValueRef.current };
            setState(stateRef.current);
        };
        const resets = liveResets.get(resetKey) ?? new Set<() => void>();

        resets.add(reset);
        liveResets.set(resetKey, resets);

        return () => {
            resets.delete(reset);
            if (!resets.size) liveResets.delete(resetKey);
        };
    }, [resetKey]);

    const setValue: Dispatch<SetStateAction<T>> = (value) => {
        try {
            const key = storageKeyRef.current;
            const current = stateRef.current.storageKey === key ? stateRef.current.value : readStoredValue(key, initialValueRef.current);
            const next = { storageKey: key, value: value instanceof Function ? value(current) : value };

            stateRef.current = next;
            setState(next);

            if (key) scheduleWrite(next);
        } catch (error) {
            OctaneLogger.error(error);
        }
    };

    return [state.value, setValue];
};

/** A value shared by everyone who uses this browser, such as a window or catalog preference. */
export const useLocalStorage = <T>(key: string, initialValue: T, options: UseLocalStorageOptions<T> = {}): [T, Dispatch<SetStateAction<T>>] => {
    const storageKey = storageKeyOf(key);

    return useStoredState(storageKey, storageKey, initialValue, options);
};

/**
 * A value that belongs to the logged-in account, such as the chat history. It is stored under the session's user id:
 * until the session knows that id it stays in memory only, and once it does, the values other accounts left in this
 * browser (and those of older clients) are removed.
 */
export const useAccountLocalStorage = <T>(key: string, initialValue: T, options: UseLocalStorageOptions<T> = {}): [T, Dispatch<SetStateAction<T>>] => {
    const { userId = 0 } = useUserDataSnapshot() ?? {};
    const accountId = typeof userId === 'number' && userId > 0 ? userId : 0;

    useEffect(() => {
        if (accountId > 0) removeAccountLocalStorage([key], accountId);
    }, [key, accountId]);

    return useStoredState(accountId > 0 ? toAccountStorageKey(key, accountId) : null, accountResetKey(key), initialValue, options);
};
