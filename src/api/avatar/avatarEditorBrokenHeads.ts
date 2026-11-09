import { useSyncExternalStore } from 'react';

const brokenHeadIds = new Set<number>();
const listeners = new Set<() => void>();
let version = 0;

const emit = (): void => {
    version++;
    listeners.forEach((listener) => listener());
};

export const markBrokenHead = (id: number): void => {
    if (id == null || brokenHeadIds.has(id)) return;

    brokenHeadIds.add(id);
    emit();
};

export const isBrokenHead = (id: number): boolean => brokenHeadIds.has(id);

export const clearBrokenHeads = (): void => {
    if (!brokenHeadIds.size) return;

    brokenHeadIds.clear();
    emit();
};

const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
};

const getSnapshot = (): number => version;

export const useBrokenHeadsVersion = (): number => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
