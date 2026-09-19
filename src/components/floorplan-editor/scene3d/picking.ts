import { MAX_NUM_TILE_PER_AXIS } from '../state/constants';
import { Tile } from '../state/types';
import { cameraEye, FLOOR_SLAB, HEIGHT_UNIT, OrbitCamera } from './heightmap';
import { Vec3 } from './mat4';

export type Ray = { origin: Vec3; direction: Vec3 };

export type TileHit = { row: number; col: number };

const normalize = (v: Vec3): Vec3 => {
    const len = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / len, v[1] / len, v[2] / len];
};

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * World-space ray through a point on the screen. `ndcX`/`ndcY` are in -1..1
 * with y up, matching the projection used by the scene (same fov and aspect).
 */
export const cameraRay = (camera: OrbitCamera, aspect: number, fovY: number, ndcX: number, ndcY: number): Ray => {
    const origin = cameraEye(camera);
    const forward = normalize([camera.target[0] - origin[0], camera.target[1] - origin[1], camera.target[2] - origin[2]]);
    const right = normalize(cross(forward, [0, 1, 0]));
    const up = cross(right, forward);
    const halfHeight = Math.tan(fovY / 2);
    const halfWidth = halfHeight * aspect;

    return {
        origin,
        direction: normalize([
            forward[0] + right[0] * ndcX * halfWidth + up[0] * ndcY * halfHeight,
            forward[1] + right[1] * ndcX * halfWidth + up[1] * ndcY * halfHeight,
            forward[2] + right[2] * ndcX * halfWidth + up[2] * ndcY * halfHeight
        ])
    };
};

/** Slab test: distance along the ray to an axis-aligned box, or null when missed. */
export const intersectBox = (ray: Ray, min: Vec3, max: Vec3): number | null => {
    let tNear = -Infinity;
    let tFar = Infinity;

    for (let axis = 0; axis < 3; axis++) {
        const o = ray.origin[axis];
        const d = ray.direction[axis];

        if (Math.abs(d) < 1e-9) {
            if (o < min[axis] || o > max[axis]) return null;
            continue;
        }

        let t1 = (min[axis] - o) / d;
        let t2 = (max[axis] - o) / d;
        if (t1 > t2) [t1, t2] = [t2, t1];
        if (t1 > tNear) tNear = t1;
        if (t2 < tFar) tFar = t2;
        if (tNear > tFar || tFar < 0) return null;
    }

    return tNear >= 0 ? tNear : tFar >= 0 ? 0 : null;
};

/**
 * The tile under a ray: the nearest tile column it enters, or failing that the
 * tile where it crosses the floor plane, so tools can also paint empty tiles.
 * Only positions inside the editable grid count.
 */
export const pickTile = (ray: Ray, tiles: Tile[][]): TileHit | null => {
    let best: TileHit | null = null;
    let bestT = Infinity;

    for (let r = 0; r < tiles.length; r++) {
        const row = tiles[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
            const tile = row[c];
            if (!tile || tile.blocked) continue;

            const t = intersectBox(ray, [c, -FLOOR_SLAB, r], [c + 1, tile.h * HEIGHT_UNIT, r + 1]);
            if (t !== null && t < bestT) {
                bestT = t;
                best = { row: r, col: c };
            }
        }
    }

    if (best) return best;

    if (Math.abs(ray.direction[1]) < 1e-9) return null;

    const t = -ray.origin[1] / ray.direction[1];
    if (t < 0 || t > bestT) return null;

    const col = Math.floor(ray.origin[0] + ray.direction[0] * t);
    const row = Math.floor(ray.origin[2] + ray.direction[2] * t);
    const rows = Math.min(tiles.length, MAX_NUM_TILE_PER_AXIS);
    const cols = Math.min(tiles[0]?.length ?? 0, MAX_NUM_TILE_PER_AXIS);

    if (row < 0 || col < 0 || row >= rows || col >= cols) return null;

    return { row, col };
};
