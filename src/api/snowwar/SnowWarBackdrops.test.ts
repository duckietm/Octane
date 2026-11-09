import { describe, expect, it } from 'vitest';
import { findSnowWarOfficialBackdrop, layoutSnowWarOfficialBackdrop, SNOWWAR_OFFICIAL_BACKDROPS } from './SnowWarBackdrops';

// Stage px of a tile point relative to the top corner of tile (0, 0): the arena
// floor is drawn at scale 32, so a tile is 32 x 16 stage px.
const tilePoint = (x: number, y: number) => ({ x: (x - y) * 16, y: (x + y) * 8 });

// Top-left of the artwork relative to tile (0, 0), as fitted on the heightmaps.
const topLeft = (file: string, ratio?: number) =>
{
    const backdrop = SNOWWAR_OFFICIAL_BACKDROPS.find(entry => entry.file === file)!;
    const anchor = tilePoint(backdrop.tile.x, backdrop.tile.y);
    // A floor far bigger than the art keeps the stage from shifting the rect.
    const layout = layoutSnowWarOfficialBackdrop(backdrop, ratio ?? backdrop.defaultRatio, { x: anchor.x + 5000, y: anchor.y + 5000 }, 20000, 20000);
    return { left: layout.rect.left - 5000, top: layout.rect.top - 5000, width: layout.rect.width, height: layout.rect.height };
};

describe('SnowWarBackdrops', () =>
{
    it('recognises the three official backdrops by file name on any host', () =>
    {
        expect(findSnowWarOfficialBackdrop('https://images.habbo.com/c_images/DEV_tests/snst_bg_1_a_big.png')?.file).toBe('snst_bg_1_a_big.png');
        expect(findSnowWarOfficialBackdrop('http://localhost/swf/c_images/gamecenter_snowwar/snst_bg_2_big.png?v=3')?.file).toBe('snst_bg_2_big.png');
        expect(findSnowWarOfficialBackdrop('/c_images/snowstorm_client/official/snst_bg_3_noscale.webp')?.file).toBe('snst_bg_3_noscale.png');
        expect(findSnowWarOfficialBackdrop('https://cdn.example/custom_arena.png')).toBeNull();
        expect(findSnowWarOfficialBackdrop('https://cdn.example/snst_bg_2_big_copy.png')).toBeNull();
        expect(findSnowWarOfficialBackdrop('')).toBeNull();
        expect(findSnowWarOfficialBackdrop(undefined)).toBeNull();
    });

    it('keeps the Arctic Island fit: the painted moat centre on the heightmap moat centre', () =>
    {
        expect(topLeft('snst_bg_1_a_big.png')).toEqual({ left: -987, top: -235, width: 2000, height: 1222 });
    });

    it('places Dragon Top with the playfield centred on the painted plateau', () =>
    {
        expect(topLeft('snst_bg_2_big.png')).toEqual({ left: -992, top: -218, width: 2000, height: 1222 });
    });

    it('places Fight Night with the playfield centred in the spotlight pool', () =>
    {
        expect(topLeft('snst_bg_3_noscale.png')).toEqual({ left: -899, top: -199, width: 1800, height: 1100 });
    });

    it('scales a hi-res copy to the same painted size and keeps its anchor', () =>
    {
        // A 2x file reports the same ratio, so it lands exactly where the 1x file does.
        expect(topLeft('snst_bg_2_big.png', 2444 / 4000)).toEqual(topLeft('snst_bg_2_big.png'));
    });

    it('builds the stage around the artwork and moves the floor into it', () =>
    {
        const backdrop = findSnowWarOfficialBackdrop('snst_bg_2_big.png')!;
        const layout = layoutSnowWarOfficialBackdrop(backdrop, backdrop.defaultRatio, { x: 816, y: 408 }, 1632, 840);

        expect(layout.rect).toEqual({ left: 0, top: 0, width: 2000, height: 1222 });
        expect(layout.floorOffsetX).toBe(992 - 816);
        expect(layout.floorOffsetY).toBe(626 - 408);
        expect(layout.stageW).toBe(2000);
        expect(layout.stageH).toBe(1222);
    });
});
