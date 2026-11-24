import { describe, expect, it } from 'vitest';
import {
    addRecyclerSlot,
    getRecyclerEligibleItemIds,
    getRecyclerInventoryChoices,
    getRecyclerLockedRefs,
    normalizeRecyclerSlotCount,
    pickRecyclerChoiceForPlacedItem,
    placeRecyclerSlot,
    reconcileRecyclerSlots
} from './recycler.helpers';

describe('recycler helpers', () => {
    it('accepts only recyclable unlocked unselected instances', () => {
        const groups = [
            {
                iconUrl: 'chair.png',
                items: [
                    { id: 1, locked: false, recyclable: false },
                    { id: 2, locked: true, recyclable: true },
                    { id: 3, locked: false, recyclable: true }
                ],
                name: 'Chair'
            }
        ];

        expect(getRecyclerInventoryChoices(groups as any, new Set())).toEqual([
            { iconUrl: 'chair.png', itemId: 3, name: 'Chair' }
        ]);
        expect(getRecyclerInventoryChoices(groups as any, new Set([3]))).toEqual([]);
    });

    it('bounds configuration before creating slots', () => {
        expect(normalizeRecyclerSlotCount(5)).toBe(5);
        expect(normalizeRecyclerSlotCount(99)).toBe(12);
        expect(normalizeRecyclerSlotCount('invalid')).toBe(8);
    });

    it('atomically rejects duplicate, full and no-longer-eligible slot additions', () => {
        const selected = [{ iconUrl: 'chair.png', itemId: 3, name: 'Chair' }];
        const next = { iconUrl: 'table.png', itemId: 4, name: 'Table' };
        const eligibleIds = new Set([3, 4]);

        expect(addRecyclerSlot(selected, selected[0], 2, eligibleIds)).toBe(selected);
        expect(addRecyclerSlot(selected, next, 1, eligibleIds)).toBe(selected);
        expect(addRecyclerSlot(selected, { ...next, itemId: 5 }, 2, eligibleIds)).toBe(selected);
        expect(addRecyclerSlot(selected, next, 2, eligibleIds)).toEqual([...selected, next]);
    });

    it('removes slots that become locked or non-recyclable in the live inventory', () => {
        const groups = [
            {
                iconUrl: 'chair.png',
                items: [
                    { id: 3, locked: false, recyclable: true },
                    { id: 4, locked: true, recyclable: true }
                ],
                name: 'Chair'
            }
        ];
        const selected = [
            { iconUrl: 'chair.png', itemId: 3, name: 'Chair' },
            { iconUrl: 'chair.png', itemId: 4, name: 'Chair' }
        ];
        const eligibleIds = getRecyclerEligibleItemIds(groups as any);

        expect(reconcileRecyclerSlots(selected, eligibleIds)).toEqual([selected[0]]);
    });

    const stack = [
        { iconUrl: 'chair.png', name: 'Chair', items: [{ id: 1, locked: false, recyclable: true }, { id: 2, locked: false, recyclable: true }] },
        { iconUrl: 'rare.png', name: 'Rare', items: [{ id: 9, locked: false, recyclable: false }] }
    ] as any;

    it('takes the furni held from the inventory, or another free one of its stack', () => {
        expect(pickRecyclerChoiceForPlacedItem(stack, 2, new Set())).toEqual({ iconUrl: 'chair.png', itemId: 2, name: 'Chair' });
        expect(pickRecyclerChoiceForPlacedItem(stack, 2, new Set([2]))?.itemId).toBe(1);
        expect(pickRecyclerChoiceForPlacedItem(stack, -2, new Set())?.itemId).toBe(2);
    });

    it('refuses a furni that cannot be recycled or whose stack is used up', () => {
        expect(pickRecyclerChoiceForPlacedItem(stack, 9, new Set())).toBeNull();
        expect(pickRecyclerChoiceForPlacedItem(stack, 2, new Set([1, 2]))).toBeNull();
        expect(pickRecyclerChoiceForPlacedItem(stack, 77, new Set())).toBeNull();
    });

    it('puts the furni in the slot it is dropped on, or the next free one', () => {
        const a = { iconUrl: '', itemId: 1, name: 'a' };
        const b = { iconUrl: '', itemId: 2, name: 'b' };
        const c = { iconUrl: '', itemId: 3, name: 'c' };

        expect(placeRecyclerSlot([a, b], 0, c, 8)).toEqual([c, b]);
        expect(placeRecyclerSlot([a, b], 5, c, 8)).toEqual([a, b, c]);
        expect(placeRecyclerSlot([a, b], 5, c, 2)).toEqual([a, b]);
        expect(placeRecyclerSlot([a, b], 1, a, 8)).toEqual([a, b]);
    });

    it('keeps a furni locked by the recycler itself in its slot', () => {
        const groups = [
            { iconUrl: 'c.png', name: 'Chair', items: [{ id: 1, ref: 11, locked: true, recyclable: true }, { id: 2, ref: 12, locked: true, recyclable: true }, { id: 3, ref: 13, locked: false, recyclable: true }] }
        ] as any;

        // 1 is in a slot (locked by the recycler), 2 is locked by something else.
        expect([...getRecyclerEligibleItemIds(groups, new Set([1]))]).toEqual([1, 3]);
        expect([...getRecyclerEligibleItemIds(groups)]).toEqual([3]);
        expect(getRecyclerLockedRefs(groups, new Set([1]))).toEqual([11]);
        expect(getRecyclerLockedRefs(groups, new Set())).toEqual([]);

        // Dropping on the slot that holds 1: it may go back in; 2 never does.
        expect(pickRecyclerChoiceForPlacedItem(groups, 1, new Set(), new Set([1]))?.itemId).toBe(1);
        expect(pickRecyclerChoiceForPlacedItem(groups, 2, new Set([1, 3]), new Set([1, 3]))).toBeNull();
    });
});
