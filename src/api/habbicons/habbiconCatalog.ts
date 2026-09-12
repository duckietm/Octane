import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { localizeWithFallback } from '../utils/localizeWithFallback';

export type HabbiconEntry = {
    id: number;
    dir: number;
    nameKey: string;
    collectionId: number;
    state: number;
    owned: boolean;
    claimable: boolean;
    favorite: boolean;
    purchasable: boolean;
    isReward: boolean;
    priceCredits: number;
    priceActivityPoints: number;
    activityPointType: number;
};

export type HabbiconSet = {
    id: string;
    collectionId: number;
    completed: number;
    total: number;
    reward: HabbiconEntry | null;
    priceCredits: number;
    priceActivityPoints: number;
    activityPointType: number;
    canBuy: boolean;
    title: string;
    description: string;
    entries: HabbiconEntry[];
};

export const HABBICON_CELL_SIZE = 42;
export const HABBICON_GRID_COLUMNS = 5;
export const HABBICON_RECENT_LIMIT = 10;
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

export const localizeHabbiconSetDescription = (category: string) => localizeWithFallback(`habbicon_collection_${category}_description`, '');

export const padHabbiconRow = <T>(entries: T[]): (T | null)[] => {
    const remainder = entries.length % HABBICON_GRID_COLUMNS;

    if (!remainder) return entries;

    return [...entries, ...Array.from({ length: HABBICON_GRID_COLUMNS - remainder }, () => null)];
};

export { useHabbiconCatalog } from '../../hooks/habbicons/useHabbiconCatalog';
