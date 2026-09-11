import { afterEach, describe, expect, it, vi } from 'vitest';

const furniData = new Map<string, Partial<Record<string, unknown>>>();

vi.mock('@octane/renderer', () => ({
    GetSessionDataManager: () => ({
        getFloorItemData: (id: number) => furniData.get(`floor:${id}`) ?? null,
        getWallItemData: (id: number) => furniData.get(`wall:${id}`) ?? null
    })
}));

vi.mock('../../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    FurniCategory: { WALL_PAPER: 2, FLOOR: 3, LANDSCAPE: 4, POST_IT: 5, CREDIT_FURNI: 12, FIGURE_PURCHASABLE_SET: 23 }
}));

import {
    filterInventoryGroupItems,
    getInventoryMainFilterLabel,
    getInventoryTypeFilterIds,
    getInventoryTypeFilterLabel,
    MAIN_FILTER_ALL,
    MAIN_FILTER_FLOOR,
    MAIN_FILTER_ROOM_LAYOUT,
    MAIN_FILTER_WALL,
    passInventoryMainFilter,
    passInventoryTypeFilter,
    TYPE_FILTER_ANY
} from './inventoryFurniFilters';

const makeItem = (options: {
    type: number;
    isWallItem?: boolean;
    category?: number;
    name?: string;
    uniqueNumber?: number;
    tradable?: boolean;
    recyclable?: boolean;
}) => {
    const { type, isWallItem = false, category = 1, name = 'item', uniqueNumber = 0, tradable = true, recyclable = false } = options;

    return {
        type,
        isWallItem,
        category,
        name,
        description: '',
        stuffData: { uniqueNumber },
        getItemByIndex: () => ({ isTradable: tradable, recyclable })
    } as any;
};

const registerFloorData = (type: number, data: Record<string, unknown>) =>
    furniData.set(`floor:${type}`, {
        className: '',
        category: '',
        furniLine: '',
        allowStack: false,
        canStandOn: false,
        tileSizeX: 1,
        tileSizeY: 1,
        tileSizeZ: 0,
        ...data
    });

const registerWallData = (type: number, data: Record<string, unknown>) =>
    furniData.set(`wall:${type}`, { className: '', category: '', furniLine: '', ...data });

afterEach(() => furniData.clear());

describe('inventory furni filters', () => {
    it('offers the official type lists per main filter', () => {
        expect(getInventoryTypeFilterIds(MAIN_FILTER_ALL)).toContain('sittable');
        expect(getInventoryTypeFilterIds(MAIN_FILTER_FLOOR)).toContain('wired');
        expect(getInventoryTypeFilterIds(MAIN_FILTER_WALL)).toEqual([
            'any',
            'windows',
            'dimmers',
            'stickies',
            'paintings',
            'tradable',
            'non_tradable',
            'recyclable'
        ]);
        expect(getInventoryTypeFilterIds(MAIN_FILTER_ROOM_LAYOUT)).toEqual(['any', 'floors', 'wallpapers', 'landscape']);
    });

    it('labels every filter id with an English fallback', () => {
        expect(getInventoryMainFilterLabel(MAIN_FILTER_ROOM_LAYOUT)).toBe('Room layout');
        expect(getInventoryTypeFilterLabel('tiles_or_rugs')).toBe('Tiles and rugs');
        expect(getInventoryTypeFilterLabel(TYPE_FILTER_ANY)).toBe('Any type');
    });

    it('separates room layout items from wall items in the main filter', () => {
        const wallpaper = makeItem({ type: 1, isWallItem: true, category: 2 });
        const poster = makeItem({ type: 2, isWallItem: true, category: 1 });
        const chair = makeItem({ type: 3 });

        expect(passInventoryMainFilter(wallpaper, MAIN_FILTER_WALL)).toBe(false);
        expect(passInventoryMainFilter(wallpaper, MAIN_FILTER_ROOM_LAYOUT)).toBe(true);
        expect(passInventoryMainFilter(poster, MAIN_FILTER_WALL)).toBe(true);
        expect(passInventoryMainFilter(chair, MAIN_FILTER_FLOOR)).toBe(true);
        expect(passInventoryMainFilter(chair, MAIN_FILTER_WALL)).toBe(false);
    });

    it('matches sittable, wired and rug furni through the furni data of the item', () => {
        registerFloorData(10, { className: 'chair_basic', canSitOn: true });
        registerFloorData(11, { className: 'wf_trg_says_something' });
        registerFloorData(12, { className: 'rug_x', category: 'rug', allowStack: true });
        registerFloorData(13, { className: 'tile_walkmagic', category: 'rug', allowStack: true });

        expect(passInventoryTypeFilter(makeItem({ type: 10 }), 'sittable')).toBe(true);
        expect(passInventoryTypeFilter(makeItem({ type: 10 }), 'wired')).toBe(false);
        expect(passInventoryTypeFilter(makeItem({ type: 11 }), 'wired')).toBe(true);
        expect(passInventoryTypeFilter(makeItem({ type: 12 }), 'tiles_or_rugs')).toBe(true);
        expect(passInventoryTypeFilter(makeItem({ type: 13 }), 'tiles_or_rugs')).toBe(false);
    });

    it('uses the item flags for ltd, tradable and recyclable', () => {
        expect(passInventoryTypeFilter(makeItem({ type: 20, uniqueNumber: 7 }), 'ltd')).toBe(true);
        expect(passInventoryTypeFilter(makeItem({ type: 20 }), 'ltd')).toBe(false);
        expect(passInventoryTypeFilter(makeItem({ type: 20, tradable: false }), 'non_tradable')).toBe(true);
        expect(passInventoryTypeFilter(makeItem({ type: 20, tradable: false }), 'tradable')).toBe(false);
        expect(passInventoryTypeFilter(makeItem({ type: 20, recyclable: true }), 'recyclable')).toBe(true);
    });

    it('matches wall types through class names and categories', () => {
        registerWallData(30, { className: 'window_basic' });
        registerWallData(31, { className: 'dimmer_fabric' });

        expect(passInventoryTypeFilter(makeItem({ type: 30, isWallItem: true }), 'windows')).toBe(true);
        expect(passInventoryTypeFilter(makeItem({ type: 31, isWallItem: true }), 'dimmers')).toBe(true);
        expect(passInventoryTypeFilter(makeItem({ type: 31, isWallItem: true, category: 5 }), 'stickies')).toBe(true);
        expect(passInventoryTypeFilter(makeItem({ type: 31, isWallItem: true }), 'stickies')).toBe(false);
    });

    it('combines main filter, type filter and search', () => {
        registerFloorData(40, { className: 'chair_basic', canSitOn: true });
        registerFloorData(41, { className: 'table_basic' });

        const chair = makeItem({ type: 40, name: 'Basic chair' });
        const table = makeItem({ type: 41, name: 'Basic table' });
        const poster = makeItem({ type: 42, isWallItem: true, name: 'Chair poster' });

        expect(filterInventoryGroupItems([chair, table, poster], MAIN_FILTER_ALL, TYPE_FILTER_ANY, 'chair')).toEqual([chair, poster]);
        expect(filterInventoryGroupItems([chair, table, poster], MAIN_FILTER_FLOOR, 'sittable', '')).toEqual([chair]);
        expect(filterInventoryGroupItems([chair, table, poster], MAIN_FILTER_WALL, TYPE_FILTER_ANY, '')).toEqual([poster]);
    });
});
