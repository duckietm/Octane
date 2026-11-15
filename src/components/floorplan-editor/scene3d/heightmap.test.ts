import { describe, expect, it } from 'vitest';
import { HEIGHT_SCHEME, COLORMAP } from '../state/constants';
import { FloorplanState, Tile } from '../state/types';
import { buildHeightmapInstances, cameraEye, clampCamera, colorForHeight, DEFAULT_WALL_HEIGHT, DISTANCE_MAX, DOOR_COLOR, doorStep, fitCamera, FLAG_GHOST, FLAG_MARKER, FLAG_OCCUPIED, FLAG_SELECTED, FLAG_WALL, FLOOR_SLAB, GHOST_HEIGHT, HEIGHT_UNIT, panCamera, PITCH_MAX, roomBounds, roomCenter, visibleWallSides, WALL_THICKNESS } from './heightmap';

const tile = (h: number, blocked = false): Tile => ({ h, blocked });

const makeState = (tiles: Tile[][], door = { x: -1, y: -1, dir: 2 as const }): FloorplanState =>
    ({ tiles, door, thickness: { wall: 1, floor: 1 }, wallHeight: -1, brush: { h: 0, action: 'SET' }, selection: new Set() }) as unknown as FloorplanState;

describe('heightmap instances', () => {
    it('emits one column per walkable tile, skipping blocked ones', () => {
        const state = makeState([
            [tile(0), tile(2, true)],
            [tile(3), tile(1)]
        ]);
        const result = buildHeightmapInstances(state);

        expect(result.count).toBe(3);
        expect(result.offsets.length).toBe(9);
        expect(result.sizes.length).toBe(9);
        expect(Array.from(result.offsets.slice(0, 3))).toEqual([0, -FLOOR_SLAB, 0]);
        expect(Array.from(result.offsets.slice(3, 6))).toEqual([0, -FLOOR_SLAB, 1]);
    });

    it('extrudes each column by the engine height unit above the slab', () => {
        const result = buildHeightmapInstances(makeState([[tile(4)]]));
        expect(result.sizes[1]).toBeCloseTo(FLOOR_SLAB + 4 * HEIGHT_UNIT, 6);
        expect(result.sizes[0]).toBe(1);
        expect(result.sizes[2]).toBe(1);
        expect(HEIGHT_UNIT).toBeCloseTo(0.8165, 3);
    });

    it('colours tiles from the shared floorplan palette and the door white', () => {
        const state = makeState([[tile(0), tile(5)]], { x: 1, y: 0, dir: 2 });
        const result = buildHeightmapInstances(state);
        const expected = (COLORMAP as Record<string, string>)[HEIGHT_SCHEME[1]];

        expect(colorForHeight(0).map((v) => Math.round(v * 255))).toEqual([parseInt(expected.slice(0, 2), 16), parseInt(expected.slice(2, 4), 16), parseInt(expected.slice(4, 6), 16)]);
        expect(Array.from(result.colors.slice(3, 6))).toEqual([...DOOR_COLOR]);
    });

    it('flags selected and occupied tiles', () => {
        const state = makeState([[tile(0), { h: 0, blocked: false, occupied: true }]]);
        const result = buildHeightmapInstances({ ...state, selection: new Set(['0,0']) });
        expect(Array.from(result.flags)).toEqual([FLAG_SELECTED, FLAG_OCCUPIED]);
    });

    it('adds a ghost slab when hovering an empty tile, and nothing when hovering a column', () => {
        const state = makeState([[tile(0), tile(0, true)]]);
        const ghost = buildHeightmapInstances(state, { hover: { row: 0, col: 1 } });
        expect(ghost.count).toBe(2);
        expect(ghost.sizes[4]).toBeCloseTo(GHOST_HEIGHT, 6);
        expect(ghost.flags[1]).toBe(FLAG_GHOST);
        expect(Array.from(ghost.offsets.slice(3, 6))).toEqual([1, 0, 0]);

        const column = buildHeightmapInstances(state, { hover: { row: 0, col: 0 } });
        expect(column.count).toBe(1);
    });

    it('returns an empty set for an empty floorplan', () => {
        const result = buildHeightmapInstances(makeState([[tile(0, true)]]));
        expect(result.count).toBe(0);
        expect(roomBounds(makeState([[tile(0, true)]]))).toBeNull();
        expect(roomCenter(null)).toEqual([0, 0, 0]);
    });
});

describe('walls and door marker', () => {
    const room = makeState(
        [
            [tile(0), tile(0)],
            [tile(0), tile(2)]
        ],
        { x: 0, y: 1, dir: 2 }
    );

    it('walls the north and west outline edges only, with a corner piece', () => {
        const result = buildHeightmapInstances(room, { walls: true });
        const walls = Array.from(result.flags).map((flag, index) => ({ flag, index })).filter((entry) => entry.flag === FLAG_WALL);

        // (0,0): north + west + corner; (0,1): north; (1,1): nothing; (1,0): west edge is the door gap
        expect(walls.length).toBe(4);

        const sizeOf = (index: number) => Array.from(result.sizes.slice(index * 3, index * 3 + 3));
        const thin = walls.filter((entry) => sizeOf(entry.index)[2] === WALL_THICKNESS && sizeOf(entry.index)[0] === 1);
        expect(thin.length).toBe(2); // two north walls
    });

    it('raises walls to the default height above the highest tile', () => {
        const result = buildHeightmapInstances(room, { walls: true });
        const wallIndex = Array.from(result.flags).indexOf(FLAG_WALL);
        const bottom = result.offsets[wallIndex * 3 + 1];
        const height = result.sizes[wallIndex * 3 + 1];

        expect(bottom + height).toBeCloseTo((2 + DEFAULT_WALL_HEIGHT) * HEIGHT_UNIT, 5);
    });

    it('leaves the door edge open and draws the entry arrow on the door tile', () => {
        const withMarker = buildHeightmapInstances(room, { walls: true, doorMarker: true });
        const markers = Array.from(withMarker.flags).filter((flag) => flag === FLAG_MARKER);
        expect(markers.length).toBe(2);

        const noDoorGap = buildHeightmapInstances({ ...room, door: { x: 5, y: 5, dir: 2 } }, { walls: true });
        expect(Array.from(noDoorGap.flags).filter((flag) => flag === FLAG_WALL).length).toBe(5);
    });

    it('drops the wall side the camera looks through', () => {
        expect(visibleWallSides([10, 5, 10], [2, 0, 2])).toEqual({ north: true, west: true });
        expect(visibleWallSides([-10, 5, 10], [2, 0, 2])).toEqual({ north: true, west: false });
        expect(visibleWallSides([10, 5, -10], [2, 0, 2])).toEqual({ north: false, west: true });

        const result = buildHeightmapInstances(room, { walls: true, wallSides: { north: false, west: true } });
        expect(Array.from(result.flags).filter((flag) => flag === FLAG_WALL).length).toBe(1);
    });

    it('reduces entry directions to cardinal steps', () => {
        expect(doorStep(0)).toEqual([0, -1]);
        expect(doorStep(2)).toEqual([1, 0]);
        expect(doorStep(4)).toEqual([0, 1]);
        expect(doorStep(6)).toEqual([-1, 0]);
        expect(doorStep(7)).toEqual([0, -1]);
    });
});

describe('orbit camera', () => {
    it('frames the room from its centre', () => {
        const state = makeState([
            [tile(0), tile(0), tile(0)],
            [tile(0), tile(0), tile(0)]
        ]);
        const bounds = roomBounds(state);
        expect(bounds).toEqual({ minCol: 0, maxCol: 2, minRow: 0, maxRow: 1, maxHeight: 0 });

        const camera = fitCamera(bounds, 16 / 9);
        expect(camera.target).toEqual([1.5, 0, 1]);
        expect(camera.distance).toBeGreaterThan(3);
    });

    it('keeps the eye above the floor at the requested distance', () => {
        const camera = clampCamera({ yaw: 0.3, pitch: 0.6, distance: 10, target: [2, 0, 2] });
        const eye = cameraEye(camera);
        expect(eye[1]).toBeGreaterThan(0);
        expect(Math.hypot(eye[0] - 2, eye[1], eye[2] - 2)).toBeCloseTo(10, 6);
    });

    it('clamps pitch and distance to their limits', () => {
        const camera = clampCamera({ yaw: 0, pitch: 5, distance: 9999, target: [0, 0, 0] });
        expect(camera.pitch).toBe(PITCH_MAX);
        expect(camera.distance).toBe(DISTANCE_MAX);
    });

    it('pans the target across the floor plane only', () => {
        const camera = clampCamera({ yaw: 0, pitch: 0.6, distance: 10, target: [0, 0, 0] });
        const panned = panCamera(camera, 40, 0);
        expect(panned.target[1]).toBe(0);
        expect(panned.target[0]).not.toBe(0);
    });
});
