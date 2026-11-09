import { describe, expect, it } from 'vitest';
import { Tile } from '../state/types';
import { clampCamera, HEIGHT_UNIT } from './heightmap';
import { cameraRay, intersectBox, pickTile, Ray } from './picking';

const tile = (h: number, blocked = false): Tile => ({ h, blocked });

const down = (x: number, z: number, y = 20): Ray => ({ origin: [x, y, z], direction: [0, -1, 0] });

describe('intersectBox', () => {
    it('returns the entry distance for a hit and null for a miss', () => {
        expect(intersectBox(down(0.5, 0.5, 10), [0, 0, 0], [1, 2, 1])).toBeCloseTo(8, 6);
        expect(intersectBox(down(3, 0.5, 10), [0, 0, 0], [1, 2, 1])).toBeNull();
    });

    it('ignores boxes behind the ray origin', () => {
        expect(intersectBox({ origin: [0.5, -5, 0.5], direction: [0, -1, 0] }, [0, 0, 0], [1, 2, 1])).toBeNull();
    });
});

describe('pickTile', () => {
    const tiles: Tile[][] = [
        [tile(0), tile(4), tile(0, true)],
        [tile(0), tile(0), tile(0)]
    ];

    it('finds the column straight under the ray', () => {
        expect(pickTile(down(1.5, 0.5), tiles)).toEqual({ row: 0, col: 1 });
        expect(pickTile(down(2.5, 1.5), tiles)).toEqual({ row: 1, col: 2 });
    });

    it('falls back to the floor plane on blocked tiles inside the grid', () => {
        expect(pickTile(down(2.5, 0.5), tiles)).toEqual({ row: 0, col: 2 });
        expect(pickTile(down(7.5, 0.5), tiles)).toBeNull();
        expect(pickTile(down(-0.5, 0.5), tiles)).toBeNull();
    });

    it('prefers the tall column that a slanted ray hits first', () => {
        // Aim at the floor of tile (1, 1) from a position where the ray passes through the top of column (0, 1).
        const top = 4 * HEIGHT_UNIT;
        const ray: Ray = { origin: [1.5, top + 1, -1], direction: [0, -1, 1] };
        const len = Math.hypot(0, 1, 1);
        ray.direction = [0, -1 / len, 1 / len];
        expect(pickTile(ray, tiles)).toEqual({ row: 0, col: 1 });
    });
});

describe('cameraRay', () => {
    it('shoots through the target from the screen centre', () => {
        const camera = clampCamera({ yaw: 0.7, pitch: 0.5, distance: 12, target: [3, 0, 4] });
        const ray = cameraRay(camera, 16 / 9, Math.PI / 4, 0, 0);
        const t = 12;
        expect(ray.origin[0] + ray.direction[0] * t).toBeCloseTo(3, 5);
        expect(ray.origin[1] + ray.direction[1] * t).toBeCloseTo(0, 5);
        expect(ray.origin[2] + ray.direction[2] * t).toBeCloseTo(4, 5);
    });

    it('tilts up for the top of the screen and right for the right edge', () => {
        const camera = clampCamera({ yaw: 0, pitch: 0.4, distance: 10, target: [0, 0, 0] });
        const centre = cameraRay(camera, 1, Math.PI / 4, 0, 0);
        const top = cameraRay(camera, 1, Math.PI / 4, 0, 1);
        const right = cameraRay(camera, 1, Math.PI / 4, 1, 0);
        expect(top.direction[1]).toBeGreaterThan(centre.direction[1]);
        expect(right.direction[0]).toBeGreaterThan(centre.direction[0]);
    });
});
