import { describe, expect, it } from 'vitest';
import {
    addRecyclerSlot,
    getRecyclerEligibleItemIds,
    getRecyclerInventoryChoices,
    normalizeRecyclerSlotCount,
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
});
