/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { inFurnitureSection } from './FurnitureFilter';
import { GroupItem } from './GroupItem';

const make = (over: { rentable?: boolean; uniqueNumber?: number }) =>
    ({ getLastItem: () => ({ rentable: !!over.rentable, stuffData: { uniqueNumber: over.uniqueNumber ?? 0 } }) }) as unknown as GroupItem;

describe('inFurnitureSection', () => {
    const plain = make({});
    const numbered = make({ uniqueNumber: 5 });
    const rented = make({ rentable: true });
    const rentedNumbered = make({ rentable: true, uniqueNumber: 3 });
    const all = [plain, numbered, rented, rentedNumbered];

    it('keeps each item in exactly one section', () => {
        expect(inFurnitureSection(all, 'furni')).toEqual([plain]);
        expect(inFurnitureSection(all, 'collectibles')).toEqual([numbered]);
        expect(inFurnitureSection(all, 'rentables')).toEqual([rented, rentedNumbered]);
    });
});
