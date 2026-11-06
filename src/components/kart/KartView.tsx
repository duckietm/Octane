import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { AvatarAction } from '@octane/renderer';
import { GetSessionDataManager, IHallPlayer } from '../../api';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { LayoutFurniImageView } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import bannerImage from '../../assets/images/kart/kart-banner.png';
import groundImage from '../../assets/images/kart/kart-ground.png';
import { MiniGameLobby, MiniGameResults, MiniGameTopBar, MiniGameWaiting, mgt } from '../minigame/MiniGameParts';
import { useHallGame, useStageZoom } from '../minigame/useHallGame';
import { useUnoAvatar } from '../uno/useUnoAvatar';
import '../../css/kart/KartView.css';

/** A text of HabboKart, `kart.<key>`. */
const kt = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`kart.${ key }`, fallback, parameters, replacements);

/** The ground (kart-ground.png, deploy/scripts/kart-art.py): 16 x 12 tiles of 64 x 32. */
const STAGE_W = 976;
const STAGE_H = 648;
const ORIGIN = { x: 424, y: 150 };
const TILES_X = 16;
const TILES_Y = 12;
const SEATS: [number, number] = [ 2, 8 ];
/** The hotel's car effects, a seat each: the dragster, the money car, police, ambulance, the doggy car, scooters. */
const CARS = [ 22, 21, 19, 20, 48, 215, 216, 217 ];
const SEND_MS = 120;

const ROAD_MAX = 5.4;
const GRASS_MAX = 2.2;
const ACCEL = 6.5;
const BRAKE = 11;
const FRICTION = 2.6;
const STEER = 2.9;

interface ICar { x: number; y: number; angle: number; progress: number; lap: number; place: number; time: number; robot: boolean; out: boolean; startX: number; startY: number }
interface IDrive { x: number; y: number; angle: number; speed: number; progress: number; t: number }

const tilePoint = (x: number, y: number) => ({ left: ORIGIN.x + 32 * (x - y), top: ORIGIN.y + 16 * (x + y) });

/** The hotel's direction (0 to 7) a car faces, from its heading on the floor (2: +x, 4: +y). */
const directionOf = (angle: number): number => ((Math.round(angle / (Math.PI / 4)) + 2) % 8 + 8) % 8;

/** The pieces of the circuit: a straight along x or y, a corner joining two sides, the finish line on the first. */
const piecesOf = (track: number[][]) => track.map((block, index) => {
    const previous = track[(index - 1 + track.length) % track.length];
    const next = track[(index + 1) % track.length];
    const sides = [ [ previous[0] - block[0], previous[1] - block[1] ], [ next[0] - block[0], next[1] - block[1] ] ];
    const alongX = sides.every(([ dx ]) => dx !== 0);
    const alongY = sides.every(([ , dy ]) => dy !== 0);
    const has = (dx: number, dy: number) => sides.some(([ sx, sy ]) => sx === dx && sy === dy);

    if (alongX || alongY) return { block, name: index === 0 ? 'sporttrack3*2' : 'sporttrack1*2', dir: alongX ? 2 : 0 };

    // A corner: the sides it joins (-y: back right, +x: front right, +y: front left, -x: back left).
    let dir = 0;

    if (has(1, 0) && has(0, 1)) dir = 0;
    else if (has(0, 1) && has(-1, 0)) dir = 2;
    else if (has(-1, 0) && has(0, -1)) dir = 4;
    else dir = 6;

    return { block, name: 'sporttrack2*2', dir };
});

/** The middle of the road and where a point is along it (blocks from the line), as the server counts it. */
const progressAt = (track: number[][], x: number, y: number): number => {
    let best = 0;
    let bestDistance = Infinity;

    for (let index = 0; index < track.length; index++) {
        const from = track[index];
        const to = track[(index + 1) % track.length];
        const ax = from[0] * 2 + 1;
        const ay = from[1] * 2 + 1;
        const dx = (to[0] - from[0]) * 2;
        const dy = (to[1] - from[1]) * 2;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
        const distance = (ax + dx * t - x) ** 2 + (ay + dy * t - y) ** 2;

        if (distance < bestDistance) {
            bestDistance = distance;
            best = index + t;
        }
    }

    return best;
};

/** The coloured pieces' ids in the hotel's furni data (a name with `*` is not found by name: only its first colour). */
const KNOWN_IDS: Record<string, number> = { 'sporttrack1*2': 1748, 'sporttrack2*2': 1751, 'sporttrack3*2': 1755, 'traffic_light*1': 1761 };

const useFurniIds = (names: string[]): Record<string, number> => useMemo(() => {
    const ids: Record<string, number> = {};
    const session = GetSessionDataManager();

    for (const name of names) {
        const known = KNOWN_IDS[name];
        const id = known !== undefined && session?.getFloorItemData?.(known)?.fullName === name ? known : session?.getFloorItemDataByName?.(name)?.id;

        if (id !== undefined) ids[name] = id;
    }

    return ids;
}, [ names.join() ]);

const Furni: FC<{ id: number; x: number; y: number; dir: number; size: number; depth: number }> = ({ id, x, y, dir, size, depth }) => {
    const bottom = tilePoint(x + size, y + size);

    return (
        <div className="kart-item" style={{ left: bottom.left, top: bottom.top, zIndex: depth }}>
            <LayoutFurniImageView productType="s" productClassId={id} direction={dir * 45} style={{ position: 'absolute', transform: 'translate(-50%, -100%)' }} />
        </div>
    );
};

/** A car: the player's avatar in their car effect, turned to its heading (eight pictures, drawn once). */
const Car: FC<{ player: IHallPlayer; seat: number; x: number; y: number; angle: number; you: boolean; smooth: boolean }> = ({ player, seat, x, y, angle, you, smooth }) => {
    const effect = CARS[seat % CARS.length];
    const pictures = [ 0, 1, 2, 3, 4, 5, 6, 7 ].map((direction) => useUnoAvatar(player.figure, player.gender, direction, AvatarAction.POSTURE_STAND, -1, effect)); // eslint-disable-line react-hooks/rules-of-hooks
    const point = tilePoint(x, y);
    const picture = pictures[directionOf(angle)];

    return (
        <div className={`kart-car ${ smooth ? 'is-smooth' : '' }`} style={{ left: point.left, top: point.top, zIndex: Math.floor((x + y) * 10) + 5 }}>
            {picture && <img src={picture} alt="" draggable={false} />}
            <span className={`kart-car__name ${ you ? 'is-you' : '' }`} data-browser-text>{player.name}</span>
        </div>
    );
};

/** The player's own car, driven here with the arrows; where it is goes to the race every 120 ms. */
const useDrive = (active: boolean, start: { x: number; y: number; angle: number; progress: number } | null, track: number[][], send: (move: Record<string, unknown>) => void) => {
    const [ drive, setDrive ] = useState<IDrive | null>(null);
    const road = useMemo(() => new Set(track.map(([ bx, by ]) => `${ bx },${ by }`)), [ track.join('|') ]);

    useEffect(() => {
        if (!active || !start) return;

        const car: IDrive = { x: start.x, y: start.y, angle: start.angle, speed: 0, progress: start.progress, t: progressAt(track, start.x, start.y) };
        const held = new Set<string>();
        let last = performance.now();
        let sentAt = 0;
        let frame = 0;

        setDrive({ ...car });

        const onDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;

            if (!event.key.startsWith('Arrow') || (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))) return;

            event.preventDefault();
            event.stopPropagation();
            held.add(event.key);
        };
        const onUp = (event: KeyboardEvent) => held.delete(event.key);
        const loop = () => {
            const now = performance.now();
            const dt = Math.min(0.05, (now - last) / 1000);

            last = now;

            const onRoad = road.has(`${ Math.floor(car.x / 2) },${ Math.floor(car.y / 2) }`);
            const max = onRoad ? ROAD_MAX : GRASS_MAX;

            if (held.has('ArrowUp')) car.speed += ACCEL * dt;
            else if (held.has('ArrowDown')) car.speed -= BRAKE * dt;
            else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), FRICTION * dt);

            if (car.speed > max) car.speed = Math.max(max, car.speed - BRAKE * dt);
            car.speed = Math.max(-1.6, car.speed);

            const turn = (held.has('ArrowRight') ? 1 : 0) - (held.has('ArrowLeft') ? 1 : 0);

            car.angle += turn * STEER * dt * Math.max(0.35, Math.min(1, Math.abs(car.speed) / 3)) * Math.sign(car.speed || 1);
            car.x += Math.cos(car.angle) * car.speed * dt;
            car.y += Math.sin(car.angle) * car.speed * dt;

            if (car.x < 0.2 || car.x > TILES_X - 0.2 || car.y < 0.2 || car.y > TILES_Y - 0.2) {
                car.x = Math.max(0.2, Math.min(TILES_X - 0.2, car.x));
                car.y = Math.max(0.2, Math.min(TILES_Y - 0.2, car.y));
                car.speed *= 0.3;
            }

            // Along the road: the progress follows the middle line, a little at a time (no cutting across the grass).
            const t = progressAt(track, car.x, car.y);
            let delta = t - car.t;

            if (delta < -track.length / 2) delta += track.length;
            if (delta > track.length / 2) delta -= track.length;
            if (Math.abs(delta) < 1.5) car.progress += delta;

            car.t = t;

            if (now - sentAt > SEND_MS) {
                sentAt = now;
                send({ x: car.x, y: car.y, angle: car.angle, progress: car.progress });
            }

            setDrive({ ...car });
            frame = requestAnimationFrame(loop);
        };

        frame = requestAnimationFrame(loop);
        window.addEventListener('keydown', onDown, true);
        window.addEventListener('keyup', onUp, true);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('keydown', onDown, true);
            window.removeEventListener('keyup', onUp, true);
        };
    }, [ active, !!start ]);

    return drive;
};

/**
 * HabboKart (`kart/show`, from the Game Center): a race round a circuit made of the hotel's own track pieces
 * (sporttrack), at the start lights, each player at the wheel of one of the hotel's car effects. Each window drives
 * its car (arrows); the others are seen where they last said they were. Three laps; the first across the line wins.
 * It runs on the server's tables (`/api/hall`, game `kart`).
 */
export const KartView: FC = () => {
    const g = useHallGame('kart', 'kart', 200);
    const zoom = useStageZoom(STAGE_W, STAGE_H);
    const table = g.table;
    const board = table?.board;
    const players = table?.players ?? [];
    const cars = (board?.cars as ICar[]) ?? [];
    const track = (board?.track as number[][]) ?? [];
    const laps = Number(board?.laps ?? 3);
    const startsIn = Number(board?.startsIn ?? 0);
    const playing = table?.state === 'playing';
    const you = table?.you ?? -1;
    const mine = cars[you];
    const racing = playing && startsIn <= 0 && !!mine && mine.place === 0 && !mine.out;
    const inFlight = useRef(false);
    const send = (move: Record<string, unknown>) => {
        if (inFlight.current) return;

        inFlight.current = true;
        g.send(move);
        setTimeout(() => {
            inFlight.current = false;
        }, 100);
    };
    const start = mine ? { x: mine.startX, y: mine.startY, angle: 0, progress: -0.35 - Math.floor(you / 2) * 0.5 } : null;
    const drive = useDrive(racing, start, track, send);
    const pieces = useMemo(() => piecesOf(track), [ track.join('|') ]);
    const furni = useFurniIds([ 'sporttrack1*2', 'sporttrack2*2', 'sporttrack3*2', 'traffic_light*1', 'bump_tires', 'horse_fin_flag', 'barrier*3' ]);

    if (!g.visible) return null;

    const rules = kt('rules', 'Three laps of the circuit at the wheel of a hotel car! Up arrow to speed up, down to brake, left and right to turn. The grass slows you down: stay on the road. The first across the line wins!');
    const order = cars.map((car, seat) => ({ car, seat })).sort((a, b) => (a.car.place || 99) - (b.car.place || 99) || b.car.progress - a.car.progress);
    const myRank = order.findIndex((entry) => entry.seat === you) + 1;
    const myLap = drive ? Math.max(1, Math.min(laps, 1 + Math.floor(drive.progress / Math.max(1, track.length)))) : mine?.lap ?? 1;

    return (
        <NativeTextTree>
            <div className="minigame-world kart-world">
                <div className="minigame-stage" style={{ width: STAGE_W * zoom, height: STAGE_H * zoom }}>
                    <div className="minigame-stage__inner" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${ zoom })` }}>
                        <img className="minigame-backdrop" src={groundImage} alt="" width={STAGE_W} height={STAGE_H} draggable={false} />
                        {pieces.map((piece) => furni[piece.name] !== undefined && (
                            <Furni key={`${ piece.block[0] }-${ piece.block[1] }`} id={furni[piece.name]} x={piece.block[0] * 2} y={piece.block[1] * 2} dir={piece.dir} size={2} depth={1} />
                        ))}
                        {furni['traffic_light*1'] !== undefined && <Furni id={furni['traffic_light*1']} x={8} y={2} dir={2} size={1} depth={105} />}
                        {furni['horse_fin_flag'] !== undefined && <Furni id={furni['horse_fin_flag']} x={9} y={2} dir={2} size={1} depth={115} />}
                        {furni['bump_tires'] !== undefined && [ [ 4, 3 ], [ 6, 4 ], [ 12, 3 ], [ 12, 8 ], [ 2, 9 ] ].map(([ x, y ]) => <Furni key={`t${ x }-${ y }`} id={furni['bump_tires']} x={x} y={y} dir={0} size={1} depth={(x + y) * 10 + 5} />)}
                        {players.map((player, seat) => {
                            const car = cars[seat];

                            if (!car || car.out) return null;

                            const own = seat === you && drive;

                            return <Car key={player.userId} player={player} seat={seat} x={own ? drive.x : car.x} y={own ? drive.y : car.y} angle={own ? drive.angle : car.angle} you={seat === you} smooth={!own} />;
                        })}
                        {playing && startsIn > 0 && <span className="minigame-count" style={{ left: STAGE_W / 2, top: STAGE_H / 2 }} data-browser-text>{Math.ceil(startsIn / 1000)}</span>}
                    </div>
                </div>

                <MiniGameTopBar game="kart" g={g} title={kt('title', 'HabboKart')}>
                    {playing && <span className="minigame-topbar__info">{startsIn > 0 ? kt('starting', 'Engines on...') : mine?.place ? kt('arrived', 'Finished! Place: %n%', [ 'n' ], [ String(mine.place) ]) : kt('racing', 'Lap %lap%/%laps% · Place %n%/%count%', [ 'lap', 'laps', 'n', 'count' ], [ String(myLap), String(laps), String(myRank), String(cars.length) ])}</span>}
                </MiniGameTopBar>

                {playing && (
                    <div className="kart-ranking" data-browser-text>
                        {order.map(({ car, seat }, index) => (
                            <span key={seat} className={`kart-ranking__row ${ seat === you ? 'is-you' : '' }`}>
                                <strong>{index + 1}</strong>
                                <span>{players[seat]?.name ?? ''}</span>
                                <em>{car.place ? kt('done', 'arrived') : kt('lap', 'lap %n%', [ 'n' ], [ String(car.lap) ])}</em>
                            </span>
                        ))}
                    </div>
                )}

                {table?.state === 'waiting' && <MiniGameWaiting game="kart" g={g} table={table} seats={SEATS} className="kart-panel" rules={rules} />}

                {g.error && <div className="minigame-toast" data-browser-text>{g.error}</div>}
            </div>

            {!table && <MiniGameLobby game="kart" g={g} className="kart-lobby" title={kt('title', 'HabboKart')} intro={rules} banner={bannerImage} seats={SEATS} />}

            {table?.state === 'finished' && (
                <MiniGameResults game="kart" g={g} table={table} className="kart-results" title={kt('results', 'The finish')}
                    rows={cars.map((car, seat) => ({ seat, place: car.place, detail: car.time > 0 ? mgt('seconds', '%n% s', [ 'n' ], [ (car.time / 1000).toFixed(1) ]) : kt('not_arrived', 'not arrived') }))
                        .sort((a, b) => (a.place || 99) - (b.place || 99))} />
            )}
        </NativeTextTree>
    );
};
