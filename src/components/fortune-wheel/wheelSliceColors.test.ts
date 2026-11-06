import { describe, expect, it } from 'vitest';
import { getSliceColorIndexes, WHEEL_SLICE_COLORS } from './wheelSliceColors';

const neighboursDiffer = (indexes: number[]) => indexes.every((index, i) => index !== indexes[(i + 1) % indexes.length]);

describe('getSliceColorIndexes', () => {
    it('cycles the palette', () => {
        expect(getSliceColorIndexes(4)).toEqual([0, 1, 2, 3]);
    });

    it('never gives two neighbouring slices the same colour, the last and first included', () => {
        for (let count = 3; count <= 64; count++) {
            const indexes = getSliceColorIndexes(count);

            expect(indexes).toHaveLength(count);
            expect(neighboursDiffer(indexes)).toBe(true);
            expect(indexes.every((index) => index >= 0 && index < WHEEL_SLICE_COLORS.length)).toBe(true);
        }
    });

    it('returns nothing for an empty wheel', () => {
        expect(getSliceColorIndexes(0)).toEqual([]);
    });
});
