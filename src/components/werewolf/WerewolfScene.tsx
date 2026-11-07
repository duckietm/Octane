import { AvatarAction, GetRoomEngine, Vector3d } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useMemo, useState } from 'react';
import { GetSessionDataManager, IWerewolfGame, IWerewolfSeat, wt } from '../../api';
import { LayoutFurniImageView } from '../../common';
import forestBigImage from '../../assets/images/werewolf/werewolf-forest-big.png';
import forestImage from '../../assets/images/werewolf/werewolf-forest.png';
import { useUnoAvatar } from '../uno/useUnoAvatar';
import { WerewolfRoleIcon } from './WerewolfRoleIcon';

/**
 * The village's clearing, drawn as the hotel draws a room: the floor picture (werewolf-forest.png), the hotel's own furni (a fire, stumps to sit on, trees, bushes, logs) drawn by its
 * renderer, and the players sitting round the fire. Tile (x, y) has its top corner at ORIGIN + (32 * (x - y), 16 * (x + y)).
 */
/** The forest's edge above the floor: it may go off the top of the screen. */
export const FOREST_BACKDROP = 150;

/** The trees and things round the clearing, `size` tiles from its corners. */
const decorOf = (tiles: number) => [
    { name: 'ashtree', x: 0, y: tiles - 2, dir: 2 },
    { name: 'ashtree', x: tiles - 2, y: 0, dir: 4 },
    { name: 'country_log', x: 0, y: 2, dir: 2, size: 1 },
    { name: 'hween10_tarot', x: tiles - 2, y: tiles - 2, dir: 2 }
];

export interface IForestLayout {
    tiles: number;
    width: number;
    height: number;
    origin: { x: number; y: number };
    image: string;
    /** The fire's tile (1x1, on the corner between the four middle tiles), and the middle of the rings of stumps. */
    fire: number;
    decor: { name: string; x: number; y: number; dir: number; size?: number }[];
}

/** The clearing of 12 x 12 tiles for a village of up to 12, the big one of 20 x 20 beyond (up to 49). */
const SMALL_FOREST: IForestLayout = { tiles: 12, width: 784, height: 594, origin: { x: 392, y: 190 }, image: forestImage, fire: 5.5, decor: decorOf(12) };
const BIG_FOREST: IForestLayout = { tiles: 20, width: 1296, height: 850, origin: { x: 648, y: 190 }, image: forestBigImage, fire: 9.5, decor: decorOf(20) };

export const forestLayout = (maxPlayers: number): IForestLayout => ((maxPlayers || 12) > 12 ? BIG_FOREST : SMALL_FOREST);

/**
 * The twelve seats round the fire, as the server numbers them; `dir` is where the sitter looks. A Habbo sits only in
 * the four straight directions, so the seats on the diagonals look along the nearest one.
 */
export const WEREWOLF_CHAIRS = [
    { x: 5, y: 2, dir: 4 }, { x: 6, y: 2, dir: 4 }, { x: 8, y: 3, dir: 4 }, { x: 9, y: 5, dir: 6 },
    { x: 9, y: 6, dir: 6 }, { x: 8, y: 8, dir: 6 }, { x: 6, y: 9, dir: 0 }, { x: 5, y: 9, dir: 0 },
    { x: 3, y: 8, dir: 0 }, { x: 2, y: 6, dir: 2 }, { x: 2, y: 5, dir: 2 }, { x: 3, y: 3, dir: 2 }
];

/** Looking at the fire from a seat: the nearest of the four straight directions a Habbo sits in. */
const facingFire = (x: number, y: number, fire: number): number => {
    const dx = fire + 0.5 - (x + 0.5);
    const dy = fire + 0.5 - (y + 0.5);

    if (Math.abs(dy) >= Math.abs(dx)) return dy > 0 ? 4 : 0;

    return dx > 0 ? 2 : 6;
};

/** `count` seats on a ring round the fire, starting at the top. */
const ring = (count: number, radius: number, turn: number, fire: number) => Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + turn + (index * 2 * Math.PI) / count;
    const x = fire - 0.5 + radius * Math.cos(angle);
    const y = fire - 0.5 + radius * Math.sin(angle);

    return { x, y, dir: facingFire(x, y, fire) };
});

const BIG_RINGS = [ 3.4, 5.4, 7.4 ];

/**
 * The stumps of a village of `count` players (the server numbers them 0 to count - 1), spread round the fire: the
 * twelve seats of the clearing, then for a big village (up to 49) a ring close to the fire and a second one behind it.
 */
export const werewolfChairs = (count: number) => {
    const total = WEREWOLF_CHAIRS.length;

    if ((count || total) <= total) {
        const stumps = Math.max(1, count || total);

        return Array.from({ length: stumps }, (_, index) => WEREWOLF_CHAIRS[Math.round((index * total) / stumps) % total]);
    }

    // The big clearing: one ring up to 16, two up to 34, three beyond, the stumps shared by the rings' lengths.
    const radii = BIG_RINGS.slice(0, count <= 16 ? 1 : count <= 34 ? 2 : 3);
    const length = radii.reduce((sum, radius) => sum + radius, 0);
    const counts = radii.map((radius) => Math.floor((count * radius) / length));

    counts[counts.length - 1] += count - counts.reduce((sum, value) => sum + value, 0);

    return radii.flatMap((radius, index) => ring(counts[index], radius, index % 2 ? Math.PI / Math.max(1, counts[index]) : 0, BIG_FOREST.fire));
};

const FIRE = 'campfire';
const SEAT = 'picnic_chair';

const FEET_FROM_BOTTOM = 14;
const SIT_LIFT = 8;

export const forestTile = (layout: IForestLayout, x: number, y: number) => ({ left: layout.origin.x + 32 * (x - y), top: layout.origin.y + 16 * (x + y) });

const useFurniLoads = (names: string[]): number => {
    const [loads, setLoads] = useState(0);

    useEffect(() => {
        const engine = GetRoomEngine?.();
        const session = GetSessionDataManager();
        let active = true;
        const loaded = () => active && setLoads((count) => count + 1);
        const listener = { imageReady: loaded, imageFailed: loaded };

        for (const name of names) {
            const id = session?.getFloorItemDataByName?.(name)?.id;

            try {
                if (engine && id !== undefined) engine.getFurnitureFloorImage(id, new Vector3d(0), 64, listener, 0, '', -1);
            } catch {
                // The renderer is not ready: the furni ask for themselves.
            }
        }

        return () => {
            active = false;
        };
    }, [names]);

    return loads;
};

const Furni: FC<{ layout: IForestLayout; name: string; x: number; y: number; dir: number; size?: number; depth: number; loads: number; state?: number }> = ({ layout, name, x, y, dir, size = 1, depth, loads, state = -1 }) => {
    const id = GetSessionDataManager()?.getFloorItemDataByName?.(name)?.id;
    const bottom = forestTile(layout, x + size, y + size);

    if (id === undefined) return null;

    return (
        <div className="ww-scene__item" style={{ left: bottom.left, top: bottom.top, zIndex: depth }}>
            <LayoutFurniImageView key={`${name}-${loads}`} productType="s" productClassId={id} direction={dir * 45} state={state} style={{ position: 'absolute', transform: 'translate(-50%, -100%)' }} />
        </div>
    );
};

const Player: FC<{ layout: IForestLayout; seat: IWerewolfSeat; game: IWerewolfGame; chairs: typeof WEREWOLF_CHAIRS; bubble: string | null; selectable: boolean; selected: boolean; onSelect: (userId: number) => void }> = ({ layout, seat, game, chairs, bubble, selectable, selected, onSelect }) => {
    const chair = chairs[seat.chair] ?? chairs[0];
    const picture = useUnoAvatar(seat.figure, seat.gender, chair.dir, AvatarAction.POSTURE_SIT);
    const centre = forestTile(layout, chair.x + 0.5, chair.y + 0.5);
    const depth = (chair.x + chair.y) * 10 + 6;
    const style: CSSProperties = { left: centre.left, top: centre.top + FEET_FROM_BOTTOM - SIT_LIFT, zIndex: depth };
    const classes = [ 'ww-tag', seat.you ? 'is-you' : '', !seat.alive ? 'is-dead' : '', selectable ? 'is-selectable' : '', selected || seat.chosen ? 'is-selected' : '', seat.wolves.length ? 'is-prey' : '', seat.lover ? 'is-lover' : '', seat.pack ? 'is-pack' : '' ].join(' ');

    return (
        <>
            {picture && <img className={`ww-scene__avatar ${seat.alive ? '' : 'is-dead'}`} src={picture} alt="" style={style} draggable={false} />}
            <button type="button" className={classes} style={{ left: centre.left, top: centre.top - 80, zIndex: 900 }} disabled={!selectable} onClick={() => onSelect(seat.userId)}>
                {seat.role && <WerewolfRoleIcon role={seat.role} zoom={1} />}
                {seat.lover && <span className="ww-tag__heart">♥</span>}
                {seat.charmed && <WerewolfRoleIcon role="piper" zoom={1} />}
                {seat.raven && <WerewolfRoleIcon role="raven" zoom={1} />}
                <span className="ww-tag__name">{seat.name}</span>
                {seat.votes > 0 && <span className="ww-tag__votes">{seat.votes}</span>}
                {game.step === 'debate' && seat.ready && <span className="ww-tag__ready">✓</span>}
            </button>
            {seat.wolves.length > 0 && <div className="ww-scene__wolves" style={{ left: centre.left, top: centre.top - 104, zIndex: 901 }}>{seat.wolves.join(', ')}</div>}
            {bubble && (
                <div className="ww-bubble" style={{ left: centre.left, top: centre.top - 110, zIndex: 950 }}>
                    <strong>{seat.name}:</strong> {bubble}
                </div>
            )}
        </>
    );
};

/**
 * The clearing: the fire, the stumps (a free one is clicked to sit on it while the village waits), the players with
 * their name (clicked to choose them when the step asks for a player), what they say, and the night over it all.
 */
export const WerewolfScene: FC<{
    game: IWerewolfGame | null;
    bubbles: Map<string, string>;
    selected: number[];
    zoom: number;
    onSelect: (userId: number) => void;
    onChair: (chair: number) => void;
}> = ({ game, bubbles, selected, zoom, onSelect, onChair }) => {
    const layout = forestLayout(game?.maxPlayers ?? WEREWOLF_CHAIRS.length);
    const names = useMemo(() => [ FIRE, SEAT, ...SMALL_FOREST.decor.map((item) => item.name) ], []);
    const loads = useFurniLoads(names);
    const taken = new Map<number, IWerewolfSeat>((game?.seats ?? []).map((seat) => [ seat.chair, seat ]));
    const waiting = !game || game.state === 'waiting';
    const night = !!game?.isNight;
    const fire = forestTile(layout, layout.fire + 0.5, layout.fire + 0.5);
    const chairs = werewolfChairs(game?.maxPlayers ?? WEREWOLF_CHAIRS.length);

    return (
        <div className={`ww-scene ${night ? 'is-night' : ''}`} style={{ width: layout.width, height: layout.height, '--ww-unzoom': String(1 / zoom) } as CSSProperties}>
            <img className="ww-scene__floor" src={layout.image} alt="" width={layout.width} height={layout.height} draggable={false} />

            {layout.decor.map((item, index) => <Furni key={`${item.name}-${index}`} layout={layout} {...item} depth={(item.x + item.y) * 10} loads={loads} />)}

            <Furni layout={layout} name={FIRE} x={layout.fire} y={layout.fire} dir={0} depth={layout.fire * 20 + 5} loads={loads} state={1} />

            {chairs.map((chair, index) => {
                const free = !taken.get(index) && waiting && !!game;
                const centre = forestTile(layout, chair.x + 0.5, chair.y + 0.5);

                return (
                    <div key={index}>
                        <Furni layout={layout} name={SEAT} x={chair.x} y={chair.y} dir={chair.dir} depth={(chair.x + chair.y) * 10 + 2} loads={loads} />
                        {free && (
                            <button type="button" className="ww-scene__seat" style={{ left: centre.left, top: centre.top, zIndex: 800 }} onClick={() => onChair(index)} aria-label={wt('sit', 'Sit here')}>
                                <span>{wt('sit', 'Sit here')}</span>
                            </button>
                        )}
                    </div>
                );
            })}

            {game?.seats.map((seat) => (
                <Player key={seat.userId} layout={layout} seat={seat} game={game} chairs={chairs} bubble={bubbles.get(seat.name) ?? null} selectable={seat.targetable} selected={selected.includes(seat.userId)} onSelect={onSelect} />
            ))}

            <div className="ww-scene__night" />
            <div className="ww-scene__glow" style={{ left: fire.left, top: fire.top - 20 }} />
        </div>
    );
};
