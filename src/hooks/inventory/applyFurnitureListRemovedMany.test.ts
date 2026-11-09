/* @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FurnitureItem, GroupItem } from '../../api';
import { applyFurnitureListRemovedMany } from './useInventoryFurni.reducers';

const item = (id: number): FurnitureItem => new FurnitureItem({ itemId: id, ref: id, spriteId: 1, category: 1, isGroupable: true } as never);

/** Enough of a room engine for GroupItem.prepareGroup, which asks it for an icon. */
const roomEngine = { getFurnitureFloorIconUrl: () => '', getFurnitureWallIconUrl: () => '' } as never;

const group = (type: number, ...items: FurnitureItem[]): GroupItem => {
    const value = new GroupItem(type, 1, roomEngine);

    for (const furni of items) value.push(furni);

    return value;
};

const ids = (groups: GroupItem[]): number[] =>
    groups.flatMap((groupItem) => {
        const found: number[] = [];

        for (let index = 0; index < groupItem.getTotalCount(); index++) found.push(groupItem.getItemByIndex(index).id);

        return found;
    });

/** A recycle sends one FurnitureListRemoveMultipleEvent for the furni it destroyed; nothing listened for it. */
describe('applyFurnitureListRemovedMany', () => {
    it('drops every recycled item and the groups left empty', () => {
        const state = [group(1, item(1), item(2), item(3)), group(2, item(4))];

        const next = applyFurnitureListRemovedMany(state, [1, 3, 4]);

        expect(ids(next)).toEqual([2]);
        expect(next).toHaveLength(1);
    });

    it('leaves the state it was given untouched', () => {
        const state = [group(1, item(1), item(2))];

        applyFurnitureListRemovedMany(state, [1]);

        expect(ids(state)).toEqual([1, 2]);
    });

    it('ignores ids it does not hold', () => {
        const state = [group(1, item(1))];

        expect(ids(applyFurnitureListRemovedMany(state, [99]))).toEqual([1]);
    });

    it('is what the inventory does with the packet', () => {
        expect(readFileSync('src/hooks/inventory/useInventoryFurni.ts', 'utf8')).toContain(
            'useMessageEvent<FurnitureListRemoveMultipleEvent>(FurnitureListRemoveMultipleEvent'
        );
    });
});
