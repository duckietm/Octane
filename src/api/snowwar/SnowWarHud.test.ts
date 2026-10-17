import { describe, expect, it } from 'vitest';
import { getCountdownFrame, getExplosionAssetName, getLoopFrame, getPingPongFrame, getScoreFlashFrame, SNOWWAR_EXPLOSION_OFFSETS } from './SnowWarHud';

describe('SnowWarHud (AIR SnowWarUI timings)', () =>
{
    it('flashes the score frames 1-4 at 50 ms, then hides', () =>
    {
        expect([ 0, 49, 50, 120, 199, 200, -1 ].map(getScoreFlashFrame)).toEqual([ 1, 1, 2, 3, 4, 0, 0 ]);
    });

    it('ping-pongs the empty-ammo flash 1,2,3,4,3,2', () =>
    {
        expect([ 0, 75, 150, 225, 300, 375, 450 ].map(now => getPingPongFrame(now, 4, 75))).toEqual([ 1, 2, 3, 4, 3, 2, 1 ]);
        expect(getPingPongFrame(500, 1, 75)).toBe(1);
    });

    it('loops the snowball loading icon', () =>
    {
        expect([ 0, 100, 700, 800 ].map(now => getLoopFrame(now, 8))).toEqual([ 1, 2, 8, 1 ]);
    });

    it('counts 5..1 in the last five preparing seconds, then bursts', () =>
    {
        const end = 100_000;

        expect(getCountdownFrame(end - 9_000, end)).toBe(0);
        expect(getCountdownFrame(end - 5_000, end)).toBe(1);
        expect(getCountdownFrame(end - 4_001, end)).toBe(1);
        expect(getCountdownFrame(end - 1, end)).toBe(5);
        expect(getCountdownFrame(end, end)).toBe(6);
        expect(getCountdownFrame(end + 450, end)).toBe(10);
        expect(getCountdownFrame(end + 500, end)).toBe(0);
        expect(getCountdownFrame(end, 0)).toBe(0);
    });

    it('names and offsets the explosion frames', () =>
    {
        expect(getExplosionAssetName(7)).toBe('explosion0007');
        expect(Object.keys(SNOWWAR_EXPLOSION_OFFSETS)).toHaveLength(10);
    });
});
