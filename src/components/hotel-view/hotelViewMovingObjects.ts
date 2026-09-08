/**
 * Pure port of the landing-view moving background objects
 * (AIR 13 `MovingBackgroundObjects.as` and `layout/backgroundobjects/*`).
 *
 * Each object is a `landing.view.bgobject.<n>` configuration string,
 * `<image>;<type>;...`, with `<type>` one of `line`, `spiral`, `animated`
 * and `randomwalk`. Speeds are per millisecond for `line` and `spiral`
 * and per second for `randomwalk`, exactly like the official classes.
 */

export const MOVING_BACKGROUND_MAX_OBJECTS = 20;

export interface MovingObjectBounds {
    width: number;
    height: number;
}

export interface MovingObjectSize {
    width: number;
    height: number;
}

export type MovingBackgroundObjectConfig =
    | { id: number; kind: 'line'; image: string; startX: number; startY: number; speedX: number; speedY: number }
    | {
          id: number;
          kind: 'spiral';
          image: string;
          startRadius: number;
          startAngle: number;
          speedRadius: number;
          speedAngle: number;
          centerX: number;
          centerY: number;
      }
    | { id: number; kind: 'animated'; imageBase: string; frameCount: number; fps: number; x: number; y: number; linkedIds: number[] }
    | {
          id: number;
          kind: 'randomwalk';
          image: string;
          startX: number;
          startY: number;
          speedX: number;
          speedY: number;
          jitterX: number;
          jitterY: number;
          intervalMs: number;
      };

export interface MovingObjectState {
    x: number;
    y: number;
    /** Spiral objects shrink towards the centre; 1 = natural size. */
    scale: number;
    /** Spiral: current radius and angle. */
    radius: number;
    angle: number;
    /** Animated: elapsed time and the time of the last linked path reset. */
    elapsed: number;
    resetAt: number;
    frame: number;
    /** Random walk: current jitter target, previous jitter and the interval start. */
    jitterX: number;
    jitterY: number;
    previousJitterX: number;
    previousJitterY: number;
    intervalStart: number;
    visible: boolean;
}

const toNumber = (value: string | undefined, fallback = 0): number => {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
};

const toInt = (value: string | undefined, fallback = 0): number => {
    const parsed = Number.parseInt(value ?? '', 10);

    return Number.isFinite(parsed) ? parsed : fallback;
};

/** `MovingBackgroundObjects.getObjectByDataContent` + the subclass constructors. */
export const parseMovingBackgroundObject = (id: number, data: string | null | undefined): MovingBackgroundObjectConfig | null => {
    if (!data) return null;

    const parts = data.split(';').map((part) => part.trim());

    if (parts.length < 2 || !parts[0]) return null;

    switch (parts[1]) {
        case 'line':
            return {
                id,
                kind: 'line',
                image: parts[0],
                startX: toInt(parts[2]),
                startY: toInt(parts[3]),
                speedX: toNumber(parts[4]),
                speedY: toNumber(parts[5])
            };
        case 'spiral':
            return {
                id,
                kind: 'spiral',
                image: parts[0],
                startRadius: toInt(parts[2]),
                startAngle: toInt(parts[3]),
                speedRadius: toNumber(parts[4]),
                speedAngle: toNumber(parts[5]),
                centerX: toNumber(parts[6]),
                centerY: toNumber(parts[7])
            };
        case 'animated':
            return {
                id,
                kind: 'animated',
                imageBase: parts[0],
                frameCount: Math.max(1, toInt(parts[2], 1)),
                fps: Math.max(1, toInt(parts[3], 1)),
                x: toInt(parts[4]),
                y: toInt(parts[5]),
                linkedIds: (parts[6] ?? '')
                    .split(',')
                    .map((value) => Number.parseInt(value.trim(), 10))
                    .filter((value) => Number.isFinite(value))
            };
        case 'randomwalk':
            return {
                id,
                kind: 'randomwalk',
                image: parts[0],
                startX: toInt(parts[2]),
                startY: toInt(parts[3]),
                speedX: toNumber(parts[4]),
                speedY: toNumber(parts[5]),
                jitterX: toNumber(parts[6]),
                jitterY: toNumber(parts[7]),
                intervalMs: Math.max(1, toInt(parts[8], 1))
            };
        default:
            return null;
    }
};

/** Read the `landing.view.bgobject.<n>` properties, 1..MAX_OBJECTS, like `initialize`. */
export const readMovingBackgroundObjects = (getProperty: (key: string) => string | null | undefined, timingCode = ''): MovingBackgroundObjectConfig[] => {
    const objects: MovingBackgroundObjectConfig[] = [];

    for (let index = 1; index <= MOVING_BACKGROUND_MAX_OBJECTS; index++) {
        const key = timingCode ? `landing.view.${timingCode}.bgobject.${index}` : `landing.view.bgobject.${index}`;
        const config = parseMovingBackgroundObject(index, getProperty(key));

        if (config) objects.push(config);
    }

    return objects;
};

/** `line` / `spiral` / `animated` images live in `reception/`, `randomwalk` is a full library path. */
export const getMovingObjectImageUrl = (config: MovingBackgroundObjectConfig, imageLibraryUrl: string, frame = 0): string => {
    switch (config.kind) {
        case 'line':
        case 'spiral':
            return `${imageLibraryUrl}reception/${config.image}.png`;
        case 'animated':
            return `${imageLibraryUrl}reception/${config.imageBase}${frame + 1}.png`;
        case 'randomwalk':
            return `${imageLibraryUrl}${config.image}.png`;
    }
};

export const createMovingObjectState = (config: MovingBackgroundObjectConfig): MovingObjectState => {
    const base: MovingObjectState = {
        x: 0,
        y: 0,
        scale: 1,
        radius: 0,
        angle: 0,
        elapsed: 0,
        resetAt: 0,
        frame: 0,
        jitterX: 0,
        jitterY: 0,
        previousJitterX: 0,
        previousJitterY: 0,
        intervalStart: 0,
        visible: true
    };

    switch (config.kind) {
        case 'line':
        case 'randomwalk':
            return { ...base, x: config.startX, y: config.startY };
        case 'spiral':
            return {
                ...base,
                radius: config.startRadius,
                angle: config.startAngle,
                x: config.centerX + Math.sin(config.startAngle) * config.startRadius,
                y: config.centerY + Math.cos(config.startAngle) * config.startRadius
            };
        case 'animated':
            return { ...base, x: config.x, y: config.y };
    }
};

const isOutOfBounds = (x: number, y: number, speedX: number, speedY: number, size: MovingObjectSize, bounds: MovingObjectBounds): boolean =>
    (speedX > 0 && x > bounds.width) || (speedX < 0 && x + size.width < 0) || (speedY > 0 && y > bounds.height) || (speedY < 0 && y + size.height < 0);

const lerp = (t: number, from: number, to: number) => from + (to - from) * t;

export interface MovingObjectStep {
    state: MovingObjectState;
    /** `LWMOPRE_MOVING_OBJECT_PATH_RESET`: the object restarted its path. */
    pathReset: boolean;
}

/** One `update(deltaMs)` of the official classes. */
export const stepMovingObject = (
    config: MovingBackgroundObjectConfig,
    state: MovingObjectState,
    deltaMs: number,
    bounds: MovingObjectBounds,
    size: MovingObjectSize,
    random: () => number = Math.random
): MovingObjectStep => {
    switch (config.kind) {
        case 'line': {
            const x = state.x + deltaMs * config.speedX;
            const y = state.y + deltaMs * config.speedY;

            if (isOutOfBounds(x, y, config.speedX, config.speedY, size, bounds))
                return { state: { ...state, x: config.startX, y: config.startY }, pathReset: true };

            return { state: { ...state, x, y }, pathReset: false };
        }
        case 'spiral': {
            const radiusRatio = state.radius === 0 ? 1 : config.startRadius / state.radius;
            const shrink = 1 + radiusRatio / 8;
            let radius = state.radius + deltaMs * config.speedRadius;
            let angle = state.angle + deltaMs * config.speedAngle * radiusRatio;
            let pathReset = false;
            let visible = state.visible;

            if (radius <= 0) {
                radius = config.startRadius;
                visible = true;
                pathReset = true;
            }
            if (radius > config.startRadius) {
                radius = 0;
                visible = false;
                pathReset = true;
            }
            if (angle < 0) angle = Math.PI * 2;
            if (angle > Math.PI * 2) angle = 0;

            return {
                state: {
                    ...state,
                    radius,
                    angle,
                    visible,
                    x: config.centerX + Math.sin(angle) * radius,
                    y: config.centerY + Math.cos(angle) * radius,
                    scale: visible ? 1 / shrink : 0
                },
                pathReset
            };
        }
        case 'animated': {
            const frameMs = 1000 / config.fps;
            const sinceReset = state.elapsed - state.resetAt;
            let frame = config.frameCount - 1;

            if (config.linkedIds.length > 0) {
                if (sinceReset < config.frameCount * frameMs) frame = Math.floor(sinceReset / frameMs);
            } else {
                frame = Math.floor(state.elapsed / frameMs) % config.frameCount;
            }

            return { state: { ...state, frame: Math.max(0, Math.min(config.frameCount - 1, frame)), elapsed: state.elapsed + deltaMs }, pathReset: false };
        }
        case 'randomwalk': {
            const elapsed = state.elapsed + deltaMs;
            let { jitterX, jitterY, previousJitterX, previousJitterY, intervalStart } = state;

            if (elapsed - intervalStart > config.intervalMs) {
                previousJitterX = jitterX;
                previousJitterY = jitterY;
                jitterX = (random() * 2 - 1) * config.jitterX;
                jitterY = (random() * 2 - 1) * config.jitterY;
                intervalStart = elapsed;
            }

            const t = (elapsed - intervalStart) / config.intervalMs;
            const x = state.x + (deltaMs / 1000) * (config.speedX + lerp(t, previousJitterX, jitterX));
            const y = state.y + (deltaMs / 1000) * (config.speedY + lerp(t, previousJitterY, jitterY));
            const next = { ...state, elapsed, jitterX, jitterY, previousJitterX, previousJitterY, intervalStart };

            if (isOutOfBounds(x, y, config.speedX, config.speedY, size, bounds))
                return { state: { ...next, x: config.startX, y: config.startY }, pathReset: true };

            return { state: { ...next, x, y }, pathReset: false };
        }
    }
};

/** `StaticAnimatedBackgroundObject.onPathResetEvent`: restart the frames of the objects linked to `resetId`. */
export const applyPathReset = (config: MovingBackgroundObjectConfig, state: MovingObjectState, resetId: number): MovingObjectState => {
    if (config.kind !== 'animated' || !config.linkedIds.includes(resetId)) return state;

    return { ...state, resetAt: state.elapsed };
};
