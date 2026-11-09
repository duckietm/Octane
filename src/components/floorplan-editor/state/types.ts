// `blocked` = void tile (no floor, serialized as 'x'). `occupied` = a tile that
// currently has furniture on it (reported by the server); kept separate so it
// stays visible and is NOT voided on save — it can't be edited unless
// `pickUpBlocking` is on, in which case the save picks that furniture up.
export type Tile = { h: number; blocked: boolean; occupied?: boolean };

export type EntryDir = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type ThicknessLevel = 0 | 1 | 2 | 3;

export type Door = { x: number; y: number; dir: EntryDir };

export type FloorActionMode = 'SET' | 'UNSET' | 'UP' | 'DOWN' | 'DOOR';

export type Brush = { h: number; action: FloorActionMode };

export type Selection = ReadonlySet<`${number},${number}`>;

export type Lease = {
    holder: number | null;
    me: boolean;
    expiresAt: number | null;
};

export type FloorplanState = {
    tiles: Tile[][];
    door: Door;
    thickness: { wall: ThicknessLevel; floor: ThicknessLevel };
    wallHeight: number;
    brush: Brush;
    selection: Selection;
    squareSelect: boolean;
    pickUpBlocking: boolean;
    lease: Lease;
    seq: number;
};

export type LocalSource = 'local' | 'remote';

export type FloorplanAction =
    | { type: 'PAINT_TILE'; row: number; col: number; h: number; source: LocalSource }
    | { type: 'ERASE_TILE'; row: number; col: number; source: LocalSource }
    | { type: 'ADJUST_HEIGHT'; row: number; col: number; delta: 1 | -1; source: LocalSource }
    | { type: 'SET_DOOR'; x: number; y: number; source: LocalSource }
    | { type: 'SET_DOOR_DIR'; dir: EntryDir; source: LocalSource }
    | { type: 'SET_THICKNESS'; wall?: ThicknessLevel; floor?: ThicknessLevel; source: LocalSource }
    | { type: 'SET_WALL_HEIGHT'; value: number; source: LocalSource }
    | { type: 'SET_OCCUPIED_TILES'; map: boolean[][] }
    | { type: 'BRUSH_SET'; h?: number; action?: FloorActionMode }
    | { type: 'SELECT_RECT'; from: [number, number]; to: [number, number] }
    | { type: 'SELECT_ALL' }
    | { type: 'CLEAR_SELECTION' }
    | { type: 'APPLY_BRUSH_TO_SELECTION'; source: LocalSource }
    | { type: 'SQUARE_SELECT_TOGGLE' }
    | { type: 'SET_PICK_UP_BLOCKING'; value: boolean }
    | { type: 'IMPORT_STRING'; raw: string; door?: Door; thickness?: { wall: ThicknessLevel; floor: ThicknessLevel }; wallHeight?: number; source: LocalSource }
    | {
          type: 'APPLY_REMOTE_DIFF';
          diff: {
              tiles?: Array<{ row: number; col: number; h: number; blocked: boolean }>;
              door?: Door;
              thickness?: { wall: ThicknessLevel; floor: ThicknessLevel };
              wallHeight?: number;
          };
          seq: number;
          editorUserId: number;
      }
    | { type: 'APPLY_REMOTE_SNAPSHOT'; raw: string; door: Door; thickness: { wall: ThicknessLevel; floor: ThicknessLevel }; wallHeight: number; seq: number };
