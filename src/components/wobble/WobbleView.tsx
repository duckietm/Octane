import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { IWobbleFighter, IWobbleRules, IWobbleView, WOBBLE_DEFAULT_RULES, WobbleApi, wbt, wobbleErrorText, wobbleEventText } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import gaugeImage from '../../assets/images/wobble/wobble-gauge.png';
import { POOL_HEIGHT, POOL_WIDTH, WobbleScene } from './WobbleScene';
import { WobbleRulesView } from './WobbleRulesView';
import '../../css/wobble/WobbleView.css';

const POLL_FAST_MS = 250;
const POLL_SLOW_MS = 1000;
const POLL_LOBBY_MS = 3000;
const TOP_BAR = 40;
/** The sky's height in the picture (it fades to the light blue of the roof's wall there; wobble-art.py). */
const SKY_HEIGHT = 250;
/** Room kept at the bottom for the keys. */
const BOTTOM_UI = 120;

/** The part of the picture that must show: round the beam, from above the fighters' heads to below the water. */
const VIEW = { top: 230, bottom: 640, width: 640 };

const useSceneZoom = (): number => {
    // What must show decides the zoom; the sky, the far corners of the roof and its front may go off the screen.
    const read = () => (typeof window === 'undefined' ? 1 : Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW.width, (window.innerHeight - TOP_BAR - BOTTOM_UI) / (VIEW.bottom - VIEW.top)))));
    const [zoom, setZoom] = useState(read);

    useEffect(() => {
        const onResize = () => setZoom(read());

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    return zoom;
};


/** The pool's top: what must show centred between the top bar and the keys (the rest may go off the screen). */
const stageTop = (zoom: number): number => {
    if (typeof window === 'undefined') return 0;

    const room = window.innerHeight - TOP_BAR - BOTTOM_UI;
    const shown = (VIEW.bottom - VIEW.top) * zoom;
    const top = TOP_BAR + Math.round((room - shown) / 2) - VIEW.top * zoom;

    // Never a gap under the picture.
    return Math.max(top, window.innerHeight - POOL_HEIGHT * zoom);
};

/** A fighter's balance dial: the needle turns from -90 to 90 degrees with the balance. */
const Gauge: FC<{ fighter?: IWobbleFighter; small?: boolean }> = ({ fighter, small = false }) => (
    <div className={`wb-gauge ${small ? 'is-small' : ''}`} style={{ backgroundImage: `url(${gaugeImage})` }}>
        <span className="wb-gauge__needle" style={{ transform: `rotate(${Math.max(-100, Math.min(100, fighter?.balance ?? 0)) * 0.9}deg)` }} />
    </div>
);

const ControlKey: FC<{ label: string; text: string; active?: boolean; disabled?: boolean; wide?: boolean; onDown?: () => void; onUp?: () => void }> = ({ label, text, active = false, disabled = false, wide = false, onDown, onUp }) => (
    <button
        type="button"
        className={`wb-control ${active ? 'is-active' : ''}`}
        disabled={disabled}
        onPointerDown={(event) => {
            event.preventDefault();
            onDown?.();
        }}
        onPointerUp={() => onUp?.()}
        onPointerLeave={() => active && onUp?.()}>
        <span className={`wb-key ${wide ? 'is-wide' : ''}`}>{label}</span>
        <span className="wb-control__text">{text}</span>
    </button>
);

/**
 * Habbi's Wobble Squabble (`wobble/show`, from the Game Center): a beam over the rooftop pool. Out of a duel, a window
 * lists the open duels; in a duel the two fighters stand on the beam, each with their balance dial, and the keys (or the
 * buttons at the bottom) lean, push, step and crouch until one of them falls in.
 */
export const WobbleView: FC = () => {
    const [visible, setVisible] = useState(false);
    const [view, setView] = useState<IWobbleView | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [rulesOpen, setRulesOpen] = useState<'create' | 'edit' | 'read' | 'help' | null>(null);
    const [banner, setBanner] = useState<{ key: number; text: string; kind: string } | null>(null);
    const [lean, setLean] = useState(0);
    const busyRef = useRef(false);
    const latestRef = useRef(0);
    const lastSeqRef = useRef(0);
    const matchRef = useRef(0);
    const heldRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
    const leanRef = useRef(0);
    const zoom = useSceneZoom();

    const receive = useCallback((next: IWobbleView) => {
        const match = next.match;
        const time = match?.serverTime ?? 0;

        // A late answer (an older poll after an action) must not move the fighters back.
        if (match && time && time < latestRef.current && match.id === matchRef.current) return;

        latestRef.current = time;

        if ((match?.id ?? 0) !== matchRef.current) {
            matchRef.current = match?.id ?? 0;
            lastSeqRef.current = Math.max(0, ...(match?.log ?? []).map((event) => event.seq));
        } else if (match) {
            for (const event of match.log) {
                if (event.seq <= lastSeqRef.current) continue;

                lastSeqRef.current = event.seq;

                if ([ 'fall', 'win', 'sudden', 'forfeit' ].includes(event.type)) setBanner({ key: event.seq, text: wobbleEventText(event) ?? '', kind: event.type });
            }
        }

        setView(next);
    }, []);

    const refresh = useCallback(() => {
        if (busyRef.current) return;

        WobbleApi.view().then(receive).catch((caught) => setError(wobbleErrorText(caught) ?? ''));
    }, [receive]);

    /** A window action (create, join, start...): one at a time, its refusal shown. */
    const run = useCallback(async (action: () => Promise<IWobbleView>) => {
        if (busyRef.current) return;

        busyRef.current = true;
        setBusy(true);
        setError('');

        try {
            receive(await action());
        } catch (caught) {
            setError(wobbleErrorText(caught) ?? '');
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }, [receive]);

    /** A move of the game: sent at once, never blocked by a poll; the small refusals (too soon...) stay silent. */
    const play = useCallback((action: () => Promise<IWobbleView>) => {
        action().then(receive).catch((caught) => {
            const text = wobbleErrorText(caught);

            if (text) setError(text);
        });
    }, [receive]);

    useEffect(() => {
        const tracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const action = url.split('/')[1];

                if (action === 'show') setVisible(true);
                else if (action === 'hide') setVisible(false);
                else if (action === 'toggle') setVisible((value) => !value);
            },
            eventUrlPrefix: 'wobble/'
        };

        AddLinkEventTracker(tracker);

        return () => RemoveLinkEventTracker(tracker);
    }, []);

    const match = view?.match;
    const live = !!match && [ 'countdown', 'playing', 'round_over' ].includes(match.state);

    useEffect(() => {
        if (!visible) return;

        refresh();

        const timer = setInterval(refresh, live ? POLL_FAST_MS : match ? POLL_SLOW_MS : POLL_LOBBY_MS);

        return () => clearInterval(timer);
    }, [visible, live, !!match, refresh]);

    useEffect(() => {
        if (!banner) return;

        const timer = setTimeout(() => setBanner(null), banner.kind === 'sudden' ? 2200 : 3200);

        return () => clearTimeout(timer);
    }, [banner]);

    const me = match?.fighters.find((fighter) => fighter.you);
    const playing = match?.state === 'playing' && !!me && !me.fell;

    const sendLean = useCallback((dir: number) => {
        if (leanRef.current === dir) return;

        leanRef.current = dir;
        setLean(dir);
        play(() => WobbleApi.lean(dir));
    }, [play]);

    const hold = useCallback((side: 'left' | 'right', down: boolean) => {
        heldRef.current[side] = down;

        const { left, right } = heldRef.current;

        sendLean(left && !right ? -1 : right && !left ? 1 : 0);
    }, [sendLean]);

    const push = useCallback((dir: number) => {
        if (me && me.pushIn > 120) return;

        play(() => WobbleApi.push(dir));
    }, [me, play]);

    const move = useCallback((dir: number) => play(() => WobbleApi.move(dir)), [play]);
    const stabilise = useCallback(() => play(() => WobbleApi.stabilise()), [play]);

    // The keys, while a round is on: they never reach the hotel behind.
    useEffect(() => {
        if (!visible || !live || !me) return;

        const active = document.activeElement as HTMLElement | null;

        if (active && active !== document.body) active.blur();

        const keys: Record<string, (down: boolean, repeat: boolean) => void> = {
            q: (down) => hold('left', down),
            e: (down) => hold('right', down),
            a: (down, repeat) => down && !repeat && push(-1),
            d: (down, repeat) => down && !repeat && push(1),
            n: (down, repeat) => down && !repeat && move(-1),
            m: (down, repeat) => down && !repeat && move(1),
            ' ': (down, repeat) => down && !repeat && stabilise()
        };
        const handle = (down: boolean) => (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;

            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target.closest('.wb-room') === null) return;

            const action = keys[event.key.toLowerCase()];

            if (!action) return;

            event.preventDefault();
            event.stopPropagation();
            action(down, event.repeat);
        };
        const onDown = handle(true);
        const onUp = handle(false);
        const onBlur = () => {
            heldRef.current = { left: false, right: false };
            sendLean(0);
        };

        window.addEventListener('keydown', onDown, true);
        window.addEventListener('keyup', onUp, true);
        window.addEventListener('blur', onBlur);

        return () => {
            window.removeEventListener('keydown', onDown, true);
            window.removeEventListener('keyup', onUp, true);
            window.removeEventListener('blur', onBlur);
        };
    }, [visible, live, !!me, hold, push, move, stabilise, sendLean]);

    // A new round: nothing held any more.
    useEffect(() => {
        heldRef.current = { left: false, right: false };
        leanRef.current = 0;
        setLean(0);
    }, [match?.round, match?.state === 'countdown']);

    if (!visible) return null;

    const close = () => {
        setVisible(false);
        setRulesOpen(null);
    };
    const leave = () => {
        setRulesOpen(null);
        run(() => WobbleApi.leave());
    };
    const left = match?.fighters.find((fighter) => fighter.side === 0);
    const right = match?.fighters.find((fighter) => fighter.side === 1);
    const suddenLeft = match ? Math.max(0, Math.ceil((match.suddenIn - match.roundTime) / 1000)) : 0;
    const countdown = match?.state === 'countdown' ? Math.ceil(match.phaseLeft / 1000) : 0;
    const won = match?.state === 'finished' && me && match.winnerSide === me.side;
    const top = stageTop(zoom);

    const bottomPanel = () => {
        if (!match) return null;

        if (match.state === 'waiting') {
            return (
                <div className="wb-panel">
                    <div className="wb-panel__text">{match.fighters.length < 2 ? wbt('waiting', 'Waiting for an opponent... Another player can join you from the list of duels.') : wbt('ready', 'Two fighters on the beam: ready?')}</div>
                    {match.youAreHost
                        ? (
                            <div className="wb-panel__actions">
                                {match.rules.bots && match.fighters.length < 2 && <Button variant="secondary" disabled={busy} onClick={() => run(() => WobbleApi.addBot())}>{wbt('add_bot', 'Call a robot')}</Button>}
                                {match.fighters.some((fighter) => fighter.bot) && <Button variant="secondary" disabled={busy} onClick={() => run(() => WobbleApi.removeBot())}>{wbt('remove_bot', 'Send the robot away')}</Button>}
                                <Button variant="success" disabled={busy || match.fighters.length < 2} onClick={() => run(() => WobbleApi.start())}>{wbt('start', 'Start the duel')}</Button>
                            </div>
                        )
                        : <div className="wb-panel__text">{wbt('waiting_host', 'The host starts the duel.')}</div>}
                </div>
            );
        }

        if (match.state === 'finished') {
            return (
                <div className="wb-panel wb-panel--end">
                    <div className="wb-panel__title">{me ? (won ? wbt('you_won', 'You won!') : wbt('you_lost', 'Splash... you lost!')) : wbt('finished', 'The duel is over.')}</div>
                    <div className="wb-panel__actions">
                        <Button variant="secondary" onClick={leave}>{wbt('leave', 'Leave the pool')}</Button>
                        {match.youAreHost && match.fighters.length === 2 && <Button variant="success" disabled={busy} onClick={() => run(() => WobbleApi.start())}>{wbt('again', 'Rematch')}</Button>}
                        {match.youAreHost && match.fighters.length < 2 && match.rules.bots && <Button variant="secondary" disabled={busy} onClick={() => run(() => WobbleApi.addBot())}>{wbt('add_bot', 'Call a robot')}</Button>}
                    </div>
                </div>
            );
        }

        if (!me) return <div className="wb-panel"><div className="wb-panel__text">{wbt('watching', 'You are watching the duel.')}</div></div>;

        const disabled = !playing;

        return (
            <div className="wb-controls">
                <Gauge fighter={me} />
                <div className="wb-controls__keys">
                    <div className="wb-controls__group">
                        <span className="wb-controls__label">{wbt('group.balance', 'Balance')}</span>
                        <ControlKey label="Q" text={wbt('key.lean_left', 'Lean left (hold)')} active={lean < 0} disabled={disabled} onDown={() => hold('left', true)} onUp={() => hold('left', false)} />
                        <ControlKey label="E" text={wbt('key.lean_right', 'Lean right (hold)')} active={lean > 0} disabled={disabled} onDown={() => hold('right', true)} onUp={() => hold('right', false)} />
                    </div>
                    <div className="wb-controls__group">
                        <span className="wb-controls__label">{wbt('group.push', 'Push')}</span>
                        <ControlKey label="A" text={wbt('key.push_left', 'Push to the left')} disabled={disabled || me.pushIn > 0} onDown={() => push(-1)} />
                        <ControlKey label="D" text={wbt('key.push_right', 'Push to the right')} disabled={disabled || me.pushIn > 0} onDown={() => push(1)} />
                    </div>
                    <div className="wb-controls__group">
                        <span className="wb-controls__label">{wbt('group.move', 'Move')}</span>
                        <ControlKey label="N" text={wbt('key.step_left', 'Step left')} disabled={disabled} onDown={() => move(-1)} />
                        <ControlKey label="M" text={wbt('key.step_right', 'Step right')} disabled={disabled} onDown={() => move(1)} />
                    </div>
                    <div className="wb-controls__group">
                        <span className="wb-controls__label">{wbt('group.stabilise', 'Stabilise')}</span>
                        <ControlKey label="Espace" wide text={me.stabiliseIn > 0 ? wbt('key.wait', 'Wait %s% s', [ 's' ], [ String(Math.ceil(me.stabiliseIn / 1000)) ]) : wbt('key.stabilise', 'Stabilise')} active={me.stabilising} disabled={disabled || me.stabiliseIn > 0} onDown={stabilise} />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <NativeTextTree>
            <div className="wb-room" style={{ background: `linear-gradient(rgb(92, 166, 236) ${top}px, rgb(196, 230, 252) ${top + SKY_HEIGHT * zoom}px)` }}>
                <div className="wb-room__stage" style={{ width: POOL_WIDTH * zoom, height: POOL_HEIGHT * zoom, marginTop: top }}>
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
                        <WobbleScene match={match ?? null} zoom={zoom} />
                    </div>
                </div>

                <div className="wb-topbar">
                    <Button variant="secondary" onClick={() => setRulesOpen(match?.youAreHost && !live ? 'edit' : match ? 'read' : 'help')}>{wbt('rules.button', 'Rules')}</Button>
                    <Button variant="danger" onClick={match ? leave : close}>{match ? wbt('leave', 'Leave the pool') : wbt('close', 'Leave the roof')}</Button>
                </div>

                {match && match.state !== 'waiting' && (
                    <div className={`wb-score ${match.sudden ? 'is-sudden' : ''}`}>
                        <div className="wb-score__side">
                            <Gauge fighter={left} small />
                            <span className={`wb-score__name ${left?.you ? 'is-you' : ''}`}>{left?.name ?? '?'}</span>
                            <span className="wb-score__wins">{left?.wins ?? 0}</span>
                        </div>
                        <div className="wb-score__middle">
                            <span className="wb-score__round">{wbt('round_n', 'Round %n%', [ 'n' ], [ String(match.round) ])}</span>
                            <span className="wb-score__clock">{match.state === 'playing' ? (match.sudden ? wbt('sudden', 'SUDDEN DEATH') : wbt('sudden_in', 'Sudden death in %s% s', [ 's' ], [ String(suddenLeft) ])) : '–'}</span>
                        </div>
                        <div className="wb-score__side is-right">
                            <span className="wb-score__wins">{right?.wins ?? 0}</span>
                            <span className={`wb-score__name ${right?.you ? 'is-you' : ''}`}>{right?.name ?? '?'}</span>
                            <Gauge fighter={right} small />
                        </div>
                    </div>
                )}

                {countdown > 0 && <div key={countdown} className="wb-countdown">{countdown}</div>}
                {match?.state === 'playing' && match.roundTime < 900 && <div className="wb-countdown is-go">{wbt('go', 'Wobble!')}</div>}
                {banner && <div key={banner.key} className={`wb-banner is-${banner.kind}`} data-browser-text>{banner.text}</div>}

                {match && <div className="wb-bottom">{bottomPanel()}</div>}

                {error && <div className="wb-toast" data-browser-text>{error}</div>}
            </div>

            {!match && !rulesOpen && (
                <OctaneCardView className="wb-lobby" theme="primary-slim" uniqueKey="wobble-lobby">
                    <OctaneCardHeaderView headerText={wbt('lobby.title', 'Wobble Squabble')} onCloseClick={close} />
                    <OctaneCardContentView className="text-black" gap={2}>
                        <div className="wb-lobby__intro" data-browser-text>{wbt('intro', 'Two fighters, one beam, one pool. Keep your balance and knock your opponent into the water!')}</div>
                        <div className="wb-lobby__list">
                            {!view?.matches.length && <div className="wb-lobby__empty">{wbt('no_games', 'No duel yet: open one and challenge a player or a robot.')}</div>}
                            {view?.matches.map((summary) => (
                                <div key={summary.id} className="wb-lobby__game">
                                    <span className="wb-lobby__host">{summary.right ? `${summary.left || '?'} – ${summary.right}` : wbt('duel_of', '%name% is waiting for an opponent', [ 'name' ], [ summary.host || summary.left ])}</span>
                                    <Button variant="success" disabled={busy || summary.players >= 2} onClick={() => run(() => WobbleApi.join(summary.id))}>
                                        {summary.players >= 2 ? wbt('state.playing', 'Full') : wbt('join', 'Take them on')}
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <div className="wb-lobby__actions">
                            <Button variant="secondary" onClick={() => setRulesOpen('help')}>{wbt('rules.help', 'Rules of the game')}</Button>
                            <Button variant="success" onClick={() => setRulesOpen('create')}>{wbt('create', 'Open a duel')}</Button>
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {rulesOpen && (
                <WobbleRulesView
                    rules={match?.rules ?? WOBBLE_DEFAULT_RULES}
                    editable={rulesOpen === 'create' || rulesOpen === 'edit'}
                    mode={rulesOpen}
                    busy={busy}
                    onClose={() => setRulesOpen(null)}
                    onSave={(rules: IWobbleRules) => {
                        setRulesOpen(null);
                        run(() => (rulesOpen === 'create' ? WobbleApi.create(rules) : WobbleApi.setRules(rules)));
                    }} />
            )}
        </NativeTextTree>
    );
};

