import { describe, expect, it } from 'vitest';
import {
    clampProjectileParam,
    decodeProjectileTokens,
    defaultProjectileParams,
    encodeProjectileTokens,
    isProjectileVariableEnabled,
    normalizeProjectileParams,
    PROJECTILE_INTERNAL_VARIABLES,
    PROJECTILE_PARAM_COUNT,
    PROJECTILE_PARAM_CURVE_STRENGTH,
    PROJECTILE_PARAM_DIRECTIONAL_SYSTEM,
    PROJECTILE_PARAM_DISTANCE_TILES,
    PROJECTILE_PARAM_ROTATE,
    PROJECTILE_PARAM_ROTATION_OFFSET,
    PROJECTILE_PARAM_TIME_PER_TILE,
    PROJECTILE_SYSTEM_EIGHT_DIFFUSE,
    PROJECTILE_SYSTEM_EIGHT_STRAIGHT,
    PROJECTILE_SYSTEM_FOUR_PREFER_HORIZONTAL,
    PROJECTILE_SYSTEM_FOUR_PREFER_VERTICAL,
    PROJECTILE_TIME_PER_TILE_DEFAULT,
    PROJECTILE_TOTAL_PARAM_COUNT,
    resolveProjectileDirection,
    toggleProjectileVariable
} from './WiredProjectile';

describe('projectile add-on params', () => {
    it('starts a fresh box turning its projectiles at the default time per tile', () => {
        const params = defaultProjectileParams();

        expect(params).toHaveLength(PROJECTILE_TOTAL_PARAM_COUNT);
        expect(params[PROJECTILE_PARAM_ROTATE]).toBe(1);
        expect(params[PROJECTILE_PARAM_TIME_PER_TILE]).toBe(PROJECTILE_TIME_PER_TILE_DEFAULT);
        expect(params.filter((value) => value !== 0)).toEqual([1, PROJECTILE_TIME_PER_TILE_DEFAULT]);
    });

    it('keeps every param the server stores, sources included', () => {
        const saved = [1, 3, 1, 1, 250, 2, 1, 1, 1, 75, 6, 5, 1, 1, 2, 1, -12, 3, 400, 11, 101, 200, 201, 11];

        expect(normalizeProjectileParams(saved)).toEqual(saved);
    });

    it('converts a box saved before the time was applied', () => {
        // Nineteen params, the time per tile still the 0 the old editor wrote.
        const old = [1, 3, 1, 1, 0, 2, 1, 1, 1, 75, 6, 5, 1, 1, 2, 1, -12, 3, 400];
        const params = normalizeProjectileParams(old);

        expect(params).toHaveLength(PROJECTILE_TOTAL_PARAM_COUNT);
        expect(params[PROJECTILE_PARAM_TIME_PER_TILE]).toBe(PROJECTILE_TIME_PER_TILE_DEFAULT);
        expect(params.slice(PROJECTILE_PARAM_COUNT)).toEqual([0, 0, 0, 0, 0]);
        expect(params[PROJECTILE_PARAM_CURVE_STRENGTH]).toBe(400);
    });

    it('pads a short box, clamps what is out of range and cuts a long one', () => {
        const short = normalizeProjectileParams([0, 2]);

        expect(short).toHaveLength(PROJECTILE_TOTAL_PARAM_COUNT);
        expect(short[PROJECTILE_PARAM_ROTATE]).toBe(0);
        expect(short[PROJECTILE_PARAM_DIRECTIONAL_SYSTEM]).toBe(2);
        expect(short[PROJECTILE_PARAM_TIME_PER_TILE]).toBe(PROJECTILE_TIME_PER_TILE_DEFAULT);
        expect(normalizeProjectileParams([9, 9, 9, 9, 999_999])[PROJECTILE_PARAM_TIME_PER_TILE]).toBe(100_000);
        expect(normalizeProjectileParams(new Array(30).fill(1))).toHaveLength(PROJECTILE_TOTAL_PARAM_COUNT);
        expect(normalizeProjectileParams(null)).toEqual(defaultProjectileParams());
    });

    it('packs the time and distance variables into the string param and back', () => {
        expect(encodeProjectileTokens('custom:12', 'internal:@position_x')).toBe('custom:12\tinternal:@position_x');
        expect(encodeProjectileTokens('', 'custom:3')).toBe('\tcustom:3');
        expect(encodeProjectileTokens('', '')).toBe('');
        expect(decodeProjectileTokens('custom:12\tinternal:@position_x')).toEqual(['custom:12', 'internal:@position_x']);
        expect(decodeProjectileTokens('custom:12')).toEqual(['custom:12', '']);
        expect(decodeProjectileTokens(null)).toEqual(['', '']);
    });

    it('turns each internal variable on and off by its bit', () => {
        expect(isProjectileVariableEnabled(0b1000010, 1)).toBe(true);
        expect(isProjectileVariableEnabled(0b1000010, 2)).toBe(false);
        expect(toggleProjectileVariable(0, 6, true)).toBe(64);
        expect(toggleProjectileVariable(127, 0, false)).toBe(126);
    });

    it("orders the mask bits as AIR's sub-variable ids, with AIR's spellings", () => {
        expect(PROJECTILE_INTERNAL_VARIABLES).toEqual([
            '@projectile.animation.tiles_travelled',
            '@projectile.animation.user_collisions',
            '@projectile.animation.furni_collisions',
            '@projectile.animation.position.x',
            '@projectile.animation.position.y',
            '@projectile.animation.position.altitude',
            '@projectile.animation.is_travelling'
        ]);
    });
});

describe('projectile direction picture', () => {
    it('resolves each system the way the server does', () => {
        // One step each way under eight straight: the room's own compass, north towards smaller y.
        expect([
            [0, -1],
            [1, -1],
            [1, 0],
            [1, 1],
            [0, 1],
            [-1, 1],
            [-1, 0],
            [-1, -1]
        ].map(([dx, dy]) => resolveProjectileDirection(PROJECTILE_SYSTEM_EIGHT_STRAIGHT, dx, dy))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

        expect(resolveProjectileDirection(PROJECTILE_SYSTEM_EIGHT_STRAIGHT, 5, 1)).toBe(3);
        expect(resolveProjectileDirection(PROJECTILE_SYSTEM_EIGHT_DIFFUSE, 5, 1)).toBe(2);
        expect(resolveProjectileDirection(PROJECTILE_SYSTEM_EIGHT_DIFFUSE, 5, 3)).toBe(3);
        expect(resolveProjectileDirection(PROJECTILE_SYSTEM_FOUR_PREFER_VERTICAL, 3, 3)).toBe(4);
        expect(resolveProjectileDirection(PROJECTILE_SYSTEM_FOUR_PREFER_HORIZONTAL, 3, 3)).toBe(2);
        expect(resolveProjectileDirection(PROJECTILE_SYSTEM_FOUR_PREFER_VERTICAL, -2, -2)).toBe(0);
        expect(resolveProjectileDirection(PROJECTILE_SYSTEM_FOUR_PREFER_HORIZONTAL, -2, -2)).toBe(6);
        expect(resolveProjectileDirection(PROJECTILE_SYSTEM_EIGHT_STRAIGHT, 0, 0)).toBe(-1);
    });

    it('keeps an edited param inside what the server accepts', () => {
        expect(clampProjectileParam(PROJECTILE_PARAM_ROTATION_OFFSET, 9)).toBe(7);
        expect(clampProjectileParam(PROJECTILE_PARAM_DISTANCE_TILES, -80)).toBe(-64);
        expect(clampProjectileParam(PROJECTILE_PARAM_CURVE_STRENGTH, 12.7)).toBe(12);
        expect(clampProjectileParam(PROJECTILE_PARAM_TIME_PER_TILE, Number.NaN)).toBe(1);
        expect(clampProjectileParam(PROJECTILE_PARAM_TIME_PER_TILE, 0)).toBe(1);
    });
});
