import { tileFill } from '../state/selectors';
import { FloorplanState, Tile } from '../state/types';
import { Vec3 } from './mat4';

/**
 * World units for the preview: one tile is one unit along x (columns) and z
 * (rows). The room engine scales a height unit by sqrt(1/2) / sqrt(3/4)
 * (RoomGeometry's internal z scale), so the same factor is used here to keep
 * stairs and platforms in proportion with the real room.
 */
export const HEIGHT_UNIT = Math.sqrt(1 / 2) / Math.sqrt(3 / 4);

/** Thickness of the slab drawn under every tile so height-0 floors still show. */
export const FLOOR_SLAB = 0.25;

export const DOOR_COLOR: Vec3 = [1, 1, 1];

export type HeightmapInstances = {
    /** Number of tile columns to draw. */
    count: number;
    /** Per instance: x, y (bottom), z of the column. */
    offsets: Float32Array;
    /** Per instance: box size (x, y, z) in world units. */
    sizes: Float32Array;
    /** Per instance: r, g, b in 0..1. */
    colors: Float32Array;
    /** Per instance: FLAG_* bits. */
    flags: Float32Array;
};

export const FLAG_SELECTED = 1;
export const FLAG_OCCUPIED = 2;
export const FLAG_GHOST = 4;
/** Wall segment: textured with the wall pattern, never picked. */
export const FLAG_WALL = 8;
/** Solid marker (door arrow): never textured or edge-lined. */
export const FLAG_MARKER = 16;

/** Engine constants (RoomPlaneParser): wall thickness and default wall height in height units. */
export const WALL_THICKNESS = 0.25;
export const DEFAULT_WALL_HEIGHT = 3.6;
export const WALL_COLOR: Vec3 = [0.78, 0.83, 0.86];
export const MARKER_COLOR: Vec3 = [0.16, 0.16, 0.18];

/** Height of the slab drawn where the pointer hovers an empty tile. */
export const GHOST_HEIGHT = 0.08;
export const GHOST_COLOR: Vec3 = [0.55, 0.55, 0.52];

export type HeightmapOptions = {
    /** Tile the pointer is over; an empty tile gets a ghost slab. */
    hover?: { row: number; col: number } | null;
    /** Draw the room's walls (north and west outline edges, as the engine does). */
    walls?: boolean;
    /** Which of the two wall sides to draw; a side facing the camera is normally left out. */
    wallSides?: WallSides;
    /** Draw the door tile's entry arrow. */
    doorMarker?: boolean;
};

export type WallSides = { north: boolean; west: boolean };

/**
 * Which wall sides keep the interior visible from a camera eye: a wall is
 * dropped when the eye is on its far side, where it would hide the room.
 */
export const visibleWallSides = (eye: Vec3, center: Vec3): WallSides => ({ north: eye[2] >= center[2], west: eye[0] >= center[0] });

/** Thickness multiplier for the editor's 0..3 thickness levels. */
export const thicknessFactor = (level: number): number => [0.5, 1, 1.5, 2][Math.max(0, Math.min(3, level | 0))];

type InstanceSink = { offsets: number[]; sizes: number[]; colors: number[]; flags: number[] };

const push = (sink: InstanceSink, min: Vec3, size: Vec3, color: Vec3, flag: number): void => {
    sink.offsets.push(min[0], min[1], min[2]);
    sink.sizes.push(size[0], size[1], size[2]);
    sink.colors.push(color[0], color[1], color[2]);
    sink.flags.push(flag);
};

const walkable = (tiles: Tile[][], row: number, col: number): Tile | null => {
    const tile = tiles[row]?.[col];
    return tile && !tile.blocked ? tile : null;
};

/** Entry direction 0..7 (0 = north, clockwise) reduced to a cardinal step (dx, dz). */
export const doorStep = (dir: number): [number, number] => {
    const cardinal = ((Math.round(dir / 2) % 4) + 4) % 4;
    return ([[0, -1], [1, 0], [0, 1], [-1, 0]] as Array<[number, number]>)[cardinal];
};

/**
 * Wall segments along the room outline. Like the engine, only the north
 * (row - 1) and west (col - 1) edges of walkable tiles get a wall, so the
 * interior stays visible from the classic corner; the door tile's edge that
 * the avatar walks in through is left open.
 */
export const buildWalls = (
    state: Pick<FloorplanState, 'tiles' | 'door' | 'thickness' | 'wallHeight'>,
    sink: InstanceSink,
    sides: WallSides = { north: true, west: true }
): void => {
    const bounds = roomBounds(state);
    if (!bounds) return;

    const thickness = WALL_THICKNESS * thicknessFactor(state.thickness.wall);
    const slab = FLOOR_SLAB * thicknessFactor(state.thickness.floor);
    const top = (bounds.maxHeight + DEFAULT_WALL_HEIGHT + Math.max(0, state.wallHeight)) * HEIGHT_UNIT;
    const [doorDx, doorDz] = doorStep(state.door.dir);

    for (let r = 0; r < state.tiles.length; r++) {
        const row = state.tiles[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
            const tile = walkable(state.tiles, r, c);
            if (!tile) continue;

            const isDoor = state.door.x === c && state.door.y === r;
            const bottom = tile.h * HEIGHT_UNIT - slab;
            const height = top - bottom;
            const north = sides.north && !walkable(state.tiles, r - 1, c) && !(isDoor && doorDz === 1);
            const west = sides.west && !walkable(state.tiles, r, c - 1) && !(isDoor && doorDx === 1);

            if (north) push(sink, [c, bottom, r - thickness], [1, height, thickness], WALL_COLOR, FLAG_WALL);
            if (west) push(sink, [c - thickness, bottom, r], [thickness, height, 1], WALL_COLOR, FLAG_WALL);
            if (north && west) push(sink, [c - thickness, bottom, r - thickness], [thickness, height, thickness], WALL_COLOR, FLAG_WALL);
        }
    }
};

/** Flat arrow on the door tile pointing the way an avatar enters. */
export const buildDoorMarker = (state: Pick<FloorplanState, 'tiles' | 'door'>, sink: InstanceSink): void => {
    const tile = walkable(state.tiles, state.door.y, state.door.x);
    if (!tile) return;

    const [dx, dz] = doorStep(state.door.dir);
    const y = tile.h * HEIGHT_UNIT + 0.01;
    const cx = state.door.x + 0.5;
    const cz = state.door.y + 0.5;
    const lift = 0.06;

    // shaft: 0.5 long, 0.14 wide, centred on the tile; head: 0.32 wide, 0.18 long at the tip
    const shaftLength = 0.5;
    const headLength = 0.18;
    const along = (t: number): [number, number] => [cx + dx * t, cz + dz * t];

    const [sx, sz] = along(-shaftLength / 2);
    const shaftMin: Vec3 = dx !== 0 ? [Math.min(sx, sx + dx * shaftLength), y, sz - 0.07] : [sx - 0.07, y, Math.min(sz, sz + dz * shaftLength)];
    const shaftSize: Vec3 = dx !== 0 ? [shaftLength, lift, 0.14] : [0.14, lift, shaftLength];
    push(sink, shaftMin, shaftSize, MARKER_COLOR, FLAG_MARKER);

    const [hx, hz] = along(shaftLength / 2);
    const headMin: Vec3 = dx !== 0 ? [Math.min(hx, hx + dx * headLength), y, hz - 0.16] : [hx - 0.16, y, Math.min(hz, hz + dz * headLength)];
    const headSize: Vec3 = dx !== 0 ? [headLength, lift, 0.32] : [0.32, lift, headLength];
    push(sink, headMin, headSize, MARKER_COLOR, FLAG_MARKER);
};

export type RoomBounds = { minCol: number; maxCol: number; minRow: number; maxRow: number; maxHeight: number };

const hexToRgb = (hex: string): Vec3 => {
    const value = parseInt(hex.replace('#', ''), 16);
    return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};

const colorCache = new Map<number, Vec3>();

/** Colour of a walkable tile at height `h`: the same palette the SVG editor uses. */
export const colorForHeight = (h: number): Vec3 => {
    const cached = colorCache.get(h);
    if (cached) return cached;
    const rgb = hexToRgb(tileFill({ h, blocked: false }));
    colorCache.set(h, rgb);
    return rgb;
};

/** Bounding box of the walkable tiles, or null for an empty floorplan. */
export const roomBounds = (state: Pick<FloorplanState, 'tiles'>): RoomBounds | null => {
    let minCol = Infinity;
    let maxCol = -Infinity;
    let minRow = Infinity;
    let maxRow = -Infinity;
    let maxHeight = 0;

    for (let r = 0; r < state.tiles.length; r++) {
        const row = state.tiles[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
            const tile = row[c];
            if (!tile || tile.blocked) continue;
            if (c < minCol) minCol = c;
            if (c > maxCol) maxCol = c;
            if (r < minRow) minRow = r;
            if (r > maxRow) maxRow = r;
            if (tile.h > maxHeight) maxHeight = tile.h;
        }
    }

    if (minCol === Infinity) return null;

    return { minCol, maxCol, minRow, maxRow, maxHeight };
};

/** Centre of the room on the floor plane. */
export const roomCenter = (bounds: RoomBounds | null): Vec3 =>
    bounds ? [(bounds.minCol + bounds.maxCol + 1) / 2, 0, (bounds.minRow + bounds.maxRow + 1) / 2] : [0, 0, 0];

/**
 * Everything the scene draws, as axis-aligned boxes: one extruded column per
 * walkable tile (a slab of FLOOR_SLAB below the floor plane plus the tile's
 * height above it, the door tile white), then optionally the walls, the door
 * arrow and a ghost slab under the pointer on an empty tile.
 */
export const buildHeightmapInstances = (
    state: Pick<FloorplanState, 'tiles' | 'door'> & Partial<Pick<FloorplanState, 'selection' | 'thickness' | 'wallHeight'>>,
    options: HeightmapOptions = {}
): HeightmapInstances => {
    const sink: InstanceSink = { offsets: [], sizes: [], colors: [], flags: [] };
    const selection = state.selection;
    const hover = options.hover ?? null;
    const slab = FLOOR_SLAB * thicknessFactor(state.thickness?.floor ?? 1);
    let hoverIsColumn = false;

    for (let r = 0; r < state.tiles.length; r++) {
        const row = state.tiles[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
            const tile = row[c];
            if (!tile || tile.blocked) continue;

            const isDoor = state.door.x === c && state.door.y === r;
            const color = isDoor ? DOOR_COLOR : colorForHeight(tile.h);
            let flag = 0;
            if (selection?.has(`${r},${c}`)) flag |= FLAG_SELECTED;
            if (tile.occupied) flag |= FLAG_OCCUPIED;
            if (hover && hover.row === r && hover.col === c) hoverIsColumn = true;

            push(sink, [c, -slab, r], [1, slab + tile.h * HEIGHT_UNIT, 1], color, flag);
        }
    }

    if (options.walls) {
        buildWalls({ tiles: state.tiles, door: state.door, thickness: state.thickness ?? { wall: 1, floor: 1 }, wallHeight: state.wallHeight ?? -1 }, sink, options.wallSides);
    }
    if (options.doorMarker) buildDoorMarker(state, sink);

    if (hover && !hoverIsColumn) push(sink, [hover.col, 0, hover.row], [1, GHOST_HEIGHT, 1], GHOST_COLOR, FLAG_GHOST);

    return {
        count: sink.flags.length,
        offsets: new Float32Array(sink.offsets),
        sizes: new Float32Array(sink.sizes),
        colors: new Float32Array(sink.colors),
        flags: new Float32Array(sink.flags)
    };
};

export type OrbitCamera = {
    /** Rotation around the vertical axis, radians. */
    yaw: number;
    /** Elevation above the floor plane, radians, kept inside (0, PI/2). */
    pitch: number;
    /** Distance from the target, world units. */
    distance: number;
    target: Vec3;
};

export const PITCH_MIN = 0.12;
export const PITCH_MAX = Math.PI / 2 - 0.05;
export const DISTANCE_MIN = 3;
export const DISTANCE_MAX = 160;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const clampCamera = (camera: OrbitCamera): OrbitCamera => ({
    ...camera,
    pitch: clamp(camera.pitch, PITCH_MIN, PITCH_MAX),
    distance: clamp(camera.distance, DISTANCE_MIN, DISTANCE_MAX)
});

/** Camera that frames the whole room from the classic isometric corner. */
export const fitCamera = (bounds: RoomBounds | null, aspect: number): OrbitCamera => {
    const target = roomCenter(bounds);
    const spanX = bounds ? bounds.maxCol - bounds.minCol + 1 : 8;
    const spanZ = bounds ? bounds.maxRow - bounds.minRow + 1 : 8;
    const spanY = bounds ? bounds.maxHeight * HEIGHT_UNIT + FLOOR_SLAB : 1;
    const radius = Math.hypot(spanX, spanZ, spanY) / 2;
    const fovY = Math.PI / 4;
    const fovX = 2 * Math.atan(Math.tan(fovY / 2) * Math.max(0.2, aspect));
    const distance = radius / Math.sin(Math.min(fovY, fovX) / 2) * 1.05;

    return clampCamera({ yaw: Math.PI / 4, pitch: Math.PI / 5, distance, target });
};

export const cameraEye = (camera: OrbitCamera): Vec3 => {
    const horizontal = Math.cos(camera.pitch) * camera.distance;
    return [
        camera.target[0] + Math.sin(camera.yaw) * horizontal,
        camera.target[1] + Math.sin(camera.pitch) * camera.distance,
        camera.target[2] + Math.cos(camera.yaw) * horizontal
    ];
};

/** Move the target across the floor plane by screen-relative amounts. */
export const panCamera = (camera: OrbitCamera, dxScreen: number, dyScreen: number): OrbitCamera => {
    const rightX = Math.cos(camera.yaw);
    const rightZ = -Math.sin(camera.yaw);
    const forwardX = -Math.sin(camera.yaw);
    const forwardZ = -Math.cos(camera.yaw);
    const scale = camera.distance * 0.0025;

    return {
        ...camera,
        target: [
            camera.target[0] - (rightX * dxScreen - forwardX * dyScreen) * scale,
            camera.target[1],
            camera.target[2] - (rightZ * dxScreen - forwardZ * dyScreen) * scale
        ]
    };
};
