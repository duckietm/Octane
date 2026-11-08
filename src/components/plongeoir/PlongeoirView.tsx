import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { AvatarAction } from '@octane/renderer';
import { IHallPlayer, IHallTable } from '../../api';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { Button } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import bannerImage from '../../assets/images/plongeoir/pl-banner.png';
import poolImage from '../../assets/images/plongeoir/pl-pool.png';
import ropesImage from '../../assets/images/plongeoir/pl-ropes.png';
import towerImage from '../../assets/images/plongeoir/pl-tower.png';
import waterImage from '../../assets/images/plongeoir/pl-water.png';
import { MiniGameLobby, MiniGameResults, MiniGameTopBar, MiniGameWaiting } from '../minigame/MiniGameParts';
import { useHallGame, useStageZoom } from '../minigame/useHallGame';
import { useUnoAvatar } from '../uno/useUnoAvatar';
import { DiveKey, IDiver, diveStep, newDiver, replayDive } from './PlongeoirEngine';
import { IDiverLook, PlongeoirDiver, PlongeoirSprite, diverLook } from './PlongeoirDiver';
import '../../css/plongeoir/PlongeoirView.css';

/** A text of the diving board, `plongeoir.<key>`. */
const pt = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`plongeoir.${ key }`, fallback, parameters, replacements);

/** The original stage, shown twice its size. */
const Z = 2;
const STAGE_W = 720;
const TOWER_H = 528;
const POOL_H = 493;
const SEATS: [number, number] = [ 2, 8 ];
const TICK_MS = 100;
/** On the tower for this long, the diver starts running on their own (the Lido waited 45 s). */
const AUTO_RUN_MS = 30_000;
const SKY = '#99ccff';
/** Where the others stand on the pool's deck (feet, original pixels). */
const DECK = [ [ 262, 238 ], [ 318, 228 ], [ 372, 240 ], [ 428, 234 ], [ 486, 246 ], [ 540, 262 ], [ 596, 286 ], [ 650, 302 ] ];
/** The FUSE screen's picture, in the pool view. */
const FUSE = { left: 611, top: 30, width: 98, height: 70 };

const CODES: Record<string, DiveKey> = { KeyA: 'a', KeyD: 'd', KeyW: 'w', KeyE: 'e', KeyS: 's', KeyZ: 'z', KeyX: 'x', Space: ' ' };

interface IDivingPlayer { total: number; last: number; dives: number; voted: boolean; mark: number; out: boolean }

/** The keys' names on this keyboard (a French keyboard has Q and Z where the Lido said A and W). */
const useKeyLabels = (): Record<string, string> => {
    const [ labels, setLabels ] = useState<Record<string, string>>({ KeyA: 'A', KeyD: 'D', KeyW: 'W', KeyE: 'E', KeyS: 'S', KeyZ: 'Z', KeyX: 'X' });

    useEffect(() => {
        const keyboard = (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;

        keyboard?.getLayoutMap?.().then((map) => {
            const next: Record<string, string> = {};

            for (const code of Object.keys(CODES)) {
                if (code !== 'Space') next[code] = (map.get(code) ?? code.slice(3)).toUpperCase();
            }

            setLabels(next);
        }).catch(() => undefined);
    }, []);

    return labels;
};

/** The clouds of the tower view (poolClouds): they drift down to the left, and come back from the right. */
const useClouds = (active: boolean) => {
    const make = () => [ 711, 888, 515, 318 ].map((start) => {
        const h = Math.floor(Math.random() * start / 2) * 2;

        return { start, h, v: (start - h) / 2, every: 1 + Math.floor(Math.random() * 3), member: `pilvi${ 1 + Math.floor(Math.random() * 5) }` };
    });
    const [ clouds, setClouds ] = useState(make);

    useEffect(() => {
        if (!active) return;

        let frame = 0;
        const timer = setInterval(() => {
            frame++;
            setClouds((current) => current.map((cloud) => {
                if (frame % cloud.every !== 0) return cloud;

                let { h, v } = cloud;

                h--;
                if (h % 2 === 0) v++;
                if (h < -45) return { ...cloud, h: cloud.start, v: -34, every: 1 + Math.floor(Math.random() * 3), member: `pilvi${ 1 + Math.floor(Math.random() * 5) }` };

                return { ...cloud, h, v };
            }));
        }, 60);

        return () => clearInterval(timer);
    }, [ active ]);

    return clouds;
};

const Spectator: FC<{ player: IHallPlayer; at: number[]; sign: number; voted: boolean }> = ({ player, at, sign, voted }) => {
    const picture = useUnoAvatar(player.figure, player.gender, 4, AvatarAction.POSTURE_STAND, sign);

    return (
        <div className="plongeoir-spectator" style={{ left: at[0] * Z, top: at[1] * Z }}>
            {picture && <img src={picture} alt="" draggable={false} />}
            <span className={`plongeoir-spectator__name ${ voted ? 'is-voted' : '' }`} data-browser-text>{player.name}</span>
        </div>
    );
};

const TowerScene: FC<{ diver: IDiver | null; look: IDiverLook | null }> = ({ diver, look }) => {
    const clouds = useClouds(true);

    return (
        <div className="plongeoir-scene" style={{ width: STAGE_W * Z, height: TOWER_H * Z, background: SKY }}>
            {clouds.map((cloud, index) => <PlongeoirSprite key={index} name={cloud.member} x={cloud.h} y={cloud.v} />)}
            <img className="plongeoir-backdrop" src={towerImage} alt="" width={STAGE_W * Z} height={TOWER_H * Z} draggable={false} />
            {diver && look && <PlongeoirDiver diver={diver} look={look} />}
        </div>
    );
};

const PoolScene: FC<{ diver: IDiver | null; look: IDiverLook | null; splash: number; spectators: { player: IHallPlayer; sign: number; voted: boolean }[]; fuse: string[] }> = ({ diver, look, splash, spectators, fuse }) => (
    <div className="plongeoir-scene" style={{ width: STAGE_W * Z, height: POOL_H * Z }}>
        <img className="plongeoir-backdrop" src={poolImage} alt="" width={STAGE_W * Z} height={POOL_H * Z} draggable={false} />
        {fuse.length > 0 && (
            <div className="plongeoir-fuse" style={{ left: FUSE.left * Z, top: FUSE.top * Z, width: FUSE.width * Z, height: FUSE.height * Z }} data-browser-text>
                {fuse.map((line, index) => <span key={index}>{line}</span>)}
            </div>
        )}
        {spectators.map((entry, index) => <Spectator key={entry.player.userId} player={entry.player} at={DECK[index % DECK.length]} sign={entry.sign} voted={entry.voted} />)}
        {diver && look && diver.underWater && <PlongeoirDiver diver={diver} look={look} />}
        <img className="plongeoir-backdrop" src={waterImage} alt="" width={STAGE_W * Z} height={POOL_H * Z} draggable={false} />
        {diver && look && !diver.underWater && <PlongeoirDiver diver={diver} look={look} />}
        {diver && splash >= 0 && splash < 20 && <PlongeoirSprite name={`big_splash_${ splash }`} x={diver.h - 15} y={diver.v - 15} opacity={0.75} />}
        <img className="plongeoir-backdrop is-top" src={ropesImage} alt="" width={STAGE_W * Z} height={POOL_H * Z} draggable={false} />
    </div>
);

/** The help window of the tower (ph_instructions): the run keys, the space bar, the seven dive keys. */
const KeyHelp: FC<{ labels: Record<string, string> }> = ({ labels }) => {
    const key = (code: string, left: number, top: number) => <span className="plongeoir-help__key" style={{ left: left * Z, top: top * Z }}>{labels[code]}</span>;

    return (
        <div className="plongeoir-help" data-browser-text>
            <span className="plongeoir-help__label" style={{ top: 0 }}>{pt('help.run', 'Run: one then the other')}</span>
            <span className="plongeoir-help__label" style={{ top: 64 * Z }}>{pt('help.jump', 'Jump')}</span>
            <span className="plongeoir-help__label" style={{ top: 122 * Z }}>{pt('help.dive', 'Dive: hold a key in the air')}</span>
            <div className="plongeoir-help__buttons" style={{ top: 12 * Z }}>
                <PlongeoirSprite name="boottons" x={0} y={0} />
                {key('KeyA', 16, 4)}
                {key('KeyD', 56, 4)}
                <span className="plongeoir-help__key is-space" style={{ left: 10 * Z, top: 74 * Z }}>{pt('help.space', 'Space')}</span>
                {key('KeyW', 16, 145)}
                {key('KeyE', 56, 145)}
                {key('KeyA', -4, 175)}
                {key('KeyS', 36, 175)}
                {key('KeyD', 76, 175)}
                {key('KeyZ', 16, 205)}
                {key('KeyX', 56, 205)}
            </div>
        </div>
    );
};

/** Plays the diver live on the tower: a key each tenth of a second, recorded; the dive is sent once in the water. */
const useLiveDive = (active: boolean, send: (keys: string) => void) => {
    const [ diver, setDiver ] = useState<IDiver | null>(null);
    const sentRef = useRef(false);

    useEffect(() => {
        if (!active) {
            setDiver(null);
            return;
        }

        const live = newDiver();
        const held: string[] = [];
        let pressed: string | null = null;
        let keys = '';
        let auto = 0;
        const started = performance.now();

        sentRef.current = false;
        setDiver({ ...live });

        const onDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;

            if (!(event.code in CODES) || (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))) return;

            event.preventDefault();
            event.stopPropagation();

            if (event.repeat) return;

            pressed = event.code;
            if (!held.includes(event.code)) held.push(event.code);
        };
        const onUp = (event: KeyboardEvent) => {
            const index = held.indexOf(event.code);

            if (index >= 0) held.splice(index, 1);
        };
        const timer = setInterval(() => {
            if (live.status === 'ready') return;

            let key: DiveKey = '0';

            if (pressed) key = CODES[pressed];
            else if (held.length) key = CODES[held[held.length - 1]];

            pressed = null;

            // Asleep on the tower: the diver runs on their own and the board makes them jump.
            if (key === '0' && live.status === 'run' && performance.now() - started > AUTO_RUN_MS) key = auto++ % 2 === 0 ? 'a' : 'd';

            keys += key;
            diveStep(live, key);
            setDiver({ ...live });

            if ((live.status as string) === 'ready' && !sentRef.current) {
                sentRef.current = true;
                send(`0${ keys.replace(/^0+/, '') }`);
            }
        }, TICK_MS);

        window.addEventListener('keydown', onDown, true);
        window.addEventListener('keyup', onUp, true);

        return () => {
            clearInterval(timer);
            window.removeEventListener('keydown', onDown, true);
            window.removeEventListener('keyup', onUp, true);
        };
    }, [ active ]);

    return diver;
};

/** The time inside a phase, carried on between two answers of the server. */
const usePhaseClock = (elapsed: number, receivedAt: number, running: boolean): number => {
    const [ , setTick ] = useState(0);

    useEffect(() => {
        if (!running) return;

        const timer = setInterval(() => setTick((value) => value + 1), 50);

        return () => clearInterval(timer);
    }, [ running ]);

    return elapsed + (performance.now() - receivedAt);
};

/**
 * The Lido's diving board (`plongeoir/show`, from the Game Center): a diving contest at the Lido of Habbo's 2004
 * hotel, with its own pictures. One by one, each player climbs the tower and dives (run, jump, dives in the air);
 * everybody watches the dive played again, then the others hold up their mark. The dives' marks add up over the
 * rounds. It runs on the server's tables (`/api/hall`, game `diving`).
 */
export const PlongeoirView: FC = () => {
    const g = useHallGame('diving', 'plongeoir', 250);
    const table: IHallTable | undefined = g.table;
    const board = table?.board;
    const phase = String(board?.phase ?? '');
    const jumper = Number(board?.jumper ?? -1);
    const players = table?.players ?? [];
    const scores = (board?.players as IDivingPlayer[]) ?? [];
    const playing = table?.state === 'playing';
    const you = table?.you ?? -1;
    const iDive = playing && phase === 'jump' && jumper === you;
    const keys = String(board?.keys ?? '');
    const labels = useKeyLabels();
    const live = useLiveDive(iDive, (sent) => g.send({ keys: sent }));
    const replay = useMemo(() => (keys ? replayDive(keys) : []), [ keys ]);
    const clock = usePhaseClock(Number(board?.elapsed ?? 0), g.receivedRef.current, playing && (phase === 'show' || phase === 'vote' || phase === 'score'));
    const looks = useMemo(() => players.map((player, seat) => diverLook(player, seat)), [ players.map((player) => player.figure).join() ]);
    const zoomFor = useStageZoom(STAGE_W * Z, TOWER_H * Z);
    const [ marked, setMarked ] = useState(-1);

    useEffect(() => setMarked(-1), [ phase, jumper ]);

    if (!g.visible) return null;

    const rules = pt('rules', 'In turn, each player climbs the tower of the Lido and dives: run with two keys one after the other, jump with space, then hold a key in the air for the dives. The others give each dive a mark from 0 to 10: the best total wins!');
    const jumperName = players[jumper]?.name ?? '';
    const look = looks[jumper] ?? null;

    // The dive played again: from the start of the show, a key each tenth of a second.
    let shown: IDiver | null = null;
    let splash = -1;

    if (iDive && live && live.splashTick >= 0) splash = Math.floor(((live.ticks - live.splashTick) * TICK_MS - 250) / 60);

    if (replay.length && phase === 'show') {
        const index = Math.min(replay.length - 1, Math.max(0, Math.floor(clock / TICK_MS)));

        shown = replay[index];

        if (shown.splashTick >= 0) splash = Math.floor((clock - shown.splashTick * TICK_MS - 250) / 60);

        // Out of sight a moment after the splash.
        if (index === replay.length - 1 && clock > (replay.length + 15) * TICK_MS) shown = null;
    }

    const diver = iDive ? live : shown;
    const upView = !!diver && diver.screen === 'up' && (iDive || phase === 'show');
    const spectators = players
        .map((player, seat) => ({ player, seat }))
        .filter(({ seat }) => !(playing && seat === jumper && (phase === 'jump' || phase === 'show')) && !scores[seat]?.out)
        .map(({ player, seat }) => ({ player, voted: phase === 'vote' && !!scores[seat]?.voted, sign: phase === 'score' && seat !== jumper ? scores[seat]?.mark ?? -1 : -1 }));
    const average = Number(board?.average ?? -1);
    const fuse = !playing
        ? []
        : phase === 'jump' ? [ jumperName, pt('fuse.climbing', 'on the tower') ]
            : phase === 'score' ? [ jumperName, average.toFixed(1).replace('.', ',') ]
                : phase === 'intro' ? [ pt('fuse.ready', 'Contest!') ] : [ jumperName ];
    const canMark = playing && phase === 'vote' && you >= 0 && you !== jumper && !scores[you]?.voted && marked < 0;
    const timeLeft = Math.ceil(Number(board?.timeLeft ?? 0) / 1000);
    const topInfo = !playing ? ''
        : phase === 'intro' ? pt('intro', 'The contest begins!')
            : phase === 'jump' ? (iDive ? pt('your_dive', 'Your dive! %s% s', [ 's' ], [ String(timeLeft) ]) : pt('climbing', '%name% climbs the tower...', [ 'name' ], [ jumperName ]))
                : phase === 'show' ? pt('watching', '%name% dives!', [ 'name' ], [ jumperName ])
                    : phase === 'vote' ? pt('voting', 'The judges give their marks... %s% s', [ 's' ], [ String(timeLeft) ])
                        : phase === 'score' ? pt('scored', '%name%: %mark% points', [ 'name', 'mark' ], [ jumperName, average.toFixed(1).replace('.', ',') ]) : '';
    const round = Number(board?.round ?? 0) + 1;
    const rounds = Number(board?.rounds ?? 1);
    const zoom = Math.min(1, zoomFor);

    return (
        <NativeTextTree>
            <div className="minigame-world plongeoir-world">
                <div className="minigame-stage" style={{ width: STAGE_W * Z * zoom, height: (upView ? TOWER_H : POOL_H) * Z * zoom }}>
                    <div className="minigame-stage__inner" style={{ transform: `scale(${ zoom })` }}>
                        {upView
                            ? <TowerScene diver={diver} look={iDive ? looks[you] ?? null : look} />
                            : <PoolScene diver={phase === 'show' || iDive ? diver : null} look={iDive ? looks[you] ?? null : look} splash={splash} spectators={spectators} fuse={fuse} />}
                    </div>
                </div>

                <MiniGameTopBar game="diving" g={g} title={pt('title', 'The diving board')}>
                    {playing && <span className="minigame-topbar__info">{pt('round', 'Round %n%/%max%', [ 'n', 'max' ], [ String(Math.min(round, rounds)), String(rounds) ])} · {topInfo}</span>}
                </MiniGameTopBar>

                {iDive && <KeyHelp labels={labels} />}

                {playing && (
                    <div className="plongeoir-scores" data-browser-text>
                        {players.map((player, seat) => (
                            <span key={player.userId} className={`plongeoir-scores__row ${ seat === jumper ? 'is-jumper' : '' } ${ seat === you ? 'is-you' : '' }`}>
                                <strong>{player.name}</strong>
                                <span>{(scores[seat]?.total ?? 0).toFixed(1).replace('.', ',')}</span>
                            </span>
                        ))}
                    </div>
                )}

                {canMark && (
                    <div className="minigame-panel plongeoir-marks" data-browser-text>
                        <div className="minigame-panel__text">{pt('your_mark', 'Your mark for %name%\'s dive', [ 'name' ], [ jumperName ])}</div>
                        <div className="minigame-panel__actions">
                            {Array.from({ length: 11 }, (_, mark) => (
                                <Button key={mark} variant="secondary" onClick={() => {
                                    setMarked(mark);
                                    g.send({ mark });
                                }}>{String(mark)}</Button>
                            ))}
                        </div>
                    </div>
                )}

                {table?.state === 'waiting' && <MiniGameWaiting game="diving" g={g} table={table} seats={SEATS} className="plongeoir-panel" rules={rules} />}

                {g.error && <div className="minigame-toast" data-browser-text>{g.error}</div>}
            </div>

            {!table && <MiniGameLobby game="diving" g={g} className="plongeoir-lobby" title={pt('title', 'The diving board')} intro={rules} banner={bannerImage} seats={SEATS} />}

            {table?.state === 'finished' && (
                <MiniGameResults game="diving" g={g} table={table} className="plongeoir-results" title={pt('results', 'The contest\'s results')}
                    rows={scores.map((score, seat) => ({ seat, total: score.total }))
                        .sort((a, b) => b.total - a.total)
                        .map((row, index, rows) => ({ seat: row.seat, place: 1 + rows.findIndex((other) => other.total === row.total), detail: pt('points', '%n% points', [ 'n' ], [ row.total.toFixed(1).replace('.', ',') ]) }))} />
            )}
        </NativeTextTree>
    );
};
