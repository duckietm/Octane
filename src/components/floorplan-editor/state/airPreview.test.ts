import { describe, expect, it } from 'vitest';
import { AIR_PREVIEW_ENTRY, AIR_PREVIEW_TILE_SIZE, layoutAirPreview } from './airPreview';
import { Tile } from './types';

/** Rows of heights, 'x' for a void tile. */
const grid = (...rows: string[]): Tile[][] =>
    rows.map((row) => row.split('').map((char) => (char === 'x' ? { h: 0, blocked: true } : { h: parseInt(char, 36), blocked: false })));

describe('layoutAirPreview (AIR FloorPlanPreviewer)', () => {
    it('puts each tile at (8 * (x - y), 4 * (x + y) - 8 * height), shifted to the top-left corner', () => {
        const { tiles, width, height } = layoutAirPreview(grid('00', '00'), null);

        // Raw points: (0,0) (8,4) (-8,4) (0,8) -> min x -8, min y 0.
        expect(tiles).toEqual([
            { x: 8, y: 0, picture: 0 },
            { x: 16, y: 4, picture: 0 },
            { x: 0, y: 4, picture: 0 },
            { x: 8, y: 8, picture: 0 }
        ]);
        expect(width).toBe(16 + AIR_PREVIEW_TILE_SIZE);
        expect(height).toBe(8 + AIR_PREVIEW_TILE_SIZE);
    });

    it('raises a tile by 8 px per height step', () => {
        const { tiles } = layoutAirPreview(grid('02'), null);

        expect(tiles[1].y - tiles[0].y).toBe(4 - 16);
    });

    it('marks the sides that touch a tile one step higher', () => {
        // The middle tile has a higher neighbour only to its right (x + 1): bits 2 (up-right) and 8 (down-right).
        const { tiles } = layoutAirPreview(grid('000', '001', '000'), null);

        expect(tiles[4].picture).toBe(2 | 8);
        // A tile ringed by higher tiles counts as plain.
        expect(layoutAirPreview(grid('111', '101', '111'), null).tiles[4].picture).toBe(0);
        // Two steps up is not "one step higher".
        expect(layoutAirPreview(grid('000', '002', '000'), null).tiles[4].picture).toBe(0);
    });

    it('draws the door tile with the entry picture', () => {
        const { tiles } = layoutAirPreview(grid('x0', '00'), { x: 1, y: 0, dir: 2 });

        expect(tiles[0].picture).toBe(AIR_PREVIEW_ENTRY);
    });

    it('skips void tiles and gives an empty plan an empty bitmap', () => {
        expect(layoutAirPreview(grid('x0x'), null).tiles).toHaveLength(1);
        expect(layoutAirPreview(grid('xx', 'xx'), null)).toEqual({ width: 0, height: 0, tiles: [] });
    });
});
