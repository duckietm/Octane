import { describe, expect, it } from 'vitest';
import { MAX_NUM_TILE_PER_AXIS } from './constants';
import { initialState, reducer } from './reducer';
import { defaultEmptyTilemap } from './selectors';
import { FloorplanState } from './types';

const stateWith = (tiles: FloorplanState['tiles']): FloorplanState => ({
    ...initialState,
    tiles
});

describe('reducer — PAINT_TILE', () => {
    it('sets tile to {h, blocked: false}', () => {
        const start = stateWith(defaultEmptyTilemap(2, 2));
        const next = reducer(start, { type: 'PAINT_TILE', row: 0, col: 1, h: 5, source: 'local' });
        expect(next.tiles[0][1]).toEqual({ h: 5, blocked: false });
        expect(next.tiles[0][0]).toEqual({ h: 0, blocked: true });
    });

    it('clamps h to 0..26', () => {
        const start = stateWith(defaultEmptyTilemap(1, 1));
        const next = reducer(start, { type: 'PAINT_TILE', row: 0, col: 0, h: 99, source: 'local' });
        expect(next.tiles[0][0].h).toBe(26);
    });

    it('grows the grid to fit out-of-bounds rows/cols', () => {
        const start = stateWith(defaultEmptyTilemap(1, 1));
        const next = reducer(start, { type: 'PAINT_TILE', row: 2, col: 3, h: 0, source: 'local' });
        expect(next.tiles).toHaveLength(3);
        expect(next.tiles[2]).toHaveLength(4);
        expect(next.tiles[2][3]).toEqual({ h: 0, blocked: false });
        expect(next.tiles[0][0]).toEqual({ h: 0, blocked: true });
    });

    it('caps growth at MAX_NUM_TILE_PER_AXIS', () => {
        const start = stateWith(defaultEmptyTilemap(1, 1));
        const next = reducer(start, { type: 'PAINT_TILE', row: 99, col: 99, h: 0, source: 'local' });
        expect(next.tiles).toHaveLength(64);
        expect(next.tiles[0]).toHaveLength(64);
    });

    it('returns the same reference if no change (idempotent painting)', () => {
        const tile = { h: 5, blocked: false };
        const start = stateWith([[tile]]);
        const next = reducer(start, { type: 'PAINT_TILE', row: 0, col: 0, h: 5, source: 'local' });
        expect(next).toBe(start);
    });
});

describe('reducer — ERASE_TILE', () => {
    it('marks tile as blocked', () => {
        const start = stateWith([[{ h: 5, blocked: false }]]);
        const next = reducer(start, { type: 'ERASE_TILE', row: 0, col: 0, source: 'local' });
        expect(next.tiles[0][0]).toEqual({ h: 5, blocked: true });
    });

    it('is a no-op outside the grid', () => {
        const start = stateWith(defaultEmptyTilemap(1, 1));
        const next = reducer(start, { type: 'ERASE_TILE', row: 5, col: 5, source: 'local' });
        expect(next).toBe(start);
    });
});

describe('reducer — ADJUST_HEIGHT', () => {
    it('increments height by 1', () => {
        const start = stateWith([[{ h: 5, blocked: false }]]);
        const next = reducer(start, { type: 'ADJUST_HEIGHT', row: 0, col: 0, delta: 1, source: 'local' });
        expect(next.tiles[0][0]).toEqual({ h: 6, blocked: false });
    });

    it('decrements height by 1', () => {
        const start = stateWith([[{ h: 5, blocked: false }]]);
        const next = reducer(start, { type: 'ADJUST_HEIGHT', row: 0, col: 0, delta: -1, source: 'local' });
        expect(next.tiles[0][0]).toEqual({ h: 4, blocked: false });
    });

    it('clamps at 26 going up', () => {
        const start = stateWith([[{ h: 26, blocked: false }]]);
        const next = reducer(start, { type: 'ADJUST_HEIGHT', row: 0, col: 0, delta: 1, source: 'local' });
        expect(next.tiles[0][0].h).toBe(26);
    });

    it('clamps at 0 going down', () => {
        const start = stateWith([[{ h: 0, blocked: false }]]);
        const next = reducer(start, { type: 'ADJUST_HEIGHT', row: 0, col: 0, delta: -1, source: 'local' });
        expect(next.tiles[0][0].h).toBe(0);
    });

    it('is a no-op on blocked tiles', () => {
        const start = stateWith([[{ h: 5, blocked: true }]]);
        const next = reducer(start, { type: 'ADJUST_HEIGHT', row: 0, col: 0, delta: 1, source: 'local' });
        expect(next).toBe(start);
    });

    it('is a no-op on occupied tiles', () => {
        const start = stateWith([[{ h: 5, blocked: false, occupied: true }]]);
        const next = reducer(start, { type: 'ADJUST_HEIGHT', row: 0, col: 0, delta: 1, source: 'local' });
        expect(next).toBe(start);
    });
});

describe('reducer — SET_OCCUPIED_TILES', () => {
    it('marks tiles occupied per the map without touching h or blocked', () => {
        const start = stateWith([
            [
                { h: 2, blocked: false },
                { h: 0, blocked: true }
            ]
        ]);
        const next = reducer(start, { type: 'SET_OCCUPIED_TILES', map: [[true, false]] });
        expect(next.tiles[0][0]).toEqual({ h: 2, blocked: false, occupied: true });
        // already-unoccupied tile is left untouched (no spurious occupied key)
        expect(next.tiles[0][1]).toEqual({ h: 0, blocked: true });
    });

    it('does not block editing of non-occupied tiles', () => {
        const start = stateWith([
            [
                { h: 0, blocked: false },
                { h: 0, blocked: false }
            ]
        ]);
        const occupied = reducer(start, { type: 'SET_OCCUPIED_TILES', map: [[false, true]] });
        // col 0 (not occupied) can still be painted; col 1 (occupied) cannot
        const painted = reducer(occupied, { type: 'PAINT_TILE', row: 0, col: 0, h: 5, source: 'local' });
        expect(painted.tiles[0][0].h).toBe(5);
        const blocked = reducer(occupied, { type: 'PAINT_TILE', row: 0, col: 1, h: 9, source: 'local' });
        expect(blocked).toBe(occupied);
    });
});

describe('reducer — SET_DOOR', () => {
    it('updates door position', () => {
        const next = reducer(initialState, { type: 'SET_DOOR', x: 3, y: 4, source: 'local' });
        expect(next.door).toEqual({ x: 3, y: 4, dir: 2 });
    });

    it('preserves door direction', () => {
        const start = { ...initialState, door: { x: 0, y: 0, dir: 5 as const } };
        const next = reducer(start, { type: 'SET_DOOR', x: 1, y: 1, source: 'local' });
        expect(next.door).toEqual({ x: 1, y: 1, dir: 5 });
    });
});

describe('reducer — SET_DOOR_DIR', () => {
    it('updates direction', () => {
        const next = reducer(initialState, { type: 'SET_DOOR_DIR', dir: 7, source: 'local' });
        expect(next.door.dir).toBe(7);
    });
});

describe('reducer — SET_THICKNESS', () => {
    it('updates wall only', () => {
        const next = reducer(initialState, { type: 'SET_THICKNESS', wall: 3, source: 'local' });
        expect(next.thickness).toEqual({ wall: 3, floor: 1 });
    });

    it('updates floor only', () => {
        const next = reducer(initialState, { type: 'SET_THICKNESS', floor: 0, source: 'local' });
        expect(next.thickness).toEqual({ wall: 1, floor: 0 });
    });

    it('updates both', () => {
        const next = reducer(initialState, { type: 'SET_THICKNESS', wall: 2, floor: 3, source: 'local' });
        expect(next.thickness).toEqual({ wall: 2, floor: 3 });
    });
});

describe('reducer — SET_WALL_HEIGHT', () => {
    it('updates wallHeight clamped to 0..16', () => {
        expect(reducer(initialState, { type: 'SET_WALL_HEIGHT', value: 5, source: 'local' }).wallHeight).toBe(5);
        expect(reducer(initialState, { type: 'SET_WALL_HEIGHT', value: 99, source: 'local' }).wallHeight).toBe(16);
        expect(reducer(initialState, { type: 'SET_WALL_HEIGHT', value: -3, source: 'local' }).wallHeight).toBe(0);
    });
});

describe('reducer — BRUSH_SET', () => {
    it('updates h only', () => {
        const next = reducer(initialState, { type: 'BRUSH_SET', h: 10 });
        expect(next.brush).toEqual({ h: 10, action: 'SET' });
    });

    it('updates action only', () => {
        const next = reducer(initialState, { type: 'BRUSH_SET', action: 'DOOR' });
        expect(next.brush).toEqual({ h: 0, action: 'DOOR' });
    });
});

describe('reducer — selection', () => {
    it('SELECT_ALL marks every cell in the full editor grid (MAX × MAX)', () => {
        const start = stateWith([
            [
                { h: 0, blocked: false },
                { h: 0, blocked: true }
            ],
            [
                { h: 0, blocked: false },
                { h: 0, blocked: false }
            ]
        ]);
        const next = reducer(start, { type: 'SELECT_ALL' });
        expect(next.selection.size).toBe(MAX_NUM_TILE_PER_AXIS * MAX_NUM_TILE_PER_AXIS);
        expect(next.selection.has('0,0')).toBe(true);
        expect(next.selection.has('0,1')).toBe(true);
        expect(next.selection.has(`${MAX_NUM_TILE_PER_AXIS - 1},${MAX_NUM_TILE_PER_AXIS - 1}`)).toBe(true);
    });

    it('SELECT_ALL + APPLY_BRUSH_TO_SELECTION SET fills empty cells inside the room shape', () => {
        const start = stateWith([
            [
                { h: 0, blocked: false },
                { h: 0, blocked: true }
            ],
            [
                { h: 0, blocked: true },
                { h: 0, blocked: false }
            ]
        ]);
        const armed = reducer(start, { type: 'BRUSH_SET', action: 'SET', h: 2 });
        const selected = reducer(armed, { type: 'SELECT_ALL' });
        const next = reducer(selected, { type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
        expect(next.tiles[0][0]).toEqual({ h: 2, blocked: false });
        expect(next.tiles[0][1]).toEqual({ h: 2, blocked: false });
        expect(next.tiles[1][0]).toEqual({ h: 2, blocked: false });
        expect(next.tiles[1][1]).toEqual({ h: 2, blocked: false });
    });

    it('CLEAR_SELECTION empties it', () => {
        const start = { ...initialState, selection: new Set(['0,0', '1,1']) as ReadonlySet<`${number},${number}`> };
        const next = reducer(start, { type: 'CLEAR_SELECTION' });
        expect(next.selection.size).toBe(0);
    });

    it('SELECT_RECT marks the rectangle inclusive', () => {
        const start = stateWith(defaultEmptyTilemap(4, 4));
        const populated = {
            ...start,
            tiles: start.tiles.map((row) => row.map(() => ({ h: 0, blocked: false })))
        } as FloorplanState;
        const next = reducer(populated, { type: 'SELECT_RECT', from: [1, 1], to: [2, 3] });
        const keys = Array.from(next.selection).sort();
        expect(keys).toEqual(['1,1', '1,2', '1,3', '2,1', '2,2', '2,3'].sort());
    });

    it('SELECT_RECT includes blocked / empty cells so the SET brush can paint into them', () => {
        const start = stateWith([
            [
                { h: 0, blocked: true },
                { h: 0, blocked: true }
            ],
            [
                { h: 0, blocked: true },
                { h: 0, blocked: false }
            ]
        ]);
        const next = reducer(start, { type: 'SELECT_RECT', from: [0, 0], to: [1, 1] });
        const keys = Array.from(next.selection).sort();
        expect(keys).toEqual(['0,0', '0,1', '1,0', '1,1'].sort());
    });

    it('SELECT_RECT clamps to grid bounds when the drag goes negative or past MAX', () => {
        const start = stateWith([[{ h: 0, blocked: false }]]);
        const next = reducer(start, { type: 'SELECT_RECT', from: [-5, -5], to: [999, 999] });
        expect(next.selection.has('0,0')).toBe(true);
        expect(next.selection.has('63,63')).toBe(true);
        expect(next.selection.has('64,0')).toBe(false);
        expect(next.selection.has('-1,0')).toBe(false);
    });

    it('SQUARE_SELECT_TOGGLE flips the flag', () => {
        const a = reducer(initialState, { type: 'SQUARE_SELECT_TOGGLE' });
        expect(a.squareSelect).toBe(true);
        const b = reducer(a, { type: 'SQUARE_SELECT_TOGGLE' });
        expect(b.squareSelect).toBe(false);
    });

    it('APPLY_BRUSH_TO_SELECTION with SET fills selected tiles at brush height (including blocked ones) and clears selection', () => {
        const populated = stateWith([
            [
                { h: 0, blocked: false },
                { h: 0, blocked: false }
            ],
            [
                { h: 0, blocked: false },
                { h: 0, blocked: true }
            ]
        ]);
        const withSel = reducer(populated, { type: 'SELECT_ALL' });
        const armed = reducer(withSel, { type: 'BRUSH_SET', action: 'SET', h: 4 });
        const next = reducer(armed, { type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
        expect(next.tiles[0][0]).toEqual({ h: 4, blocked: false });
        expect(next.tiles[0][1]).toEqual({ h: 4, blocked: false });
        expect(next.tiles[1][0]).toEqual({ h: 4, blocked: false });
        expect(next.tiles[1][1]).toEqual({ h: 4, blocked: false });
        expect(next.selection.size).toBe(0);
    });

    it('APPLY_BRUSH_TO_SELECTION with UNSET erases selected tiles', () => {
        const populated = stateWith([
            [
                { h: 3, blocked: false },
                { h: 3, blocked: false }
            ]
        ]);
        const withSel = reducer(populated, { type: 'SELECT_ALL' });
        const armed = reducer(withSel, { type: 'BRUSH_SET', action: 'UNSET' });
        const next = reducer(armed, { type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
        expect(next.tiles[0][0].blocked).toBe(true);
        expect(next.tiles[0][1].blocked).toBe(true);
        expect(next.selection.size).toBe(0);
    });

    it('APPLY_BRUSH_TO_SELECTION with UP/DOWN adjusts heights', () => {
        const populated = stateWith([
            [
                { h: 2, blocked: false },
                { h: 0, blocked: false }
            ]
        ]);
        const withSel = reducer(populated, { type: 'SELECT_ALL' });
        const armedUp = reducer(withSel, { type: 'BRUSH_SET', action: 'UP' });
        const up = reducer(armedUp, { type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
        expect(up.tiles[0][0].h).toBe(3);
        expect(up.tiles[0][1].h).toBe(1);

        const withSel2 = reducer(up, { type: 'SELECT_ALL' });
        const armedDown = reducer(withSel2, { type: 'BRUSH_SET', action: 'DOWN' });
        const down = reducer(armedDown, { type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
        expect(down.tiles[0][0].h).toBe(2);
        expect(down.tiles[0][1].h).toBe(0);
    });

    it('APPLY_BRUSH_TO_SELECTION SET paints into blocked / empty cells (build-from-scratch UX)', () => {
        const start = stateWith([
            [
                { h: 0, blocked: true },
                { h: 0, blocked: true }
            ],
            [
                { h: 0, blocked: true },
                { h: 0, blocked: true }
            ]
        ]);
        const armed = reducer(start, { type: 'BRUSH_SET', action: 'SET', h: 2 });
        const selected = reducer(armed, { type: 'SELECT_RECT', from: [0, 0], to: [1, 1] });
        const next = reducer(selected, { type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
        expect(next.tiles[0][0]).toEqual({ h: 2, blocked: false });
        expect(next.tiles[0][1]).toEqual({ h: 2, blocked: false });
        expect(next.tiles[1][0]).toEqual({ h: 2, blocked: false });
        expect(next.tiles[1][1]).toEqual({ h: 2, blocked: false });
        expect(next.selection.size).toBe(0);
    });

    it('APPLY_BRUSH_TO_SELECTION SET grows the tiles array when the rect extends beyond current bounds', () => {
        const start = stateWith([[{ h: 0, blocked: false }]]); // 1x1 room
        const armed = reducer(start, { type: 'BRUSH_SET', action: 'SET', h: 1 });
        const selected = reducer(armed, { type: 'SELECT_RECT', from: [0, 0], to: [2, 2] });
        const next = reducer(selected, { type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
        expect(next.tiles.length).toBeGreaterThanOrEqual(3);
        expect(next.tiles[0].length).toBeGreaterThanOrEqual(3);
        expect(next.tiles[2][2]).toEqual({ h: 1, blocked: false });
    });

    it('APPLY_BRUSH_TO_SELECTION UNSET still skips blocked cells (only erases painted ones)', () => {
        const start = stateWith([
            [
                { h: 3, blocked: false },
                { h: 0, blocked: true }
            ]
        ]);
        const armed = reducer(start, { type: 'BRUSH_SET', action: 'UNSET' });
        const selected = reducer(armed, { type: 'SELECT_RECT', from: [0, 0], to: [0, 1] });
        const next = reducer(selected, { type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
        expect(next.tiles[0][0].blocked).toBe(true);
        expect(next.tiles[0][1]).toEqual({ h: 0, blocked: true });
    });

    it('APPLY_BRUSH_TO_SELECTION on empty selection is a no-op', () => {
        const start = stateWith([[{ h: 5, blocked: false }]]);
        const next = reducer(start, { type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
        expect(next).toBe(start);
    });

    it('APPLY_BRUSH_TO_SELECTION with DOOR clears selection without touching tiles', () => {
        const populated = stateWith([
            [
                { h: 1, blocked: false },
                { h: 2, blocked: false }
            ]
        ]);
        const withSel = reducer(populated, { type: 'SELECT_ALL' });
        const armed = reducer(withSel, { type: 'BRUSH_SET', action: 'DOOR' });
        const next = reducer(armed, { type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
        expect(next.tiles).toEqual(armed.tiles);
        expect(next.selection.size).toBe(0);
    });
});

describe('reducer — IMPORT_STRING', () => {
    it('replaces tilemap with parsed string', () => {
        const start = stateWith(defaultEmptyTilemap(1, 1));
        const next = reducer(start, { type: 'IMPORT_STRING', raw: '01\rxq', source: 'local' });
        expect(next.tiles).toHaveLength(2);
        expect(next.tiles[0]).toEqual([
            { h: 0, blocked: false },
            { h: 1, blocked: false }
        ]);
        expect(next.tiles[1]).toEqual([
            { h: 0, blocked: true },
            { h: 26, blocked: false }
        ]);
    });

    it('optionally updates door, thickness, wallHeight', () => {
        const next = reducer(initialState, {
            type: 'IMPORT_STRING',
            raw: '00',
            door: { x: 5, y: 6, dir: 4 },
            thickness: { wall: 3, floor: 2 },
            wallHeight: 8,
            source: 'local'
        });
        expect(next.door).toEqual({ x: 5, y: 6, dir: 4 });
        expect(next.thickness).toEqual({ wall: 3, floor: 2 });
        expect(next.wallHeight).toBe(8);
    });
});

describe('reducer — APPLY_REMOTE_DIFF', () => {
    it('applies tile edits without re-broadcasting (source agnostic)', () => {
        const start = stateWith([[{ h: 0, blocked: false }]]);
        const next = reducer(start, {
            type: 'APPLY_REMOTE_DIFF',
            diff: { tiles: [{ row: 0, col: 0, h: 7, blocked: false }] },
            seq: 1,
            editorUserId: 42
        });
        expect(next.tiles[0][0]).toEqual({ h: 7, blocked: false });
        expect(next.seq).toBe(1);
    });

    it('records last seq', () => {
        const start = stateWith([[{ h: 0, blocked: false }]]);
        const a = reducer(start, { type: 'APPLY_REMOTE_DIFF', diff: { tiles: [{ row: 0, col: 0, h: 1, blocked: false }] }, seq: 5, editorUserId: 1 });
        expect(a.seq).toBe(5);
    });

    it('applies door/thickness/wallHeight from diff', () => {
        const next = reducer(initialState, {
            type: 'APPLY_REMOTE_DIFF',
            diff: { door: { x: 2, y: 3, dir: 0 }, thickness: { wall: 0, floor: 0 }, wallHeight: 4 },
            seq: 1,
            editorUserId: 99
        });
        expect(next.door).toEqual({ x: 2, y: 3, dir: 0 });
        expect(next.thickness).toEqual({ wall: 0, floor: 0 });
        expect(next.wallHeight).toBe(4);
    });
});

describe('reducer — APPLY_REMOTE_SNAPSHOT', () => {
    it('replaces full state from snapshot', () => {
        const next = reducer(initialState, {
            type: 'APPLY_REMOTE_SNAPSHOT',
            raw: '01\rxq',
            door: { x: 1, y: 1, dir: 3 },
            thickness: { wall: 2, floor: 3 },
            wallHeight: 9,
            seq: 100
        });
        expect(next.tiles).toHaveLength(2);
        expect(next.door).toEqual({ x: 1, y: 1, dir: 3 });
        expect(next.thickness).toEqual({ wall: 2, floor: 3 });
        expect(next.wallHeight).toBe(9);
        expect(next.seq).toBe(100);
    });

    it('clears selection on snapshot apply', () => {
        const start = { ...initialState, selection: new Set(['0,0']) as ReadonlySet<`${number},${number}`> };
        const next = reducer(start, {
            type: 'APPLY_REMOTE_SNAPSHOT',
            raw: '0',
            door: initialState.door,
            thickness: initialState.thickness,
            wallHeight: 0,
            seq: 1
        });
        expect(next.selection.size).toBe(0);
    });
});

describe('reducer — occupied flags survive tilemap swaps', () => {
    const occupiedState = (): FloorplanState => {
        const base = stateWith(defaultEmptyTilemap(2, 2));
        const painted = reducer(base, { type: 'PAINT_TILE', row: 0, col: 1, h: 0, source: 'local' });
        return reducer(painted, { type: 'SET_OCCUPIED_TILES', map: [[false, true], [false, false]] });
    };

    it('APPLY_REMOTE_SNAPSHOT keeps them by position', () => {
        const start = occupiedState();
        expect(start.tiles[0][1].occupied).toBe(true);
        const next = reducer(start, { type: 'APPLY_REMOTE_SNAPSHOT', raw: '00\r0x', door: start.door, thickness: start.thickness, wallHeight: 0, seq: 2 });
        expect(next.tiles[0][1].occupied).toBe(true);
        expect(next.tiles[0][0].occupied).toBeUndefined();
    });

    it('IMPORT_STRING keeps them by position', () => {
        const next = reducer(occupiedState(), { type: 'IMPORT_STRING', raw: '11\r11', source: 'local' });
        expect(next.tiles[0][1].occupied).toBe(true);
        expect(next.tiles[0][1].h).toBe(1);
    });

    it('APPLY_REMOTE_DIFF keeps the flag on a tile it rewrites', () => {
        const next = reducer(occupiedState(), { type: 'APPLY_REMOTE_DIFF', diff: { tiles: [{ row: 0, col: 1, h: 3, blocked: false }] }, seq: 3, editorUserId: 1 });
        expect(next.tiles[0][1]).toEqual({ h: 3, blocked: false, occupied: true });
    });
});
