/* @vitest-environment jsdom */
import { GetSessionDataManager } from '@octane/renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FURNI_MAIN_FILTER, FURNI_TYPE_OPTIONS, filterFurnitureGroupItems } from './FurnitureFilter';
import { GroupItem } from './GroupItem';

const classes: Record<string, string> = { 'floor:1': 'nft_dragon', 'floor:2': 'throne', 'wall:3': 'nft_poster', 'wall:4': 'window_basic' };

const item = (type: number, isWallItem = false) =>
    ({
        type,
        isWallItem,
        category: 1,
        name: `item${type}`,
        description: 'desc',
        stuffData: null,
        getLastItem: () => ({ stuffData: { uniqueNumber: 0 } })
    }) as unknown as GroupItem;

const useFurnidata = () =>
    vi.mocked(GetSessionDataManager).mockReturnValue({
        getFloorItemData: (type: number) => (classes[`floor:${type}`] ? { className: classes[`floor:${type}`] } : null),
        getWallItemData: (type: number) => (classes[`wall:${type}`] ? { className: classes[`wall:${type}`] } : null)
    } as unknown as ReturnType<typeof GetSessionDataManager>);

describe('the collectibles furni type filter', () => {
    afterEach(() => vi.mocked(GetSessionDataManager).mockReset());

    it('is offered where Volt offers it', () => {
        expect(FURNI_TYPE_OPTIONS.all).toContain('collectibles');
        expect(FURNI_TYPE_OPTIONS.floor_items.indexOf('collectibles')).toBe(FURNI_TYPE_OPTIONS.floor_items.indexOf('pet_food') + 1);
        expect(FURNI_TYPE_OPTIONS.wall_items.indexOf('collectibles')).toBe(FURNI_TYPE_OPTIONS.wall_items.indexOf('paintings') + 1);
        expect(FURNI_TYPE_OPTIONS.room_layout).not.toContain('collectibles');
    });

    it('keeps the nft_* furni the Collectibles marketplace sells', () => {
        useFurnidata();

        const all = [item(1), item(2), item(3, true), item(4, true)];

        expect(filterFurnitureGroupItems(all, '', FURNI_MAIN_FILTER.ALL, 'collectibles').map((group) => group.type)).toEqual([1, 3]);
        expect(filterFurnitureGroupItems(all, '', FURNI_MAIN_FILTER.WALL, 'collectibles').map((group) => group.type)).toEqual([3]);
        expect(filterFurnitureGroupItems(all, '', FURNI_MAIN_FILTER.ALL, 'any')).toHaveLength(4);
    });
});
