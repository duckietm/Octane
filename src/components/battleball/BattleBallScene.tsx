import { AvatarAction } from '@octane/renderer';
import { CSSProperties, FC, MouseEvent, ReactElement, useEffect, useMemo, useState } from 'react';
import { BATTLEBALL_POWER_SPRITES, IBattleBallGame, IBattleBallPlayer } from '../../api';
import arenasData from '../../assets/images/battleball/battleball-arenas.json';
import effectsData from '../../assets/images/battleball/battleball-effects.json';
import arena1 from '../../assets/images/battleball/bb-arena-1.png';
import arena2 from '../../assets/images/battleball/bb-arena-2.png';
import arena3 from '../../assets/images/battleball/bb-arena-3.png';
import arena4 from '../../assets/images/battleball/bb-arena-4.png';
import arena5 from '../../assets/images/battleball/bb-arena-5.png';
import ballsImage from '../../assets/images/battleball/bb-balls.png';
import decor1 from '../../assets/images/battleball/bb-decor-1.png';
import decor2 from '../../assets/images/battleball/bb-decor-2.png';
import decor3 from '../../assets/images/battleball/bb-decor-3.png';
import decor4 from '../../assets/images/battleball/bb-decor-4.png';
import decor5 from '../../assets/images/battleball/bb-decor-5.png';
import effectsImage from '../../assets/images/battleball/bb-effects.png';
import tilesImage from '../../assets/images/battleball/bb-tiles.png';
import { useUnoAvatar } from '../uno/useUnoAvatar';

/**
 * A BattleBall arena of Habbo's original game, drawn twice its size so that the
 * hotel's avatars fit its tiles: the arena's picture, its decor (in front of or behind the players, by the room file's
 * depth), the coloured tiles, the power-ups and pins on the floor, the players on their balls and the effects.
 *
 * In the room's pixels (a 760x528 frame), tile (x, y) at height h has its "location" at
 * (ox - 17 + 16 (x - y), oy + 6 + 8 (x + y) - 8 h); a sprite of the game is drawn at the location minus its
 * registration point, as the Shockwave client did.
 */
export const SCALE = 2;
export const FRAME_WIDTH = 760;
export const FRAME_HEIGHT = 528;

interface IFrame { x: number; w: number; h: number; left?: number; top?: number; rx?: number; ry?: number }
interface IArenaData { origin: [number, number]; decor: { frames: IFrame[]; z: number; add: boolean }[]; map: { heightmap: string[] } }

const ARENAS = arenasData as unknown as Record<string, IArenaData>;
const EFFECTS = effectsData as unknown as Record<string, IFrame[]>;
const ARENA_IMAGES = [ '', arena1, arena2, arena3, arena4, arena5 ];
const DECOR_IMAGES = [ '', decor1, decor2, decor3, decor4, decor5 ];

const sheetSize = (frames: IFrame[]) => ({ w: Math.max(1, ...frames.map((f) => f.x + f.w)), h: Math.max(1, ...frames.map((f) => f.h)) });
const EFFECT_SHEET = sheetSize(Object.values(EFFECTS).flat());

const heightAt = (arena: IArenaData, x: number, y: number) => {
    const cell = arena.map.heightmap[y]?.[x] ?? 'x';

    return cell >= '0' && cell <= '9' ? Number(cell) : 0;
};

/** The "location" of a tile, in the room's pixels. */
export const tileLocation = (arena: IArenaData, x: number, y: number) => {
    const [ ox, oy ] = arena.origin;
    const h = heightAt(arena, x, y);

    return { left: ox - 17 + 16 * (x - y), top: oy + 6 + 8 * (x + y) - 8 * h };
};

/** A frame of a sheet, twice its size, its top left at (left, top) in the room's pixels. */
const sprite = (image: string, sheet: { w: number; h: number }, frame: IFrame, left: number, top: number): CSSProperties => ({
    left: left * SCALE,
    top: top * SCALE,
    width: frame.w * SCALE,
    height: frame.h * SCALE,
    backgroundImage: `url(${image})`,
    backgroundSize: `${sheet.w * SCALE}px ${sheet.h * SCALE}px`,
    backgroundPosition: `${-frame.x * SCALE}px 0`
});

/** An effect of the game on a tile: its frame (by time) drawn at the tile's location minus its registration point. */
const Effect: FC<{ arena: IArenaData; name: string; x: number; y: number; tick: number; z: number; className?: string }> = ({ arena, name, x, y, tick, z, className = '' }) => {
    const frames = EFFECTS[name];

    if (!frames?.length) return null;

    const frame = frames[tick % frames.length];
    const loc = tileLocation(arena, x, y);

    return <span className={`bb-sprite ${className}`} style={{ ...sprite(effectsImage, EFFECT_SHEET, frame, loc.left - (frame.rx ?? 0), loc.top - (frame.ry ?? 0)), zIndex: z }} />;
};

const depth = (x: number, y: number) => (x + y) * 1000 + 700;

/**
 * The avatar's bottom above the ball's, for each frame of the ball (round, squashed, stretched): the seat of a
 * sitting avatar is 23 px above its picture's bottom and sinks 8 px into the ball's top (14, 24 and 8 px below the
 * top of its 80 px frame).
 */
const SEAT_BOTTOM = [ 35, 25, 41 ];

/**
 * A player: the hotel's avatar sitting on the game's ball, in the team's colour, bouncing (the original's bounce, a
 * small one standing, a big one from tile to tile). Stunned: the stars; ball burst: no ball. As in the original, the
 * stars are drawn as they are (ink 8) and the power-ups' effects added to what is under them (ink 33).
 */
const Player: FC<{ arena: IArenaData; player: IBattleBallPlayer; tick: number }> = ({ arena, player, tick }) => {
    // A Habbo sits only in the even directions.
    const picture = useUnoAvatar(player.figure, player.gender, player.dir % 2 ? (player.dir + 1) % 8 : player.dir, AvatarAction.POSTURE_SIT);
    const loc = tileLocation(arena, player.x, player.y);
    const centre = { left: loc.left + 17, top: loc.top + 2 };
    const team = player.paintsFor;
    const broken = player.state === 'ball_broken';
    const stunned = player.state === 'stunned' || broken;
    const state = player.state === 'high_jumps' ? 'spring' : player.state === 'cleaning_tiles' ? 'drill' : player.state === 'colouring_for_opponent' ? 'harlequin' : '';
    const classes = [ 'bb-player', player.moving ? 'is-moving' : 'is-idle', stunned ? 'is-stunned' : '', player.state === 'flying' ? 'is-flying' : '', player.you ? 'is-you' : '' ].join(' ');
    const frame = player.moving ? (tick % 2 ? 1 : 2) : 0;

    return (
        <>
            <div className={classes} style={{ left: centre.left * SCALE, top: centre.top * SCALE, zIndex: depth(player.x, player.y) }}>
                <div className="bb-player__bounce">
                    {!broken && <span className="bb-player__ball" style={{ backgroundImage: `url(${ballsImage})`, backgroundPosition: `${-frame * 40 * SCALE}px ${-team * 40 * SCALE}px` }} />}
                    {picture && <img className="bb-player__avatar" src={picture} alt="" draggable={false} style={{ bottom: broken ? 0 : SEAT_BOTTOM[frame] }} />}
                </div>
            </div>
            {stunned && <Effect arena={arena} name="stunned" x={player.x} y={player.y} tick={tick} z={depth(player.x, player.y) + 1} />}
            {state && <Effect arena={arena} name={state} x={player.x} y={player.y} tick={tick} z={depth(player.x, player.y) + 1} className="is-add" />}
        </>
    );
};

const DIRS = [ [ 0, -1 ], [ 1, -1 ], [ 1, 0 ], [ 1, 1 ], [ 0, 1 ], [ -1, 1 ], [ -1, 0 ], [ -1, -1 ] ];

/** The effects of the moments just gone: a light bulb's flash, a flashlight's or a cannon's beam, a pick-up, a bomb. */
const Recent: FC<{ arena: IArenaData; game: IBattleBallGame }> = ({ arena, game }) => (
    <>
        {game.log.filter((event) => event.ago < 900).map((event) => {
            if (event.type === 'pickup') return <Effect key={event.seq} arena={arena} name="pickup" x={event.b} y={event.c} tick={Math.floor(event.ago / 110)} z={depth(event.b, event.c) + 2} className="is-add" />;
            if (event.type === 'power' && event.a === 1) return <Effect key={event.seq} arena={arena} name="lghtbulb" x={event.b} y={event.c} tick={Math.floor(event.ago / 220)} z={depth(event.b, event.c) + 2} className="is-add" />;
            if (event.type === 'power' && event.a === 3) {
                const [ dx, dy ] = DIRS[event.d] ?? [ 1, 0 ];

                return <Effect key={event.seq} arena={arena} name={`flashlght_${event.d}`} x={event.b + dx} y={event.c + dy} tick={0} z={depth(event.b, event.c) + 2} className="is-add" />;
            }
            if (event.type === 'cannon') return <Effect key={event.seq} arena={arena} name={`cannon_${(game.players.find((p) => p.userId === event.userId)?.dir ?? 2)}`} x={event.a} y={event.b} tick={0} z={depth(event.a, event.b) + 2} className="is-add" />;
            if (event.type === 'power' && event.a === 7) {
                const loc = tileLocation(arena, event.b, event.c);

                return <span key={event.seq} className="bb-blast" style={{ left: (loc.left + 17) * SCALE, top: (loc.top + 2) * SCALE, zIndex: depth(event.b, event.c) + 2 }} />;
            }
            return null;
        })}
    </>
);

/** Which tile is under a point of the room (the frontmost one when several heights overlap). */
const tileAt = (arena: IArenaData, px: number, py: number): [number, number] | null => {
    const [ ox, oy ] = arena.origin;
    let found: [number, number] | null = null;
    let front = -1;

    arena.map.heightmap.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            if (row[x] < '0' || row[x] > '9') continue;

            const h = Number(row[x]);
            const cx = ox + 16 * (x - y);
            const cy = oy + 8 * (x + y + 1) - 8 * h;

            if (Math.abs(px - cx) / 16 + Math.abs(py - cy) / 8 <= 1 && x + y > front) {
                front = x + y;
                found = [ x, y ];
            }
        }
    });

    return found;
};

export const BattleBallScene: FC<{ game: IBattleBallGame | null; arenaId: number; zoom: number; onWalk: (x: number, y: number) => void }> = ({ game, arenaId, zoom, onWalk }) => {
    const arena = ARENAS[String(arenaId)] ?? ARENAS['1'];
    const decorSheet = useMemo(() => sheetSize(arena.decor.flatMap((item) => item.frames)), [ arena ]);
    const [ tick, setTick ] = useState(0);
    const [ hover, setHover ] = useState<[number, number] | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setTick((value) => value + 1), 120);

        return () => clearInterval(timer);
    }, []);

    const pointer = (event: MouseEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();

        return tileAt(arena, (event.clientX - rect.left) / (SCALE * zoom), (event.clientY - rect.top) / (SCALE * zoom));
    };

    const tiles: ReactElement[] = [];

    if (game) {
        for (let y = 0; y < game.height; y++) {
            for (let x = 0; x < game.width; x++) {
                const cell = game.tiles[y * game.width + x];

                if (!cell || cell === '-' || cell === '0') continue;

                const index = 1 + (cell.charCodeAt(0) - 97);
                const loc = tileLocation(arena, x, y);

                tiles.push(<span key={`${x}-${y}`} className="bb-sprite bb-tile" style={{ ...sprite(tilesImage, { w: 510, h: 15 }, { x: index * 30, w: 30, h: 15 }, loc.left + 2, loc.top - 6), zIndex: 1 }} />);
            }
        }
    }

    const hoverLoc = hover ? tileLocation(arena, hover[0], hover[1]) : null;

    return (
        <div
            className="bb-scene"
            style={{ width: FRAME_WIDTH * SCALE, height: FRAME_HEIGHT * SCALE }}
            onMouseMove={(event) => setHover(pointer(event))}
            onMouseLeave={() => setHover(null)}
            onClick={(event) => {
                const tile = pointer(event);

                if (tile) onWalk(tile[0], tile[1]);
            }}>
            <img className="bb-scene__floor" src={ARENA_IMAGES[arenaId] ?? arena1} alt="" width={FRAME_WIDTH * SCALE} height={FRAME_HEIGHT * SCALE} draggable={false} />
            {tiles}
            {hoverLoc && <span className="bb-hover" style={{ left: (hoverLoc.left + 2) * SCALE, top: (hoverLoc.top - 6) * SCALE, zIndex: 2 }} />}
            {arena.decor.map((item, index) => {
                const frame = item.frames[Math.floor(tick / 3) % item.frames.length];

                return <span key={index} className={`bb-sprite ${item.add ? 'is-add' : ''}`} style={{ ...sprite(DECOR_IMAGES[arenaId] ?? decor1, decorSheet, frame, frame.left ?? 0, frame.top ?? 0), zIndex: item.z || 3 }} />;
            })}
            {game?.pins.map((pin) => <Effect key={`pin-${pin.id}`} arena={arena} name="pins" x={pin.x} y={pin.y} tick={tick} z={depth(pin.x, pin.y) - 300} />)}
            {game?.powerUps.map((power) => <Effect key={`pu-${power.id}`} arena={arena} name={`pu_${BATTLEBALL_POWER_SPRITES[power.type]}`} x={power.x} y={power.y} tick={tick} z={depth(power.x, power.y) - 200} />)}
            {game?.players.map((player) => <Player key={player.userId} arena={arena} player={player} tick={tick} />)}
            {game && <Recent arena={arena} game={game} />}
        </div>
    );
};
