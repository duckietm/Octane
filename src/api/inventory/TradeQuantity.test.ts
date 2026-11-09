/* @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FurnitureItem } from './FurnitureItem';
import { GroupItem } from './GroupItem';
import { clampTradeQuantity } from './TradeQuantity';

/**
 * Clearing the trade quantity field to retype it made the amount NaN. The view offered the raw field,
 * and GroupItem.getTradeItems compared `found >= NaN`, which is never true: the whole stack went into
 * the trade (300 of a pile instead of the few the user meant).
 */
describe('clampTradeQuantity', () => {
    it('offers nothing for an empty, zero or negative amount', () => {
        expect(clampTradeQuantity(Number.NaN, 300)).toBe(0);
        expect(clampTradeQuantity(0, 300)).toBe(0);
        expect(clampTradeQuantity(-4, 300)).toBe(0);
        expect(clampTradeQuantity(5, 0)).toBe(0);
    });

    it('holds the amount to what is still unlocked', () => {
        expect(clampTradeQuantity(5, 300)).toBe(5);
        expect(clampTradeQuantity(900, 300)).toBe(300);
        expect(clampTradeQuantity(2.7, 300)).toBe(2);
    });
});

const roomEngine = { getFurnitureFloorIconUrl: () => '', getFurnitureWallIconUrl: () => '' } as never;

const stack = (size: number): GroupItem => {
    const group = new GroupItem(1, 1, roomEngine);

    for (let ref = 1; ref <= size; ref++) {
        group.push(new FurnitureItem({ itemId: ref, ref, spriteId: 1, category: 1, isGroupable: true, tradable: true } as never));
    }

    return group;
};

describe('GroupItem.getTradeItems', () => {
    it('hands back nothing for an amount that is not a positive number', () => {
        const group = stack(30);

        expect(group.getTradeItems(Number.NaN)).toEqual([]);
        expect(group.getTradeItems(0)).toEqual([]);
        expect(group.getTradeItems(3)).toHaveLength(3);
    });

    it('the trade view offers the checked amount, not the raw field', () => {
        const view = readFileSync('src/components/inventory/views/furniture/InventoryTradeView.tsx', 'utf8');

        expect(view).toContain('const count = clampTradeQuantity(quantity, totalItemCount);');
        expect(view).toContain('attemptItemOffer(count);');
        expect(view).not.toContain('attemptItemOffer(quantity);');
    });
});
