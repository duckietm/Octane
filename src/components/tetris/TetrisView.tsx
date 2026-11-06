import { AvatarAction } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import arcadeImage from '../../assets/images/tetris/tetris-arcade.png';
import bannerImage from '../../assets/images/tetris/tetris-banner.png';
import { MiniGameAvatar, MiniGameLobby, MiniGameResults, MiniGameTopBar, MiniGameWaiting } from '../minigame/MiniGameParts';
import { useHallGame, useStageZoom } from '../minigame/useHallGame';
import { SHAPES, TetrisEngine, W, cellsOf } from './TetrisEngine';
import '../../css/tetris/TetrisView.css';

/** A text of the blocks duel, `tetrisduel.<key>`. */
const tt = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`tetrisduel.${key}`, fallback, parameters, replacements);

/** The arcade (tetris-arcade.png, deploy/scripts/tetris-art.py) is drawn at 1x and shown twice its size. */
const STAGE_W = 960;
const STAGE_H = 640;
const SEATS: [number, number] = [ 2, 4 ];
/** The small cabinets the others play on, in the order they are given (their middles). */
const SMALL_CABINETS = [ 204, 756, 76, 884 ];
const SEND_EVERY_MS = 1500;

interface IRemoteBoard { board: string; lines: number; score: number; level: number; received: number; out: boolean; place: number }

const Cell: FC<{ value: number; ghost?: boolean }> = ({ value, ghost = false }) => <span className={`tetris-cell ${value ? `is-${value}` : ''} ${ghost ? 'is-ghost' : ''}`} />;

const MiniPiece: FC<{ type: number }> = ({ type }) => {
    const cells = type < 0 ? new Set<number>() : new Set(SHAPES[type].map(([ x, y ]) => y * 4 + x));

    return (
        <span className="tetris-mini-piece">
            {Array.from({ length: 8 }, (_, index) => <Cell key={index} value={cells.has(index) ? type + 1 : 0} />)}
        </span>
    );
};

/**
 * The blocks duel (`tetrisduel/show`, from the Game Center): an arcade, the player at the big cabinet in the middle,
 * the others at the small ones. Each plays their own well here; clearing two rows or more at once sends rubbish to
 * the others, the last one standing wins. The well is sent to the server (`/api/hall`, game `tetris`) when a piece
 * locks and every 1.5 s; the others' wells come back with the table, asked for every 250 ms.
 */
export const TetrisView: FC = () => {
    const g = useHallGame('tetris', 'tetrisduel', 250);
    const zoom = useStageZoom(STAGE_W, STAGE_H);
    const table = g.table;
    const board = table?.board;
    const boards = (board?.boards as IRemoteBoard[]) ?? [];
    const mine = table ? boards[table.you] : undefined;
    const startsIn = Number(board?.startsIn ?? 0);
    const playing = table?.state === 'playing' && !!mine && !mine.out && startsIn <= 0;
    const round = table?.round ?? 0;
    const engineRef = useRef<{ round: number; engine: TetrisEngine }>({ round: -1, engine: new TetrisEngine() });
    const sentAt = useRef(0);
    const [ , setFrame ] = useState(0);

    if (engineRef.current.round !== round) engineRef.current = { round, engine: new TetrisEngine() };

    const engine = engineRef.current.engine;

    const report = (extra: Record<string, unknown>) => {
        sentAt.current = performance.now();
        g.send({ board: engine.snapshot(), lines: engine.lines, score: engine.score, level: engine.level, ...extra });
    };

    // The rubbish the others sent.
    useEffect(() => {
        if (!mine || !playing) return;

        const incoming = mine.received - engine.applied;

        if (incoming > 0) {
            engine.applied = mine.received;
            engine.addRubbish(incoming);
        }
    }, [ mine?.received, playing, engine ]);

    useEffect(() => {
        if (!playing) return;

        if (!engine.piece) engine.start(performance.now());

        let handle = 0;
        const loop = () => {
            const now = performance.now();
            const cleared = engine.step(now);

            if (engine.out) {
                report({ out: true, cleared: 0 });
                setFrame((value) => value + 1);
                return;
            }

            if (cleared !== 0) report({ cleared: Math.max(0, cleared) });
            else if (now - sentAt.current > SEND_EVERY_MS) report({ cleared: 0 });

            setFrame((value) => value + 1);
            handle = requestAnimationFrame(loop);
        };

        handle = requestAnimationFrame(loop);

        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;

            if (engine.out || !engine.piece || (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))) return;

            const now = performance.now();
            let handled = true;

            switch (event.key) {
                case 'ArrowLeft': engine.move(-1, now); break;
                case 'ArrowRight': engine.move(1, now); break;
                case 'ArrowDown':
                    if (engine.down()) engine.score += 1;
                    engine.dropAt = now + engine.gravity;
                    break;
                case 'ArrowUp': case 'x': case 'X': engine.rotate(1, now); break;
                case 'z': case 'Z': case 'w': case 'W': engine.rotate(-1, now); break;
                case 'c': case 'C': case 'Shift': engine.swapHold(now); break;
                case ' ': {
                    if (event.repeat) break;

                    const cleared = engine.hardDrop(now);

                    report(engine.out ? { out: true, cleared: 0 } : { cleared });
                    break;
                }
                default: handled = false;
            }

            if (handled) {
                event.preventDefault();
                event.stopPropagation();
                setFrame((value) => value + 1);
            }
        };

        window.addEventListener('keydown', onKey, true);

        return () => {
            cancelAnimationFrame(handle);
            window.removeEventListener('keydown', onKey, true);
        };
    }, [ playing, engine ]);

    if (!g.visible) return null;

    const rules = tt('rules', 'Everyone plays their own well. Clear two rows or more at once to send rubbish to the others: the last one standing wins! Arrows to move and turn, space to drop, C to keep a piece.');
    const players = table?.players ?? [];
    const out = engine.out || !!mine?.out;
    const showLocal = !!table && table.state !== 'waiting' && !!mine;
    const ghost = engine.piece && !engine.out ? new Set(cellsOf(engine.ghost()).map(([ x, y ]) => y * W + x)) : new Set<number>();
    const live = engine.piece && !engine.out ? new Map(cellsOf(engine.piece).map(([ x, y ]) => [ y * W + x, engine.piece.type + 1 ])) : new Map<number, number>();
    const others = players.map((player, seat) => ({ player, seat })).filter(({ seat }) => seat !== table?.you);
    const me = table ? players[table.you] : undefined;
    const timeLeft = Number(board?.timeLeft ?? 0);

    return (
        <NativeTextTree>
            <div className="minigame-world tetris-world">
                <div className="minigame-stage" style={{ width: STAGE_W * zoom, height: STAGE_H * zoom }}>
                    <div className="minigame-stage__inner" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${zoom})` }}>
                        <img className="minigame-backdrop" src={arcadeImage} alt="" width={STAGE_W} height={STAGE_H} draggable={false} />

                        <div className="tetris-screen" data-browser-text>
                            <div className="tetris-screen__side">
                                <span className="tetris-label">{tt('hold', 'Kept (C)')}</span>
                                <MiniPiece type={showLocal ? engine.hold : -1} />
                                <span className="tetris-label">{tt('score', 'Score')}</span>
                                <strong>{showLocal ? engine.score : 0}</strong>
                                <span className="tetris-label">{tt('lines', 'Rows')}</span>
                                <strong>{showLocal ? engine.lines : 0}</strong>
                                <span className="tetris-label">{tt('level', 'Level')}</span>
                                <strong>{showLocal ? engine.level : 1}</strong>
                            </div>
                            <div className={`tetris-well ${out ? 'is-out' : ''}`}>
                                {engine.grid.map((value, index) => <Cell key={index} value={showLocal ? live.get(index) ?? value : 0} ghost={showLocal && !value && !live.has(index) && ghost.has(index)} />)}
                                {!table && <span className="tetris-well__message">{tt('insert', 'Open or join a game!')}</span>}
                                {table?.state === 'waiting' && <span className="tetris-well__message">{tt('waiting', 'Waiting for the players...')}</span>}
                                {showLocal && out && <span className="tetris-well__message">{mine?.place ? tt('place', 'Place: %n%', [ 'n' ], [ String(mine.place) ]) : tt('out', 'Topped out!')}</span>}
                            </div>
                            <div className="tetris-screen__side">
                                <span className="tetris-label">{tt('next', 'Next')}</span>
                                {(showLocal ? engine.queue.slice(0, 3) : [ -1, -1, -1 ]).map((type, index) => <MiniPiece key={index} type={type} />)}
                                <span className="tetris-keys">{tt('keys', 'Arrows: move and turn. Space: drop.')}</span>
                            </div>
                            {table?.state === 'playing' && startsIn > 0 && <span className="minigame-count tetris-count">{Math.ceil(startsIn / 1000)}</span>}
                        </div>

                        {others.map(({ player, seat }, index) => {
                            const remote = boards[seat];
                            const middle = SMALL_CABINETS[index];

                            return (
                                <div key={player.userId}>
                                    <div className={`tetris-small ${remote?.out ? 'is-out' : ''}`} style={{ left: middle - 44 }} data-browser-text>
                                        <div className="tetris-small__well">
                                            {[ ...(remote?.board ?? '.'.repeat(200)) ].map((value, cell) => <Cell key={cell} value={value === '.' ? 0 : Number(value)} />)}
                                        </div>
                                        <span className="tetris-small__name">{player.name}</span>
                                        <span>{remote?.score ?? 0}</span>
                                        {remote?.out && <span className="tetris-small__out">{remote.place ? tt('place_short', '%n%e', [ 'n' ], [ String(remote.place) ]) : tt('out_short', 'Out')}</span>}
                                    </div>
                                    <div className="tetris-player" style={{ left: middle }}>
                                        <MiniGameAvatar player={player} direction={0} posture={AvatarAction.POSTURE_STAND} />
                                    </div>
                                </div>
                            );
                        })}
                        {me && (
                            <div className="tetris-player is-you" style={{ left: STAGE_W / 2 }}>
                                <MiniGameAvatar player={me} direction={0} />
                            </div>
                        )}
                    </div>
                </div>

                <MiniGameTopBar game="tetris" g={g} title={tt('title', 'Blocks duel')}>
                    {table?.state === 'playing' && <span className="minigame-topbar__info">{startsIn > 0 ? tt('starting', 'Get ready...') : playing ? tt('playing', 'Clear rows to send rubbish to the others! %s% s left', [ 's' ], [ String(Math.ceil(timeLeft / 1000)) ]) : tt('watching', 'You are out: watch the others!')}</span>}
                </MiniGameTopBar>

                {table?.state === 'waiting' && <MiniGameWaiting game="tetris" g={g} table={table} seats={SEATS} className="tetris-panel" rules={rules} />}

                {g.error && <div className="minigame-toast" data-browser-text>{g.error}</div>}
            </div>

            {!table && <MiniGameLobby game="tetris" g={g} className="tetris-lobby" title={tt('title', 'Blocks duel')} intro={rules} banner={bannerImage} seats={SEATS} />}

            {table?.state === 'finished' && (
                <MiniGameResults game="tetris" g={g} table={table} className="tetris-results" title={tt('results', 'Game over')}
                    rows={boards.map((remote, seat) => ({ seat, place: remote.place, detail: tt('result', '%score% points, %lines% rows', [ 'score', 'lines' ], [ String(remote.score), String(remote.lines) ]) }))
                        .sort((a, b) => (a.place || 99) - (b.place || 99))} />
            )}
        </NativeTextTree>
    );
};
