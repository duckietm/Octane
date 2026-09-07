import { useCallback, useEffect, useMemo, useState } from 'react';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { localizeWithFallback } from '../utils/localizeWithFallback';

export type HabbiconEntry = {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    dir: number;
    name: string;
    nameKey: string;
    category: string;
};

export type HabbiconSet = {
    id: string;
    title: string;
    description: string;
    entries: HabbiconEntry[];
};

export const HABBICON_CELL_SIZE = 42;
export const HABBICON_GRID_COLUMNS = 5;
export const HABBICON_RECENT_LIMIT = 10;
const RECENT_STORAGE_KEY = 'nitro.habbicons.recent';
const FAVORITE_STORAGE_KEY = 'nitro.habbicons.favorites';

const readIdList = (key: string, limit: number): number[] => {
    if (typeof window === 'undefined') return [];

    try {
        const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');

        return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean).slice(0, limit) : [];
    } catch {
        return [];
    }
};

const writeIdList = (key: string, values: number[]) => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(key, JSON.stringify(values));
};

export const getHabbiconsBaseUrl = () => {
    const root = GetConfigurationValue<string>('habbicons.asset.root', '');
    const hash = GetConfigurationValue<string>('habbicons.asset.hash', '');

    if (!root) return '';

    const cleanRoot = root.endsWith('/') ? root : `${root}/`;

    if (hash && hash.length) return `${cleanRoot}${hash}/`;

    return cleanRoot;
};

export const formatHabbiconName = (nameKey: string, id: number) => {
    if (!nameKey) return `Habbicon ${id}`;

    return nameKey
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

export const localizeHabbiconName = (entry: HabbiconEntry) =>
    localizeWithFallback(`habbicon_${entry.nameKey}_name`, formatHabbiconName(entry.nameKey, entry.id));

export const localizeHabbiconSetTitle = (category: string) =>
    localizeWithFallback(`habbicon_collection_${category}_name`, category.charAt(0).toUpperCase() + category.slice(1));

export const localizeHabbiconSetDescription = (category: string) => localizeWithFallback(`habbicon_collection_${category}_desc`, '');

const getCategory = (name: string) => {
    const prefix = (name || '').split('_')[0];

    return prefix || 'habbicons';
};

export const padHabbiconRow = <T>(entries: T[]): (T | null)[] => {
    const remainder = entries.length % HABBICON_GRID_COLUMNS;

    if (!remainder) return entries;

    return [...entries, ...Array.from({ length: HABBICON_GRID_COLUMNS - remainder }, () => null)];
};

export const useHabbiconCatalog = () => {
    const enabled = GetConfigurationValue<boolean>('habbicons.enabled', false);
    const baseUrl = useMemo(() => getHabbiconsBaseUrl(), []);
    const [entries, setEntries] = useState<HabbiconEntry[]>([]);
    const [recentIds, setRecentIds] = useState<number[]>(() => readIdList(RECENT_STORAGE_KEY, HABBICON_RECENT_LIMIT));
    const [favoriteIds, setFavoriteIds] = useState<number[]>(() => readIdList(FAVORITE_STORAGE_KEY, 1000));

    useEffect(() => {
        if (!enabled || !baseUrl) return;

        let disposed = false;

        void (async () => {
            try {
                const response = await fetch(`${baseUrl}habbicons.json`);

                if (!response.ok) return;

                const data = await response.json();
                const nextEntries = (Array.isArray(data?.habbicons) ? data.habbicons : [])
                    .map((entry: any) => {
                        const id = Number(entry?.id);
                        const nameKey = String(entry?.name || '');

                        return {
                            id,
                            x: Number(entry?.x) || 0,
                            y: Number(entry?.y) || 0,
                            width: Number(entry?.width) || HABBICON_CELL_SIZE,
                            height: Number(entry?.height) || HABBICON_CELL_SIZE,
                            dir: Number(entry?.dir) || 0,
                            name: formatHabbiconName(nameKey, id),
                            nameKey,
                            category: getCategory(nameKey)
                        } as HabbiconEntry;
                    })
                    .filter((entry: HabbiconEntry) => entry.id > 0);

                if (!disposed) setEntries(nextEntries);
            } catch {
                if (!disposed) setEntries([]);
            }
        })();

        return () => {
            disposed = true;
        };
    }, [enabled, baseUrl]);

    const sets = useMemo<HabbiconSet[]>(() => {
        const grouped = new Map<string, HabbiconEntry[]>();

        for (const entry of entries) {
            const list = grouped.get(entry.category) || [];

            list.push(entry);
            grouped.set(entry.category, list);
        }

        return Array.from(grouped.entries()).map(([id, setEntries]) => ({
            id,
            title: localizeHabbiconSetTitle(id),
            description: localizeHabbiconSetDescription(id),
            entries: setEntries
        }));
    }, [entries]);

    const noteUsed = useCallback((habbiconId: number) => {
        setRecentIds((current) => {
            const next = [habbiconId, ...current.filter((id) => id !== habbiconId)].slice(0, HABBICON_RECENT_LIMIT);

            writeIdList(RECENT_STORAGE_KEY, next);

            return next;
        });
    }, []);

    const toggleFavorite = useCallback((habbiconId: number) => {
        setFavoriteIds((current) => {
            const next = current.includes(habbiconId) ? current.filter((id) => id !== habbiconId) : [habbiconId, ...current];

            writeIdList(FAVORITE_STORAGE_KEY, next);

            return next;
        });
    }, []);

    return {
        enabled,
        baseUrl,
        entries,
        sets,
        recentIds,
        favoriteIds,
        noteUsed,
        toggleFavorite
    };
};
