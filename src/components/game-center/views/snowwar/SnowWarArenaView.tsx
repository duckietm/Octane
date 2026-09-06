import { FC, MouseEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetConfigurationValue, GetSessionDataManager, LocalizeText } from '../../../../api';
import {
    INITIAL_SNOWBALL_COUNT,
    LONG_LOB_MAX_RANGE_WORLD,
    QUICK_THROW_MAX_RANGE_WORLD,
    SHORT_LOB_MAX_RANGE_WORLD,
    SNOWWAR_SNOWBALL_IMAGE,
    SNOWWAR_SNOWBALL_SHADOW,
    SNOWWAR_SPLASH_FRAMES,
    SNOWWAR_STATE_CREATING,
    SNOWWAR_STATE_INVINCIBLE,
    SNOWWAR_STATE_STUNNED,
    STUN_TIME,
    SUBTURN_MS,
    TILE_SIZE_WORLD,
    TRAJECTORY_DEFAULT,
    TRAJECTORY_LONG_LOB,
    TRAJECTORY_QUICK,
    TRAJECTORY_SHORT_LOB,
    tileToWorld,
} from '../../../../api/snowwar';
import snowballPileImage from '../../../../assets/images/snowstorm/original/snst_ballpile.png';
import { LayoutAvatarImageView, LayoutFurniImageView } from '../../../../common';
import { useSnowWar } from '../../../../hooks';
import { FloorplanEditorView } from '../../../floorplan-editor/FloorplanEditorView';
import { SnowWarAvatarView } from './SnowWarAvatarView';
import {
    canPlaceSnowWarEditorItem,
    getSnowWarEditorArea,
    isSnowWarFloorTile,
    SnowWarEditorTile,
} from './SnowWarEditorTools';

const localizeWithFallback = (key: string, fallback: string) =>
{
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

// RoomDesktop creates every AIR game session at RoomEngine scale 32 (normal
// rooms use 64). Keep the DOM layer at 2x for crisp pixel rendering, but author
// every world coordinate and sprite at the matching half-size underneath it.
const AIR_GAME_CANVAS_SCALE = 32;
const ZOOM = 2;
const TILE_HALF_W = AIR_GAME_CANVAS_SCALE / (2 * ZOOM);
const TILE_HALF_H = TILE_HALF_W / 2;

// Furni images come from getFurnitureFloorImage at geometry scale 64, i.e.
// authored for a 64px-wide tile (half-width 32). The SnowWar tile is only
// TILE_HALF_W*2 wide, so this scale makes one furni tile exactly cover one
// arena tile - a 2x2 grid furni then lines up with the 2x2 floor tiles instead
// of overhanging them.
const SNOWWAR_FURNI_SCALE = TILE_HALF_W / 32;
// SnowWar's embedded game sprites are already authored for the 32px game
// canvas, unlike normal RoomEngine furniture and LARGE avatar renders (64px).
const SNOWWAR_GAME_SPRITE_SCALE = 1 / ZOOM;

// Duckie's water tiles are an additive editor feature. The original
// block_basic/block_ice suffixes describe progressively taller one-tile
// obstacles, not wider floor footprints.
const CUSTOM_FLOOR_SIZES: Record<string, { w: number; l: number }> = {
    block_water1: { w: 1, l: 1 },
    block_water2: { w: 2, l: 2 },
    block_water3: { w: 3, l: 3 },
};

// Draws one flat isometric floor tile (diamond) with its top vertex at (tsx,tsy).
const drawFloorDiamond = (context: CanvasRenderingContext2D, tsx: number, tsy: number, kind: 'stone' | 'ice' | 'water'): void =>
{
    const midY = tsy + TILE_HALF_H;
    const bottomY = tsy + (TILE_HALF_H * 2);

    context.beginPath();
    context.moveTo(tsx, tsy);
    context.lineTo(tsx + TILE_HALF_W, midY);
    context.lineTo(tsx, bottomY);
    context.lineTo(tsx - TILE_HALF_W, midY);
    context.closePath();

    if (kind === 'water')
    {
        // Deep-to-light vertical gradient so the tile reads as water with depth.
        const gradient = context.createLinearGradient(tsx, tsy, tsx, bottomY);
        gradient.addColorStop(0, '#7cc3ec');
        gradient.addColorStop(1, '#2f7cb8');
        context.fillStyle = gradient;
    }
    else
    {
        context.fillStyle = kind === 'ice' ? '#bfe6f7' : '#c7cfd6';
    }
    context.fill();
    context.strokeStyle = kind === 'ice' ? '#7fbfe0' : kind === 'water' ? '#276fa8' : '#9aa5b0';
    context.lineWidth = 1;
    context.stroke();

    if (kind === 'ice')
    {
        // Glossy highlight: a bright facet in the upper-left of the tile.
        context.fillStyle = 'rgba(255, 255, 255, 0.55)';
        context.beginPath();
        context.moveTo(tsx, tsy + 2);
        context.lineTo(tsx - TILE_HALF_W * 0.55, tsy + TILE_HALF_H * 0.7);
        context.lineTo(tsx, tsy + TILE_HALF_H);
        context.lineTo(tsx + TILE_HALF_W * 0.3, tsy + TILE_HALF_H * 0.55);
        context.closePath();
        context.fill();
    }
    else if (kind === 'water')
    {
        // Two short wavy ripples across the middle, kept well inside the diamond.
        context.strokeStyle = 'rgba(226, 246, 255, 0.75)';
        context.lineWidth = 1;
        for (const dy of [-2.5, 2])
        {
            context.beginPath();
            context.moveTo(tsx - 6, midY + dy);
            context.quadraticCurveTo(tsx - 3, midY + dy - 1.4, tsx, midY + dy);
            context.quadraticCurveTo(tsx + 3, midY + dy + 1.4, tsx + 6, midY + dy);
            context.stroke();
        }
    }
};

interface OfficialSnowWarSprite
{
    image: string;
    shadow?: string;
}

// Original hh_game_snowwar_room artwork. Comet itself resolves these classnames
// through RoomEngine; it never paints substitute trees or snowmen.
const OFFICIAL_SNOWWAR_SPRITES: Record<string, OfficialSnowWarSprite> = {
    sw_tree1: { image: 'sw_tree1.png', shadow: 'sw_tree1_shadow.png' },
    sw_tree2: { image: 'sw_tree2.png', shadow: 'sw_tree2_shadow.png' },
    sw_tree3: { image: 'sw_tree3.png', shadow: 'sw_tree3_shadow.png' },
    sw_tree4: { image: 'sw_tree4.png', shadow: 'sw_tree4_shadow.png' },
    obst_snowman: { image: 'obst_snowman.png' },
    obst_duck: { image: 'obst_duck.png' },
    block_basic: { image: 'block_basic.png' },
    block_basic2: { image: 'block_basic2.png' },
    block_basic3: { image: 'block_basic3.png' },
    block_ice: { image: 'block_ice.png' },
    block_ice2: { image: 'block_ice2.png' },
    block_small: { image: 'block_small.png' },
    // The a/b arch variants are distinct official pieces (different collision
    // heights server-side), not rotations of one classname.
    block_arch1: { image: 'block_arch1.png' },
    block_arch2: { image: 'block_arch2.png' },
    block_arch3: { image: 'block_arch3.png' },
    block_arch1b: { image: 'block_arch1b.png' },
    block_arch2b: { image: 'block_arch2b.png' },
    block_arch3b: { image: 'block_arch3b.png' },
};

const getArenaPropAssetUrl = (fileName: string): string =>
{
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const baseUrl = imageLibraryUrl && !imageLibraryUrl.endsWith('/') ? `${imageLibraryUrl}/` : imageLibraryUrl;
    return `${baseUrl}snowstorm_client/arena_props/${fileName}?v=official-2`;
};

const getOfficialSnowWarAssetUrl = (fileName: string): string =>
{
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const baseUrl = imageLibraryUrl && !imageLibraryUrl.endsWith('/') ? `${imageLibraryUrl}/` : imageLibraryUrl;
    return `${baseUrl}snowstorm_client/official/${fileName}?v=air-room-2`;
};

const getOfficialSnowWarSprite = (name: string, rotation: number): OfficialSnowWarSprite | null =>
{
    if (name === 'sw_fence' || name === 'sw_fence2')
    {
        const alternate = (rotation === 2 || rotation === 6) !== (name === 'sw_fence2');
        return { image: alternate ? 'sw_fence_dir2.png' : 'sw_fence_dir4.png' };
    }
    return OFFICIAL_SNOWWAR_SPRITES[name] ?? null;
};

const loadSnowWarImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) =>
{
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load SnowStorm asset: ${url}`));
    image.src = url;
});

// Draws Duckie's additive water tiles and a neutral fallback for newer editor
// pieces that do not exist in the archived original asset library.
const drawCustomProp = (context: CanvasRenderingContext2D, name: string, sx: number, sy: number, _rotation = 0): void =>
{
    const centerY = sy + TILE_HALF_H;

    const size = CUSTOM_FLOOR_SIZES[name];
    if (size)
    {
        const kind = name.includes('ice') ? 'ice' : name.includes('water') ? 'water' : 'stone';
        for (let dx = 0; dx < size.w; dx++)
        {
            for (let dy = 0; dy < size.l; dy++)
            {
                const tsx = sx + ((dx - dy) * TILE_HALF_W);
                const tsy = sy + ((dx + dy) * TILE_HALF_H);
                drawFloorDiamond(context, tsx, tsy, kind);
            }
        }
        return;
    }

    // Any other block / fence / obstacle: raised cube.
    const height = name.includes('3') ? 26 : name.includes('2') ? 18 : 10;
    const isIce = name.includes('ice');
    context.beginPath();
    context.moveTo(sx, centerY - height - TILE_HALF_H);
    context.lineTo(sx + TILE_HALF_W, centerY - height);
    context.lineTo(sx + TILE_HALF_W, centerY);
    context.lineTo(sx, centerY + TILE_HALF_H);
    context.lineTo(sx - TILE_HALF_W, centerY);
    context.lineTo(sx - TILE_HALF_W, centerY - height);
    context.closePath();
    context.fillStyle = isIce ? '#bfe3f5' : '#cfd6dd';
    context.fill();
    context.strokeStyle = isIce ? '#8fc3de' : '#9aa5b0';
    context.stroke();
};

const isFlatFloorProp = (name: string) => !!CUSTOM_FLOOR_SIZES[name];

// v26 sprites use a ~30px isometric tile; the arena's authored tile is 24px.
const OFFICIAL_SNOWWAR_SPRITE_SCALE = (TILE_HALF_W * 2) / 30;
const PROP_BOX_W = 64;
const PROP_BOX_H = 112;
const PROP_ANCHOR_Y = 100;

// Paint the original bitmap and its original shadow into a per-tile canvas.
const ClassicPropSprite: FC<{ name: string; rotation: number; opacity?: number }> = ({ name, rotation, opacity }) =>
{
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() =>
    {
        const context = ref.current?.getContext('2d');
        if (!context) return;

        let cancelled = false;
        const fallback = () =>
        {
            context.clearRect(0, 0, PROP_BOX_W, PROP_BOX_H);
            drawCustomProp(context, name, PROP_BOX_W / 2, PROP_ANCHOR_Y, rotation);
        };
        const sprite = getOfficialSnowWarSprite(name, rotation);
        if (!sprite)
        {
            fallback();
            return;
        }

        const render = async () =>
        {
            try
            {
                const [image, shadow] = await Promise.all([
                    loadSnowWarImage(getArenaPropAssetUrl(sprite.image)),
                    sprite.shadow ? loadSnowWarImage(getArenaPropAssetUrl(sprite.shadow)) : Promise.resolve(null),
                ]);
                if (cancelled) return;

                context.clearRect(0, 0, PROP_BOX_W, PROP_BOX_H);
                context.imageSmoothingEnabled = false;
                const baseY = PROP_ANCHOR_Y + TILE_HALF_H;
                if (shadow)
                {
                    const shadowWidth = Math.round(shadow.naturalWidth * OFFICIAL_SNOWWAR_SPRITE_SCALE);
                    const shadowHeight = Math.round(shadow.naturalHeight * OFFICIAL_SNOWWAR_SPRITE_SCALE);
                    context.drawImage(
                        shadow,
                        Math.round((PROP_BOX_W - shadowWidth) / 2),
                        Math.round(baseY + 4 - shadowHeight),
                        shadowWidth,
                        shadowHeight);
                }

                const width = Math.round(image.naturalWidth * OFFICIAL_SNOWWAR_SPRITE_SCALE);
                const height = Math.round(image.naturalHeight * OFFICIAL_SNOWWAR_SPRITE_SCALE);
                context.drawImage(
                    image,
                    Math.round((PROP_BOX_W - width) / 2),
                    Math.round(baseY - height),
                    width,
                    height);
            }
            catch
            {
                if (!cancelled) fallback();
            }
        };
        void render();
        return () =>
        {
            cancelled = true;
        };
    }, [name, rotation]);
    return <canvas ref={ref} width={PROP_BOX_W} height={PROP_BOX_H} className="snowwar-classic-prop-canvas" style={opacity != null ? { opacity } : undefined} />;
};

const TEAM_COLORS = ['#e64545', '#4577e6', '#3fb550', '#e6c245'];

// How long (ms) an avatar holds the SnowWarThrow arm-out pose after throwing.
const SNOWWAR_THROW_POSE_MS = 450;
// Official AIR snowball height rendering: the simulated z (world units) maps
// linearly to screen pixels exactly like room-engine z — roomZ = worldZ / 1600
// (Tile.TILE_HALFWIDTH), drawn at 16px per z unit on the 32px game canvas.
// That is worldZ / 100 screen px here. No per-trajectory baselines or caps: a
// resting ball sits at z=3000 (hand height), quick throws fly flat there and
// lobs follow the full parabola. The splash shares the mapping so flight and
// impact never drift apart.
const SNOWWAR_WORLD_Z_TO_PX = (TILE_HALF_W * ZOOM) / 1600;
const snowballRise = (height: number): number => height * SNOWWAR_WORLD_Z_TO_PX;

// Design base: the arena is authored for a 1920x1080 stage. Larger screens
// centre this stage; smaller screens cap the viewport to the screen and follow
// the player.
const DESIGN_W = 1920;
const DESIGN_H = 1080;

// Camera dead zone: the avatar roams the central (1 - 2*DEADZONE) of the
// viewport with the camera held still; only when it pushes into the outer
// DEADZONE band near an edge does the camera ease back to re-centre it. This
// keeps the background static most of the time (no per-step scroll, so jitter
// stays invisible) and only follows when the avatar is about to leave the view.
const CAMERA_DEADZONE = 0.2;
const CAMERA_EASE = 0.15;

interface EditItem { name: string; x: number; y: number; rotation: number; imageUrl: string; offsetZ: number; width?: number; length?: number; state: number; stateCount?: number; walkableHeight?: number }

const SNOWWAR_EDITOR_MAX_ITEMS = 2048;

interface EditorGesture
{
    mode: 'paint' | 'area';
    start: SnowWarEditorTile;
    end: SnowWarEditorTile;
}

// Editor preview walker: a purely client-side avatar you can stroll around the
// arena while editing (no server / game simulation involved), to test the
// layout. It steps one tile every SNOWWAR_EDITOR_STEP_MS.
const SNOWWAR_EDITOR_STEP_MS = 260;

interface EditorWalk { path: { x: number; y: number }[]; startMs: number; endDir: number }

// Tile delta -> Habbo 8-direction (0 N .. 7 NW; +x = E, +y = S on the grid).
const tileDirection = (dx: number, dy: number): number =>
{
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);
    if (sx === 0 && sy > 0) return 4;
    if (sx > 0 && sy > 0) return 3;
    if (sx > 0 && sy === 0) return 2;
    if (sx > 0 && sy < 0) return 1;
    if (sx === 0 && sy < 0) return 0;
    if (sx < 0 && sy < 0) return 7;
    if (sx < 0 && sy === 0) return 6;
    if (sx < 0 && sy > 0) return 5;
    return 4;
};

// Breadth-first shortest walk over every non-void floor-plan height, 8-way but
// never cutting a diagonal through a void corner. Returns the tile path
// (including the start) or null when the target is void / unreachable.
const findEditorPath = (rows: string[], from: { x: number; y: number }, to: { x: number; y: number }, width: number, height: number, blocked?: Set<number>): { x: number; y: number }[] | null =>
{
    const walkable = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && isSnowWarFloorTile(rows[y]?.charAt(x)) && !(blocked?.has((y * width) + x));
    if (!walkable(from.x, from.y) || !walkable(to.x, to.y)) return null;
    if (from.x === to.x && from.y === to.y) return [from];

    const key = (x: number, y: number) => (y * width) + x;
    const prev = new Map<number, number>();
    const seen = new Set<number>([key(from.x, from.y)]);
    const queue: { x: number; y: number }[] = [from];
    const steps = [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
        { dx: 1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: -1, dy: -1 },
    ];

    while (queue.length)
    {
        const cur = queue.shift();
        if (cur.x === to.x && cur.y === to.y)
        {
            const path: { x: number; y: number }[] = [];
            let cx = cur.x;
            let cy = cur.y;
            let k = key(cx, cy);
            for (;;)
            {
                path.unshift({ x: cx, y: cy });
                if (cx === from.x && cy === from.y) break;
                k = prev.get(k);
                cx = k % width;
                cy = Math.floor(k / width);
            }
            return path;
        }
        for (const s of steps)
        {
            const nx = cur.x + s.dx;
            const ny = cur.y + s.dy;
            if (!walkable(nx, ny)) continue;
            // No diagonal corner-cutting: both orthogonal neighbours must be open.
            if (s.dx !== 0 && s.dy !== 0 && (!walkable(cur.x + s.dx, cur.y) || !walkable(cur.x, cur.y + s.dy))) continue;
            const nk = key(nx, ny);
            if (seen.has(nk)) continue;
            seen.add(nk);
            prev.set(nk, key(cur.x, cur.y));
            queue.push({ x: nx, y: ny });
        }
    }
    return null;
};

// Placeable classnames for the in-arena editor, mirroring the server's
// SnowWarItemProperties registry.
const EDITOR_PALETTE = [
    'sw_tree1', 'sw_tree2', 'sw_tree3', 'sw_tree4',
    'block_basic', 'block_basic2', 'block_basic3', 'block_small',
    'block_ice', 'block_ice2',
    'block_arch1', 'block_arch2', 'block_arch3',
    'block_arch1b', 'block_arch2b', 'block_arch3b',
    'block_water1', 'block_water2', 'block_water3',
    'obst_snowman', 'obst_duck', 'sw_fence', 'sw_fence2',
];

/** AIR projectile caps, expressed in world coordinates like the emulator. */
const isThrowInRange = (fromX: number, fromY: number, toX: number, toY: number, trajectory: number) =>
{
    const maxRange = trajectory === TRAJECTORY_QUICK
        ? QUICK_THROW_MAX_RANGE_WORLD
        : trajectory === TRAJECTORY_SHORT_LOB
            ? SHORT_LOB_MAX_RANGE_WORLD
            : LONG_LOB_MAX_RANGE_WORLD;
    const dx = toX - fromX;
    const dy = toY - fromY;
    return ((dx * dx) + (dy * dy)) <= (maxRange * maxRange);
};

/** Original AIR modifier mapping; opponent clicks default to adaptive aim. */
const getAirTrajectory = (altKey: boolean, shiftKey: boolean, opponent: boolean): number | null =>
{
    if (altKey && shiftKey) return TRAJECTORY_SHORT_LOB;
    if (altKey) return TRAJECTORY_LONG_LOB;
    if (shiftKey) return TRAJECTORY_QUICK;
    return opponent ? TRAJECTORY_DEFAULT : null;
};

/** Exact isometric direction mapping from AIR's KeyboardControl. */
const getKeyboardDirection = (keys: Set<string>): { x: number; y: number } | null =>
{
    if (keys.has('ArrowUp') && keys.has('ArrowLeft')) return { x: -1, y: 0 };
    if (keys.has('ArrowUp') && keys.has('ArrowRight')) return { x: 0, y: -1 };
    if (keys.has('ArrowDown') && keys.has('ArrowLeft')) return { x: 0, y: 1 };
    if (keys.has('ArrowDown') && keys.has('ArrowRight')) return { x: 1, y: 0 };
    if (keys.has('ArrowUp')) return { x: -1, y: -1 };
    if (keys.has('ArrowDown')) return { x: 1, y: 1 };
    if (keys.has('ArrowLeft')) return { x: -1, y: 1 };
    if (keys.has('ArrowRight')) return { x: 1, y: -1 };

    const letterDirections: [string, number, number][] = [
        ['KeyQ', -1, 0], ['KeyW', -1, -1], ['KeyE', 0, -1],
        ['KeyA', -1, 1], ['KeyD', 1, -1],
        ['KeyZ', 0, 1], ['KeyX', 1, 1], ['KeyC', 1, 0],
    ];
    for (const [code, x, y] of letterDirections)
    {
        if (keys.has(code)) return { x, y };
    }
    return null;
};

/** Classic SnowWar props drawn as canvas shapes; everything else is furni. */
const isClassicItem = (name: string) =>
    name.startsWith('sw_') || name.startsWith('block_') || name.startsWith('obst_') || name.startsWith('snowball_machine');

export const SnowWarArenaView: FC = () =>
{
    const {
        phase,
        levelData,
        secondsLeft,
        preparingSeconds,
        chatMessages,
        simulation,
        editing,
        walkTo,
        throwAtLocation,
        throwAtPlayer,
        createSnowball,
        exitGame,
        startEditing,
        saveArena,
        stopEditing,
        sendChat,
        requestFullStatus,
    } = useSnowWar();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Classic props (trees/blocks/fences/floor tiles) draw on their own canvas
    // ABOVE the ad backdrop overlay, so "hide tiles behind image" only hides the
    // floor grid - the props stay visible, like the hotel furni.
    const propsCanvasRef = useRef<HTMLCanvasElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    // Dead-zone follow camera: persisted translate + per-axis "recentring"
    // latch. Advanced at most once per animation frame (see the camera block).
    const cameraRef = useRef({ x: 0, y: 0, frame: -1, recenterX: false, recenterY: false, initialized: false });
    // Wall-clock of the last animation frame; doubles as the re-render tick.
    const [frameNow, setFrameNow] = useState(0);
    const [chatInput, setChatInput] = useState('');
    const zoom = ZOOM;
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    // Set when a throw is blocked for being out of range; shows a short hint.
    const [rangeWarningAt, setRangeWarningAt] = useState(0);
    const ownUserId = GetSessionDataManager()?.userId ?? 0;
    const submitChat = useCallback(() =>
    {
        const message = chatInput.trim();

        if (!message) return;

        sendChat(message);
        setChatInput('');
    }, [chatInput, sendChat]);

    // Exact AIR splash frames, positioned from the authoritative collision event.
    const [splashes, setSplashes] = useState<{ id: number; x: number; y: number }[]>([]);
    const ballScreenRef = useRef<Map<number, { x: number; y: number; tx: number; ty: number }>>(new Map());
    // avatar objectId -> frameNow timestamp until which that avatar holds the
    // SnowWarThrow pose. Set when a new snowball appears (that ball's thrower).
    const throwPoseUntilRef = useRef<Map<number, number>>(new Map());

    // In-arena editor state (only meaningful while `editing`).
    const [editItems, setEditItems] = useState<EditItem[]>([]);
    const [editHeightmap, setEditHeightmap] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    // Palette selection: a classname to place, an explicit floor-plan tool,
    // 'walk' to test routes, or null for select/move mode. Spawns aren't placed
    // by hand - the game picks them automatically from walkable tiles.
    const [paletteSel, setPaletteSel] = useState<string | null>(null);
    const [furniSearch, setFurniSearch] = useState('');
    const [editorArenaName, setEditorArenaName] = useState('');
    const [savedAt, setSavedAt] = useState(0);
    // Tile under the cursor while editing - drives the 80%-opacity placement
    // ghost. Only updated when it changes, so it doesn't churn renders.
    const [hoverTile, setHoverTile] = useState<{ x: number; y: number } | null>(null);
    const [editorArea, setEditorArea] = useState<{ start: SnowWarEditorTile; end: SnowWarEditorTile } | null>(null);
    const [floorplanEditorVisible, setFloorplanEditorVisible] = useState(false);
    const editorGestureRef = useRef<EditorGesture | null>(null);
    const suppressEditorClickRef = useRef(false);

    // Editor preview walker (client-side only). Held in a ref and animated off
    // the RAF frameNow clock; the current interpolated position is computed in
    // render, so moving it never triggers extra state churn.
    const editorWalkRef = useRef<EditorWalk | null>(null);

    // Hotel furni matching the current search - lets the editor place any
    // real furniture (like decorating a room), not just the classic SnowWar
    // props. Floor furni only; capped so the list stays usable.
    const furniMatches = useMemo(() =>
    {
        const term = furniSearch.trim().toLowerCase();
        if (term.length < 2) return [];
        const all = GetSessionDataManager()?.getAllFurnitureData?.() ?? [];
        return all
            .filter(furni => furni.type === 'S' && (
                furni.className?.toLowerCase().includes(term) || furni.name?.toLowerCase().includes(term)))
            .slice(0, 40);
    }, [furniSearch]);

    // Seed the working copy from the current level snapshot when the editor
    // opens; the game furni become editable items.
    useEffect(() =>
    {
        if (!editing) return;
        setEditItems((levelData?.items ?? []).map(item =>
        {
            // Flat floor-tile props carry a fixed footprint client-side (the
            // server treats them as 1x1 non-blocking floor), so their selection
            // box + walkable band match how they're drawn.
            const classicSize = CUSTOM_FLOOR_SIZES[item.name];
            return {
                name: item.name, x: item.x, y: item.y, rotation: item.rotation, imageUrl: item.imageUrl, offsetZ: item.offsetZ ?? 0,
                width: classicSize?.w ?? item.width, length: classicSize?.l ?? item.length,
                state: item.state ?? 0, stateCount: item.stateCount,
                // Use the server's walkable height (0 for basic/ice, 1 for water).
                walkableHeight: item.walkableHeight,
            };
        }));
        setEditHeightmap([...(levelData?.heightmapRows ?? [])]);
        setSelectedIndex(-1);
        setPaletteSel(null);
        setFurniSearch('');
        setEditorArea(null);
        setFloorplanEditorVisible(false);
        editorGestureRef.current = null;
        setEditorArenaName(levelData?.arenaName || (levelData ? `Custom Arena ${levelData.mapId}` : 'Custom Arena'));

        // Drop the preview walker on the walkable tile nearest the arena centre.
        const rows = levelData?.heightmapRows ?? [];
        const rowH = rows.length;
        const rowW = rows.reduce((max, row) => Math.max(max, row.length), 0);
        let start: { x: number; y: number } | null = null;
        let best = Infinity;
        for (let y = 0; y < rowH; y++)
        {
            for (let x = 0; x < rows[y].length; x++)
            {
                if (!isSnowWarFloorTile(rows[y].charAt(x))) continue;
                const dist = ((x - (rowW / 2)) ** 2) + ((y - (rowH / 2)) ** 2);
                if (dist < best) { best = dist; start = { x, y }; }
            }
        }
        editorWalkRef.current = start ? { path: [start], startMs: 0, endDir: 4 } : null;
    }, [editing, levelData?.mapId]);

    // Current walker tile (rounded) at call time - used to path from where it
    // stands right now, whether idle or mid-step.
    const walkerTileNow = useCallback((): { x: number; y: number } | null =>
    {
        const plan = editorWalkRef.current;
        if (!plan || !plan.path.length) return null;
        if (plan.path.length === 1) return plan.path[0];
        const total = plan.path.length - 1;
        const stepFloat = Math.max(0, Date.now() - plan.startMs) / SNOWWAR_EDITOR_STEP_MS;
        if (stepFloat >= total) return plan.path[total];
        const seg = Math.floor(stepFloat);
        const t = stepFloat - seg;
        const a = plan.path[seg];
        const b = plan.path[seg + 1];
        return { x: Math.round(a.x + ((b.x - a.x) * t)), y: Math.round(a.y + ((b.y - a.y) * t)) };
    }, []);


    // The arena renders the editor's working copy while editing, the live
    // level items otherwise. Both references are stable across renders.
    const displayItems = editing ? editItems : (levelData?.items ?? []);

    // classname -> interaction_modes_count, learned from the server's level data.
    // Lets the editor cap a freshly-placed furni's state stepper when that furni
    // type already appears in the arena (the palette/furnidata carries no state
    // count). Unknown types stay uncapped until the arena is saved and reloaded.
    const stateCountByName = useMemo(() =>
    {
        const map = new Map<string, number>();
        for (const item of (levelData?.items ?? []))
        {
            if (item.stateCount && item.stateCount > 0) map.set(item.name, item.stateCount);
        }
        return map;
    }, [levelData]);

    const mapRows = editing ? editHeightmap : (levelData?.heightmapRows ?? []);
    const mapHeight = mapRows.length;
    const mapWidth = mapHeight > 0 ? mapRows[0].length : 0;
    const walkableTileCount = useMemo(
        () => editHeightmap.reduce(
            (total, row) => total + Array.from(row).filter(isSnowWarFloorTile).length,
            0),
        [editHeightmap]);

    const floorplanOccupiedTiles = useMemo(() =>
    {
        const occupied = editHeightmap.map(row => Array.from({ length: row.length }, () => false));
        for (const item of editItems)
        {
            if (item.imageUrl) continue;
            const rotated = item.rotation === 2 || item.rotation === 6;
            const width = Math.max(1, (rotated ? item.length : item.width) ?? 1);
            const length = Math.max(1, (rotated ? item.width : item.length) ?? 1);
            for (let y = item.y; y < item.y + length; y++)
            {
                for (let x = item.x; x < item.x + width; x++)
                {
                    if (occupied[y]?.[x] !== undefined) occupied[y][x] = true;
                }
            }
        }
        return occupied;
    }, [editHeightmap, editItems]);

    const applyEditorFloorPlan = useCallback((raw: string) =>
    {
        const rows = raw.split(/\r\n|\r|\n/).filter(row => row.length > 0);
        if (!rows.length) return;
        setEditHeightmap(rows);
        setPaletteSel(null);
        setSelectedIndex(-1);
        setHoverTile(null);
        setEditorArea(null);
        editorGestureRef.current = null;
    }, []);

    // Path the preview walker to a tile (client-side only). Returns true if a
    // walk was started, so callers can tell a walk from a no-op empty click.
    const walkPreviewTo = useCallback((tileX: number, tileY: number): boolean =>
    {
        const from = walkerTileNow();
        if (!from) return false;
        // Tiles blocked for the preview walker: any non-walkable piece
        // (walkableHeight > 0 - water, trees, blocks, solid furni) over its whole
        // footprint, so the walker routes around them just like in-game.
        const blocked = new Set<number>();
        for (const it of editItems)
        {
            if ((it.walkableHeight ?? 0) <= 0) continue;
            const swap = it.rotation === 2 || it.rotation === 6;
            const w = Math.max(1, (swap ? it.length : it.width) ?? 1);
            const l = Math.max(1, (swap ? it.width : it.length) ?? 1);
            for (let dx = 0; dx < w; dx++)
            {
                for (let dy = 0; dy < l; dy++)
                {
                    blocked.add(((it.y + dy) * mapWidth) + (it.x + dx));
                }
            }
        }
        const path = findEditorPath(mapRows, from, { x: tileX, y: tileY }, mapWidth, mapHeight, blocked);
        if (!path || path.length < 2) return false;
        const last = path[path.length - 1];
        const prevTile = path[path.length - 2];
        editorWalkRef.current = { path, startMs: Date.now(), endDir: tileDirection(last.x - prevTile.x, last.y - prevTile.y) };
        return true;
    }, [mapRows, mapWidth, mapHeight, walkerTileNow, editItems]);

    const originX = mapHeight * TILE_HALF_W;
    const canvasWidth = (mapWidth + mapHeight) * TILE_HALF_W;
    const canvasHeight = (mapWidth + mapHeight) * TILE_HALF_H + 40;

    const toScreen = useCallback((tileX: number, tileY: number) => ({
        x: originX + (tileX - tileY) * TILE_HALF_W,
        y: (tileX + tileY) * TILE_HALF_H,
    }), [originX]);

    const worldToScreen = useCallback((worldX: number, worldY: number) =>
    {
        const tx = worldX / TILE_SIZE_WORLD;
        const ty = worldY / TILE_SIZE_WORLD;
        return {
            x: originX + (tx - ty) * TILE_HALF_W,
            y: (tx + ty) * TILE_HALF_H,
        };
    }, [originX]);

    // Static floor: tiles + obstacles drawn once per level.
    useEffect(() =>
    {
        const canvas = canvasRef.current;
        if (!canvas || !mapHeight) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        context.clearRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < mapHeight; y++)
        {
            for (let x = 0; x < mapWidth; x++)
            {
                const char = mapRows[y]?.charAt(x);
                if (!isSnowWarFloorTile(char)) continue;

                const { x: sx, y: sy } = toScreen(x, y);
                context.beginPath();
                context.moveTo(sx, sy);
                context.lineTo(sx + TILE_HALF_W, sy + TILE_HALF_H);
                context.lineTo(sx, sy + TILE_HALF_H * 2);
                context.lineTo(sx - TILE_HALF_W, sy + TILE_HALF_H);
                context.closePath();
                context.fillStyle = ((x + y) % 2) ? '#eef5fb' : '#e4eef7';
                context.fill();
                context.strokeStyle = '#c8d8e6';
                context.lineWidth = 1;
                context.stroke();
            }
        }

        // Classic props draw on a SEPARATE canvas that sits above the ad
        // backdrop overlay, so toggling "hide tiles behind image" hides only the
        // floor grid (this canvas) and not the props.
        const propsCanvas = propsCanvasRef.current;
        const propsContext = propsCanvas?.getContext('2d');
        if (!propsContext) return;
        propsContext.clearRect(0, 0, propsCanvas.width, propsCanvas.height);

        for (const item of displayItems)
        {
            // Only the FLAT floor tiles (basic/ice/water) draw on this canvas -
            // they sit on the ground below the avatars. The tall props (trees,
            // snowman, fences, blocks) are DOM sprites that depth-sort with the
            // avatars, and hotel furni are their own DOM images.
            if (!isFlatFloorProp(item.name)) continue;

            const { x: sx, y: sy } = toScreen(item.x, item.y);
            drawCustomProp(propsContext, item.name, sx, sy, item.rotation);
        }

        // Placement preview for a flat floor tile (tall props get a DOM ghost).
        if (editing && paletteSel && isFlatFloorProp(paletteSel) && hoverTile)
        {
            const { x: sx, y: sy } = toScreen(hoverTile.x, hoverTile.y);
            propsContext.save();
            propsContext.globalAlpha = 0.55;
            drawCustomProp(propsContext, paletteSel, sx, sy);
            propsContext.restore();
        }
    }, [displayItems, mapHeight, mapWidth, mapRows, toScreen, editing, paletteSel, hoverTile]);

    // Drive the simulation clock + re-render at display rate.
    useEffect(() =>
    {
        let running = true;
        let rafId = 0;

        const loop = (now: number) =>
        {
            if (!running) return;
            simulation.update(now);
            setFrameNow(Date.now());
            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () =>
        {
            running = false;
            cancelAnimationFrame(rafId);
        };
    }, [simulation]);

    // Track the viewport size; the camera transform is computed from it.
    useEffect(() =>
    {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const update = () => setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
        update();

        const observer = new ResizeObserver(update);
        observer.observe(viewport);
        return () => observer.disconnect();
    }, [levelData]);


    // Periodic authoritative resync.
    useEffect(() =>
    {
        if (phase !== 'playing') return;
        const interval = setInterval(() => requestFullStatus(), 10000);
        return () => clearInterval(interval);
    }, [phase, requestFullStatus]);

    const screenToTile = useCallback((event: { clientX: number; clientY: number }) =>
    {
        // Measure the floor canvas itself, NOT the viewport: the world is
        // centered inside a scrollable viewport, so the viewport rect is
        // offset from the isometric origin and clicks landed on the wrong
        // tile (or outside the map) whenever the arena didn't exactly fill it.
        const canvas = canvasRef.current;
        if (!canvas) return { tileX: -1, tileY: -1 };

        const bounds = canvas.getBoundingClientRect();
        const scaleX = bounds.width > 0 ? canvasWidth / bounds.width : 1;
        const px = (event.clientX - bounds.left) * scaleX - originX;
        const py = (event.clientY - bounds.top) * scaleX;

        const tileX = Math.floor(((px / TILE_HALF_W) + (py / TILE_HALF_H)) / 2);
        const tileY = Math.floor(((py / TILE_HALF_H) - (px / TILE_HALF_W)) / 2);
        return { tileX, tileY };
    }, [canvasWidth, originX]);

    const placeEditItems = useCallback((tiles: SnowWarEditorTile[]) =>
    {
        if (!paletteSel || paletteSel === 'walk' || paletteSel === 'edit') return;

        const fd = GetSessionDataManager()?.getFloorItemDataByName?.(paletteSel);
        const classicSize = CUSTOM_FLOOR_SIZES[paletteSel];
        const isBlocking = paletteSel.startsWith('block_water') || paletteSel.startsWith('sw_fence');
        const walkable = !isBlocking && (!!(fd?.canStandOn || fd?.canLayOn) || !!classicSize);

        setEditItems(items =>
        {
            const next = [...items];
            let changed = false;

            for (const tile of tiles)
            {
                if (next.length >= SNOWWAR_EDITOR_MAX_ITEMS) break;
                const item: EditItem = {
                    name: paletteSel,
                    x: tile.x,
                    y: tile.y,
                    rotation: 0,
                    imageUrl: '',
                    offsetZ: 0,
                    state: 0,
                    stateCount: stateCountByName.get(paletteSel),
                    width: fd?.tileSizeX ?? classicSize?.w,
                    length: fd?.tileSizeY ?? classicSize?.l,
                    walkableHeight: walkable ? 0 : 1,
                };
                if (!canPlaceSnowWarEditorItem(next, item, mapWidth, mapHeight)) continue;
                next.push(item);
                changed = true;
            }

            return changed ? next : items;
        });
    }, [mapHeight, mapWidth, paletteSel, stateCountByName]);

    const applyEditClick = useCallback((tileX: number, tileY: number) =>
    {
        if (paletteSel === 'walk')
        {
            // Stroll the client-side preview avatar to the clicked tile.
            walkPreviewTo(tileX, tileY);
            return;
        }

        if (paletteSel && paletteSel !== 'edit')
        {
            placeEditItems([{ x: tileX, y: tileY }]);
            // Keep the palette piece armed so you can drop several in a row; it
            // stays selected (ghost keeps following) until you pick it again to
            // toggle it off, or choose another piece / mode.
            return;
        }

        // Selection modes: 'edit' (paletteSel === 'edit') just picks a piece to
        // tweak in place (rotate / state / delete); Select/Move (paletteSel ===
        // null) additionally drops the selected piece on an empty tile. Both
        // select the piece under the click.
        // When a piece is already picked up for a move (Select/Move), a click
        // should DROP it on the tile - even a tile covered by a flat floor tile
        // (basic/ice/water) - instead of the flat tile grabbing the click and
        // re-selecting itself. So skip flat floor tiles (and the moving piece
        // itself) in the hit-test while relocating; solid furni still re-select.
        const relocating = paletteSel === null && selectedIndex >= 0;
        let hitIndex = -1;
        for (let i = editItems.length - 1; i >= 0; i--)
        {
            const it = editItems[i];
            if (relocating && (i === selectedIndex || isFlatFloorProp(it.name))) continue;
            // Hit-test the whole footprint (rotation swaps width/length), not
            // just the origin tile, so clicking any tile of a 3x3 / 2x1 / ...
            // furni selects it.
            const swap = it.rotation === 2 || it.rotation === 6;
            const effW = Math.max(1, (swap ? it.length : it.width) ?? 1);
            const effL = Math.max(1, (swap ? it.width : it.length) ?? 1);
            if (tileX >= it.x && tileX < it.x + effW && tileY >= it.y && tileY < it.y + effL) { hitIndex = i; break; }
        }

        if (hitIndex >= 0) { setSelectedIndex(hitIndex); return; }

        // Only Select/Move relocates on an empty-tile click; Edit leaves the
        // piece where it is so you can't nudge it by accident while editing.
        if (paletteSel === null && selectedIndex >= 0)
        {
            const selected = editItems[selectedIndex];
            if (!selected) return;
            const moved = { ...selected, x: tileX, y: tileY };
            if (!canPlaceSnowWarEditorItem(editItems, moved, mapWidth, mapHeight, selectedIndex)) return;
            setEditItems(items => items.map((item, index) => index === selectedIndex ? moved : item));
            // Dropped at the new tile - deselect so the moved furni shows at its
            // new spot and stops following the cursor.
            setSelectedIndex(-1);
            setHoverTile(null);
            return;
        }

        // Empty tile clicked in a selection mode with nothing to move: stroll the
        // preview avatar there too, so walking works without switching to the
        // dedicated Walk mode.
        if (paletteSel === null || paletteSel === 'edit') walkPreviewTo(tileX, tileY);
        setSelectedIndex(-1);
    }, [paletteSel, editItems, selectedIndex, mapHeight, mapWidth, placeEditItems, walkPreviewTo]);

    const onArenaClick = useCallback((event: MouseEvent<HTMLDivElement>) =>
    {
        const { tileX, tileY } = screenToTile(event);
        if (tileX < 0 || tileY < 0 || tileX >= mapWidth || tileY >= mapHeight) return;

        if (editing)
        {
            event.preventDefault();
            if (event.type === 'click' && suppressEditorClickRef.current)
            {
                suppressEditorClickRef.current = false;
                return;
            }
            applyEditClick(tileX, tileY);
            return;
        }

        if (event.type === 'contextmenu')
        {
            event.preventDefault();
            // Duckie's convenient right-click gestures remain additive to AIR:
            // right-click is quick and Shift+right-click is a long lob.
            const trajectory = event.shiftKey ? TRAJECTORY_LONG_LOB : TRAJECTORY_QUICK;
            const own = simulation.getAvatarByUserId(ownUserId);
            if (own && !isThrowInRange(own.worldX, own.worldY, tileToWorld(tileX), tileToWorld(tileY), trajectory))
            {
                setRangeWarningAt(Date.now());
                return;
            }
            throwAtLocation(tileToWorld(tileX), tileToWorld(tileY), trajectory);
            return;
        }

        const trajectory = getAirTrajectory(event.altKey, event.shiftKey, false);
        if (trajectory !== null)
        {
            event.preventDefault();
            const own = simulation.getAvatarByUserId(ownUserId);
            if (own && !isThrowInRange(own.worldX, own.worldY, tileToWorld(tileX), tileToWorld(tileY), trajectory))
            {
                setRangeWarningAt(Date.now());
                return;
            }
            throwAtLocation(tileToWorld(tileX), tileToWorld(tileY), trajectory);
            return;
        }

        const tile = mapRows[tileY]?.charAt(tileX);
        if (tile === 'x' || tile === 'X') return;
        walkTo(tileToWorld(tileX), tileToWorld(tileY));
    }, [editing, applyEditClick, mapHeight, mapRows, mapWidth, screenToTile, simulation, ownUserId, throwAtLocation, walkTo]);

    const editorBrushActive = !!paletteSel && paletteSel !== 'edit' && paletteSel !== 'walk';

    const updateEditorHover = useCallback((event: { clientX: number; clientY: number }) =>
    {
        const { tileX, tileY } = screenToTile(event);
        const inBounds = tileX >= 0 && tileY >= 0 && tileX < mapWidth && tileY < mapHeight;
        setHoverTile(previous =>
            (previous && previous.x === tileX && previous.y === tileY) || (!previous && !inBounds)
                ? previous
                : (inBounds ? { x: tileX, y: tileY } : null));
        return inBounds ? { x: tileX, y: tileY } : null;
    }, [mapHeight, mapWidth, screenToTile]);

    const onEditorPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) =>
    {
        if (!editing || !editorBrushActive || event.button !== 0) return;
        const tile = updateEditorHover(event);
        if (!tile) return;

        const mode = event.shiftKey ? 'area' : (event.ctrlKey || event.metaKey) ? 'paint' : null;
        if (!mode) return;

        event.preventDefault();
        suppressEditorClickRef.current = true;
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}

        const gesture: EditorGesture = {
            mode,
            start: tile,
            end: tile,
        };
        editorGestureRef.current = gesture;

        if (mode === 'area')
        {
            setEditorArea({ start: tile, end: tile });
            return;
        }

        placeEditItems([tile]);
    }, [editing, editorBrushActive, placeEditItems, updateEditorHover]);

    const onEditorPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) =>
    {
        if (!editing) return;
        const tile = updateEditorHover(event);
        const gesture = editorGestureRef.current;
        if (!gesture || !tile || (gesture.end.x === tile.x && gesture.end.y === tile.y)) return;

        gesture.end = tile;
        if (gesture.mode === 'area')
        {
            setEditorArea({ start: gesture.start, end: tile });
            return;
        }

        placeEditItems([tile]);
    }, [editing, placeEditItems, updateEditorHover]);

    const onEditorPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) =>
    {
        const gesture = editorGestureRef.current;
        if (!gesture) return;

        editorGestureRef.current = null;
        setEditorArea(null);
        try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}

        if (gesture.mode === 'area')
        {
            const tiles = getSnowWarEditorArea(gesture.start, gesture.end);
            placeEditItems(tiles);
        }

        window.setTimeout(() => { suppressEditorClickRef.current = false; }, 0);
    }, [placeEditItems]);

    const onEditorPointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) =>
    {
        editorGestureRef.current = null;
        suppressEditorClickRef.current = false;
        setEditorArea(null);
        try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
    }, []);

    const fireRayGun = useCallback((event: MouseEvent<HTMLButtonElement>, x: number, y: number, rotation: number, width: number, length: number) =>
    {
        event.stopPropagation();
        const direction = ((rotation % 8) + 8) % 8;
        const horizontalSize = (direction === 2 || direction === 6) ? length : width;
        const verticalSize = (direction === 2 || direction === 6) ? width : length;
        walkTo(
            tileToWorld(x + (direction === 6 ? horizontalSize : direction === 2 ? -1 : 0)),
            tileToWorld(y + (direction === 0 ? verticalSize : direction === 4 ? -1 : 0)));
    }, [walkTo]);

    const rotateSelected = useCallback(() =>
        setEditItems(items => items.map((item, i) => (i === selectedIndex ? { ...item, rotation: (item.rotation + 2) % 8 } : item))),
    [selectedIndex]);

    // Multistate furni: step the state index up/down, clamped to the furni's
    // real range - [0, interaction_modes_count - 1] from items_base, sent by the
    // server. When the count is unknown (a freshly-placed furni type not yet in
    // the arena), leave the high end open until the arena is saved and reloaded.
    const cycleState = useCallback((delta: number) =>
        setEditItems(items => items.map((item, i) =>
        {
            if (i !== selectedIndex) return item;
            const count = item.stateCount ?? stateCountByName.get(item.name);
            const max = count && count > 0 ? count - 1 : Number.MAX_SAFE_INTEGER;
            return { ...item, state: Math.min(max, Math.max(0, (item.state ?? 0) + delta)) };
        })),
    [selectedIndex, stateCountByName]);

    const deleteSelected = useCallback(() =>
    {
        setEditItems(items => items.filter((_, i) => i !== selectedIndex));
        setSelectedIndex(-1);
    }, [selectedIndex]);

    // The arena backdrop is a single always-full-screen ad image, edited via
    // the dedicated background control rather than by selecting a tile.
    const setBackdropUrl = useCallback((url: string) =>
        setEditItems(items =>
        {
            const trimmed = url;
            const index = items.findIndex(item => item.imageUrl);
            if (!trimmed) return items.filter(item => !item.imageUrl);
            if (index >= 0) return items.map((item, i) => (i === index ? { ...item, imageUrl: trimmed } : item));
            return [...items, { name: 'ads_background', x: 0, y: 0, rotation: 0, imageUrl: trimmed, offsetZ: 0, state: 0 }];
        }), []);

    const setBackdropOffsetZ = useCallback((offsetZ: number) =>
        setEditItems(items => items.map(item => (item.imageUrl ? { ...item, offsetZ } : item))), []);

    const clearAllItems = useCallback(() =>
    {
        setEditItems([]);
        setSelectedIndex(-1);
    }, []);

    const saveEditor = useCallback(() =>
    {
        if (!levelData) return;
        // Spawns are auto-generated server-side, so none are sent from the editor.
        saveArena(levelData.mapId, editItems, [], editHeightmap, editorArenaName);
        setSavedAt(Date.now());
    }, [levelData, editItems, editHeightmap, editorArenaName, saveArena]);

    const ownAvatar = simulation.getAvatarByUserId(ownUserId);
    const alpha = simulation.interpolationAlpha;

    // AIR supports arrows and the isometric QWE/AD/ZXC cluster. While a key is
    // held it sends a target two tiles away once per 300 ms game turn.
    useEffect(() =>
    {
        if (editing || phase !== 'playing') return;

        const keys = new Set<string>();
        let interval: ReturnType<typeof setInterval> | null = null;
        const movementCodes = new Set([
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'KeyQ', 'KeyW', 'KeyE', 'KeyA', 'KeyD', 'KeyZ', 'KeyX', 'KeyC',
        ]);
        const isEditableTarget = (target: EventTarget | null): boolean =>
        {
            const element = target as HTMLElement | null;
            if (!element) return false;
            return element.isContentEditable || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT';
        };
        const move = () =>
        {
            const direction = getKeyboardDirection(keys);
            const avatar = simulation.getAvatarByUserId(ownUserId);
            if (!direction || !avatar) return;
            const targetX = Math.max(0, Math.min(mapWidth - 1, avatar.tileX + (direction.x * 2)));
            const targetY = Math.max(0, Math.min(mapHeight - 1, avatar.tileY + (direction.y * 2)));
            walkTo(tileToWorld(targetX), tileToWorld(targetY));
        };
        const stopTimerIfIdle = () =>
        {
            if (getKeyboardDirection(keys) || interval === null) return;
            clearInterval(interval);
            interval = null;
        };
        const onKeyDown = (event: KeyboardEvent) =>
        {
            if (!movementCodes.has(event.code) || isEditableTarget(event.target)) return;
            event.preventDefault();
            const wasMoving = getKeyboardDirection(keys) !== null;
            keys.add(event.code);
            if (!wasMoving) move();
            if (interval === null) interval = setInterval(move, 300);
        };
        const onKeyUp = (event: KeyboardEvent) =>
        {
            if (!movementCodes.has(event.code)) return;
            keys.delete(event.code);
            stopTimerIfIdle();
        };
        const onBlur = () =>
        {
            keys.clear();
            stopTimerIfIdle();
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        return () =>
        {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
            if (interval !== null) clearInterval(interval);
        };
    }, [editing, mapHeight, mapWidth, ownUserId, phase, simulation, walkTo]);

    // Track newly launched balls for the throw pose and drain authoritative
    // impact positions. The server sends the post-movement x/y/z, avoiding the
    // old one-subturn-early splash and nearest-prop guessing.
    useEffect(() =>
    {
        const prev = ballScreenRef.current;
        const next = new Map<number, { x: number; y: number; tx: number; ty: number }>();
        for (const ball of simulation.snowballs.values())
        {
            const lx = ball.prevLocH + (ball.locH - ball.prevLocH) * alpha;
            const ly = ball.prevLocV + (ball.locV - ball.prevLocV) * alpha;
            const { x, y } = worldToScreen(lx, ly);
            next.set(ball.objectId, { x, y, tx: Math.round(lx / TILE_SIZE_WORLD), ty: Math.round(ly / TILE_SIZE_WORLD) });

            // A newly-appeared ball means its thrower just threw - flash that
            // avatar into the SnowWarThrow pose for a short window.
            if (!prev.has(ball.objectId) && ball.throwerObjectId)
            {
                throwPoseUntilRef.current.set(ball.throwerObjectId, frameNow + SNOWWAR_THROW_POSE_MS);
            }
        }

        ballScreenRef.current = next;

        const impacts = simulation.drainImpacts();
        if (impacts.length)
        {
            setSplashes(list => [...list, ...impacts.map(impact =>
            {
                const point = worldToScreen(impact.worldX, impact.worldY);
                return {
                    id: impact.id,
                    x: point.x,
                    y: point.y - snowballRise(Math.max(0, impact.height)),
                };
            })]);
        }
    }, [frameNow, alpha, worldToScreen, simulation]);

    // First room-ad furni's image is the arena backdrop. offsetZ doubles as an
    // overlay flag: 0 = drawn behind the arena (full-screen), 1 = overlaid on
    // top of the floor tiles (hiding them, but they stay walkable) while still
    // sitting under the furni and avatars. Edit-aware so it previews live.
    const arenaBackdrop = displayItems.find(item => item.imageUrl) ?? null;
    const officialArcticBackdrop = !!arenaBackdrop?.imageUrl.includes('snst_bg_1_a_big');
    const backdropOverlay = !!(arenaBackdrop && !officialArcticBackdrop && (arenaBackdrop.offsetZ ?? 0) > 0);
    const selectedItem = (editing && selectedIndex >= 0 && editItems[selectedIndex]) ? editItems[selectedIndex] : null;
    const placingFurni = (editing && paletteSel && paletteSel !== 'edit' && paletteSel !== 'walk')
        ? GetSessionDataManager()?.getFloorItemDataByName?.(paletteSel) : null;
    const selectedFurni = selectedItem ? GetSessionDataManager()?.getFloorItemDataByName?.(selectedItem.name) : null;
    const backdropItem = editing ? (editItems.find(item => item.imageUrl) ?? null) : null;

    // Interaction-mode count for the selected furni (items_base value from the
    // server). Known => the stepper caps at count-1 and single-state furni hide
    // it entirely; unknown => leave the stepper open (freshly-placed new type).
    const selectedStateCount = selectedItem ? (selectedItem.stateCount ?? stateCountByName.get(selectedItem.name)) : undefined;
    const selectedStateMax = (selectedStateCount && selectedStateCount > 0) ? selectedStateCount - 1 : Number.MAX_SAFE_INTEGER;

    // Placement ghost: the furni being placed (palette pick) or the selected
    // furni being moved, previewed at the hovered tile at 80% opacity.
    const ghostFurni = placingFurni ?? (selectedItem ? selectedFurni : null);
    const ghostRotation = placingFurni ? 0 : (selectedItem?.rotation ?? 0);
    // A freshly-placed furni starts at state 0; a moving furni keeps its state.
    const ghostState = placingFurni ? 0 : (selectedItem?.state ?? 0);

    // "Actively moving": Select/Move mode (paletteSel === null) with a piece
    // selected and the cursor over a tile. Only then do we hide the piece at its
    // old spot, float the move ghost, and suppress the selection box. Edit mode
    // (paletteSel === 'edit') never moves, so it keeps the piece + selection box.
    const movingSelected = editing && paletteSel === null && !!selectedItem && !!hoverTile;

    const editorAreaOutline = useMemo(() =>
    {
        if (!editorArea) return null;
        const minX = Math.min(editorArea.start.x, editorArea.end.x);
        const maxX = Math.max(editorArea.start.x, editorArea.end.x);
        const minY = Math.min(editorArea.start.y, editorArea.end.y);
        const maxY = Math.max(editorArea.start.y, editorArea.end.y);
        const top = toScreen(minX, minY);
        const right = toScreen(maxX, minY);
        const bottom = toScreen(maxX, maxY);
        const left = toScreen(minX, maxY);
        const corners = [
            top,
            { x: right.x + TILE_HALF_W, y: right.y + TILE_HALF_H },
            { x: bottom.x, y: bottom.y + (TILE_HALF_H * 2) },
            { x: left.x - TILE_HALF_W, y: left.y + TILE_HALF_H },
        ];
        const leftPx = Math.min(...corners.map(corner => corner.x));
        const topPx = Math.min(...corners.map(corner => corner.y));
        return {
            left: leftPx,
            top: topPx,
            width: Math.max(...corners.map(corner => corner.x)) - leftPx,
            height: Math.max(...corners.map(corner => corner.y)) - topPx,
            points: corners.map(corner => `${corner.x - leftPx},${corner.y - topPx}`).join(' '),
        };
    }, [editorArea, toScreen]);

    // Editor preview walker: current interpolated tile position + facing, derived
    // purely from the walk plan + the RAF frameNow clock (recomputed each frame).
    const editorWalker = (() =>
    {
        if (!editing) return null;
        const plan = editorWalkRef.current;
        if (!plan || !plan.path.length) return null;
        if (plan.path.length === 1) return { x: plan.path[0].x, y: plan.path[0].y, dir: plan.endDir, walking: false };
        const total = plan.path.length - 1;
        const stepFloat = Math.max(0, frameNow - plan.startMs) / SNOWWAR_EDITOR_STEP_MS;
        if (stepFloat >= total)
        {
            const last = plan.path[total];
            return { x: last.x, y: last.y, dir: plan.endDir, walking: false };
        }
        const seg = Math.floor(stepFloat);
        const t = stepFloat - seg;
        const a = plan.path[seg];
        const b = plan.path[seg + 1];
        return { x: a.x + ((b.x - a.x) * t), y: a.y + ((b.y - a.y) * t), dir: tileDirection(b.x - a.x, b.y - a.y), walking: true };
    })();
    const ownPlayer = levelData?.players?.find(player => player.userId === ownUserId) ?? null;
    const editorWalkerFigure = ownPlayer?.figure ?? GetSessionDataManager()?.figure ?? '';
    const editorWalkerGender = ownPlayer?.gender ?? 'M';

    // Fixed 1920x1080 design stage: the background fills it and the floor sits
    // centred on it. On screens >= the stage the whole stage is centred in the
    // viewport; on smaller screens the viewport is capped to the screen and the
    // camera follows the own avatar (like a normal room), so background + tiles
    // pan together. The stage grows past the base only if a map is larger.
    const floorW = canvasWidth * zoom;
    const floorH = canvasHeight * zoom;
    const stageW = Math.max(DESIGN_W, floorW);
    const stageH = Math.max(DESIGN_H, floorH);
    const floorOffsetX = (stageW - floorW) / 2;
    const floorOffsetY = (stageH - floorH) / 2;

    // Camera as a GPU translate on the stage. Instead of hard-locking the
    // avatar to centre (which scrolls the background on every step and makes
    // the smallest jitter obvious), the camera holds still while the avatar
    // roams a central dead zone and only eases back to centre once the avatar
    // pushes into the outer CAMERA_DEADZONE band near a screen edge.
    let cameraX = (viewportSize.width - stageW) / 2;
    let cameraY = (viewportSize.height - stageH) / 2;

    if (ownAvatar && viewportSize.width > 0)
    {
        const followX = ownAvatar.prevWorldX + (ownAvatar.worldX - ownAvatar.prevWorldX) * alpha;
        const followY = ownAvatar.prevWorldY + (ownAvatar.worldY - ownAvatar.prevWorldY) * alpha;
        const { x, y } = worldToScreen(followX, followY);
        const avatarStageX = floorOffsetX + (x * zoom);
        const avatarStageY = floorOffsetY + (y * zoom);

        const followsX = stageW > viewportSize.width;
        const followsY = stageH > viewportSize.height;
        const centeredX = Math.min(0, Math.max(viewportSize.width - stageW, (viewportSize.width / 2) - avatarStageX));
        const centeredY = Math.min(0, Math.max(viewportSize.height - stageH, (viewportSize.height / 2) - avatarStageY));

        const cam = cameraRef.current;
        if (!cam.initialized)
        {
            cam.x = followsX ? centeredX : cameraX;
            cam.y = followsY ? centeredY : cameraY;
            cam.initialized = true;
        }

        // Advance the dead-zone camera at most once per animation frame; the
        // frame gate also makes a Strict-Mode double render idempotent.
        if (cam.frame !== frameNow)
        {
            cam.frame = frameNow;

            if (followsX)
            {
                const screenX = avatarStageX + cam.x;
                if (!cam.recenterX && (screenX < viewportSize.width * CAMERA_DEADZONE || screenX > viewportSize.width * (1 - CAMERA_DEADZONE)))
                    cam.recenterX = true;
                if (cam.recenterX)
                {
                    cam.x += (centeredX - cam.x) * CAMERA_EASE;
                    if (Math.abs(centeredX - cam.x) < 0.5) { cam.x = centeredX; cam.recenterX = false; }
                }
                cam.x = Math.min(0, Math.max(viewportSize.width - stageW, cam.x));
            }
            else cam.x = cameraX;

            if (followsY)
            {
                const screenY = avatarStageY + cam.y;
                if (!cam.recenterY && (screenY < viewportSize.height * CAMERA_DEADZONE || screenY > viewportSize.height * (1 - CAMERA_DEADZONE)))
                    cam.recenterY = true;
                if (cam.recenterY)
                {
                    cam.y += (centeredY - cam.y) * CAMERA_EASE;
                    if (Math.abs(centeredY - cam.y) < 0.5) { cam.y = centeredY; cam.recenterY = false; }
                }
                cam.y = Math.min(0, Math.max(viewportSize.height - stageH, cam.y));
            }
            else cam.y = cameraY;
        }

        cameraX = cam.x;
        cameraY = cam.y;
    }
    else
    {
        cameraRef.current.initialized = false;
    }

    const teamScores = useMemo(() =>
    {
        const scores = new Map<number, number>();
        for (const avatar of simulation.avatars.values())
        {
            scores.set(avatar.teamId, (scores.get(avatar.teamId) ?? 0) + avatar.score);
        }
        return [...scores.entries()].sort((a, b) => a[0] - b[0]);
    }, [simulation, simulation.subturnCount]);

    const formatClock = (totalSeconds: number) =>
    {
        const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
        const seconds = Math.max(0, totalSeconds) % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
    const redScore = teamScores.find(([teamId]) => teamId === 0)?.[1] ?? 0;
    const blueScore = teamScores.find(([teamId]) => teamId === 1)?.[1] ?? 0;
    const healthFrame = Math.max(0, Math.min(5, ownAvatar?.health ?? 0));
    const visibleChatMessages = chatMessages
        .filter(message => (frameNow - message.receivedAt) < 10000)
        .slice(-8)
        .flatMap(message =>
        {
            const avatar = simulation.avatars.get(message.objectId);

            return avatar ? [{ avatar, message, stackIndex: 0 }] : [];
        });
    const chatStackCounts = new Map<number, number>();

    for (let index = visibleChatMessages.length - 1; index >= 0; index--)
    {
        const entry = visibleChatMessages[index];
        entry.stackIndex = chatStackCounts.get(entry.avatar.teamId) ?? 0;
        chatStackCounts.set(entry.avatar.teamId, entry.stackIndex + 1);
    }

    if (!levelData)
    {
        return (
            <div className="snowwar-arena snowwar-arena--loading">
                <div className="snowwar-banner">{localizeWithFallback('snowwar.loading', 'Loading arena...')}</div>
            </div>
        );
    }

    return (
        <div className="snowwar-arena">
            {editing ? (
                <div className="snowwar-hud snowwar-hud--editor">
                    <div className="snowwar-hud__clock">{formatClock(secondsLeft)}</div>
                    <div className="snowwar-hud__actions">
                        <input
                            type="text"
                            className="snowwar-hud__arena-name"
                            value={editorArenaName}
                            maxLength={64}
                            aria-label={localizeWithFallback('snowwar.editor.name', 'Arena name')}
                            onChange={event => setEditorArenaName(event.target.value)}
                        />
                        <button type="button" className="snowwar-button" onClick={() => saveEditor()}>
                            {localizeWithFallback('snowwar.editor.publish', 'Publish arena')}
                        </button>
                        <button type="button" className="snowwar-button snowwar-button--danger" onClick={() => stopEditing()}>
                            {localizeWithFallback('snowwar.editor.exit', 'Exit editor')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="snowwar-official-hud">
                    <button
                        type="button"
                        className="snowwar-official-hud__quit"
                        onClick={() => exitGame()}
                    >
                        {localizeWithFallback('snowwar.leave', 'Quit Menu')}
                    </button>

                    {ownAvatar && (
                        <>
                            <div
                                className="snowwar-official-hud__ammo"
                                title={localizeWithFallback('snowwar.hud.snowballs', 'Snowball inventory')}
                            >
                                <img
                                    alt=""
                                    className="snowwar-official-hud__ammo-bg"
                                    draggable={false}
                                    src={getOfficialSnowWarAssetUrl('ui_ball_indicator_bg.png')}
                                />
                                {Array.from({ length: INITIAL_SNOWBALL_COUNT }, (_, index) => (
                                    <img
                                        key={index}
                                        alt=""
                                        className="snowwar-official-hud__ammo-ball"
                                        draggable={false}
                                        src={getOfficialSnowWarAssetUrl('ui_ball.png')}
                                        style={{ top: 10 + (index * 37), visibility: index < ownAvatar.snowballCount ? 'visible' : 'hidden' }}
                                    />
                                ))}
                                <button
                                    type="button"
                                    className="snowwar-official-hud__make-ball"
                                    disabled={phase !== 'playing' || ownAvatar.snowballCount >= INITIAL_SNOWBALL_COUNT}
                                    title={localizeWithFallback('snowwar.make_snowball', 'Scoop up a snowball')}
                                    onClick={() => createSnowball()}
                                />
                            </div>

                            <div
                                className="snowwar-official-hud__personal"
                                title={localizeWithFallback('snowwar.hud.health', 'Energy and personal score')}
                            >
                                <img
                                    alt=""
                                    className="snowwar-official-hud__personal-bg"
                                    draggable={false}
                                    src={getOfficialSnowWarAssetUrl('ui_me_bg.png')}
                                />
                                <img
                                    alt=""
                                    className="snowwar-official-hud__health"
                                    draggable={false}
                                    src={getOfficialSnowWarAssetUrl(`ui_me_health_${healthFrame}.png`)}
                                />
                                <div className="snowwar-official-hud__head">
                                    <LayoutAvatarImageView
                                        compactHead
                                        compactHeadPadding={0}
                                        compactHeadSize={52}
                                        direction={2}
                                        figure={ownAvatar.figure}
                                        gender={ownAvatar.gender}
                                        headOnly
                                    />
                                </div>
                                <div className="snowwar-official-hud__personal-score">{ownAvatar.score}</div>
                            </div>
                        </>
                    )}

                    <div className="snowwar-official-hud__scores">
                        <img
                            alt=""
                            className="snowwar-official-hud__scores-bg"
                            draggable={false}
                            src={getOfficialSnowWarAssetUrl('ui_timer_and_points.png')}
                        />
                        <div className="snowwar-official-hud__score snowwar-official-hud__score--blue">{blueScore}</div>
                        <div className="snowwar-official-hud__score snowwar-official-hud__score--red">{redScore}</div>
                        <div className="snowwar-official-hud__timer">{formatClock(secondsLeft)}</div>
                        <div className="snowwar-official-hud__time-label">{localizeWithFallback('snowwar.hud.time_left', 'Time left')}</div>
                    </div>

                    {levelData.canEditRoom && (
                        <button type="button" className="snowwar-button snowwar-official-hud__edit" onClick={() => startEditing()}>
                            {localizeWithFallback('snowwar.editor.build_custom', 'Build Custom Arena')}
                        </button>
                    )}
                </div>
            )}

            {editing && (
                <div className="snowwar-editor">
                    <div className="snowwar-editor__title">
                        <span className="snowwar-editor__title-ball" />
                        {localizeWithFallback('snowwar.editor.title', 'SnowStorm Arena Workshop')}
                    </div>
                    <div className="snowwar-editor__hint">
                        {localizeWithFallback('snowwar.editor.hint', 'Pick a piece, floor tile, or hotel furni and build directly on the arena. Select / Move and Edit let you refine placed pieces; Walk tests the finished routes.')}
                    </div>
                    <div className="snowwar-editor__shortcuts">
                        <span><kbd>Ctrl / ⌘</kbd> + drag <b>Paint line</b></span>
                        <span><kbd>Shift</kbd> + drag <b>Fill area</b></span>
                    </div>
                    {/* Function controls (modes + tools), grouped and separated
                        from the furni palette below - these are actions, not furni. */}
                    <div className="snowwar-editor__tools snowwar-editor__tools--modes">
                        <button
                            type="button"
                            className={'snowwar-editor__chip' + (paletteSel === null ? ' snowwar-editor__chip--active' : '')}
                            onClick={() => setPaletteSel(null)}
                        >
                            {localizeWithFallback('snowwar.editor.select', 'Select / Move')}
                        </button>
                        <button
                            type="button"
                            className={'snowwar-editor__chip' + (paletteSel === 'edit' ? ' snowwar-editor__chip--active' : '')}
                            onClick={() => setPaletteSel('edit')}
                        >
                            {localizeWithFallback('snowwar.editor.edit', 'Edit')}
                        </button>
                        <button
                            type="button"
                            className={'snowwar-editor__chip' + (paletteSel === 'walk' ? ' snowwar-editor__chip--active' : '')}
                            onClick={() => { setPaletteSel('walk'); setSelectedIndex(-1); }}
                        >
                            {localizeWithFallback('snowwar.editor.walk', 'Walk')}
                        </button>
                        <button type="button" className="snowwar-button snowwar-button--danger" onClick={() => clearAllItems()}>
                            {localizeWithFallback('snowwar.editor.clear', 'Clear all furni')}
                        </button>
                    </div>
                    <div className="snowwar-editor__floor-plan">
                        <div className="snowwar-editor__floor-plan-heading">
                            <strong>{localizeWithFallback('snowwar.editor.floor_plan', 'Floor plan')}</strong>
                            <span>{walkableTileCount} {localizeWithFallback('snowwar.editor.walkable_tiles', 'walkable tiles')}</span>
                        </div>
                        <div className="snowwar-editor__hint">
                            {localizeWithFallback('snowwar.editor.floor_plan_hint', 'Open the full floor plan editor to shape the playable snowfield with its canvas, height tools, selection, undo and redo.')}
                        </div>
                        <div className="snowwar-editor__tools">
                            <button type="button" className="snowwar-button" onClick={() => setFloorplanEditorVisible(true)}>
                                {localizeWithFallback('snowwar.editor.floor_open', 'Edit floor plan')}
                            </button>
                        </div>
                    </div>
                    {EDITOR_PALETTE.length > 0 && (
                        <div className="snowwar-editor__palette">
                            {EDITOR_PALETTE.map(name => (
                                <button
                                    key={name}
                                    type="button"
                                    className={'snowwar-editor__chip' + (paletteSel === name ? ' snowwar-editor__chip--active' : '')}
                                    onClick={() => { setPaletteSel(prev => prev === name ? null : name); setSelectedIndex(-1); setHoverTile(null); }}
                                >
                                    {name.replace('block_', '').replace('obst_', '').replace('sw_', '')}
                                </button>
                            ))}
                        </div>
                    )}
                    <input
                        type="text"
                        className="snowwar-editor__search"
                        value={furniSearch}
                        placeholder={localizeWithFallback('snowwar.editor.furni_search', 'Search furniture to place...')}
                        onChange={event => setFurniSearch(event.target.value)}
                    />
                    {furniMatches.length > 0 && (
                        <div className="snowwar-editor__palette snowwar-editor__palette--furni">
                            {furniMatches.map(furni => (
                                <button
                                    key={furni.id}
                                    type="button"
                                    title={furni.className}
                                    className={'snowwar-editor__chip' + (paletteSel === furni.className ? ' snowwar-editor__chip--active' : '')}
                                    onClick={() => { setPaletteSel(prev => prev === furni.className ? null : furni.className); setSelectedIndex(-1); setHoverTile(null); }}
                                >
                                    {(furni.name && furni.name.trim()) || furni.className}
                                </button>
                            ))}
                        </div>
                    )}
                    {placingFurni && (
                        <div className="snowwar-editor__preview">
                            <span className="snowwar-editor__preview-label">{localizeWithFallback('snowwar.editor.placing', 'Placing')}:</span>
                            <LayoutFurniImageView direction={2} productClassId={placingFurni.id} productType="s" style={{ transform: 'scale(0.5)' }} />
                            <span>{(placingFurni.name && placingFurni.name.trim()) || paletteSel}</span>
                        </div>
                    )}
                    {selectedItem && (
                        <div className="snowwar-editor__selected">
                            <div className="snowwar-editor__preview">
                                {selectedFurni
                                    ? <LayoutFurniImageView direction={selectedItem.rotation} productClassId={selectedFurni.id} productType="s" state={selectedItem.state ?? 0} style={{ transform: 'scale(0.5)' }} />
                                    : <div className="snowwar-furni__fallback" />}
                                <span>{(selectedFurni?.name && selectedFurni.name.trim()) || selectedItem.name}</span>
                            </div>
                            <div className="snowwar-editor__tools">
                                <button type="button" className="snowwar-button" onClick={() => rotateSelected()}>
                                    {localizeWithFallback('snowwar.editor.rotate', 'Rotate')}
                                </button>
                                <button type="button" className="snowwar-button snowwar-button--danger" onClick={() => deleteSelected()}>
                                    {localizeWithFallback('snowwar.editor.delete', 'Delete')}
                                </button>
                            </div>
                            {!selectedItem.imageUrl && selectedStateMax > 0 && (
                                <div className="snowwar-editor__state">
                                    <span>{localizeWithFallback('snowwar.editor.state', 'State')}</span>
                                    <button
                                        type="button"
                                        className="snowwar-button snowwar-button--icon"
                                        disabled={(selectedItem.state ?? 0) <= 0}
                                        onClick={() => cycleState(-1)}>
                                        &#8722;
                                    </button>
                                    <span className="snowwar-editor__state-value">
                                        {(selectedItem.state ?? 0)}{selectedStateCount ? ` / ${selectedStateMax}` : ''}
                                    </span>
                                    <button
                                        type="button"
                                        className="snowwar-button snowwar-button--icon"
                                        disabled={(selectedItem.state ?? 0) >= selectedStateMax}
                                        onClick={() => cycleState(1)}>
                                        +
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="snowwar-editor__selected">
                        <div className="snowwar-editor__field snowwar-editor__field--stack">
                            <span>{localizeWithFallback('snowwar.editor.bg', 'Arena background (ads_bg)')}</span>
                            <input
                                type="text"
                                className="snowwar-editor__search"
                                value={backdropItem?.imageUrl ?? ''}
                                placeholder={localizeWithFallback('snowwar.editor.bg_url', 'Full-screen background image URL...')}
                                onChange={event => setBackdropUrl(event.target.value)}
                            />
                        </div>
                        {backdropItem && (
                            <label className="snowwar-editor__field">
                                {localizeWithFallback('snowwar.editor.overlay', 'Overlay floor tiles (hide tiles behind image)')}
                                <input
                                    type="checkbox"
                                    checked={(backdropItem.offsetZ ?? 0) > 0}
                                    onChange={event => setBackdropOffsetZ(event.target.checked ? 1 : 0)}
                                />
                            </label>
                        )}
                    </div>
                </div>
            )}
            {editing && floorplanEditorVisible && (
                <FloorplanEditorView
                    externalSession={{
                        tilemap: editHeightmap.join('\r'),
                        occupiedTiles: floorplanOccupiedTiles,
                        title: localizeWithFallback('snowwar.editor.floor_title', 'SnowStorm Floor Plan Editor'),
                        onClose: () => setFloorplanEditorVisible(false),
                        onSave: applyEditorFloorPlan,
                    }}
                />
            )}
            {(frameNow - savedAt) < 2500 && savedAt > 0 && (
                <div className="snowwar-banner snowwar-banner--saved">
                    {localizeWithFallback('snowwar.editor.published', 'Custom arena published to the game pool!')}
                </div>
            )}

            {phase === 'preparing' && !editing && (
                <div className="snowwar-banner snowwar-banner--countdown">
                    {localizeWithFallback('snowwar.get_ready', 'Get ready!')} {preparingSeconds > 0 ? preparingSeconds : ''}
                </div>
            )}
            {(frameNow - rangeWarningAt) < 2000 && rangeWarningAt > 0 && (
                <div className="snowwar-banner snowwar-banner--warning">
                    {localizeWithFallback('snowwar.throw.too_far', 'Too far away! Use a long throw or move closer.')}
                </div>
            )}
            {phase === 'ending' && (
                <div className="snowwar-banner snowwar-banner--countdown">
                    {localizeWithFallback('snowwar.time_up', 'Time is up!')}
                </div>
            )}

            <div className="snowwar-viewport-wrap">
            <div
                ref={viewportRef}
                className="snowwar-viewport"
                onClick={onArenaClick}
                onContextMenu={onArenaClick}
                onPointerDown={editing ? onEditorPointerDown : undefined}
                onPointerMove={editing ? onEditorPointerMove : undefined}
                onPointerUp={editing ? onEditorPointerUp : undefined}
                onPointerCancel={editing ? onEditorPointerCancel : undefined}
                onMouseLeave={editing ? () => setHoverTile(null) : undefined}
            >
                <div
                    className="snowwar-world"
                    // Snap the camera translate to whole pixels. The easing keeps
                    // running in floats (cam.x/cam.y), but a fractional translate here
                    // makes the browser rasterise the whole arena subtree at a sub-pixel
                    // offset, so every scaled sprite (furni at 0.375, avatars) samples
                    // between pixels and looks blurry / shimmers while the camera moves.
                    style={{ width: stageW, height: stageH, transform: `translate(${Math.round(cameraX)}px, ${Math.round(cameraY)}px)`, transformOrigin: '0 0' }}
                >
                    {officialArcticBackdrop && (
                        <img
                            alt=""
                            className="snowwar-official-arctic-backdrop"
                            draggable={false}
                            src={getOfficialSnowWarAssetUrl('snst_bg_1_a_big.png')}
                        />
                    )}
                    {arenaBackdrop && !officialArcticBackdrop && !backdropOverlay && (
                        <img
                            alt=""
                            className="snowwar-arena-bg"
                            draggable={false}
                            src={arenaBackdrop.imageUrl}
                        />
                    )}
                    <div
                        className="snowwar-floor-layer"
                        style={{ left: floorOffsetX, top: floorOffsetY, width: canvasWidth, height: canvasHeight, transform: `scale(${zoom})`, transformOrigin: '0 0' }}
                    >
                        <canvas
                            ref={canvasRef}
                            width={canvasWidth}
                            height={canvasHeight}
                            className={`snowwar-floor${officialArcticBackdrop ? ' snowwar-floor--official-arctic' : ''}`}
                        />

                    {arenaBackdrop && !officialArcticBackdrop && backdropOverlay && (
                        <img
                            alt=""
                            className="snowwar-arena-bg-overlay"
                            draggable={false}
                            src={arenaBackdrop.imageUrl}
                            style={{ width: canvasWidth, height: canvasHeight }}
                        />
                    )}

                    {/* Classic props, above the overlay so they aren't hidden. */}
                    <canvas ref={propsCanvasRef} width={canvasWidth} height={canvasHeight} className="snowwar-floor snowwar-floor--props" />

                    {editorAreaOutline && (
                        <svg
                            aria-hidden="true"
                            className="snowwar-edit-area"
                            width={editorAreaOutline.width}
                            height={editorAreaOutline.height}
                            style={{ left: editorAreaOutline.left, top: editorAreaOutline.top }}
                        >
                            <polygon points={editorAreaOutline.points} />
                        </svg>
                    )}

                    {displayItems
                        .filter(item => !isClassicItem(item.name) && !item.imageUrl)
                        // While a selected furni is being moved (its ghost is
                        // following the cursor), hide its copy at the old tile so
                        // it isn't shown twice.
                        .filter(item => !(movingSelected && item === selectedItem))
                        .map((item, index) =>
                    {
                        // A multi-tile furni occupies width x length tiles from its
                        // origin (+x/+y, swapped for the 90/270 rotations) - the same
                        // footprint the server blocks. Draw the sprite over the
                        // footprint CENTRE (a 1x1 prop is unchanged) and depth-sort by
                        // the FRONT (nearest-camera) tile, so a 3x3 prop sits on and
                        // occludes its whole footprint instead of drawing over an
                        // avatar standing beside or in front of it.
                        const swap = item.rotation === 2 || item.rotation === 6;
                        const effW = Math.max(1, (swap ? item.length : item.width) ?? 1);
                        const effL = Math.max(1, (swap ? item.width : item.length) ?? 1);
                        // Ground the furni at the FRONT (nearest-camera) corner of its
                        // footprint and anchor the image by its BOTTOM-CENTRE there, so
                        // its base rests on the floor (size-independent; a fixed % lift
                        // floated tall props). Depth, however, sorts by the ORIGIN (back)
                        // tile - the same rule Octane uses for a real floor furni - so an
                        // avatar on the near sides (left/front) draws in front of the
                        // furni and only one standing behind it is covered.
                        const front = toScreen(item.x + effW - 1, item.y + effL - 1);
                        // Depth anchor = origin tile CENTRE (+ TILE_HALF_H), matching how
                        // avatars anchor (worldToScreen is tile-centre). Without the
                        // half-tile offset the furni sorted half a tile behind where it
                        // should, which tipped the overlay the wrong way for an avatar
                        // standing right at a corner.
                        // AIR stores furni altitude in 1600 world units per room
                        // floor. Convert that to one rendered tile-height so the
                        // stacked Arctic Island snow blocks keep their original
                        // elevation instead of collapsing onto each other.
                        const altitudePx = Math.max(0, item.offsetZ ?? 0) / 1600 * (TILE_HALF_H * 2);
                        const originY = toScreen(item.x, item.y).y + TILE_HALF_H - altitudePx;

                        // A walkable furni (walkableHeight 0 - a rug/floor tile you
                        // stand ON) is flat on the ground and must NEVER occlude an
                        // avatar. Depth-sorting the whole sprite by one tile lets its
                        // front edge out-sort an avatar standing on it, so put flat
                        // furni in a low band (above the floor + overlay, below the
                        // machines at 90 and the avatars/solid furni at 100+). Solid
                        // furni keep the shared depth band so they occlude correctly.
                        const furniData = GetSessionDataManager()?.getFloorItemDataByName?.(item.name);
                        // Flat = a walkable floor furni (rug / water / tile you stand
                        // ON). Prefer the server's walkableHeight; for a freshly-placed
                        // editor furni that doesn't carry it yet, fall back to the
                        // furnidata "can stand on" flag so it's still drawn below the
                        // avatar.
                        const flat = item.walkableHeight != null
                            ? item.walkableHeight === 0
                            : !!(furniData?.canStandOn || furniData?.canLayOn);
                        const zIndex = flat
                            ? 3 + Math.min(80, Math.max(0, Math.round(originY / 8)))
                            : 100 + Math.round(originY);
                        const tree = simulation.trees.get(`${item.x},${item.y}`);
                        const pile = simulation.piles.get(`${item.x},${item.y}`);
                        const state = tree
                            ? Math.min(tree.maximumHits - 1, tree.hits)
                            : pile
                                ? pile.maxSnowballs - pile.snowballCount
                                : (item.state ?? 0);

                        return (
                            <div
                                key={`furni-${index}`}
                                className="snowwar-furni"
                                data-snowwar-item={item.name}
                                data-snowwar-x={item.x}
                                data-snowwar-y={item.y}
                                data-snowwar-count={pile?.snowballCount}
                                style={{ left: front.x, top: front.y + (TILE_HALF_H * 2) - altitudePx, zIndex }}
                                title={pile ? localizeWithFallback('snowwar.pile.hint', `${pile.snowballCount} snowballs left`) : undefined}
                                onClick={pile ? event =>
                                {
                                    event.stopPropagation();
                                    const candidates = [
                                        { x: item.x, y: item.y - 1 },
                                        { x: item.x + 1, y: item.y },
                                        { x: item.x, y: item.y + 1 },
                                        { x: item.x - 1, y: item.y },
                                    ].filter(candidate =>
                                    {
                                        const tile = mapRows[candidate.y]?.charAt(candidate.x);
                                        if (!tile || tile === 'x' || tile === 'X') return false;
                                        if (levelData.machines.some(machine =>
                                            candidate.y === machine.y && candidate.x >= machine.x && candidate.x <= machine.x + 2)) return false;
                                        return !displayItems.some(other =>
                                        {
                                            if (other === item || (other.walkableHeight ?? 0) <= 0) return false;
                                            const rotated = other.rotation === 2 || other.rotation === 6;
                                            const width = Math.max(1, (rotated ? other.length : other.width) ?? 1);
                                            const length = Math.max(1, (rotated ? other.width : other.length) ?? 1);
                                            return candidate.x >= other.x && candidate.x < other.x + width
                                                && candidate.y >= other.y && candidate.y < other.y + length;
                                        });
                                    });
                                    candidates.sort((a, b) =>
                                        (Math.abs(a.x - (ownAvatar?.tileX ?? a.x)) + Math.abs(a.y - (ownAvatar?.tileY ?? a.y)))
                                        - (Math.abs(b.x - (ownAvatar?.tileX ?? b.x)) + Math.abs(b.y - (ownAvatar?.tileY ?? b.y))));
                                    if (candidates[0]) walkTo(tileToWorld(candidates[0].x), tileToWorld(candidates[0].y));
                                } : undefined}
                            >
                                {item.name === 'ads_igorraygun' && !editing && (
                                    <button
                                        type="button"
                                        className="snowwar-raygun-hitbox"
                                        aria-label={localizeWithFallback('snowwar.raygun.use', 'Use Ray Gun')}
                                        title={localizeWithFallback('snowwar.raygun.use', 'Use Ray Gun')}
                                        onClick={event => fireRayGun(event, item.x, item.y, item.rotation, item.width ?? 1, item.length ?? 1)}
                                    />
                                )}
                                {item.name === 'snst_ballpile'
                                    ? furniData
                                        ? <LayoutFurniImageView
                                            direction={item.rotation}
                                            productClassId={furniData.id}
                                            productType="s"
                                            state={state}
                                            style={{ position: 'absolute', transformOrigin: 'center bottom', transform: `translate(-50%, -100%) scale(${SNOWWAR_GAME_SPRITE_SCALE})` }}
                                        />
                                        : <img
                                            alt=""
                                            className="snowwar-official-ballpile"
                                            draggable={false}
                                            src={snowballPileImage}
                                            style={{ position: 'absolute', width: 23, height: 18, maxWidth: 'none', transformOrigin: 'center bottom', transform: `translate(-50%, -100%) scale(${SNOWWAR_GAME_SPRITE_SCALE})` }}
                                        />
                                    : furniData
                                    ? <LayoutFurniImageView
                                        direction={item.rotation}
                                        productClassId={furniData.id}
                                        productType="s"
                                        state={state}
                                        style={{ position: 'absolute', transformOrigin: 'center bottom', transform: `translate(-50%, -100%) scale(${SNOWWAR_FURNI_SCALE})` }}
                                    />
                                    : <div className="snowwar-furni__fallback" />}
                            </div>
                        );
                    })}

                    {editing && ghostFurni && hoverTile && (placingFurni || movingSelected) && (() =>
                    {
                        const swap = ghostRotation === 2 || ghostRotation === 6;
                        const effW = Math.max(1, (swap ? ghostFurni.tileSizeY : ghostFurni.tileSizeX) || 1);
                        const effL = Math.max(1, (swap ? ghostFurni.tileSizeX : ghostFurni.tileSizeY) || 1);
                        const front = toScreen(hoverTile.x + effW - 1, hoverTile.y + effL - 1);
                        const originY = toScreen(hoverTile.x, hoverTile.y).y + TILE_HALF_H;
                        return (
                            <div
                                className="snowwar-furni snowwar-furni--ghost"
                                style={{ left: front.x, top: front.y + (TILE_HALF_H * 2), zIndex: 100 + Math.round(originY), opacity: 0.8, pointerEvents: 'none' }}
                            >
                                <LayoutFurniImageView
                                    direction={ghostRotation}
                                    productClassId={ghostFurni.id}
                                    productType="s"
                                    state={ghostState}
                                    style={{ position: 'absolute', transformOrigin: 'center bottom', transform: `translate(-50%, -100%) scale(${SNOWWAR_FURNI_SCALE})` }}
                                />
                            </div>
                        );
                    })()}

                    {/* Tall classic props (trees / snowman / fences / blocks) as
                        per-tile sprites, depth-sorted with the avatars so one
                        standing behind a prop is occluded, like hotel furni. */}
                    {displayItems
                        .filter(item => isClassicItem(item.name) && !isFlatFloorProp(item.name) && !item.name.startsWith('snowball_machine'))
                        .map((item, index) =>
                        {
                            const { x: screenX, y: screenY } = toScreen(item.x, item.y);
                            return (
                                <div
                                    key={`classic-${index}`}
                                    className="snowwar-classic-prop"
                                    data-snowwar-item={item.name}
                                    data-snowwar-x={item.x}
                                    data-snowwar-y={item.y}
                                    style={{ left: screenX - (PROP_BOX_W / 2), top: screenY - PROP_ANCHOR_Y, zIndex: 100 + Math.round(screenY + TILE_HALF_H) }}
                                >
                                    <ClassicPropSprite name={item.name} rotation={item.rotation} />
                                </div>
                            );
                        })}

                    {editing && paletteSel && isClassicItem(paletteSel) && !isFlatFloorProp(paletteSel) && !paletteSel.startsWith('snowball_machine') && hoverTile && (() =>
                    {
                        const { x: screenX, y: screenY } = toScreen(hoverTile.x, hoverTile.y);
                        return (
                            <div
                                className="snowwar-classic-prop"
                                style={{ left: screenX - (PROP_BOX_W / 2), top: screenY - PROP_ANCHOR_Y, zIndex: 100 + Math.round(screenY + TILE_HALF_H) }}
                            >
                                <ClassicPropSprite name={paletteSel} rotation={0} opacity={0.55} />
                            </div>
                        );
                    })()}

                    {!editing && levelData.machines.map(machine =>
                    {
                        const state = simulation.machines.get(machine.objectId);
                        const { x, y } = toScreen(machine.x, machine.y);
                        const snowballCount = Math.max(0, Math.min(5, state?.snowballCount ?? 0));
                        const indicatorFrame = Math.floor(frameNow / 250) % 2;

                        return (
                            <div
                                key={machine.objectId}
                                // Depth-sort the original machine like a floor furni (origin-tile
                                // anchor, same formula as avatars/furni) so it draws in
                                // front of anyone behind it and behind anyone in front,
                                // and sorts correctly against normal furniture too.
                                className="snowwar-machine"
                                // Depth anchor = tile CENTRE (+ TILE_HALF_H) to match the
                                // avatar reference, so the machine sorts cleanly at corners.
                                style={{ left: x, top: y + (TILE_HALF_H * 2), zIndex: 100 + Math.round(y + TILE_HALF_H), transform: `scale(${SNOWWAR_GAME_SPRITE_SCALE})` }}
                                title={localizeWithFallback('snowwar.machine.hint', 'Walk here to collect snowballs')}
                                // Clicking the machine walks you to its pickup tile (the
                                // tile in front of its left cell), where the server's
                                // auto-collect tops you up - it isn't an instant click
                                // grab, so give the player the one-click "go get ammo".
                                onClick={event =>
                                {
                                    event.stopPropagation();
                                    walkTo(tileToWorld(machine.x), tileToWorld(machine.y + 1));
                                }}
                            >
                                <img
                                    alt=""
                                    className="snowwar-machine__official-shadow"
                                    draggable={false}
                                    height={26}
                                    src={getOfficialSnowWarAssetUrl('s_snowball_machine_32_sd.png')}
                                    width={56}
                                />
                                <img
                                    alt=""
                                    className="snowwar-machine__official-body"
                                    draggable={false}
                                    height={57}
                                    src={getOfficialSnowWarAssetUrl(`s_snowball_machine_32_a_0_${snowballCount}.png`)}
                                    width={41}
                                />
                                <img
                                    alt=""
                                    className="snowwar-machine__official-indicator"
                                    draggable={false}
                                    height={38}
                                    src={getOfficialSnowWarAssetUrl(`s_snowball_machine_32_b_0_${indicatorFrame}.png`)}
                                    width={32}
                                />
                                <div className="snowwar-machine__count">{state?.snowballCount ?? 0}</div>
                            </div>
                        );
                    })}

                    {editing && editItems.map((item, index) => item.imageUrl
                        ? (() =>
                        {
                            const { x, y } = toScreen(item.x, item.y);
                            return <div key={`admarker-${index}`} className="snowwar-edit-admarker" style={{ left: x, top: y + TILE_HALF_H }}>🖼</div>;
                        })()
                        : null)}

                    {editing && selectedIndex >= 0 && editItems[selectedIndex] && !movingSelected && (() =>
                    {
                        // Hidden while the ghost is following the cursor (a move in
                        // progress) - the ghost is the indicator then, so the box
                        // isn't left floating at the old/empty tile.
                        // Outline the WHOLE footprint as one isometric parallelogram
                        // (rotation swaps width/length) so the selection follows the
                        // tile angle instead of a grid of axis-aligned boxes.
                        const sel = editItems[selectedIndex];
                        const swap = sel.rotation === 2 || sel.rotation === 6;
                        const effW = Math.max(1, (swap ? sel.length : sel.width) ?? 1);
                        const effL = Math.max(1, (swap ? sel.width : sel.length) ?? 1);
                        // The four extreme tile-diamond vertices of the footprint.
                        const topV = toScreen(sel.x, sel.y);
                        const rightV = toScreen(sel.x + effW - 1, sel.y);
                        const bottomV = toScreen(sel.x + effW - 1, sel.y + effL - 1);
                        const leftV = toScreen(sel.x, sel.y + effL - 1);
                        const corners = [
                            { x: topV.x, y: topV.y },
                            { x: rightV.x + TILE_HALF_W, y: rightV.y + TILE_HALF_H },
                            { x: bottomV.x, y: bottomV.y + (TILE_HALF_H * 2) },
                            { x: leftV.x - TILE_HALF_W, y: leftV.y + TILE_HALF_H },
                        ];
                        const minX = Math.min(...corners.map(c => c.x));
                        const minY = Math.min(...corners.map(c => c.y));
                        const boxW = Math.max(...corners.map(c => c.x)) - minX;
                        const boxH = Math.max(...corners.map(c => c.y)) - minY;
                        const points = corners.map(c => `${c.x - minX},${c.y - minY}`).join(' ');
                        return (
                            <svg className="snowwar-edit-selection" width={boxW} height={boxH} style={{ left: minX, top: minY }}>
                                <polygon points={points} />
                            </svg>
                        );
                    })()}

                    {[...simulation.snowballs.values()].map(ball =>
                    {
                        const lx = ball.prevLocH + (ball.locH - ball.prevLocH) * alpha;
                        const ly = ball.prevLocV + (ball.locV - ball.prevLocV) * alpha;
                        const lh = Math.max(0, ball.prevHeight + (ball.height - ball.prevHeight) * alpha);
                        const { x, y } = worldToScreen(lx, ly);
                        const rise = snowballRise(lh);
                        return (
                            <div
                                key={ball.objectId}
                                className="snowwar-snowball"
                                style={{ left: x, top: y, transform: `scale(${SNOWWAR_GAME_SPRITE_SCALE})` }}
                            >
                                <img alt="" className="snowwar-snowball__shadow" src={SNOWWAR_SNOWBALL_SHADOW} />
                                <img alt="" className="snowwar-snowball__ball" src={SNOWWAR_SNOWBALL_IMAGE} style={{ transform: `translateY(${-rise}px)` }} />
                            </div>
                        );
                    })}

                    {splashes.map(splash =>
                        <div
                            key={splash.id}
                            className="snowwar-splash"
                            style={{ left: splash.x, top: splash.y, transform: `translate(-50%, -50%) scale(${SNOWWAR_GAME_SPRITE_SCALE})` }}
                            onAnimationEnd={() => setSplashes(list => list.filter(item => item.id !== splash.id))}
                        >
                            {SNOWWAR_SPLASH_FRAMES.map((frame, index) =>
                                <img alt="" className={`snowwar-splash__frame snowwar-splash__frame--${index + 1}`} key={frame} src={frame} />)}
                        </div>
                    )}

                    {!editing && [...simulation.avatars.values()].map(avatar =>
                    {
                        const ax = avatar.prevWorldX + (avatar.worldX - avatar.prevWorldX) * alpha;
                        const ay = avatar.prevWorldY + (avatar.worldY - avatar.prevWorldY) * alpha;
                        const { x, y } = worldToScreen(ax, ay);
                        const isOwn = avatar.userId === ownUserId;
                        const walking = (avatar.worldX !== avatar.prevWorldX) || (avatar.worldY !== avatar.prevWorldY);
                        const throwUntil = throwPoseUntilRef.current.get(avatar.objectId) ?? 0;
                        const throwing = frameNow < throwUntil;
                        const throwProgress = throwing ? 1 - (throwUntil - frameNow) / SNOWWAR_THROW_POSE_MS : 0;
                        const stunned = avatar.activityState === SNOWWAR_STATE_STUNNED;
                        const invincible = avatar.activityState === SNOWWAR_STATE_INVINCIBLE;
                        const throwAtOpponent = (event: MouseEvent<HTMLDivElement>, trajectory: number) =>
                        {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!ownAvatar || avatar.teamId === ownAvatar.teamId) return;
                            if (!isThrowInRange(ownAvatar.worldX, ownAvatar.worldY, avatar.worldX, avatar.worldY, trajectory))
                            {
                                setRangeWarningAt(Date.now());
                                return;
                            }
                            throwAtPlayer(avatar.objectId, trajectory);
                        };

                        return (
                            <div
                                key={avatar.objectId}
                                className={
                                    'snowwar-avatar' +
                                    (stunned ? ' snowwar-avatar--stunned' : '') +
                                    (invincible ? ' snowwar-avatar--invincible' : '')
                                }
                                style={{ left: x, top: y, zIndex: 100 + Math.round(y) }}
                                onClick={event =>
                                {
                                    if (isOwn)
                                    {
                                        event.stopPropagation();
                                        createSnowball();
                                        return;
                                    }
                                    throwAtOpponent(event, getAirTrajectory(event.altKey, event.shiftKey, true) ?? TRAJECTORY_DEFAULT);
                                }}
                                onContextMenu={event =>
                                {
                                    if (isOwn)
                                    {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        return;
                                    }
                                    throwAtOpponent(event, getAirTrajectory(event.altKey, event.shiftKey, true) ?? TRAJECTORY_DEFAULT);
                                }}
                            >
                                <div aria-hidden="true" className="snowwar-avatar__hitbox" />
                                <div
                                    className={'snowwar-avatar__name' + (isOwn ? ' snowwar-avatar__name--own' : '')}
                                    style={{ color: TEAM_COLORS[avatar.teamId % TEAM_COLORS.length] }}
                                >
                                    {avatar.name}
                                </div>
                                <span className="snowwar-avatar__body">
                                    <SnowWarAvatarView
                                        figure={avatar.figure}
                                        gender={avatar.gender}
                                        teamId={avatar.teamId}
                                        direction={avatar.rotation}
                                        walking={walking && !stunned}
                                        stunned={stunned}
                                        stunElapsedMs={(STUN_TIME - avatar.activityTimer) * SUBTURN_MS}
                                        picking={avatar.activityState === SNOWWAR_STATE_CREATING}
                                        throwing={throwing && !stunned}
                                        throwProgress={throwProgress}
                                        frameNow={frameNow}
                                        scale={SNOWWAR_FURNI_SCALE}
                                    />
                                </span>
                            </div>
                        );
                    })}

                    {editorWalker && (() =>
                    {
                        // Client-side preview avatar shown only in the editor (the
                        // game simulation is empty here). Anchored the same way as an
                        // in-game avatar so it lines up with the tiles it walks.
                        const { x, y } = toScreen(editorWalker.x, editorWalker.y);
                        return (
                            <div
                                className="snowwar-avatar snowwar-avatar--preview"
                                style={{ left: x, top: y, zIndex: 100 + Math.round(y) }}
                            >
                                <span className="snowwar-avatar__body">
                                    <SnowWarAvatarView
                                        figure={editorWalkerFigure}
                                        gender={editorWalkerGender}
                                        direction={editorWalker.dir}
                                        walking={editorWalker.walking}
                                        throwing={false}
                                        throwProgress={0}
                                        frameNow={frameNow}
                                        scale={SNOWWAR_FURNI_SCALE}
                                    />
                                </span>
                            </div>
                        );
                    })()}
                    </div>
                </div>
            </div>
            </div>

            {!editing && visibleChatMessages.map(({ avatar, message, stackIndex }) => (
                <div
                    key={message.id}
                    className={`snowwar-chat-bubble snowwar-chat-bubble--${avatar.teamId === 1 ? 'blue' : 'red'}`}
                    style={{
                        left: `calc(50% + ${avatar.teamId === 1 ? -300 : 300}px)`,
                        top: `calc(25% - ${stackIndex * 36}px)`,
                    }}
                >
                    <div className="snowwar-chat-bubble__face">
                        <LayoutAvatarImageView
                            compactHead
                            compactHeadPadding={0}
                            compactHeadSize={22}
                            direction={2}
                            figure={avatar.figure}
                            gender={avatar.gender}
                            headOnly
                        />
                    </div>
                    <span className="snowwar-chat-bubble__text"><b>{avatar.name}: </b>{message.message}</span>
                </div>
            ))}

            {!editing && (
            <form
                className="snowwar-chat"
                onSubmit={event =>
                {
                    event.preventDefault();
                    submitChat();
                }}
            >
                <input
                    type="text"
                    className="snowwar-chat__input"
                    value={chatInput}
                    maxLength={100}
                    aria-label={localizeWithFallback('widgets.chatinput.default', 'Click here to chat')}
                    placeholder={localizeWithFallback('widgets.chatinput.default', 'Click here to chat')}
                    onChange={event => setChatInput(event.target.value)}
                />
                <button type="submit" className="snowwar-chat__send">
                    {localizeWithFallback('widgets.chatinput.say', 'Say')}
                </button>
            </form>
            )}

            <div className="snowwar-help">
                {editing
                    ? localizeWithFallback('snowwar.editor.help', 'Editor: click to place • Ctrl/Cmd + drag paints • Shift + drag fills an area • one piece per occupied tile')
                    : localizeWithFallback('snowwar.help', 'Click: walk • Enemy: adaptive throw • Shift: quick • Alt: long lob • Alt+Shift: short lob • Arrows/QWEADZXC: move • Right-click: quick')}
            </div>
        </div>
    );
};
