import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { FASTFOOD_DEFAULT_RULES, FastFoodApi, FastFoodApiError, IFastFoodGame, IFastFoodPlayer, IFastFoodRules, IFastFoodView, fastFoodErrorText, fastFoodFly, fft } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import illustrationImage from '../../assets/images/fastfood/ff-illustration.png';
import countdownSound from '../../assets/sounds/fastfood/ff-countdown-b.mp3';
import explosionSound from '../../assets/sounds/fastfood/ff-explosion.mp3';
import starSound from '../../assets/sounds/fastfood/ff-getting-star.mp3';
import burgerSound from '../../assets/sounds/fastfood/ff-hampurilainen.mp3';
import cakeSound from '../../assets/sounds/fastfood/ff-kakku.mp3';
import bigChuteSound from '../../assets/sounds/fastfood/ff-parachute-big.mp3';
import chuteSound from '../../assets/sounds/fastfood/ff-parachute-small.mp3';
import pizzaSound from '../../assets/sounds/fastfood/ff-pizza.mp3';
import powerSound from '../../assets/sounds/fastfood/ff-power-up-off.mp3';
import releaseSound from '../../assets/sounds/fastfood/ff-release.mp3';
import rocketSound from '../../assets/sounds/fastfood/ff-rocket-launch.mp3';
import soupSound from '../../assets/sounds/fastfood/ff-soppalautanen.mp3';
import traySound from '../../assets/sounds/fastfood/ff-tarjotin.mp3';
import musicSound from '../../assets/sounds/fastfood/ff-tunnari-long.mp3';
import falseStartSound from '../../assets/sounds/fastfood/ff-wrong-error-c-6.mp3';
import { FASTFOOD_POWER_BUTTONS, FastFoodScene, IPlateNow, STAGE_HEIGHT, STAGE_WIDTH, Sprite, skinOf } from './FastFoodScene';
import { FastFoodRulesView } from './FastFoodRulesView';
import '../../css/fastfood/FastFoodView.css';

const POLL_LIVE_MS = 150;
const POLL_SLOW_MS = 1000;
const POLL_LOBBY_MS = 3000;
const CRASH_SOUNDS = [ soupSound, pizzaSound, burgerSound, traySound, cakeSound, traySound ];

/** The stage on the screen, never bigger than the original's 1920x960. */
const useStageZoom = (): number => {
    const read = () => (typeof window === 'undefined' ? 1 : Math.max(0.3, Math.min(1, window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT)));
    const [zoom, setZoom] = useState(read);

    useEffect(() => {
        const onResize = () => setZoom(read());

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    return zoom;
};

/** The original's sounds and music, each with its switch (kept in the browser). */
const useSounds = () => {
    const [on, setOn] = useState(() => localStorage.getItem('fastfood.sound') !== 'off');
    const musicRef = useRef<HTMLAudioElement | null>(null);

    const play = useCallback((url: string, volume = 0.6) => {
        if (!on || !url) return;

        const audio = new Audio(url);

        audio.volume = volume;
        audio.play().catch(() => undefined);
    }, [on]);

    const playMusic = useCallback((playing: boolean) => {
        if (!musicRef.current) {
            musicRef.current = new Audio(musicSound);
            musicRef.current.loop = true;
            musicRef.current.volume = 0.3;
        }

        if (playing && on) musicRef.current.play().catch(() => undefined);
        else musicRef.current.pause();
    }, [on]);

    useEffect(() => () => musicRef.current?.pause(), []);

    return {
        on,
        play,
        playMusic,
        toggle: () => setOn((value) => {
            localStorage.setItem('fastfood.sound', value ? 'off' : 'on');
            return !value;
        })
    };
};

/** What the player did before the server answered: the plate dropped, the parachute opened (performance.now()). */
interface ILocal {
    plateId: number;
    dropAt: number;
    chuteAt: number;
    chuteElapsed: number;
}

/** Where each plate is now: the server's plate moved on by the time gone since (and what the player just did). */
const platesNow = (view: IFastFoodView, receivedAt: number, now: number, local: ILocal | null, you: number): Record<number, IPlateNow> => {
    const result: Record<number, IPlateNow> = {};
    const game = view.game;

    if (!game) return result;

    for (const player of game.players) {
        const plate = player.plate;

        if (!plate) continue;

        const mine = player.userId === you && local && local.plateId === plate.id;
        const since = now - receivedAt + plate.ago;

        if (plate.phase === 'hanging') {
            if (mine && local.dropAt > 0) {
                const fall = fastFoodFly(view.physics, plate.food, 1, 0, now - local.dropAt, false, plate.big);

                result[player.userId] = { y: fall.y, v: fall.v, chute: false, phase: 'falling' };
            } else {
                result[player.userId] = { y: 1, v: 0, chute: false, phase: 'hanging' };
            }

            continue;
        }

        if (plate.phase === 'falling' && mine && local.chuteAt > 0) {
            // Free fall up to the moment the player opened, then under the parachute.
            const before = Math.max(0, local.chuteAt - (now - since));
            const fall = fastFoodFly(view.physics, plate.food, plate.y, plate.v, Math.min(since, before), false, plate.big);
            const rest = fastFoodFly(view.physics, plate.food, fall.y, fall.v, Math.max(0, now - Math.max(local.chuteAt, now - since)), true, plate.big);

            result[player.userId] = { y: rest.y, v: rest.v, chute: true, phase: 'chute' };
            continue;
        }

        if (plate.phase === 'falling' || plate.phase === 'chute' || plate.phase === 'broken') {
            const chute = plate.phase === 'chute';
            const moved = plate.touched ? { y: 0, v: plate.speed } : fastFoodFly(view.physics, plate.food, plate.y, plate.v, since, chute, plate.big);

            result[player.userId] = { y: moved.y, v: moved.v, chute, phase: plate.phase };
            continue;
        }

        result[player.userId] = { y: 0, v: 0, chute: false, phase: plate.phase };
    }

    return result;
};

/** The big round button (drop, parachute, or the kitchen's timer) and the power-up's button, as in the original. */
const Buttons: FC<{ me: IFastFoodPlayer; now: IPlateNow | undefined; game: IFastFoodGame; timer: number; onMain: () => void; onPower: () => void }> = ({ me, now, game, timer, onMain, onPower }) => {
    const plate = me.plate;
    const skin = skinOf(me.seat);
    let icon = '';
    let ring = '';
    let progress = 1;

    if (plate && plate.phase === 'hanging' && plate.readyIn <= 0 && now?.phase === 'hanging') icon = 'button1_arrow_normal';
    else if (plate && now?.phase === 'falling' && !now.chute && !plate.falseStart) icon = `${skin}button1_parachute_normal`;
    else if (plate && ((plate.phase === 'hanging' && plate.readyIn > 0) || plate.phase === 'landed' || plate.phase === 'crashed') && game.state === 'playing') {
        ring = plate.falseStart ? 'button1_ring_red' : 'button1_ring';
        progress = plate.phase === 'hanging' ? 1 - plate.readyIn / timer : Math.min(1, plate.endedAgo / timer);
    }

    const blink = Math.floor(performance.now() / 300) % 2 ? '_blink' : '';

    return (
        <div className="ff-buttons">
            <button type="button" className="ff-button1" onClick={onMain} aria-label="drop">
                <Sprite name="button1_basic" x={0} y={0} corner />
                {icon && <Sprite name={`${icon}${blink}`} x={80} y={82} corner style={{ transform: 'translate(-50%, -50%)' }} />}
                {ring && <Sprite name={ring} x={10} y={12} corner style={{ WebkitMaskImage: `conic-gradient(#000 ${progress * 360}deg, transparent 0)`, maskImage: `conic-gradient(#000 ${progress * 360}deg, transparent 0)` }} />}
            </button>
            <button type="button" className={`ff-button2 ${me.held ? 'is-ready' : ''}`} onClick={onPower} disabled={!me.held} aria-label="power">
                <Sprite name="button2_basic" x={0} y={0} corner />
                {me.held > 0 && <Sprite name={me.held === 1 ? `${skin}${FASTFOOD_POWER_BUTTONS[1]}` : FASTFOOD_POWER_BUTTONS[me.held]} x={58} y={60} corner style={{ transform: 'translate(-50%, -50%) scale(0.85)' }} />}
            </button>
        </div>
    );
};

/** The final standings, on the original's score table. */
const Results: FC<{ game: IFastFoodGame; you: number; busy: boolean; onAgain: () => void; onLeave: () => void }> = ({ game, you, busy, onAgain, onLeave }) => {
    const ranked = [ ...game.players ].sort((a, b) => b.stars - a.stars);
    const won = game.winners.includes(you);

    return (
        <div className="ff-results">
            <Sprite name="scoretable" x={0} y={0} corner />
            <div className="ff-results__body" data-browser-text>
                <strong className="ff-results__title">{game.winners.length ? (won ? fft('you_won', 'You won!') : fft('winner', '%name% wins!', [ 'name' ], [ game.players.find((p) => p.userId === game.winners[0])?.name ?? '' ])) : fft('no_winner', 'Nobody served a plate!')}</strong>
                {ranked.map((player, index) => (
                    <div key={player.userId} className={`ff-results__row ${player.you ? 'is-you' : ''}`}>
                        <span className="ff-results__rank">{index + 1}</span>
                        <span className="ff-results__name">{player.name}</span>
                        <span className="ff-results__stars">{Array.from({ length: player.stars }, (_, star) => <Sprite key={star} name="star_yellow" x={star * 21} y={0} corner />)}</span>
                        {game.winners.includes(player.userId) && <Sprite name="trophy" x={360} y={-12} corner className="ff-results__trophy" />}
                    </div>
                ))}
            </div>
            <div className="ff-results__actions">
                <Button variant="secondary" onClick={onLeave}>{fft('leave', 'Leave the restaurant')}</Button>
                {game.youAreHost && <Button variant="success" disabled={busy} onClick={onAgain}>{fft('again', 'Play again')}</Button>}
            </div>
        </div>
    );
};

/**
 * Fast Food (`fastfood/show`, from the Game Center): Habbo's original Fast Food (2010), its restaurant, plates,
 * parachutes, power-ups and sounds. Space (or the big button) drops the plate, then opens its parachute; E (or the
 * small button) uses the power-up.
 */
export const FastFoodView: FC = () => {
    const [visible, setVisible] = useState(false);
    const [view, setView] = useState<IFastFoodView | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [rulesOpen, setRulesOpen] = useState<'create' | 'edit' | 'read' | 'help' | null>(null);
    const [frame, setFrame] = useState(0);
    const busyRef = useRef(false);
    const receivedRef = useRef(0);
    const viewRef = useRef<IFastFoodView | null>(null);
    const localRef = useRef<ILocal | null>(null);
    const seqRef = useRef(0);
    const gameRef = useRef(0);
    const zoom = useStageZoom();
    const sounds = useSounds();

    const game = view?.game;
    const you = view?.userId ?? 0;
    const live = game?.state === 'countdown' || game?.state === 'playing';

    const receive = useCallback((next: IFastFoodView) => {
        const current = next.game;

        if ((current?.id ?? 0) !== gameRef.current) {
            gameRef.current = current?.id ?? 0;
            seqRef.current = Math.max(0, ...(current?.log ?? []).map((event) => event.seq));
        } else if (current) {
            for (const event of current.log) {
                if (event.seq <= seqRef.current) continue;

                seqRef.current = event.seq;

                const mine = event.userId === next.userId;

                if (event.type === 'countdown') sounds.play(countdownSound);
                if (event.type === 'drop' && mine && !event.c) sounds.play(releaseSound, 0.5);
                if (event.type === 'chute') sounds.play(event.b ? bigChuteSound : chuteSound, mine ? 0.6 : 0.25);
                if (event.type === 'land' && mine) sounds.play(starSound);
                if (event.type === 'crash') sounds.play(CRASH_SOUNDS[event.b] ?? soupSound, mine ? 0.7 : 0.3);
                if (event.type === 'falsestart' && mine) sounds.play(falseStartSound);
                if (event.type === 'powerup' && mine) sounds.play(powerSound);
                if (event.type === 'missile') sounds.play(rocketSound, 0.5);
                if (event.type === 'hit') sounds.play(explosionSound, 0.6);
            }
        }

        const mine = current?.players.find((player) => player.userId === next.userId)?.plate;

        // What the player did is the server's now (or a new plate came).
        const local = localRef.current;

        if (local && (!mine || mine.id !== local.plateId || (local.chuteAt > 0 ? mine.phase !== 'falling' : mine.phase !== 'hanging'))) localRef.current = null;

        receivedRef.current = performance.now();
        viewRef.current = next;
        setView(next);
    }, [sounds]);

    const pollingRef = useRef(false);

    // One poll at a time; a poll lost on the way (the server busy) is simply the next one.
    const refresh = useCallback(() => {
        if (busyRef.current || pollingRef.current) return;

        pollingRef.current = true;
        FastFoodApi.view()
            .then(receive)
            .catch((caught) => {
                if (!(caught instanceof FastFoodApiError) || caught.code !== 'http_error') setError(fastFoodErrorText(caught) ?? '');
            })
            .finally(() => {
                pollingRef.current = false;
            });
    }, [receive]);

    const run = useCallback(async (action: () => Promise<IFastFoodView>) => {
        if (busyRef.current) return;

        busyRef.current = true;
        setBusy(true);
        setError('');

        try {
            receive(await action());
        } catch (caught) {
            setError(fastFoodErrorText(caught) ?? '');
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }, [receive]);

    const play = useCallback((action: () => Promise<IFastFoodView>) => {
        action().then(receive).catch((caught) => {
            const text = fastFoodErrorText(caught);

            localRef.current = null;
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
            eventUrlPrefix: 'fastfood/'
        };

        AddLinkEventTracker(tracker);

        return () => RemoveLinkEventTracker(tracker);
    }, []);

    useEffect(() => {
        if (!visible) return;

        refresh();

        const timer = setInterval(refresh, live ? POLL_LIVE_MS : game ? POLL_SLOW_MS : POLL_LOBBY_MS);

        return () => clearInterval(timer);
    }, [visible, live, !!game, refresh]);

    useEffect(() => {
        sounds.playMusic(visible && !!live);
    }, [visible, live, sounds.on]);

    // The plates move every frame while a game is on.
    useEffect(() => {
        if (!visible || !game || game.state === 'waiting') return;

        let handle = 0;
        const loop = () => {
            setFrame((value) => value + 1);
            handle = requestAnimationFrame(loop);
        };

        handle = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(handle);
    }, [visible, game?.state]);

    const main = useCallback(() => {
        const current = viewRef.current;
        const state = current?.game?.state;
        const me = current?.game?.players.find((player) => player.userId === current.userId);
        const plate = me?.plate;

        if (!current || !plate || (state !== 'countdown' && state !== 'playing')) return;

        const now = performance.now();
        const local = localRef.current?.plateId === plate.id ? localRef.current : null;

        if (plate.phase === 'hanging' && !local) {
            if (state === 'playing' && plate.readyIn - (now - receivedRef.current) > 0) return;

            localRef.current = { plateId: plate.id, dropAt: state === 'playing' ? now : 0, chuteAt: 0, chuteElapsed: 0 };
            play(() => FastFoodApi.drop());
            return;
        }

        const falling = (plate.phase === 'falling' && !plate.falseStart) || (plate.phase === 'hanging' && local && local.dropAt > 0);

        if (!falling || (local && local.chuteAt > 0)) return;

        const elapsed = plate.phase === 'falling' ? plate.elapsed + (now - receivedRef.current) : now - local.dropAt;

        localRef.current = { plateId: plate.id, dropAt: local?.dropAt ?? 0, chuteAt: now, chuteElapsed: elapsed };
        play(() => FastFoodApi.chute(elapsed));
    }, [play]);

    const power = useCallback(() => play(() => FastFoodApi.power()), [play]);

    // Space: the big button; E: the power-up.
    useEffect(() => {
        if (!visible || !live) return;

        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;

            if (event.repeat || (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))) return;

            if (event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                main();
            } else if (event.key === 'e' || event.key === 'E') {
                event.preventDefault();
                event.stopPropagation();
                power();
            }
        };

        window.addEventListener('keydown', onKey, true);

        return () => window.removeEventListener('keydown', onKey, true);
    }, [visible, live, main, power]);

    useEffect(() => {
        if (!error) return;

        const timer = setTimeout(() => setError(''), 4000);

        return () => clearTimeout(timer);
    }, [error]);

    if (!visible) return null;

    const close = () => {
        setVisible(false);
        setRulesOpen(null);
    };
    const leave = () => {
        setRulesOpen(null);
        run(() => FastFoodApi.leave());
    };
    const now = performance.now();
    const since = now - receivedRef.current;
    const plates = view ? platesNow(view, receivedRef.current, now, localRef.current, you) : {};
    const me = game?.players.find((player) => player.userId === you);

    return (
        <NativeTextTree>
            <div className="ff-room">
                <div className="ff-stage" style={{ width: STAGE_WIDTH * zoom, height: STAGE_HEIGHT * zoom }}>
                    <div className="ff-stage__inner" style={{ transform: `scale(${zoom})` }}>
                        <FastFoodScene game={game ?? null} physics={view?.physics ?? null} plates={plates} tick={Math.floor(now / 120)} since={since} />
                        {game && live && me && <Buttons me={me} now={plates[me.userId]} game={game} timer={view.physics.plateTimerMs} onMain={main} onPower={power} />}
                        {game && live && <span className="ff-clock" data-browser-text>{`${Math.floor(Math.max(0, game.timeLeft - since) / 60000)}:${String(Math.floor(Math.max(0, game.timeLeft - since) / 1000) % 60).padStart(2, '0')}`}</span>}
                        {game?.state === 'finished' && <Results game={game} you={you} busy={busy} onAgain={() => run(() => FastFoodApi.start())} onLeave={leave} />}
                        <button type="button" className="ff-mute" onClick={sounds.toggle} aria-label="sound"><Sprite name={sounds.on ? 'mute_off' : 'mute_on'} x={0} y={0} corner /></button>
                    </div>
                </div>

                <div className="ff-topbar">
                    <Button variant="secondary" onClick={() => setRulesOpen(game?.youAreHost && game.state === 'waiting' ? 'edit' : game ? 'read' : 'help')}>{fft('rules.button', 'Rules')}</Button>
                    <Button variant="danger" onClick={game ? leave : close}>{game ? fft('leave', 'Leave the restaurant') : fft('close', 'Leave Fast Food')}</Button>
                </div>

                {live && <div className="ff-hint" data-browser-text>{fft('hint', 'Space: drop the plate, then open the parachute · E: power-up')}</div>}
                {error && <div className="ff-toast" data-browser-text>{error}</div>}
                <span className="ff-frame" data-frame={frame} />
            </div>

            {game?.state === 'waiting' && !rulesOpen && (
                <OctaneCardView className="ff-tables" theme="primary-slim" uniqueKey="fastfood-tables">
                    <OctaneCardHeaderView headerText={fft('table_of', 'Fast Food · %name%\'s game', [ 'name' ], [ game.host ])} onCloseClick={leave} />
                    <OctaneCardContentView className="text-black" gap={2}>
                        <div className="ff-tables__list">
                            {Array.from({ length: game.rules.tables }, (_, seat) => {
                                const player = game.players.find((entry) => entry.seat === seat);

                                return (
                                    <div key={seat} className={`ff-tables__seat ${player?.you ? 'is-you' : ''}`}>
                                        <Sprite name={`${skinOf(seat)}parachute_open_2`} x={0} y={0} corner className="ff-tables__chute" />
                                        <span data-browser-text>{player ? `${player.name}${player.bot ? ` (${fft('robot', 'robot')})` : ''}` : fft('free_table', 'Free table')}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="ff-tables__info" data-browser-text>{fft('to_win', 'First to serve %n% plates wins.', [ 'n' ], [ String(game.rules.plates) ])}</div>
                        <div className="ff-tables__actions">
                            {game.youAreHost
                                ? (
                                    <>
                                        {game.rules.bots && game.players.length < game.maxPlayers && <Button variant="secondary" disabled={busy} onClick={() => run(() => FastFoodApi.addBot())}>{fft('add_bot', 'Add a robot')}</Button>}
                                        {game.players.some((player) => player.bot) && <Button variant="secondary" disabled={busy} onClick={() => run(() => FastFoodApi.removeBot())}>{fft('remove_bot', 'Remove a robot')}</Button>}
                                        <Button variant="success" disabled={busy} onClick={() => run(() => FastFoodApi.start())}>{fft('start', 'Start the game!')}</Button>
                                    </>
                                )
                                : <span data-browser-text>{fft('waiting_host', 'The host starts the game.')}</span>}
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {!game && !rulesOpen && (
                <OctaneCardView className="ff-lobby" theme="primary-slim" uniqueKey="fastfood-lobby">
                    <OctaneCardHeaderView headerText={fft('lobby.title', 'Fast Food')} onCloseClick={close} />
                    <OctaneCardContentView className="text-black" gap={2}>
                        <div className="ff-lobby__intro">
                            <img src={illustrationImage} alt="" draggable={false} />
                            <span data-browser-text>{fft('intro', 'The diners are starving! Drop their plates from up high and open the parachute as late as you dare: too late and the food is lost. The first to serve all their plates wins.')}</span>
                        </div>
                        <div className="ff-lobby__list">
                            {!view?.games.length && <div className="ff-lobby__empty" data-browser-text>{fft('no_games', 'No game yet: create one and invite your friends or robots.')}</div>}
                            {view?.games.map((summary) => (
                                <div key={summary.id} className="ff-lobby__game">
                                    <span className="ff-lobby__info">
                                        <strong>{fft('game_of', '%name%\'s game', [ 'name' ], [ summary.host ])}</strong>
                                        <span>{fft('players_count', '%players%/%max% players · %plates% plates', [ 'players', 'max', 'plates' ], [ String(summary.players), String(summary.maxPlayers), String(summary.rules.plates) ])}</span>
                                    </span>
                                    <Button variant="success" disabled={busy || summary.state !== 'waiting' || summary.players >= summary.maxPlayers} onClick={() => run(() => FastFoodApi.join(summary.id))}>
                                        {summary.state === 'waiting' ? fft('join', 'Join') : fft('state.playing', 'Playing')}
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <div className="ff-lobby__actions">
                            <Button variant="secondary" onClick={() => setRulesOpen('help')}>{fft('rules.help', 'How to play')}</Button>
                            <Button variant="success" onClick={() => setRulesOpen('create')}>{fft('create', 'Create a game')}</Button>
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {rulesOpen && (
                <FastFoodRulesView
                    rules={game?.rules ?? FASTFOOD_DEFAULT_RULES}
                    editable={rulesOpen === 'create' || rulesOpen === 'edit'}
                    mode={rulesOpen}
                    busy={busy}
                    onClose={() => setRulesOpen(null)}
                    onSave={(rules: IFastFoodRules) => {
                        setRulesOpen(null);
                        run(() => (rulesOpen === 'create' ? FastFoodApi.create(rules) : FastFoodApi.setRules(rules)));
                    }} />
            )}
        </NativeTextTree>
    );
};
