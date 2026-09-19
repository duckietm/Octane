import { EMPTY_DOOR, MAX_NUM_TILE_PER_AXIS, MAX_WALL_HEIGHT, MIN_WALL_HEIGHT } from './constants';
import { parseTilemap } from './encoding';
import { FloorplanAction, FloorplanState, Tile } from './types';

export const initialState: FloorplanState = {
    tiles: [],
    door: { ...EMPTY_DOOR },
    thickness: { wall: 1, floor: 1 },
    wallHeight: -1,
    brush: { h: 0, action: 'SET' },
    selection: new Set<`${number},${number}`>(),
    squareSelect: false,
    lease: { holder: null, me: false, expiresAt: null },
    seq: 0
};

const clampHeight = (h: number): number => Math.max(0, Math.min(26, h | 0));
const clamp64 = (n: number): number => Math.max(0, Math.min(MAX_NUM_TILE_PER_AXIS - 1, n | 0));

const ensureRect = (tiles: Tile[][], rows: number, cols: number): Tile[][] => {
    const tRows = Math.min(MAX_NUM_TILE_PER_AXIS, Math.max(rows, tiles.length));
    const tCols = Math.min(MAX_NUM_TILE_PER_AXIS, Math.max(cols, tiles[0]?.length ?? 0));
    if (tRows === tiles.length && (tiles[0]?.length ?? 0) === tCols) return tiles;
    const next: Tile[][] = [];
    for (let r = 0; r < tRows; r++) {
        const src = tiles[r] ?? [];
        const row: Tile[] = [];
        for (let c = 0; c < tCols; c++) {
            row.push(src[c] ?? { h: 0, blocked: true });
        }
        next.push(row);
    }
    return next;
};

const setTile = (tiles: Tile[][], row: number, col: number, tile: Tile): Tile[][] => {
    const current = tiles[row]?.[col];
    if (current && current.h === tile.h && current.blocked === tile.blocked) return tiles;
    const next = tiles.map((r, ri) => (ri === row ? r.map((t, ci) => (ci === col ? tile : t)) : r));
    return next;
};

/**
 * Occupied flags mark tiles that hold furniture. They come from the server,
 * not from the tilemap string, so whenever a whole tilemap is swapped in
 * (import, undo/redo snapshots, live-sync snapshots) the flags are carried
 * over by position or they would silently disappear.
 */
const carryOccupied = (previous: Tile[][], next: Tile[][]): Tile[][] =>
    next.map((row, r) => row.map((tile, c) => (previous[r]?.[c]?.occupied ? { ...tile, occupied: true } : tile)));

export const reducer = (state: FloorplanState, action: FloorplanAction): FloorplanState => {
    switch (action.type) {
        case 'PAINT_TILE': {
            const row = clamp64(action.row);
            const col = clamp64(action.col);
            if (state.tiles[row]?.[col]?.occupied) return state;
            const tiles = ensureRect(state.tiles, row + 1, col + 1);
            const target = { h: clampHeight(action.h), blocked: false };
            const next = setTile(tiles, row, col, target);
            if (next === tiles && tiles === state.tiles) return state;
            return { ...state, tiles: next };
        }
        case 'ERASE_TILE': {
            const row = action.row | 0;
            const col = action.col | 0;
            if (row < 0 || col < 0 || row >= state.tiles.length || col >= (state.tiles[0]?.length ?? 0)) return state;
            const current = state.tiles[row][col];
            if (current.occupied) return state;
            const target = { h: current.h, blocked: true };
            const next = setTile(state.tiles, row, col, target);
            if (next === state.tiles) return state;
            return { ...state, tiles: next };
        }
        case 'ADJUST_HEIGHT': {
            const row = action.row | 0;
            const col = action.col | 0;
            if (row < 0 || col < 0 || row >= state.tiles.length || col >= (state.tiles[0]?.length ?? 0)) return state;
            const current = state.tiles[row][col];
            if (current.blocked || current.occupied) return state;
            const newH = clampHeight(current.h + action.delta);
            if (newH === current.h) return state;
            const next = setTile(state.tiles, row, col, { h: newH, blocked: false });
            return { ...state, tiles: next };
        }
        case 'SET_DOOR': {
            const x = clamp64(action.x);
            const y = clamp64(action.y);
            if (state.door.x === x && state.door.y === y) return state;
            return { ...state, door: { ...state.door, x, y } };
        }
        case 'SET_DOOR_DIR': {
            if (state.door.dir === action.dir) return state;
            return { ...state, door: { ...state.door, dir: action.dir } };
        }
        case 'SET_THICKNESS': {
            const wall = action.wall ?? state.thickness.wall;
            const floor = action.floor ?? state.thickness.floor;
            if (wall === state.thickness.wall && floor === state.thickness.floor) return state;
            return { ...state, thickness: { wall, floor } };
        }
        case 'SET_WALL_HEIGHT': {
            const value = Math.max(MIN_WALL_HEIGHT, Math.min(MAX_WALL_HEIGHT, action.value | 0));
            if (value === state.wallHeight) return state;
            return { ...state, wallHeight: value };
        }
        case 'SET_OCCUPIED_TILES': {
            // Mark tiles that currently hold furniture (server-reported). Leaves
            // height + blocked untouched so it never alters the saved tilemap.
            const map = action.map ?? [];
            let changed = false;
            const tiles = state.tiles.map((r, ri) =>
                r.map((tile, ci) => {
                    const occ = !!map[ri]?.[ci];
                    if ((tile.occupied ?? false) === occ) return tile;
                    changed = true;
                    return { ...tile, occupied: occ };
                })
            );
            if (!changed) return state;
            return { ...state, tiles };
        }
        case 'BRUSH_SET': {
            const h = action.h ?? state.brush.h;
            const act = action.action ?? state.brush.action;
            if (h === state.brush.h && act === state.brush.action) return state;
            return { ...state, brush: { h: clampHeight(h), action: act } };
        }
        case 'SELECT_ALL': {
            const sel = new Set<`${number},${number}`>();
            for (let r = 0; r < MAX_NUM_TILE_PER_AXIS; r++) {
                for (let c = 0; c < MAX_NUM_TILE_PER_AXIS; c++) {
                    sel.add(`${r},${c}`);
                }
            }
            return { ...state, selection: sel };
        }
        case 'CLEAR_SELECTION':
            return state.selection.size === 0 ? state : { ...state, selection: new Set() };
        case 'SELECT_RECT': {
            const [r0, c0] = action.from;
            const [r1, c1] = action.to;
            const rMin = Math.max(0, Math.min(r0, r1));
            const rMax = Math.min(MAX_NUM_TILE_PER_AXIS - 1, Math.max(r0, r1));
            const cMin = Math.max(0, Math.min(c0, c1));
            const cMax = Math.min(MAX_NUM_TILE_PER_AXIS - 1, Math.max(c0, c1));
            const sel = new Set<`${number},${number}`>();
            for (let r = rMin; r <= rMax; r++) {
                for (let c = cMin; c <= cMax; c++) {
                    sel.add(`${r},${c}`);
                }
            }
            return { ...state, selection: sel };
        }
        case 'APPLY_BRUSH_TO_SELECTION': {
            if (state.selection.size === 0) return state;
            if (state.brush.action === 'DOOR') return { ...state, selection: new Set() };

            let maxR = -1;
            let maxC = -1;
            for (const key of state.selection) {
                const [rStr, cStr] = key.split(',');
                const r = parseInt(rStr, 10);
                const c = parseInt(cStr, 10);
                if (r > maxR) maxR = r;
                if (c > maxC) maxC = c;
            }

            let tiles = state.tiles;
            if (state.brush.action === 'SET' && maxR >= 0 && maxC >= 0) {
                tiles = ensureRect(tiles, maxR + 1, maxC + 1);
            }

            for (const key of state.selection) {
                const [rStr, cStr] = key.split(',');
                const row = parseInt(rStr, 10);
                const col = parseInt(cStr, 10);
                const current = tiles[row]?.[col];
                if (!current) continue;
                if (current.occupied) continue;

                switch (state.brush.action) {
                    case 'SET':
                        tiles = setTile(tiles, row, col, { h: clampHeight(state.brush.h), blocked: false });
                        break;
                    case 'UNSET':
                        if (current.blocked) continue;
                        tiles = setTile(tiles, row, col, { h: current.h, blocked: true });
                        break;
                    case 'UP':
                        if (current.blocked) continue;
                        tiles = setTile(tiles, row, col, { h: clampHeight(current.h + 1), blocked: false });
                        break;
                    case 'DOWN':
                        if (current.blocked) continue;
                        tiles = setTile(tiles, row, col, { h: clampHeight(current.h - 1), blocked: false });
                        break;
                }
            }

            return { ...state, tiles, selection: new Set() };
        }
        case 'SQUARE_SELECT_TOGGLE':
            return { ...state, squareSelect: !state.squareSelect };
        case 'IMPORT_STRING': {
            const tiles = carryOccupied(state.tiles, parseTilemap(action.raw));
            const next: FloorplanState = { ...state, tiles };
            if (action.door) next.door = action.door;
            if (action.thickness) next.thickness = action.thickness;
            if (action.wallHeight !== undefined) next.wallHeight = Math.max(MIN_WALL_HEIGHT, Math.min(MAX_WALL_HEIGHT, action.wallHeight | 0));
            return next;
        }
        case 'APPLY_REMOTE_DIFF': {
            let next: FloorplanState = { ...state, seq: action.seq };
            if (action.diff.tiles) {
                let tiles = next.tiles;
                for (const e of action.diff.tiles) {
                    tiles = ensureRect(tiles, e.row + 1, e.col + 1);
                    const occupied = tiles[e.row]?.[e.col]?.occupied;
                    tiles = setTile(tiles, e.row, e.col, occupied ? { h: clampHeight(e.h), blocked: e.blocked, occupied: true } : { h: clampHeight(e.h), blocked: e.blocked });
                }
                next.tiles = tiles;
            }
            if (action.diff.door) next.door = action.diff.door;
            if (action.diff.thickness) next.thickness = action.diff.thickness;
            if (action.diff.wallHeight !== undefined) next.wallHeight = Math.max(MIN_WALL_HEIGHT, Math.min(MAX_WALL_HEIGHT, action.diff.wallHeight | 0));
            return next;
        }
        case 'APPLY_REMOTE_SNAPSHOT': {
            return {
                ...state,
                tiles: carryOccupied(state.tiles, parseTilemap(action.raw)),
                door: action.door,
                thickness: action.thickness,
                wallHeight: Math.max(MIN_WALL_HEIGHT, Math.min(MAX_WALL_HEIGHT, action.wallHeight | 0)),
                selection: new Set(),
                seq: action.seq
            };
        }
        default:
            return state;
    }
};
