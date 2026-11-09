/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { FurnitureItem, GroupItem } from '../../api';
import { unlockAllGroups } from './useInventoryTrade';

const item = (ref: number, locked: boolean): FurnitureItem => {
    const value = new FurnitureItem({ itemId: ref, ref, spriteId: 1, category: 1, isGroupable: false } as never);

    value.locked = locked;

    return value;
};

/** Enough of a room engine for GroupItem.prepareGroup, which asks it for an icon. */
const roomEngine = { getFurnitureFloorIconUrl: () => '', getFurnitureWallIconUrl: () => '' } as never;

const group = (...items: FurnitureItem[]): GroupItem => {
    const value = new GroupItem(1, 1, roomEngine);

    for (const furni of items) value.push(furni);

    return value;
};

const lockStates = (groups: GroupItem[]): boolean[] =>
    groups.flatMap((groupItem) => {
        const states: boolean[] = [];

        for (let index = 0; index < groupItem.getTotalCount(); index++) states.push(groupItem.getItemByIndex(index).locked);

        return states;
    });

/**
 * Offering an item in a trade locks it. Nothing released that lock, so after a
 * cancelled trade - where the server returns the items and sends no inventory packet at
 * all - the item stayed unplaceable, unsellable and unrecyclable until a reload.
 */
describe('unlockAllGroups', () => {
    it('unlocks what the trade had locked', () => {
        const groups = unlockAllGroups([group(item(1, true), item(2, true))]);

        expect(lockStates(groups)).toEqual([false, false]);
    });

    it('leaves the items that were never locked alone', () => {
        const groups = unlockAllGroups([group(item(1, false), item(2, true))]);

        expect(lockStates(groups)).toEqual([false, false]);
    });

    it('covers every group, not just the one that was offered', () => {
        const groups = unlockAllGroups([group(item(1, true)), group(item(2, true)), group(item(3, false))]);

        expect(lockStates(groups)).toEqual([false, false, false]);
    });

    it('does not mutate the groups it was given', () => {
        const original = group(item(1, true));

        unlockAllGroups([original]);

        expect(original.getItemByIndex(0).locked).toBe(true);
    });

    it('handles an empty inventory', () => {
        expect(unlockAllGroups([])).toEqual([]);
    });
});