import { describe, expect, it } from 'vitest';
import { canPlaceSnowWarEditorItem, getSnowWarEditorArea, isSnowWarFloorTile } from './SnowWarEditorTools';

describe('SnowWar editor tools', () =>
{
    it('treats every real floor-plan height as floor and x as void', () =>
    {
        expect(isSnowWarFloorTile('0')).toBe(true);
        expect(isSnowWarFloorTile('a')).toBe(true);
        expect(isSnowWarFloorTile('Q')).toBe(true);
        expect(isSnowWarFloorTile('x')).toBe(false);
        expect(isSnowWarFloorTile('z')).toBe(false);
        expect(isSnowWarFloorTile()).toBe(false);
    });

    it('fills a dragged rectangle in row order regardless of drag direction', () =>
    {
        expect(getSnowWarEditorArea({ x: 3, y: 2 }, { x: 1, y: 1 })).toEqual([
            { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
            { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
        ]);
    });

    it('rejects overlapping and out-of-map multi-tile placements', () =>
    {
        const items = [{ x: 2, y: 2, width: 2, length: 2 }];
        expect(canPlaceSnowWarEditorItem(items, { x: 3, y: 3 }, 8, 8)).toBe(false);
        expect(canPlaceSnowWarEditorItem(items, { x: 4, y: 3 }, 8, 8)).toBe(true);
        expect(canPlaceSnowWarEditorItem(items, { x: 7, y: 7, width: 2, length: 2 }, 8, 8)).toBe(false);
    });

    it('uses the rotated footprint and can ignore the item being moved', () =>
    {
        const items = [{ x: 1, y: 1, width: 3, length: 1, rotation: 2 }];
        expect(canPlaceSnowWarEditorItem(items, { x: 1, y: 3 }, 8, 8)).toBe(false);
        expect(canPlaceSnowWarEditorItem(items, { x: 1, y: 3 }, 8, 8, 0)).toBe(true);
    });
});
