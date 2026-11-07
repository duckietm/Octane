import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { GetSessionDataManager, HallApi } from '../../api';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { Button, LayoutFurniImageView } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import bannerImage from '../../assets/images/kart/kart-banner.png';
import logoImage from '../../assets/images/kart/kart-logo.png';
import { MiniGameLobby, MiniGameResults, MiniGameTopBar, MiniGameWaiting } from '../minigame/MiniGameParts';
import { useFurniLoads } from '../minigame/useFurniLoads';
import { useHallGame } from '../minigame/useHallGame';
import { KART_TRACK, KART_WIDTH, kartBox } from './KartTrack';
import { useKartSounds } from './KartSounds';
import { KARTS, KartItem, KartPicture, KartRacer, kartName } from './KartSprite';
import '../../css/kart/KartView.css';

/** A text of HabboKart, `kart.<key>`. */
const kt = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`kart.${ key }`, fallback, parameters, replacements);

const SEATS: [number, number] = [ 2, 8 ];
const TOP_BAR = 44;
const SEND_MS = 110;
const KART_KEY = 'habbi.kart';

const MAX_SPEED = 420;
const ACCEL = 380;
const BRAKE = 700;
const FRICTION = 260;
const TURN = 3.0;
const DRIFT_TURN = 3.9;
const GRASS = 0.45;
const BOOST = 1.45;
const SPIN_MS = 1400;

interface ICar { x: number; y: number; angle: number; progress: number; lap: number; place: number; time: number; robot: boolean; out: boolean; kart: number; item: string; spin: number; boost: number; startX: number; startY: number; startAngle: number; startProgress: number }
interface IPeel { id: number; x: number; y: number }
interface IShell { id: number; to: number; x: number; y: number; flown: number; flight: number }

interface IDrive {
    x: number; y: number; angle: number; move: number; speed: number;
    distance: number; along: number; offRoad: boolean;
    drifting: boolean; driftSide: number; charge: number;
    boostUntil: number; spinUntil: number;
}

/** The hotel's furni round the circuit, placed once: trees and bushes on the grass, tyres on the outside of bends. */
const SCENERY = (() => {
    const names = [ 'ashtree', 'bolly_palm', 'plant_pineapple', 'garden_staringbush', 'plant_yukka', 'garden_jungle', 'plant_big_cactus', 'ashtree' ];
    const placed: { name: string; x: number; y: number }[] = [];
    let seed = 7;
    const random = () => {
        seed = (seed * 16807) % 2147483647;

        return seed / 2147483647;
    };

    for (let distance = 0; distance < KART_TRACK.length; distance += 150) {
        for (const sideSign of [ -1, 1 ]) {
            const side = sideSign * (KART_WIDTH / 2 + 110 + random() * 360);
            const [ x, y ] = KART_TRACK.pointAt(distance, side);

            if (KART_TRACK.locate(x, y)[1] < KART_WIDTH / 2 + 90) continue;
            if (placed.some((item) => Math.hypot(item.x - x, item.y - y) < 120)) continue;

            placed.push({ name: names[Math.floor(random() * names.length)], x, y });
        }
    }

    return placed;
})();

/** The furni of the game hall's catalogue by name (a coloured one by id: `name*n` is not found by name). */
const furniId = (name: string): number | undefined => (name === 'traffic_light*1' ? 1761 : GetSessionDataManager()?.getFloorItemDataByName?.(name)?.id);

const SCENERY_NAMES = [ ...new Set(SCENERY.map((item) => item.name)) ];

const Scenery: FC<{ camX: number; camY: number; width: number; height: number; loads: number }> = ({ camX, camY, width, height, loads }) => {
    const items = SCENERY.filter((item) => Math.abs(item.x - camX) < width / 2 + 200 && Math.abs(item.y - camY) < height / 2 + 260);

    return (
        <>
            {items.map((item) => {
                const id = furniId(item.name);

                return id === undefined ? null : (
                    <div key={`${ item.x }-${ item.y }`} className="kart-scenery" style={{ left: item.x, top: item.y, zIndex: Math.round(item.y) }}>
                        <LayoutFurniImageView key={loads} productType="s" productClassId={id} direction={2 * 45} style={{ position: 'absolute', transform: 'translate(-50%, -100%)' }} />
                    </div>
                );
            })}
        </>
    );
};

/** The ground and the road, drawn each frame round the camera: tiles of the hotel's floor, the road, its kerbs. */
const useTrackCanvas = (canvas: HTMLCanvasElement | null, camX: number, camY: number) => {
    const assets = useMemo(() => {
        const tile = document.createElement('canvas');

        tile.width = 128;
        tile.height = 64;

        const context = tile.getContext('2d');
        const diamond = (cx: number, cy: number, colour: string) => {
            context.fillStyle = colour;
            context.beginPath();
            context.moveTo(cx, cy - 16);
            context.lineTo(cx + 32, cy);
            context.lineTo(cx, cy + 16);
            context.lineTo(cx - 32, cy);
            context.closePath();
            context.fill();
            context.strokeStyle = 'rgba(0, 0, 0, 0.08)';
            context.stroke();
        };

        context.fillStyle = '#b3a256';
        context.fillRect(0, 0, 128, 64);
        diamond(32, 16, '#b8a85c');
        diamond(96, 16, '#ac9c50');
        diamond(32, 48, '#ac9c50');
        diamond(96, 48, '#b8a85c');
        diamond(0, 0, '#ac9c50');
        diamond(128, 0, '#ac9c50');
        diamond(0, 64, '#ac9c50');
        diamond(128, 64, '#ac9c50');
        diamond(64, 32, '#b5a559');

        const path = new Path2D();

        KART_TRACK.xs.forEach((x, index) => (index ? path.lineTo(x, KART_TRACK.ys[index]) : path.moveTo(x, KART_TRACK.ys[index])));
        path.closePath();

        return { tile, path };
    }, []);

    useEffect(() => {
        if (!canvas) return;

        const context = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const left = camX - width / 2;
        const top = camY - height / 2;
        const pattern = context.createPattern(assets.tile, 'repeat');

        pattern.setTransform(new DOMMatrix().translate(-left, -top));
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.fillStyle = pattern;
        context.fillRect(0, 0, width, height);
        context.setTransform(1, 0, 0, 1, -left, -top);
        context.lineJoin = 'round';
        context.lineCap = 'round';
        context.strokeStyle = '#c8a764';
        context.lineWidth = KART_WIDTH + 70;
        context.stroke(assets.path);
        context.strokeStyle = '#7d5a2c';
        context.lineWidth = KART_WIDTH + 34;
        context.stroke(assets.path);
        context.strokeStyle = '#ffffff';
        context.lineWidth = KART_WIDTH + 28;
        context.stroke(assets.path);
        context.setLineDash([ 34, 34 ]);
        context.strokeStyle = '#ef7a1e';
        context.stroke(assets.path);
        context.setLineDash([]);
        context.strokeStyle = '#6e6c70';
        context.lineWidth = KART_WIDTH;
        context.stroke(assets.path);

        // The start line: a chequered band across the road.
        const [ sx, sy, heading ] = KART_TRACK.pointAt(0, 0);

        context.save();
        context.translate(sx, sy);
        context.rotate(heading);

        for (let row = 0; row < 2; row++) {
            for (let column = 0; column < 11; column++) {
                context.fillStyle = (row + column) % 2 === 0 ? '#f4f4f4' : '#1e1e1e';
                context.fillRect(-12 + row * 12, -KART_WIDTH / 2 + column * (KART_WIDTH / 11), 12, KART_WIDTH / 11);
            }
        }

        context.restore();
        context.setTransform(1, 0, 0, 1, 0, 0);
    });
};

/** The circuit in small, the karts on it. */
const MiniMap: FC<{ cars: ICar[]; you: number; me: IDrive | null }> = ({ cars, you, me }) => {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;

        if (!canvas) return;

        const context = canvas.getContext('2d');
        const scale = 0.065;
        const ox = 4;
        const oy = -14;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.lineJoin = 'round';
        context.beginPath();
        KART_TRACK.xs.forEach((x, index) => (index ? context.lineTo(ox + x * scale, oy + KART_TRACK.ys[index] * scale) : context.moveTo(ox + x * scale, oy + KART_TRACK.ys[index] * scale)));
        context.closePath();
        context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        context.lineWidth = 7;
        context.stroke();
        context.strokeStyle = '#6e6c70';
        context.lineWidth = 4;
        context.stroke();

        cars.forEach((car, seat) => {
            if (car.out) return;

            const x = seat === you && me ? me.x : car.x;
            const y = seat === you && me ? me.y : car.y;

            context.fillStyle = KARTS[car.kart % KARTS.length].colour;
            context.strokeStyle = seat === you ? '#ffffff' : '#000000';
            context.lineWidth = seat === you ? 2 : 1;
            context.beginPath();
            context.arc(ox + x * scale, oy + y * scale, seat === you ? 5 : 3.5, 0, Math.PI * 2);
            context.fill();
            context.stroke();
        });
    });

    return <canvas ref={ref} className="kart-minimap" width={224} height={146} />;
};

/** Held keys and on-screen buttons: the direction wanted on the screen, drift, reverse, item. */
const useControls = (active: boolean) => {
    const held = useRef(new Set<string>());
    const pressed = useRef(new Set<string>());

    useEffect(() => {
        if (!active) return;

        const keys: Record<string, string> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Shift: 'drift', ' ': 'item', r: 'back', R: 'back' };
        const onDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const key = keys[event.key];

            if (!key || (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))) return;

            event.preventDefault();
            event.stopPropagation();

            if (!held.current.has(key)) pressed.current.add(key);

            held.current.add(key);
        };
        const onUp = (event: KeyboardEvent) => {
            const key = keys[event.key];

            if (key) held.current.delete(key);
            if (event.key === 'Shift') held.current.delete('drift');
        };

        window.addEventListener('keydown', onDown, true);
        window.addEventListener('keyup', onUp, true);

        return () => {
            window.removeEventListener('keydown', onDown, true);
            window.removeEventListener('keyup', onUp, true);
            held.current.clear();
        };
    }, [ active ]);

    const press = (key: string, down: boolean) => {
        if (down) {
            if (!held.current.has(key)) pressed.current.add(key);
            held.current.add(key);
        } else held.current.delete(key);
    };

    return { held, pressed, press };
};

const PadButton: FC<{ label: string; control: string; press: (key: string, down: boolean) => void; className?: string }> = ({ label, control, press, className = '' }) => (
    <button type="button" className={`kart-pad__button ${ className }`}
        onPointerDown={(event) => {
            event.preventDefault();
            press(control, true);
        }}
        onPointerUp={() => press(control, false)}
        onPointerLeave={() => press(control, false)}>{label}</button>
);

const formatTime = (ms: number): string => {
    const total = Math.max(0, ms) / 1000;
    const minutes = Math.floor(total / 60);
    const seconds = total - minutes * 60;

    return `${ minutes }:${ seconds.toFixed(2).padStart(5, '0') }`;
};

/** The kart choice: the player's avatar in each kart, and how to race (online, or against robots). */
const KartChoice: FC<{ kart: number; onKart: (kart: number) => void; onOnline: () => void; onBots: () => void; busy: boolean }> = ({ kart, onKart, onOnline, onBots, busy }) => {
    const figure = GetSessionDataManager()?.figure ?? '';
    const gender = GetSessionDataManager()?.gender ?? 'M';

    return (
        <div className="kart-choice" data-browser-text>
            <img className="kart-choice__logo" src={logoImage} alt="HabboKart" draggable={false} />
            <div className="kart-choice__title">{kt('choose', 'Choose your kart')}</div>
            <div className="kart-choice__karts">
                {KARTS.map((entry, index) => (
                    <button key={entry.name} type="button" className={`kart-choice__kart ${ index === kart ? 'is-on' : '' }`} onClick={() => onKart(index)}>
                        <span className="kart-choice__picture"><KartPicture kart={index} direction={2} figure={figure} gender={gender} /></span>
                        <span className="kart-choice__name" style={{ color: entry.colour }}>{kartName(index)}</span>
                    </button>
                ))}
            </div>
            <div className="kart-choice__text">{kt('rules', 'Three laps, up to eight drivers. Press the arrow of the direction you want to go on the screen: the kart turns and drives on its own. Hold Shift while turning to drift and charge a turbo. Pick up the "?" boxes and use your item with Space!')}</div>
            <div className="kart-choice__buttons">
                <Button variant="success" disabled={busy} onClick={onOnline}>{kt('online', 'Online race')}</Button>
                <Button variant="secondary" disabled={busy} onClick={onBots}>{kt('bots', 'Against robots')}</Button>
            </div>
        </div>
    );
};

/**
 * HabboKart (`kart/show`, from the Game Center): choose a kart, then race three laps of a circuit, the camera behind
 * your kart. The arrows give the direction wanted on the screen: the kart turns towards it and drives on its own;
 * Shift drifts (a turbo when let go), R reverses, Space uses the item of a "?" box (a turbo, a banana peel, a shell).
 * Each window drives its own kart and tells the race (`/api/hall`, game `kart`) where it is; the race keeps the boxes,
 * the peels, the shells and the order.
 */
export const KartView: FC = () => {
    const g = useHallGame('kart', 'kart', 150);
    const table = g.table;
    const board = table?.board;
    const players = table?.players ?? [];
    const cars = (board?.cars as ICar[]) ?? [];
    const peels = (board?.peels as IPeel[]) ?? [];
    const shells = (board?.shells as IShell[]) ?? [];
    const boxes = (board?.boxes as boolean[]) ?? [];
    const laps = Number(board?.laps ?? 3);
    const startsIn = Math.max(0, Number(board?.startsIn ?? 0) - (performance.now() - g.receivedRef.current));
    const playing = table?.state === 'playing';
    const you = table?.you ?? -1;
    const mine = cars[you];
    const racing = playing && startsIn <= 0 && !!mine && mine.place === 0 && !mine.out;
    const [ kart, setKart ] = useState(() => Math.max(0, Math.min(KARTS.length - 1, Number(window.localStorage?.getItem(KART_KEY) ?? 0) || 0)));
    const [ online, setOnline ] = useState(false);
    const [ size, setSize ] = useState({ w: window.innerWidth, h: window.innerHeight - TOP_BAR });
    const [ , setFrame ] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drive = useRef<IDrive | null>(null);
    const shown = useRef(new Map<number, { x: number; y: number; angle: number }>());
    const sentAt = useRef(0);
    const pickedAt = useRef(new Map<number, number>());
    const hitPeels = useRef(new Set<number>());
    const controls = useControls(playing && !!mine);
    const sounds = useKartSounds();
    const lapRef = useRef(0);
    const loads = useFurniLoads(SCENERY_NAMES, [ 1761 ]);

    useEffect(() => {
        const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight - TOP_BAR });

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        window.localStorage?.setItem(KART_KEY, String(kart));
    }, [ kart ]);

    // A new race: the kart on its place of the grid.
    useEffect(() => {
        if (!playing || !mine) {
            drive.current = null;
            return;
        }

        const [ along ] = KART_TRACK.locate(mine.startX, mine.startY);

        drive.current = { x: mine.startX, y: mine.startY, angle: mine.startAngle, move: mine.startAngle, speed: 0, distance: mine.startProgress * KART_TRACK.length, along, offRoad: false, drifting: false, driftSide: 0, charge: 0, boostUntil: 0, spinUntil: 0 };
        hitPeels.current.clear();
        lapRef.current = 0;
    }, [ playing, table?.round, !!mine ]);

    // The race's clock: the kart driven, what it says sent, the others moved smoothly to where they are.
    useEffect(() => {
        if (!g.visible || !table) return;

        let frame = 0;
        let last = performance.now();
        const loop = () => {
            const now = performance.now();
            const elapsedS = Math.min(0.25, (now - last) / 1000);
            const frameS = Math.min(0.05, elapsedS);
            const car = drive.current;

            last = now;

            if (car && racing) {
                const held = controls.held.current;
                const pressed = controls.pressed.current;
                // The kart moves in small steps: a slow screen does not slow the race.
                const step = (dt: number) => {
                    const spinning = now < car.spinUntil;
                    const dx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
                    const dy = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
                    const steering = (dx !== 0 || dy !== 0) && !spinning;
                    const [ along, fromMiddle ] = KART_TRACK.locate(car.x, car.y);
                    const offRoad = fromMiddle > KART_WIDTH / 2 + 16;
                    let top = MAX_SPEED * (offRoad ? GRASS : 1) * (now < car.boostUntil ? BOOST : 1);

                    if (spinning) {
                        car.speed *= Math.pow(0.08, dt);
                        car.angle += 11 * dt;
                        car.move = car.angle;
                        car.drifting = false;
                        car.charge = 0;
                    } else if (held.has('back')) {
                        car.speed = Math.max(-140, car.speed - BRAKE * dt);
                    } else if (steering) {
                        const target = Math.atan2(dy, dx);
                        let diff = Math.atan2(Math.sin(target - car.angle), Math.cos(target - car.angle));
                        const drifting = held.has('drift') && Math.abs(diff) > 0.12 && car.speed > 160;

                        if (drifting && !car.drifting) car.driftSide = Math.sign(diff);

                        car.drifting = drifting;

                        const turn = (drifting ? DRIFT_TURN : TURN) * dt;

                        car.angle += Math.max(-turn, Math.min(turn, diff));
                        diff = Math.atan2(Math.sin(target - car.angle), Math.cos(target - car.angle));

                        if (Math.abs(diff) > 1.9) car.speed -= BRAKE * dt;
                        else car.speed = Math.min(top, car.speed + ACCEL * dt);

                        if (drifting) car.charge += dt;
                    } else {
                        car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), FRICTION * dt);
                        car.drifting = false;
                    }

                    // A drift let go: a turbo, longer for a longer drift.
                    if (!car.drifting && car.charge > 0) {
                        if (car.charge > 0.7) {
                            car.boostUntil = now + (car.charge > 1.6 ? 1200 : 750);
                            sounds.boost();
                        }
                        car.charge = 0;
                    }

                    if (car.speed > top) car.speed = Math.max(top, car.speed - BRAKE * 0.6 * dt);

                    // Drifting, the kart slides: it moves a little off the way it faces.
                    const slide = car.drifting ? car.driftSide * 0.32 : 0;

                    car.move = car.angle - slide;
                    car.x = Math.max(-300, Math.min(4000, car.x + Math.cos(car.move) * car.speed * dt));
                    car.y = Math.max(-300, Math.min(3100, car.y + Math.sin(car.move) * car.speed * dt));
                    car.offRoad = offRoad;

                    let step = along - car.along;

                    if (step < -KART_TRACK.length / 2) step += KART_TRACK.length;
                    if (step > KART_TRACK.length / 2) step -= KART_TRACK.length;
                    if (Math.abs(step) < 300) car.distance += step;

                    car.along = along;
                };
                const steps = Math.max(1, Math.ceil(elapsedS / 0.02));

                for (let index = 0; index < steps; index++) step(elapsedS / steps);

                const move: Record<string, unknown> = {};

                // A "?" box driven through.
                if (mine && !mine.item) {
                    boxes.forEach((there, index) => {
                        const [ bx, by ] = kartBox(index);

                        if (there && Math.hypot(bx - car.x, by - car.y) < 46 && now - (pickedAt.current.get(index) ?? 0) > 1500) {
                            pickedAt.current.set(index, now);
                            move.pick = index;
                            sounds.pickup();
                        }
                    });
                }

                // A peel run over.
                for (const peel of peels) {
                    if (!hitPeels.current.has(peel.id) && Math.hypot(peel.x - car.x, peel.y - car.y) < 26) {
                        hitPeels.current.add(peel.id);
                        car.spinUntil = now + SPIN_MS;
                        move.hit = peel.id;
                        sounds.hit();
                    }
                }

                if (pressed.has('item') && mine?.item) {
                    if (mine.item === 'boost') {
                        car.boostUntil = now + 1300;
                        sounds.boost();
                    } else sounds.item(mine.item);

                    move.use = true;
                }

                pressed.clear();
                sounds.engine({ speed: car.speed * (now < car.boostUntil ? 1.2 : 1), drifting: car.drifting, offRoad: car.offRoad });

                // A new lap crossed.
                const lapNow = Math.floor(car.distance / KART_TRACK.length);

                if (lapNow > lapRef.current && lapNow >= 1 && lapNow < laps) sounds.lap(lapNow === laps - 1);
                lapRef.current = Math.max(lapRef.current, lapNow);

                if (now - sentAt.current > SEND_MS || Object.keys(move).length) {
                    sentAt.current = now;
                    g.send({ ...move, x: car.x, y: car.y, angle: car.angle, progress: car.distance / KART_TRACK.length, kart });
                }
            }

            // The engine idles on the grid, stops once the line is crossed.
            if (!(car && racing)) sounds.engine(playing && mine && !mine.place && !mine.out ? { speed: 0, drifting: false, offRoad: false } : null);

            // The others, eased to where the race says they are.
            cars.forEach((other, seat) => {
                const current = shown.current.get(seat) ?? { x: other.x, y: other.y, angle: other.angle };
                const ease = Math.min(1, frameS * 9);

                current.x += (other.x - current.x) * ease;
                current.y += (other.y - current.y) * ease;
                current.angle += Math.atan2(Math.sin(other.angle - current.angle), Math.cos(other.angle - current.angle)) * ease;
                shown.current.set(seat, current);
            });

            setFrame((value) => value + 1);
            frame = requestAnimationFrame(loop);
        };

        frame = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(frame);
    }, [ g.visible, !!table, racing, playing, cars, boxes, peels, mine, kart ]);

    // The start's lights: a beep each second, a higher one for the start.
    const lightsNow = playing && startsIn > 0 ? Math.min(3, Math.ceil(startsIn / 1000)) : 0;
    const beeped = useRef(-1);

    useEffect(() => {
        if (!playing) {
            beeped.current = -1;
            return;
        }

        if (lightsNow === beeped.current) return;
        if (lightsNow > 0) sounds.beep(false);
        else if (beeped.current > 0) sounds.beep(true);

        beeped.current = lightsNow;
    }, [ playing, lightsNow ]);

    // The music during a race; a shell's hit; the finish.
    useEffect(() => {
        sounds.playMusic(g.visible && playing && !!mine && !mine.place);
    }, [ g.visible, playing, !!mine, mine?.place ]);

    useEffect(() => {
        if (mine?.spin > 0 && performance.now() >= (drive.current?.spinUntil ?? 0) - SPIN_MS + 700) sounds.hit();
    }, [ mine?.spin > 0 ]);

    useEffect(() => {
        if (mine?.place > 0) sounds.finish(mine.place === 1);
    }, [ mine?.place ]);

    useEffect(() => {
        if (!g.visible) {
            sounds.engine(null);
            sounds.playMusic(false);
        }
    }, [ g.visible ]);

    // The race's spins for this kart (a shell).
    useEffect(() => {
        if (drive.current && mine && mine.spin > 0) drive.current.spinUntil = Math.max(drive.current.spinUntil, performance.now() + mine.spin);
    }, [ mine?.spin ]);

    const me = drive.current;
    const camX = me?.x ?? mine?.startX ?? KART_TRACK.xs[0];
    const camY = me?.y ?? mine?.startY ?? KART_TRACK.ys[0];

    useTrackCanvas(canvasRef.current, camX, camY);

    if (!g.visible) return null;

    const createWithBots = () => g.run(async () => {
        await HallApi.create('kart', 6, true);

        for (let index = 0; index < 5; index++) await HallApi.addBot('kart');

        return HallApi.start('kart');
    });
    const order = cars.map((car, seat) => ({ car, seat, progress: seat === you && me ? me.distance / KART_TRACK.length : car.progress }))
        .sort((a, b) => (a.car.place || 99) - (b.car.place || 99) || b.progress - a.progress);
    const myRank = order.findIndex((entry) => entry.seat === you) + 1;
    const myLap = me ? Math.max(1, Math.min(laps, 1 + Math.floor(me.distance / KART_TRACK.length))) : mine?.lap ?? 1;
    const elapsed = Number(board?.elapsed ?? 0) + (performance.now() - g.receivedRef.current);
    const raceTime = mine?.place ? mine.time : elapsed;
    const showRace = !!table;
    const lights = startsIn > 0 ? Math.min(3, Math.ceil(startsIn / 1000)) : 0;

    return (
        <NativeTextTree>
            <div className="minigame-world kart-world">
                {showRace && (
                    <div className="kart-race" style={{ width: size.w, height: size.h }}>
                        <canvas ref={canvasRef} className="kart-race__ground" width={size.w} height={size.h} />
                        <div className="kart-race__world" style={{ transform: `translate(${ Math.round(size.w / 2 - camX) }px, ${ Math.round(size.h / 2 - camY) }px)` }}>
                            <Scenery camX={camX} camY={camY} width={size.w} height={size.h} loads={loads} />
                            {(() => {
                                const [ lx, ly ] = KART_TRACK.pointAt(30, KART_WIDTH / 2 + 40);
                                const id = furniId('traffic_light*1');

                                return id === undefined ? null : (
                                    <div className="kart-scenery" style={{ left: lx, top: ly, zIndex: Math.round(ly) }}>
                                        <LayoutFurniImageView key={loads} productType="s" productClassId={id} direction={2 * 45} style={{ position: 'absolute', transform: 'translate(-50%, -100%)' }} />
                                    </div>
                                );
                            })()}
                            {boxes.map((there, index) => {
                                if (!there) return null;

                                const [ bx, by ] = kartBox(index);

                                return <KartItem key={`b${ index }`} name="box" className="kart-world-item is-box" style={{ left: bx - 20, top: by - 32, zIndex: Math.round(by) }} />;
                            })}
                            {peels.map((peel) => <KartItem key={`p${ peel.id }`} name="banana" size={34} className="kart-world-item" style={{ left: peel.x - 17, top: peel.y - 26, zIndex: Math.round(peel.y) }} />)}
                            {shells.map((shell) => {
                                const target = shell.to >= 0 ? (shell.to === you && me ? me : shown.current.get(shell.to)) : null;
                                const t = Math.min(1, shell.flown / shell.flight);
                                const x = target ? shell.x + (target.x - shell.x) * t : shell.x;
                                const y = target ? shell.y + (target.y - shell.y) * t : shell.y - t * 200;

                                return <KartItem key={`s${ shell.id }`} name="shell" size={32} className="kart-world-item is-shell" style={{ left: x - 16, top: y - 24, zIndex: Math.round(y) + 3 }} />;
                            })}
                            {cars.map((car, seat) => {
                                const player = players[seat];

                                if (!player || car.out) return null;

                                const own = seat === you && me;
                                const at = own ? me : shown.current.get(seat) ?? car;
                                const spinning = own ? performance.now() < me.spinUntil : car.spin > 0;
                                const boosting = own ? performance.now() < me.boostUntil : car.boost > 0;

                                return (
                                    <div key={player.userId} className={`kart-racer ${ boosting ? 'is-boost' : '' } ${ own && me.drifting ? 'is-drift' : '' }`} style={{ left: at.x, top: at.y, zIndex: Math.round(at.y) + 2 }}>
                                        <KartRacer kart={own ? kart : car.kart} angle={at.angle} figure={player.figure} gender={player.gender} spinning={spinning} />
                                        <span className="kart-racer__name" style={{ color: KARTS[(own ? kart : car.kart) % KARTS.length].colour }} data-browser-text>{player.name}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {playing && (
                            <>
                                <div className="kart-hud" data-browser-text>
                                    <span className="kart-hud__rank">{myRank || '-'}<small>{myRank === 1 ? kt('first', 'st') : kt('nth', 'th')}/{cars.length}</small></span>
                                    <span className="kart-hud__lap">{kt('lap_of', 'Lap %n%/%m%', [ 'n', 'm' ], [ String(myLap), String(laps) ])}</span>
                                    <span className="kart-hud__time">{formatTime(startsIn > 0 ? 0 : raceTime)}</span>
                                </div>
                                <div className="kart-slot">{mine?.item ? <KartItem name={mine.item} size={48} /> : null}</div>
                                <MiniMap cars={cars} you={you} me={me} />
                            </>
                        )}

                        {playing && startsIn > 0 && (
                            <div className="kart-start" data-browser-text>
                                <div className="kart-start__lights">
                                    {[ 3, 2, 1 ].map((light) => <span key={light} className={`kart-start__light ${ lights <= light ? 'is-on' : '' }`} />)}
                                </div>
                                <span className="kart-start__count">{lights}</span>
                            </div>
                        )}
                        {playing && startsIn <= 0 && elapsed < 1500 && <span className="kart-go" data-browser-text>{kt('go', 'Go!')}</span>}
                        {mine?.place > 0 && table?.state === 'playing' && <span className="kart-go is-finish" data-browser-text>{kt('finished', 'Finished! %n%', [ 'n' ], [ `${ mine.place }${ mine.place === 1 ? kt('first', 'st') : kt('nth', 'th') }` ])}</span>}

                        {playing && mine && (
                            <>
                                <div className="kart-pad" data-browser-text>
                                    <PadButton label="▲" control="up" press={controls.press} className="is-up" />
                                    <PadButton label="◀" control="left" press={controls.press} className="is-left" />
                                    <PadButton label="▼" control="down" press={controls.press} className="is-down" />
                                    <PadButton label="▶" control="right" press={controls.press} className="is-right" />
                                </div>
                                <div className="kart-help" data-browser-text>
                                    <span><b>↑ ↓ ← →</b> {kt('help.arrows', 'the direction to go on the screen: the kart turns and drives on its own')}</span>
                                    <span>{kt('help.release', 'let go of everything to slow down')}</span>
                                    <span><b>Maj</b> {kt('help.drift', 'drift in the bends (hold it to charge the turbo, let go to fire it)')}</span>
                                    <span><b>R</b> {kt('help.back', 'reverse (to get out of a wall)')}</span>
                                    <span><b>{kt('help.space_key', 'Space')}</b> {kt('help.item', 'item')}</span>
                                </div>
                                <div className="kart-actions" data-browser-text>
                                    <PadButton label={kt('item', 'Item')} control="item" press={controls.press} />
                                    <PadButton label={kt('drift', 'Drift')} control="drift" press={controls.press} />
                                    <PadButton label={kt('back', 'Reverse')} control="back" press={controls.press} />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {!table && !online && <KartChoice kart={kart} onKart={setKart} busy={g.busy} onOnline={() => setOnline(true)} onBots={createWithBots} />}

                <MiniGameTopBar game="kart" g={g} title={kt('title', 'HabboKart')}>
                    <button type="button" className={`kart-sound ${ sounds.music ? '' : 'is-off' }`} onClick={sounds.toggleMusic} data-browser-text>{kt('sound.music', 'Music')}</button>
                    <button type="button" className={`kart-sound ${ sounds.effects ? '' : 'is-off' }`} onClick={sounds.toggleEffects} data-browser-text>{kt('sound.effects', 'Sounds')}</button>
                    {playing && <span className="minigame-topbar__info">{kartName(kart)}</span>}
                </MiniGameTopBar>

                {table?.state === 'waiting' && <MiniGameWaiting game="kart" g={g} table={table} seats={SEATS} className="kart-panel" rules={kt('waiting_rules', 'Your kart: %k%. Three laps: the first across the line wins!', [ 'k' ], [ kartName(kart) ])} />}

                {g.error && <div className="minigame-toast" data-browser-text>{g.error}</div>}
            </div>

            {!table && online && <MiniGameLobby game="kart" g={g} className="kart-lobby" title={kt('title', 'HabboKart')} intro={kt('lobby', 'Join a race, or open one and wait for the others. Your kart: %k%.', [ 'k' ], [ kartName(kart) ])} banner={bannerImage} seats={SEATS} />}

            {table?.state === 'finished' && (
                <MiniGameResults game="kart" g={g} table={table} className="kart-results" title={kt('results', 'The finish')}
                    rows={cars.map((car, seat) => ({ seat, place: car.place, detail: car.time > 0 ? formatTime(car.time) : kt('not_arrived', 'not arrived') }))
                        .sort((a, b) => (a.place || 99) - (b.place || 99))} />
            )}
        </NativeTextTree>
    );
};
