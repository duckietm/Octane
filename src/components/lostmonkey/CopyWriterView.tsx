import { FC, useEffect, useRef, useState } from 'react';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import bannerImage from '../../assets/images/lostmonkey/lm-banner.png';
import coinsImage from '../../assets/images/lostmonkey/lm-coins.png';
import jungleImage from '../../assets/images/lostmonkey/lm-jungle.png';
import logoImage from '../../assets/images/lostmonkey/lm-logo.png';
import monkeysImage from '../../assets/images/lostmonkey/lm-monkeys.png';
import parrotImage from '../../assets/images/lostmonkey/lm-parrot.png';
import titleImage from '../../assets/images/lostmonkey/lm-title.png';
import { MiniGameLobby, MiniGameResults, MiniGameTopBar, MiniGameWaiting } from '../minigame/MiniGameParts';
import { useHallGame, useStageZoom } from '../minigame/useHallGame';
import '../../css/lostmonkey/LostMonkeyView.css';

/** A text of Lost Monkey, `lostmonkey.<key>`. */
const lt = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`lostmonkey.${ key }`, fallback, parameters, replacements);

/** The jungle (480 x 320) shown twice its size; Lost Monkey's own pieces at their size on it. */
const STAGE_W = 960;
const STAGE_H = 640;
const SEATS: [number, number] = [ 2, 8 ];
/** The coins' rows in lm-coins.png: X, Y, Z, A, B; three states a row (dark, lit, glowing). */
const COIN_ROWS = 'XYZAB';
/** On the screen, as on a pad: A B X Y Z. */
const COINS = [ 'A', 'B', 'X', 'Y', 'Z' ];
const COIN_W = 107;
const COIN_H = 98;
const MONKEY_W = 127;
const MONKEY_H = 173;

interface ICopyPlayer { awake: boolean; answered: boolean; reached: number }

const Coin: FC<{ letter: string; state: number; small?: boolean; onClick?: () => void }> = ({ letter, state, small = false, onClick }) => {
    const row = COIN_ROWS.indexOf(letter);
    const scale = small ? 0.42 : 1;

    return (
        <button type="button" className={`lm-coin ${ small ? 'is-small' : '' } ${ onClick ? 'is-clickable' : '' }`} disabled={!onClick} onClick={onClick}
            style={{
                width: COIN_W * scale,
                height: COIN_H * scale,
                backgroundImage: `url(${ coinsImage })`,
                backgroundSize: `${ COIN_W * 3 * scale }px ${ COIN_H * 5 * scale }px`,
                backgroundPosition: `${ -state * COIN_W * scale }px ${ -row * COIN_H * scale }px`
            }} aria-label={letter} />
    );
};

const Monkey: FC<{ colour: number; asleep: boolean }> = ({ colour, asleep }) => {
    const cell = (asleep ? 9 : 0) + (colour % 9);

    return (
        <span className="lm-monkey" style={{
            width: MONKEY_W,
            height: MONKEY_H,
            backgroundImage: `url(${ monkeysImage })`,
            backgroundPosition: `${ -(cell % 4) * MONKEY_W }px ${ -Math.floor(cell / 4) * MONKEY_H }px`
        }} />
    );
};

/**
 * Copy Writer (`lostmonkey/copywriter/show`, from the typewriter of the Lost Monkey island): Copy Writer, one of the games of Habbo's iPhone game Lost
 * Monkey, with its own pictures. The parrot shows a row of letters on the five coins; everybody types it back (keys A,
 * B, X, Y, Z, or a click on the coins). Each round the row grows; a mistake sends the monkey to sleep, the last one
 * awake wins. It runs on the server's tables (`/api/hall`, game `copywriter`).
 */
export const CopyWriterView: FC = () => {
    const g = useHallGame('copywriter', 'lostmonkey/copywriter', 250);
    const zoom = useStageZoom(STAGE_W, STAGE_H);
    const table = g.table;
    const board = table?.board;
    const phase = String(board?.phase ?? '');
    const players = table?.players ?? [];
    const states = (board?.players as ICopyPlayer[]) ?? [];
    const playing = table?.state === 'playing';
    const you = table?.you ?? -1;
    const length = Number(board?.length ?? 0);
    const stepMs = Number(board?.stepMs ?? 700);
    const rowRef = useRef('');
    const [ typed, setTyped ] = useState('');
    const [ , setTick ] = useState(0);
    const sentRef = useRef(false);
    const me = states[you];
    const canType = playing && phase === 'answer' && !!me?.awake && !me?.answered && !sentRef.current;

    if (board?.row) rowRef.current = String(board.row);

    useEffect(() => {
        if (phase === 'show') {
            setTyped('');
            sentRef.current = false;
        }
    }, [ phase, length ]);

    useEffect(() => {
        if (!playing) return;

        const timer = setInterval(() => setTick((value) => value + 1), 60);

        return () => clearInterval(timer);
    }, [ playing ]);

    const type = (letter: string) => {
        if (!canType) return;

        const next = typed + letter;
        const expected = rowRef.current;
        const wrong = expected.length > 0 && expected[next.length - 1] !== letter;

        setTyped(next);

        if (wrong || next.length >= length) {
            sentRef.current = true;
            g.send({ keys: next });
        }
    };

    useEffect(() => {
        if (!canType) return;

        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const letter = event.key.toUpperCase();

            if (event.repeat || !COINS.includes(letter) || (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))) return;

            event.preventDefault();
            event.stopPropagation();
            type(letter);
        };

        window.addEventListener('keydown', onKey, true);

        return () => window.removeEventListener('keydown', onKey, true);
    });

    if (!g.visible) return null;

    const rules = lt('rules', 'The parrot shows a row of letters on the coins: type it back (keys A, B, X, Y and Z, or click the coins). Each round the row grows by one; one mistake and your monkey falls asleep. The last monkey awake wins!');
    const elapsed = Number(board?.elapsed ?? 0) + (performance.now() - g.receivedRef.current);
    const showing = phase === 'show' ? Math.floor((elapsed - 900) / stepMs) : -1;
    const litLetter = showing >= 0 && showing < rowRef.current.length && ((elapsed - 900) % stepMs) < stepMs * 0.72 ? rowRef.current[showing] : '';
    const pressed = phase === 'answer' && typed.length ? typed[typed.length - 1] : '';
    const timeLeft = Math.max(0, Number(board?.timeLeft ?? 0) - (performance.now() - g.receivedRef.current));
    const spacing = Math.min(118, (STAGE_W - 40) / Math.max(1, players.length));
    const first = (STAGE_W - spacing * (players.length - 1)) / 2;
    const info = !playing ? ''
        : phase === 'intro' ? lt('intro', 'Watch the parrot!')
            : phase === 'show' ? lt('watch', 'Watch: %n% letters', [ 'n' ], [ String(length) ])
                : phase === 'answer' ? (me?.awake ? (me.answered || sentRef.current ? lt('waiting', 'Waiting for the others...') : lt('type', 'Your turn: type the row! %s% s', [ 's' ], [ String(Math.ceil(timeLeft / 1000)) ])) : lt('asleep', 'Your monkey is asleep: watch the others!'))
                    : phase === 'result' ? lt('result', 'The row was: %row%', [ 'row' ], [ rowRef.current.split('').join(' ') ]) : '';

    return (
        <NativeTextTree>
            <div className="minigame-world lm-world">
                <div className="minigame-stage" style={{ width: STAGE_W * zoom, height: STAGE_H * zoom }}>
                    <div className="minigame-stage__inner" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${ zoom })` }}>
                        <img className="minigame-backdrop lm-backdrop" src={jungleImage} alt="" width={STAGE_W} height={STAGE_H} draggable={false} />
                        <img className="lm-title" src={titleImage} alt="" draggable={false} />
                        <img className="lm-logo" src={logoImage} alt="" draggable={false} />
                        <img className={`lm-parrot ${ litLetter ? 'is-talking' : '' }`} src={parrotImage} alt="" draggable={false} />
                        {litLetter && <span className="lm-parrot__bubble" data-browser-text>{litLetter}</span>}

                        <div className="lm-coins">
                            {COINS.map((letter) => <Coin key={letter} letter={letter} state={litLetter === letter || pressed === letter ? 1 : canType ? 2 : 0} onClick={canType ? () => type(letter) : undefined} />)}
                        </div>

                        {playing && phase !== 'intro' && (
                            <div className="lm-row" data-browser-text>
                                {Array.from({ length }, (_, index) => {
                                    const letter = phase === 'answer' ? typed[index] : phase === 'result' ? rowRef.current[index] : index < showing || (index === showing && litLetter) ? rowRef.current[index] : '';

                                    return letter ? <Coin key={index} letter={letter} state={1} small /> : <span key={index} className="lm-row__dot" />;
                                })}
                            </div>
                        )}

                        {phase === 'answer' && playing && <div className="lm-timer"><span style={{ width: `${ Math.min(100, (100 * timeLeft) / (4000 + length * 900)) }%` }} /></div>}

                        {players.map((player, seat) => (
                            <div key={player.userId} className={`lm-player ${ seat === you ? 'is-you' : '' }`} style={{ left: first + seat * spacing }}>
                                {playing && phase === 'answer' && states[seat]?.answered && states[seat]?.awake && <span className="lm-player__done" data-browser-text>✓</span>}
                                <Monkey colour={seat} asleep={!!states[seat] && !states[seat].awake} />
                                <span className="lm-player__name" data-browser-text>{player.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <MiniGameTopBar game="copywriter" g={g} title={lt('title', 'Lost Monkey: Copy Writer')}>
                    {playing && <span className="minigame-topbar__info">{info}</span>}
                </MiniGameTopBar>

                {table?.state === 'waiting' && <MiniGameWaiting game="copywriter" g={g} table={table} seats={SEATS} className="lm-panel" rules={rules} />}

                {g.error && <div className="minigame-toast" data-browser-text>{g.error}</div>}
            </div>

            {!table && <MiniGameLobby game="copywriter" g={g} className="lm-lobby" title={lt('title', 'Lost Monkey: Copy Writer')} intro={rules} banner={bannerImage} seats={SEATS} />}

            {table?.state === 'finished' && (
                <MiniGameResults game="copywriter" g={g} table={table} className="lm-results" title={lt('results', 'The last monkey awake')}
                    rows={states.map((state, seat) => ({ seat, reached: state.reached }))
                        .sort((a, b) => b.reached - a.reached)
                        .map((row, index, rows) => ({ seat: row.seat, place: 1 + rows.findIndex((other) => other.reached === row.reached), detail: lt('letters', '%n% letters', [ 'n' ], [ String(row.reached) ]) }))} />
            )}
        </NativeTextTree>
    );
};
