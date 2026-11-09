/** The editor's nineteen params, in the order the server reads them; five more say whose variables are read. */
export const PROJECTILE_PARAM_COUNT = 19;
export const PROJECTILE_TOTAL_PARAM_COUNT = 24;
export const PROJECTILE_PARAM_ROTATE = 0;
export const PROJECTILE_PARAM_DIRECTIONAL_SYSTEM = 1;
export const PROJECTILE_PARAM_SCALE_TIME_WITH_DISTANCE = 2;
export const PROJECTILE_PARAM_TIME_IS_VARIABLE = 3;
export const PROJECTILE_PARAM_TIME_PER_TILE = 4;
export const PROJECTILE_PARAM_TIME_TARGET = 5;
export const PROJECTILE_PARAM_DISTANCE_BY_X = 6;
export const PROJECTILE_PARAM_DISTANCE_BY_Y = 7;
export const PROJECTILE_PARAM_DISTANCE_BY_HEIGHT = 8;
export const PROJECTILE_PARAM_SPEED_INCREASE = 9;
export const PROJECTILE_PARAM_ROTATION_OFFSET = 10;
export const PROJECTILE_PARAM_INTERNAL_VARIABLES = 11;
export const PROJECTILE_PARAM_CHANGE_SHOOTER_DIRECTION = 12;
export const PROJECTILE_PARAM_BUNNY_HOP = 13;
export const PROJECTILE_PARAM_DISTANCE_MODE = 14;
export const PROJECTILE_PARAM_DISTANCE_IS_VARIABLE = 15;
export const PROJECTILE_PARAM_DISTANCE_TILES = 16;
export const PROJECTILE_PARAM_DISTANCE_TARGET = 17;
export const PROJECTILE_PARAM_CURVE_STRENGTH = 18;
export const PROJECTILE_PARAM_TIME_USER_SOURCE = 19;
export const PROJECTILE_PARAM_TIME_FURNI_SOURCE = 20;
export const PROJECTILE_PARAM_DISTANCE_USER_SOURCE = 21;
export const PROJECTILE_PARAM_DISTANCE_FURNI_SOURCE = 22;
export const PROJECTILE_PARAM_SHOOTER_SOURCE = 23;

export const PROJECTILE_TIME_PER_TILE_DEFAULT = 500;

export const PROJECTILE_PARAM_BOUNDS: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [0, 3],
    [0, 1],
    [0, 1],
    [1, 100_000],
    [0, 3],
    [0, 1],
    [0, 1],
    [0, 1],
    [0, 100_000],
    [0, 7],
    [0, 127],
    [0, 1],
    [0, 1],
    [0, 2],
    [0, 1],
    [-64, 64],
    [0, 3],
    [-1000, 1000],
    [0, 1_000],
    [0, 1_000],
    [0, 1_000],
    [0, 1_000],
    [0, 1_000]
];

export const PROJECTILE_SYSTEM_EIGHT_STRAIGHT = 0;
export const PROJECTILE_SYSTEM_EIGHT_DIFFUSE = 1;
export const PROJECTILE_SYSTEM_FOUR_PREFER_VERTICAL = 2;
export const PROJECTILE_SYSTEM_FOUR_PREFER_HORIZONTAL = 3;

export const PROJECTILE_DISTANCE_NORMAL = 0;
export const PROJECTILE_DISTANCE_OVERSHOOT = 1;
export const PROJECTILE_DISTANCE_FIXED = 2;

/**
 * Bit order of the internal variables mask, AIR's sub-variable ids: 0 tiles travelled, 1 user collisions, 2 furni
 * collisions, 3 x, 4 y, 5 altitude, 6 is travelling. The server moves masks of boxes saved in the older order.
 */
export const PROJECTILE_INTERNAL_VARIABLES: ReadonlyArray<string> = [
    '@projectile.animation.tiles_travelled',
    '@projectile.animation.user_collisions',
    '@projectile.animation.furni_collisions',
    '@projectile.animation.position.x',
    '@projectile.animation.position.y',
    '@projectile.animation.position.altitude',
    '@projectile.animation.is_travelling'
];

export const defaultProjectileParams = (): number[] => {
    const params = new Array<number>(PROJECTILE_TOTAL_PARAM_COUNT).fill(0);

    params[PROJECTILE_PARAM_ROTATE] = 1;
    params[PROJECTILE_PARAM_TIME_PER_TILE] = PROJECTILE_TIME_PER_TILE_DEFAULT;

    return params;
};

export const clampProjectileParam = (index: number, value: number): number => {
    const [min, max] = PROJECTILE_PARAM_BOUNDS[index] ?? [0, 0];
    const whole = Number.isFinite(value) ? Math.trunc(value) : min;

    return Math.max(min, Math.min(max, whole));
};

/** A box saved before the time was applied carries 0 as its time per tile and only nineteen params. */
export const normalizeProjectileParams = (raw: number[] | null | undefined): number[] => {
    const params = defaultProjectileParams();

    if (!raw?.length) return params;

    for (let index = 0; index < PROJECTILE_TOTAL_PARAM_COUNT && index < raw.length; index++) {
        const value = raw[index];

        if (Number.isFinite(value)) params[index] = clampProjectileParam(index, value);
    }

    if (raw.length > PROJECTILE_PARAM_TIME_PER_TILE && !(raw[PROJECTILE_PARAM_TIME_PER_TILE] > 0)) {
        params[PROJECTILE_PARAM_TIME_PER_TILE] = PROJECTILE_TIME_PER_TILE_DEFAULT;
    }

    return params;
};

const TOKEN_SEPARATOR = '\t';

/** The string param: the time variable's token, then the distance variable's. */
export const encodeProjectileTokens = (timeToken: string, distanceToken: string): string => {
    const time = timeToken?.trim() ?? '';
    const distance = distanceToken?.trim() ?? '';

    return time || distance ? `${time}${TOKEN_SEPARATOR}${distance}` : '';
};

export const decodeProjectileTokens = (raw: string | null | undefined): [string, string] => {
    if (!raw) return ['', ''];

    const [time = '', distance = ''] = raw.split(TOKEN_SEPARATOR);

    return [time.trim(), distance.trim()];
};

export const isProjectileVariableEnabled = (mask: number, bit: number): boolean => (mask & (1 << bit)) !== 0;

export const toggleProjectileVariable = (mask: number, bit: number, enabled: boolean): number =>
    clampProjectileParam(PROJECTILE_PARAM_INTERNAL_VARIABLES, enabled ? mask | (1 << bit) : mask & ~(1 << bit));

const DIFFUSE_AXIS_SLOPE = 0.41421356237309503;

export const resolveProjectileDirection = (system: number, dx: number, dy: number): number => {
    if (dx === 0 && dy === 0) return -1;

    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const normalized = system >= PROJECTILE_SYSTEM_EIGHT_STRAIGHT && system <= PROJECTILE_SYSTEM_FOUR_PREFER_HORIZONTAL ? system : PROJECTILE_SYSTEM_EIGHT_STRAIGHT;

    let diagonal = false;

    if (normalized === PROJECTILE_SYSTEM_EIGHT_STRAIGHT) diagonal = ax !== 0 && ay !== 0;
    else if (normalized === PROJECTILE_SYSTEM_EIGHT_DIFFUSE) diagonal = Math.min(ax, ay) > Math.max(ax, ay) * DIFFUSE_AXIS_SLOPE;

    if (diagonal) {
        if (dx > 0) return dy > 0 ? 3 : 1;

        return dy > 0 ? 5 : 7;
    }

    const horizontal = normalized === PROJECTILE_SYSTEM_FOUR_PREFER_VERTICAL ? ax > ay : ax >= ay;

    if (horizontal) return dx > 0 ? 2 : 6;

    return dy > 0 ? 4 : 0;
};

export const isFourWayProjectileSystem = (system: number): boolean =>
    system === PROJECTILE_SYSTEM_FOUR_PREFER_VERTICAL || system === PROJECTILE_SYSTEM_FOUR_PREFER_HORIZONTAL;
