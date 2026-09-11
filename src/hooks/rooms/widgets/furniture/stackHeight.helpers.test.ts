import { describe, expect, it } from 'vitest';
import { composeMultiWalkStackHeight, isMultiWalkExtra, isWalkHeightClassName } from './stackHeight.helpers';

describe('custom stack height helpers (CustomStackHeightWidget.as / class_3611.as)', () => {
    it('recognises the walking helper by its tile_walkmagic class name', () => {
        expect(isWalkHeightClassName('tile_walkmagic')).toBe(true);
        expect(isWalkHeightClassName('tile_walkmagic_2')).toBe(true);
        expect(isWalkHeightClassName('tile_stackmagic')).toBe(false);
        expect(isWalkHeightClassName(null)).toBe(false);
    });

    it('reads the multi-walk checkbox from furniture_extra == 1', () => {
        expect(isMultiWalkExtra('1')).toBe(true);
        expect(isMultiWalkExtra(1)).toBe(true);
        expect(isMultiWalkExtra('0')).toBe(false);
        expect(isMultiWalkExtra(undefined)).toBe(false);
    });

    it('sends the official [furniId, height, multiWalkMode] array form', () => {
        expect(composeMultiWalkStackHeight(42, 150, true).getMessageArray()).toEqual([42, 150, true]);
        expect(composeMultiWalkStackHeight(42, 0, false).getMessageArray()).toEqual([42, 0, false]);
    });
});
