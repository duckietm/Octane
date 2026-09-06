import { OctaneLogger } from '@octane/renderer';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { GetLocalStorage, SetLocalStorage } from '../api';

const userId = new URLSearchParams(window.location.search).get('userid') || 0;

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

interface UseLocalStorageOptions<T> {
    /**
     * Optional projection applied right before the value is written to
     * localStorage. The in-memory React state is unaffected. Use this to
     * strip heavy ephemeral fields (e.g. base64 image URLs) that would
     * otherwise blow past the storage quota.
     */
    toStorage?: (value: T) => unknown;
}

const useLocalStorageState = <T>(key: string, initialValue: T, options: UseLocalStorageOptions<T> = {}): [T, Dispatch<SetStateAction<T>>] => {
    key = userId ? `${key}.${userId}` : key;

    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = typeof window !== 'undefined' ? GetLocalStorage<T>(key) : undefined;
            return item ?? initialValue;
        } catch (error) {
            return initialValue;
        }
    });

    const pendingWriteRef = useRef<T | null>(null);
    const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const optionsRef = useRef(options);

    // Keep the latest toStorage projection without re-running effects.
    optionsRef.current = options;

    const flushWrite = (value: T) => {
        if (typeof window === 'undefined') return;

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
    const scheduleWrite = (value: T) => {
        pendingWriteRef.current = value;
        if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
        writeTimerRef.current = setTimeout(() => {
            writeTimerRef.current = null;
            if (pendingWriteRef.current !== null) {
                flushWrite(pendingWriteRef.current);
                pendingWriteRef.current = null;
            }
        }, STORAGE_WRITE_DEBOUNCE_MS);
    };

    // Flush a pending write on tab close / hide so we don't lose the last
    // burst of activity.
    useEffect(() => {
        const flushOnLeave = () => {
            if (pendingWriteRef.current === null) return;
            if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
            writeTimerRef.current = null;
            flushWrite(pendingWriteRef.current);
            pendingWriteRef.current = null;
        };

        window.addEventListener('pagehide', flushOnLeave);
        window.addEventListener('beforeunload', flushOnLeave);

        return () => {
            window.removeEventListener('pagehide', flushOnLeave);
            window.removeEventListener('beforeunload', flushOnLeave);
        };
    }, []);

    const setValue = (value: T) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;

            setStoredValue(valueToStore);

            scheduleWrite(valueToStore);
        } catch (error) {
            OctaneLogger.error(error);
        }
    };

    return [storedValue, setValue];
};

export const useLocalStorage = useLocalStorageState;
