import { ANGLE_COMPONENT, BASE_VEL_X, BASE_VEL_Y, SQRT_TABLE } from './SnowWarTables';

/**
 * SnowWar math — a faithful TypeScript mirror of the official AIR client and
 * the server's integer math. Every operation is forced to 32-bit integer
 * semantics with `| 0` so results match the emulator's Java `int` arithmetic
 * exactly; that is what keeps client and server checksums in sync.
 */

export const TILE_SIZE_WORLD = 3200; // 32px tile * 100 accuracy factor
export const SUBTURN_MOVEMENT = 534; // official AIR world units per subturn
export const SUBTURNS_PER_TICK = 3;
export const SERVER_TICK_MS = 150;
export const SUBTURN_MS = SERVER_TICK_MS / SUBTURNS_PER_TICK;
export const INITIAL_HIT_POINTS = 5;
export const INITIAL_SNOWBALL_COUNT = 5;
export const SNOWBALL_CREATE_TIME = 20;
export const STUN_TIME = 100;
export const INVINCIBLE_AFTER_STUN_TIME = 60;

export const tileToWorld = (tile: number): number => (tile * TILE_SIZE_WORLD) | 0;

export const TRAJECTORY_QUICK = 0;
export const TRAJECTORY_SHORT_LOB = 1;
export const TRAJECTORY_LONG_LOB = 2;
export const TRAJECTORY_DEFAULT = 3;
export const QUICK_THROW_MAX_RANGE_WORLD = 20000;
export const SHORT_LOB_MAX_RANGE_WORLD = 60000;
export const LONG_LOB_MAX_RANGE_WORLD = 100000;
export const DEFAULT_THROW_TO_LOB_CUTOFF_WORLD = 42000;

export const worldToTile = (world: number): number => (((world + 1600) / 3200) | 0);

export const validateDirection360 = (value: number): number =>
{
    value = value | 0;
    if (value > 359) return value % 360;
    if (value < 0) return 360 + (value % 360);
    return value;
};

export const validateDirection8 = (value: number): number =>
{
    value = value | 0;
    if (value > 7) return value % 8;
    if (value < 0) return (8 + (value % 8)) % 8;
    return value;
};

export const direction360To8 = (angle360: number): number =>
    validateDirection8((((validateDirection360((angle360 | 0) - 22) / 45) | 0) + 1));

export const getBaseVelX = (direction: number): number => BASE_VEL_X[validateDirection360(direction)];

export const getBaseVelY = (direction: number): number => BASE_VEL_Y[validateDirection360(direction)];

/** Optimized integer square root via lookup table (README §12.2). */
export const fastSqrt = (x: number): number =>
{
    x = x | 0;
    if (x >= 65536)
    {
        if (x >= 16777216)
        {
            if (x >= 268435456)
            {
                if (x >= 1073741824) return SQRT_TABLE[(x / 16777216) | 0] * 256;
                return SQRT_TABLE[(x / 4194304) | 0] * 128;
            }
            if (x >= 67108864) return SQRT_TABLE[(x / 1048576) | 0] * 64;
            return SQRT_TABLE[(x / 262144) | 0] * 32;
        }
        if (x >= 1048576)
        {
            if (x >= 4194304) return SQRT_TABLE[(x / 65536) | 0] * 16;
            return SQRT_TABLE[(x / 16384) | 0] * 8;
        }
        if (x >= 262144) return SQRT_TABLE[(x / 4096) | 0] * 4;
        return SQRT_TABLE[(x / 1024) | 0] * 2;
    }
    if (x >= 256)
    {
        if (x >= 4096)
        {
            if (x >= 16384) return SQRT_TABLE[(x / 256) | 0];
            return (SQRT_TABLE[(x / 64) | 0] / 2) | 0;
        }
        if (x >= 1024) return (SQRT_TABLE[(x / 16) | 0] / 4) | 0;
        return (SQRT_TABLE[(x / 4) | 0] / 8) | 0;
    }
    if (x >= 0) return (SQRT_TABLE[x] / 16) | 0;
    return -1;
};

/** Direction angle (0-359) from x/y deltas (README §12.3). */
export const getAngleFromComponents = (x: number, y: number): number =>
    validateDirection360(getAngleFromComponentsMaths(x | 0, y | 0));

const getAngleFromComponentsMaths = (x: number, y: number): number =>
{
    if (Math.abs(x) <= Math.abs(y))
    {
        if (y === 0) y = 1;

        x = (x * 256) | 0;
        let temp = (x / y) | 0;

        if (temp < 0) temp = -temp;
        if (temp > 255) temp = 255;

        if (y < 0)
        {
            if (x > 0) return ANGLE_COMPONENT[temp];
            return 360 - ANGLE_COMPONENT[temp];
        }
        if (x > 0) return 180 - ANGLE_COMPONENT[temp];
        return 180 + ANGLE_COMPONENT[temp];
    }

    if (x === 0) x = 1;

    y = (y * 256) | 0;
    let temp = (y / x) | 0;

    if (temp < 0) temp = -temp;
    if (temp > 255) temp = 255;

    if (y < 0)
    {
        if (x > 0) return 90 - ANGLE_COMPONENT[temp];
        return 270 + ANGLE_COMPONENT[temp];
    }
    if (x > 0) return 90 + ANGLE_COMPONENT[temp];
    return 270 - ANGLE_COMPONENT[temp];
};

/** XOR-shift PRNG used to seed each turn's checksum (README §12.5). */
export const iterateSeed = (seed: number): number =>
{
    seed = seed | 0;
    if (seed === 0) seed = -1;

    seed = (seed ^ (seed << 13)) | 0;
    seed = (seed ^ (seed >> 17)) | 0;
    seed = (seed ^ (seed << 5)) | 0;

    return seed;
};

/** One axis step of avatar movement (README §9.2 moveTowards). */
export const moveTowards = (current: number, target: number, maxStep: number): number =>
{
    const delta = (target - current) | 0;
    if (delta === 0) return current;
    if (Math.abs(delta) <= maxStep) return target;
    return delta < 0 ? current - maxStep : current + maxStep;
};

export interface SnowballFlightPath {
    direction: number;
    timeToLive: number;
    parabolaOffset: number;
    planarVelocity: number;
    trajectory: number;
}

/** Flight parameters from the official AIR SnowBallGameObject.initialize. */
export const calculateFlightPath = (
    userX: number,
    userY: number,
    targetX: number,
    targetY: number,
    trajectory: number,
): SnowballFlightPath => calculateFlightPathWorld(
    tileToWorld(userX),
    tileToWorld(userY),
    tileToWorld(targetX),
    tileToWorld(targetY),
    trajectory);

/** World-coordinate variant used by live throws while an avatar is mid-tile. */
export const calculateFlightPathWorld = (
    startWorldX: number,
    startWorldY: number,
    targetWorldX: number,
    targetWorldY: number,
    trajectory: number,
): SnowballFlightPath =>
{
    const deltaX = ((targetWorldX - startWorldX) / 200) | 0;
    const deltaY = ((targetWorldY - startWorldY) / 200) | 0;

    const direction = getAngleFromComponents(deltaX, deltaY);

    const distanceSquared = ((deltaX * deltaX) + (deltaY * deltaY)) | 0;
    const distanceToTarget = fastSqrt(distanceSquared) * 200;
    let resolvedTrajectory = trajectory;

    if (resolvedTrajectory === TRAJECTORY_DEFAULT)
    {
        if (distanceToTarget <= DEFAULT_THROW_TO_LOB_CUTOFF_WORLD) resolvedTrajectory = TRAJECTORY_QUICK;
        else if (distanceToTarget <= SHORT_LOB_MAX_RANGE_WORLD) resolvedTrajectory = TRAJECTORY_SHORT_LOB;
        else resolvedTrajectory = TRAJECTORY_LONG_LOB;
    }

    let timeToLive: number;
    let planarVelocity: number;

    if (resolvedTrajectory === TRAJECTORY_QUICK)
    {
        timeToLive = 10;
        planarVelocity = 2000;
    }
    else if (resolvedTrajectory === TRAJECTORY_SHORT_LOB)
    {
        const cappedDistance = Math.min(distanceToTarget, SHORT_LOB_MAX_RANGE_WORLD);
        timeToLive = (cappedDistance * 0.000559) | 0;
        planarVelocity = timeToLive === 0 ? 0 : (cappedDistance / timeToLive) | 0;
    }
    else
    {
        const cappedDistance = Math.min(distanceToTarget, LONG_LOB_MAX_RANGE_WORLD);
        timeToLive = (cappedDistance * 0.0007072135785007072) | 0;
        planarVelocity = timeToLive === 0 ? 0 : (cappedDistance / timeToLive) | 0;
    }

    return {
        direction,
        timeToLive,
        parabolaOffset: (timeToLive / 2) | 0,
        planarVelocity,
        trajectory: resolvedTrajectory,
    };
};
