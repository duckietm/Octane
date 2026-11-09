import { beforeEach, describe, expect, it, vi } from 'vitest';

const FLOOR = 30;
const WALL = 40;

interface FakeSprite {
    blendMode: string;
    filters: Array<{ options: Record<string, unknown> }>;
}

const objects = new Map<string, { visualization: { sprites: FakeSprite[]; updateSpriteCounter: number } }>();

vi.mock('@octane/renderer', () => {
    class WiredFilter {
        constructor(public options: Record<string, unknown>) {}
    }

    return {
        RoomObjectCategory: { FLOOR: 30, WALL: 40, UNIT: 20 },
        WiredFilter,
        GetRoomEngine: () => ({
            activeRoomId: 1,
            getRoomObject: (_roomId: number, objectId: number, category: number) => objects.get(`${category}:${objectId}`) ?? null,
            getRoomObjects: (_roomId: number, category: number) =>
                [...objects.entries()].filter(([key]) => key.startsWith(`${category}:`)).map(([, object]) => object)
        })
    };
});

import { isDualFurniPickingMode, WiredSelectionVisualizer } from './WiredSelectionVisualizer';

const addObject = (category: number, objectId: number) => {
    const object = { visualization: { sprites: [{ blendMode: 'normal', filters: [] }], updateSpriteCounter: 0 } };

    objects.set(`${category}:${objectId}`, object);

    return object;
};

const filtersOf = (object: ReturnType<typeof addObject>) => object.visualization.sprites[0].filters.map((filter) => filter.options);

describe('isDualFurniPickingMode', () => {
    it('is on when one furni slot takes the first picks (or the snapshot) and one the second', () => {
        expect(isDualFurniPickingMode({ furniAllowed: [[0, 100], [0, 101]] })).toBe(true);
        expect(isDualFurniPickingMode({ furniAllowed: [[110], [101]] })).toBe(true);
        expect(isDualFurniPickingMode({ furniAllowed: [[0, 100, 101]] })).toBe(true);
    });

    it('is off for a single pick list or no sources', () => {
        expect(isDualFurniPickingMode({ furniAllowed: [[0, 100]] })).toBe(false);
        expect(isDualFurniPickingMode({ furniAllowed: [[101]] })).toBe(false);
        expect(isDualFurniPickingMode(null)).toBe(false);
    });
});

describe('WiredSelectionVisualizer', () => {
    beforeEach(() => {
        objects.clear();
        WiredSelectionVisualizer.setDualPickingMode(false);
        WiredSelectionVisualizer.setEditingPickList(1);
        WiredSelectionVisualizer.clearAllSelectionShaders();
    });

    it('highlights a picked wall item like a floor item', () => {
        const wallItem = addObject(WALL, 77);

        WiredSelectionVisualizer.show(77);

        expect(filtersOf(wallItem)).toHaveLength(1);
        expect(wallItem.visualization.updateSpriteCounter).toBe(1);

        WiredSelectionVisualizer.hide(77);

        expect(filtersOf(wallItem)).toHaveLength(0);
    });

    it('reads a negative pick as a wall item, as the official picks do', () => {
        const wallItem = addObject(WALL, 12);

        WiredSelectionVisualizer.applySelectionShaderToFurni([-12]);

        expect(filtersOf(wallItem)).toHaveLength(1);
    });

    it('puts a wall pick back when its sprites were rebuilt', () => {
        const wallItem = addObject(WALL, 5);

        WiredSelectionVisualizer.show(5);
        wallItem.visualization.sprites[0].filters = [];
        WiredSelectionVisualizer.refresh();

        expect(filtersOf(wallItem)).toHaveLength(1);
    });

    it('tints the first picks while dual picking is on and repaints them when it changes', () => {
        const first = addObject(FLOOR, 1);
        const second = addObject(FLOOR, 2);

        WiredSelectionVisualizer.show(1);
        WiredSelectionVisualizer.showSecondary(2);

        expect(filtersOf(first)[0].scale).toBeUndefined();

        WiredSelectionVisualizer.setDualPickingMode(true);

        expect(filtersOf(first)).toHaveLength(1);
        expect(filtersOf(first)[0].scale).toEqual([1.13, 1.13, 1]);
        expect(filtersOf(second)[0].scale).toEqual([1, 1, 1.15]);

        WiredSelectionVisualizer.show(3);
        const late = addObject(FLOOR, 3);

        WiredSelectionVisualizer.refresh();
        expect(filtersOf(late)[0].scale).toEqual([1.13, 1.13, 1]);

        WiredSelectionVisualizer.hide(1);
        expect(filtersOf(first)).toHaveLength(0);

        WiredSelectionVisualizer.setDualPickingMode(false);
        expect(filtersOf(late)[0].scale).toBeUndefined();
    });

    it('tints by pick list whichever list is edited: set 1 its own tint, set 2 the blue one', () => {
        const antenna = addObject(FLOOR, 1);
        const forward = addObject(FLOOR, 2);
        const both = addObject(FLOOR, 3);

        WiredSelectionVisualizer.setDualPickingMode(true);

        let shown = WiredSelectionVisualizer.showPickLists([], [1, 3], [2, 3]);

        expect(shown.sort()).toEqual([1, 2, 3]);
        expect(filtersOf(antenna)).toEqual([expect.objectContaining({ scale: [1.13, 1.13, 1] })]);
        expect(filtersOf(forward)).toEqual([expect.objectContaining({ scale: [1, 1, 1.15] })]);
        expect(filtersOf(both)).toEqual([expect.objectContaining({ scale: [1, 1, 1.15] })]);

        // Editing the second list does not swap the tints.
        WiredSelectionVisualizer.setEditingPickList(2);
        shown = WiredSelectionVisualizer.showPickLists(shown, [1], [2]);

        expect(filtersOf(antenna)).toEqual([expect.objectContaining({ scale: [1.13, 1.13, 1] })]);
        expect(filtersOf(forward)).toEqual([expect.objectContaining({ scale: [1, 1, 1.15] })]);
        expect(filtersOf(both)).toHaveLength(0);
        expect(shown.sort()).toEqual([1, 2]);
    });

    it('gives a furni picked while the second list is edited the blue tint only', () => {
        const picked = addObject(FLOOR, 8);

        WiredSelectionVisualizer.setEditingPickList(2);
        WiredSelectionVisualizer.show(8);

        expect(WiredSelectionVisualizer.editingPickList).toBe(2);
        expect(filtersOf(picked)).toEqual([expect.objectContaining({ scale: [1, 1, 1.15] })]);

        WiredSelectionVisualizer.hide(8);
        expect(filtersOf(picked)).toHaveLength(0);

        WiredSelectionVisualizer.setEditingPickList(1);
        WiredSelectionVisualizer.show(8);
        expect(filtersOf(picked)).toHaveLength(1);
        expect(filtersOf(picked)[0].scale).toBeUndefined();
    });
});
