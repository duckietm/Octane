import { AddLinkEventTracker, AvatarAction, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { CSSProperties, FC, useCallback, useEffect, useRef, useState } from 'react';
import { BATTLEBALL_DEFAULT_RULES, BattleBallApi, IBattleBallGame, IBattleBallRules, IBattleBallView, battleBallArenaName, battleBallErrorText, battleBallPowerName, battleBallTeamName, bbt } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import barImage from '../../assets/images/battleball/bb-bar.png';
import buttonsImage from '../../assets/images/battleball/bb-buttons.png';
import iconsImage from '../../assets/images/battleball/bb-icons.png';
import soundImage from '../../assets/images/battleball/bb-sound.png';
import thumbsImage from '../../assets/images/battleball/bb-thumbs.png';
import timerImage from '../../assets/images/battleball/bb-timer.png';
import countdownWindow from '../../assets/images/battleball/bb-window-bb-cdown.png';
import big2Window from '../../assets/images/battleball/bb-window-bb-score-big-2t.png';
import big3Window from '../../assets/images/battleball/bb-window-bb-score-big-3t.png';
import big4Window from '../../assets/images/battleball/bb-window-bb-score-big-4t.png';
import scoresWindow from '../../assets/images/battleball/bb-window-bb-scores.png';
import loseSound from '../../assets/sounds/battleball/bb-lose.mp3';
import musicSound from '../../assets/sounds/battleball/bb-music.mp3';
import pickupSound from '../../assets/sounds/battleball/bb-pickup.mp3';
import power1 from '../../assets/sounds/battleball/bb-power-1.mp3';
import power2 from '../../assets/sounds/battleball/bb-power-2.mp3';
import power3 from '../../assets/sounds/battleball/bb-power-3.mp3';
import power4 from '../../assets/sounds/battleball/bb-power-4.mp3';
import power5 from '../../assets/sounds/battleball/bb-power-5.mp3';
import power6 from '../../assets/sounds/battleball/bb-power-6.mp3';
import power7 from '../../assets/sounds/battleball/bb-power-7.mp3';
import power8 from '../../assets/sounds/battleball/bb-power-8.mp3';
import stunnedSound from '../../assets/sounds/battleball/bb-stunned.mp3';
import winSound from '../../assets/sounds/battleball/bb-win.mp3';
import { useUnoAvatar } from '../uno/useUnoAvatar';
import { BattleBallRulesView } from './BattleBallRulesView';
import { BattleBallScene, FRAME_HEIGHT, FRAME_WIDTH, SCALE } from './BattleBallScene';
import '../../css/battleball/BattleBallView.css';

const POLL_FAST_MS = 250;
const POLL_SLOW_MS = 1000;
const POLL_LOBBY_MS = 3000;
const BAR_HEIGHT = 57;
const POWER_SOUNDS = [ '', power1, power2, power3, power4, power5, power6, power7, power8 ];
/** The big windows' rows (bb_score_big_<n>t.window): the team ball's and the score's top. */
const BIG_ROWS: Record<number, number[]> = { 2: [ 64, 168 ], 3: [ 64, 135, 206 ], 4: [ 64, 119, 174, 229 ] };
const BIG_WINDOWS: Record<number, string> = { 2: big2Window, 3: big3Window, 4: big4Window };

/** The stage's zoom: the arena and its bar on the screen, never bigger than twice the original. */
const useStageZoom = (): number => {
    const read = () => (typeof window === 'undefined' ? 1 : Math.max(0.4, Math.min(1, window.innerWidth / (FRAME_WIDTH * SCALE), window.innerHeight / ((FRAME_HEIGHT + BAR_HEIGHT - 30) * SCALE))));
    const [zoom, setZoom] = useState(read);

    useEffect(() => {
        const onResize = () => setZoom(read());

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    return zoom;
};

/** The original game's music and sound effects, each with its switch (kept in the browser). */
const useSounds = () => {
    const [music, setMusic] = useState(() => localStorage.getItem('battleball.music') !== 'off');
    const [effects, setEffects] = useState(() => localStorage.getItem('battleball.effects') !== 'off');
    const musicRef = useRef<HTMLAudioElement | null>(null);

    const play = useCallback((url: string) => {
        if (!effects || !url) return;

        const audio = new Audio(url);

        audio.volume = 0.6;
        audio.play().catch(() => undefined);
    }, [effects]);

    const playMusic = useCallback((on: boolean) => {
        if (!musicRef.current) {
            musicRef.current = new Audio(musicSound);
            musicRef.current.loop = true;
            musicRef.current.volume = 0.35;
        }

        if (on && music) musicRef.current.play().catch(() => undefined);
        else musicRef.current.pause();
    }, [music]);

    useEffect(() => () => musicRef.current?.pause(), []);

    return {
        music,
        effects,
        play,
        playMusic,
        toggleMusic: () => setMusic((value) => {
            localStorage.setItem('battleball.music', value ? 'off' : 'on');
            return !value;
        }),
        toggleEffects: () => setEffects((value) => {
            localStorage.setItem('battleball.effects', value ? 'off' : 'on');
            return !value;
        })
    };
};

const TeamBall: FC<{ team: number }> = ({ team }) => <span className="bb-ico" style={{ backgroundImage: `url(${iconsImage})`, backgroundPosition: `${-team * 20}px 0` }} />;

const formatTime = (ms: number) => {
    const seconds = Math.max(0, Math.ceil(ms / 1000));

    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/** The colours of the original's score bars (bb_scorebars), a team each. */
const SCORE_BAR_COLOURS = [ '#e05951', '#51a7e0', '#d7e051', '#61e051' ];
/** A score bar's room in its groove of bb_scores, and the width under which its value goes after it, not inside. */
const SCORE_BAR_MAX = 159;
const SCORE_BAR_LABEL = 34;

/** The in-game score window of the original (bb_scores): the time left and a bar a team, its points at its end. */
const ScoreWindow: FC<{ game: IBattleBallGame }> = ({ game }) => {
    const best = Math.max(1, ...game.scores);

    return (
        <div className="bb-window bb-window--scores" style={{ backgroundImage: `url(${scoresWindow})` }}>
            <span className="bb-window__title" style={{ left: 24, top: 10, width: 135 }} data-browser-text>{bbt('time_left', 'Time left: %time%', [ 'time' ], [ formatTime(game.timeLeft) ])}</span>
            {game.scores.slice(0, game.rules.teams).map((score, team) => {
                const width = 3 + Math.round((SCORE_BAR_MAX - 3) * score / best);

                return (
                    <span key={team} className="bb-scorebar" style={{ top: 34 + team * 8, width, backgroundColor: SCORE_BAR_COLOURS[team] }}>
                        <span className={`bb-scorebar__value ${width < SCORE_BAR_LABEL ? 'is-after' : ''}`} data-browser-text>{score}</span>
                    </span>
                );
            })}
        </div>
    );
};

/** The countdown window of the original (bb_cdown): the bar fills while the game gets ready. */
const CountdownWindow: FC<{ game: IBattleBallGame }> = ({ game }) => {
    const left = Math.ceil(game.timeLeft / 1000);

    return (
        <div className="bb-window bb-window--countdown" style={{ backgroundImage: `url(${countdownWindow})` }}>
            <span className="bb-window__title" style={{ left: 17, top: 10, width: 144 }} data-browser-text>{bbt('countdown', 'The game is about to begin')}</span>
            <span className="bb-countbar" style={{ width: Math.round(159 * Math.min(1, 1 - game.timeLeft / 5000)) }} />
            <span className="bb-window__big" data-browser-text>{left}</span>
            <span className="bb-window__field" style={{ left: 33, top: 94, width: 26 }} data-browser-text>{game.players.length}</span>
            <span className="bb-window__field" style={{ left: 77, top: 94, width: 90 }} data-browser-text>{battleBallArenaName(game.rules.arena)}</span>
        </div>
    );
};

/** The best player standing in the final window's sun, at the original's size (the window is drawn twice its size). */
const BestPlayer: FC<{ figure: string; gender: string }> = ({ figure, gender }) => {
    const picture = useUnoAvatar(figure, gender, 2, AvatarAction.POSTURE_STAND);

    return picture ? <img className="bb-final__best" src={picture} alt="" draggable={false} /> : null;
};

/** The final standings of the original (bb_score_big_<n>t): the teams by rank, the best player. */
const FinalWindow: FC<{ game: IBattleBallGame; you: number; busy: boolean; onLeave: () => void; onAgain: () => void }> = ({ game, you, busy, onLeave, onAgain }) => {
    const teams = game.scores.map((score, team) => ({ team, score })).filter(({ team }) => game.players.some((player) => player.team === team)).sort((a, b) => b.score - a.score);
    const count = Math.min(4, Math.max(2, teams.length));
    const rows = BIG_ROWS[count];
    const best = [ ...game.players ].sort((a, b) => b.score - a.score)[0];
    const me = game.players.find((player) => player.userId === you);
    const won = me && game.winners.includes(me.team);

    return (
        <div className="bb-window bb-window--final" style={{ backgroundImage: `url(${BIG_WINDOWS[count]})` }}>
            <span className="bb-window__title" style={{ left: 153, top: 10, width: 160 }} data-browser-text>{game.winners.length > 1 ? bbt('tie', 'The game ended in a tie!') : bbt('game_over', 'Game over!')}</span>
            <span className="bb-window__head" style={{ left: 8, top: 43, width: 255 }} data-browser-text>{bbt('final', 'Final standings:')}</span>
            <span className="bb-window__head" style={{ left: 272, top: 43, width: 189 }} data-browser-text>{bbt('best_player', 'Best player:')}</span>
            {teams.slice(0, count).map(({ team, score }, rank) => (
                <div key={team}>
                    <span className="bb-final__ball" style={{ left: 26, top: rows[rank], backgroundImage: `url(${iconsImage})`, backgroundPosition: `${-team * 20}px 0` }} />
                    <span className="bb-window__text is-centre" style={{ left: 14, top: rows[rank] + 31, width: 44 }} data-browser-text>{score}</span>
                    <span className="bb-final__team" style={{ left: 96, top: rows[rank] + 2 }} data-browser-text>
                        <strong>{battleBallTeamName(team)}</strong>
                        {game.players.filter((player) => player.team === team).map((player) => <span key={player.userId}>{player.name} ({player.score})</span>)}
                    </span>
                </div>
            ))}
            <span className="bb-final__sun" />
            {best && <BestPlayer key={best.userId} figure={best.figure} gender={best.gender} />}
            {best && <span className="bb-window__text" style={{ left: 303, top: 130, width: 112 }} data-browser-text>{best.name}</span>}
            {best && <span className="bb-window__text" style={{ left: 427, top: 130, width: 35 }} data-browser-text>{best.score}</span>}
            <span className="bb-window__head" style={{ left: 272, top: 157, width: 189 }} data-browser-text>{me ? (won ? bbt('you_won', 'You won!') : bbt('you_lost', 'You lost...')) : ''}</span>
            {me && <span className="bb-window__text" style={{ left: 300, top: 192, width: 160 }} data-browser-text>{bbt('your_score', 'Your points: %n%', [ 'n' ], [ String(me.score) ])}</span>}
            {me && <span className="bb-window__text is-centre" style={{ left: 272, top: 225, width: 189 }} data-browser-text>{bbt('your_rank', 'Your team: %rank% of %teams%', [ 'rank', 'teams' ], [ String(1 + teams.findIndex(({ team }) => team === me.team)), String(teams.length) ])}</span>}
            <span className="bb-window__field" style={{ left: 33, top: 296, width: 27 }} data-browser-text>{game.players.length}</span>
            <div className="bb-final__actions">
                <Button variant="secondary" onClick={onLeave}>{bbt('leave', 'Leave the arena')}</Button>
                {game.youAreHost && <Button variant="success" disabled={busy} onClick={onAgain}>{bbt('again', 'Play again')}</Button>}
            </div>
        </div>
    );
};

/** The game's bottom bar (bb2_ui): the player's team and score, the power-up held and its time, the sound switches. */
const Bar: FC<{ game: IBattleBallGame; you: number; sounds: ReturnType<typeof useSounds>; onPower: () => void; onHelp: () => void }> = ({ game, you, sounds, onPower, onHelp }) => {
    const me = game.players.find((player) => player.userId === you);
    const held = me?.held ?? 0;
    const button = held === 6 ? 8 + (me?.team ?? 0) + 1 : held;
    const seconds = held ? Math.min(10, Math.ceil((me?.heldLeft ?? 0) / 1500)) : 11;

    return (
        <div className="bb-bar" style={{ backgroundImage: `url(${barImage})` }}>
            {me && <TeamBall team={me.team} />}
            <span className="bb-bar__name" data-browser-text>{me ? `${me.name} · ${battleBallTeamName(me.team)}` : bbt('watching', 'You are watching the game.')}</span>
            <span className="bb-bar__score" data-browser-text>{me ? bbt('your_score', 'Your points: %n%', [ 'n' ], [ String(me.score) ]) : ''}</span>
            <span className="bb-bar__power-name" data-browser-text>{held ? battleBallPowerName(held) : bbt('no_power', 'No power-up')}</span>
            <span className="bb-bar__timer" style={{ backgroundImage: `url(${timerImage})`, backgroundPosition: `${-seconds * 23}px 0` }} />
            <button type="button" className="bb-bar__power" disabled={!held} onClick={onPower} title={bbt('use_power', 'Use the power-up (space)')} style={{ backgroundImage: `url(${buttonsImage})`, backgroundPosition: `${-button * 47}px 0` }} />
            <button type="button" className="bb-bar__sound is-music" onClick={sounds.toggleMusic} style={{ backgroundImage: `url(${soundImage})`, backgroundPosition: `${sounds.music ? 0 : -26}px 0` }} aria-label="music" />
            <button type="button" className="bb-bar__sound is-effects" onClick={sounds.toggleEffects} style={{ backgroundImage: `url(${soundImage})`, backgroundPosition: `${sounds.effects ? -52 : -78}px 0` }} aria-label="sounds" />
            <button type="button" className="bb-bar__help" onClick={onHelp} aria-label="help" />
        </div>
    );
};

/**
 * BattleBall (`battleball/show`, from the Game Center): Habbo's original BattleBall: Rebound!, its arenas,
 * tiles, power-ups, windows and sounds. Out of a game, a window lists the games; in a game, the teams window until
 * the host starts, then the arena: click a tile to bounce there, space (or the bar's button) for the power-up.
 */
export const BattleBallView: FC = () => {
    const [visible, setVisible] = useState(false);
    const [view, setView] = useState<IBattleBallView | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [rulesOpen, setRulesOpen] = useState<'create' | 'edit' | 'read' | 'help' | null>(null);
    const busyRef = useRef(false);
    const latestRef = useRef(0);
    const seqRef = useRef(0);
    const gameRef = useRef(0);
    const zoom = useStageZoom();
    const sounds = useSounds();

    const game = view?.game;
    const you = view?.userId ?? 0;

    const receive = useCallback((next: IBattleBallView) => {
        const current = next.game;

        if (current && current.serverTime < latestRef.current && current.id === gameRef.current) return;

        latestRef.current = current?.serverTime ?? 0;

        if ((current?.id ?? 0) !== gameRef.current) {
            gameRef.current = current?.id ?? 0;
            seqRef.current = Math.max(0, ...(current?.log ?? []).map((event) => event.seq));
        } else if (current) {
            for (const event of current.log) {
                if (event.seq <= seqRef.current) continue;

                seqRef.current = event.seq;

                if (event.type === 'pickup' && event.userId === next.userId) sounds.play(pickupSound);
                if (event.type === 'power') sounds.play(POWER_SOUNDS[event.a] ?? '');
                if (event.type === 'stun' && event.userId === next.userId) sounds.play(stunnedSound);
                if (event.type === 'end') {
                    const me = current.players.find((player) => player.userId === next.userId);

                    sounds.play(me && current.winners.includes(me.team) ? winSound : loseSound);
                }
            }
        }

        setView(next);
    }, [sounds]);

    const refresh = useCallback(() => {
        if (busyRef.current) return;

        BattleBallApi.view().then(receive).catch((caught) => setError(battleBallErrorText(caught) ?? ''));
    }, [receive]);

    const run = useCallback(async (action: () => Promise<IBattleBallView>) => {
        if (busyRef.current) return;

        busyRef.current = true;
        setBusy(true);
        setError('');

        try {
            receive(await action());
        } catch (caught) {
            setError(battleBallErrorText(caught) ?? '');
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }, [receive]);

    const play = useCallback((action: () => Promise<IBattleBallView>) => {
        action().then(receive).catch((caught) => {
            const text = battleBallErrorText(caught);

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
            eventUrlPrefix: 'battleball/'
        };

        AddLinkEventTracker(tracker);

        return () => RemoveLinkEventTracker(tracker);
    }, []);

    const live = game?.state === 'countdown' || game?.state === 'playing';

    useEffect(() => {
        if (!visible) return;

        refresh();

        const timer = setInterval(refresh, live ? POLL_FAST_MS : game ? POLL_SLOW_MS : POLL_LOBBY_MS);

        return () => clearInterval(timer);
    }, [visible, live, !!game, refresh]);

    useEffect(() => {
        sounds.playMusic(visible && !!live);
    }, [visible, live, sounds.music]);

    // Space uses the power-up, while the game is on.
    useEffect(() => {
        if (!visible || game?.state !== 'playing') return;

        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;

            if (event.key !== ' ' || (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))) return;

            event.preventDefault();
            event.stopPropagation();
            play(() => BattleBallApi.power());
        };

        window.addEventListener('keydown', onKey, true);

        return () => window.removeEventListener('keydown', onKey, true);
    }, [visible, game?.state, play]);

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
        run(() => BattleBallApi.leave());
    };
    const me = game?.players.find((player) => player.userId === you);
    const arenaId = game?.rules.arena ?? 1;

    return (
        <NativeTextTree>
            <div className="bb-room">
                <div className="bb-stage" style={{ width: FRAME_WIDTH * SCALE * zoom, height: (FRAME_HEIGHT + BAR_HEIGHT - 30) * SCALE * zoom }}>
                    <div className="bb-stage__inner" style={{ transform: `scale(${zoom})` }}>
                        <BattleBallScene game={game ?? null} arenaId={arenaId} zoom={zoom} onWalk={(x, y) => game?.state === 'playing' && me && play(() => BattleBallApi.walk(x, y))} />
                        {game && live && <Bar game={game} you={you} sounds={sounds} onPower={() => play(() => BattleBallApi.power())} onHelp={() => setRulesOpen('help')} />}
                        {game?.state === 'playing' && <ScoreWindow game={game} />}
                        {game?.state === 'countdown' && <CountdownWindow game={game} />}
                        {game?.state === 'finished' && <FinalWindow game={game} you={you} busy={busy} onLeave={leave} onAgain={() => run(() => BattleBallApi.start())} />}
                    </div>
                </div>

                <div className="bb-topbar">
                    <Button variant="secondary" onClick={() => setRulesOpen(game?.youAreHost && game.state === 'waiting' ? 'edit' : game ? 'read' : 'help')}>{bbt('rules.button', 'Rules')}</Button>
                    <Button variant="danger" onClick={game ? leave : close}>{game ? bbt('leave', 'Leave the arena') : bbt('close', 'Leave BattleBall')}</Button>
                </div>

                {error && <div className="bb-toast" data-browser-text>{error}</div>}
            </div>

            {game?.state === 'waiting' && !rulesOpen && (
                <OctaneCardView className="bb-teams" theme="primary-slim" uniqueKey="battleball-teams">
                    <OctaneCardHeaderView headerText={`${bbt('title', 'BattleBall')} · ${battleBallArenaName(game.rules.arena)}`} onCloseClick={leave} />
                    <OctaneCardContentView className="text-black" gap={2}>
                        <div className="bb-teams__grid" style={{ '--bb-teams': game.rules.teams } as CSSProperties}>
                            {Array.from({ length: game.rules.teams }, (_, team) => {
                                const members = game.players.filter((player) => player.team === team);
                                const full = members.length >= game.rules.perTeam;

                                return (
                                    <div key={team} className={`bb-teams__team is-team-${team}`}>
                                        <div className="bb-teams__head"><TeamBall team={team} /><strong>{battleBallTeamName(team)}</strong><span>{members.length}/{game.rules.perTeam}</span></div>
                                        <div className="bb-teams__members">
                                            {members.map((player) => <span key={player.userId} className={player.you ? 'is-you' : ''}>{player.name}{player.bot ? ` (${bbt('robot', 'robot')})` : ''}</span>)}
                                        </div>
                                        {me && me.team !== team && !full && <Button variant="secondary" disabled={busy} onClick={() => run(() => BattleBallApi.team(team))}>{bbt('join_team', 'Join')}</Button>}
                                        {game.youAreHost && game.rules.bots && !full && <Button variant="secondary" disabled={busy} onClick={() => run(() => BattleBallApi.addBot(team))}>{bbt('add_bot', 'Add a robot')}</Button>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="bb-teams__actions">
                            {game.youAreHost
                                ? (
                                    <>
                                        {game.rules.bots && <Button variant="secondary" disabled={busy || game.players.length >= game.maxPlayers} onClick={() => run(() => BattleBallApi.fillBots())}>{bbt('fill_bots', 'Fill with robots')}</Button>}
                                        {game.players.some((player) => player.bot) && <Button variant="secondary" disabled={busy} onClick={() => run(() => BattleBallApi.removeBot())}>{bbt('remove_bot', 'Remove a robot')}</Button>}
                                        <Button variant="success" disabled={busy} onClick={() => run(() => BattleBallApi.start())}>{bbt('start', 'Start the game!')}</Button>
                                    </>
                                )
                                : <span data-browser-text>{bbt('waiting_host', 'The host starts the game.')}</span>}
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {!game && !rulesOpen && (
                <OctaneCardView className="bb-lobby" theme="primary-slim" uniqueKey="battleball-lobby">
                    <OctaneCardHeaderView headerText={bbt('lobby.title', 'BattleBall')} onCloseClick={close} />
                    <OctaneCardContentView className="text-black" gap={2}>
                        <div className="bb-lobby__intro" data-browser-text>{bbt('intro', 'Bounce on your ball, colour the tiles of your team and lock them before the others! Power-ups help you on the way.')}</div>
                        <div className="bb-lobby__list">
                            {!view?.games.length && <div className="bb-lobby__empty" data-browser-text>{bbt('no_games', 'No game yet: create one and invite your friends or robots.')}</div>}
                            {view?.games.map((summary) => (
                                <div key={summary.id} className="bb-lobby__game">
                                    <span className="bb-lobby__thumb" style={{ backgroundImage: `url(${thumbsImage})`, backgroundPosition: `${-(summary.rules.arena - 1) * 95.5}px 0` }} />
                                    <span className="bb-lobby__info">
                                        <strong>{battleBallArenaName(summary.rules.arena)}</strong>
                                        <span>{bbt('game_of', 'Game of %name%', [ 'name' ], [ summary.host ])}</span>
                                        <span>{bbt('teams_count', '%teams% teams · %players%/%max% players', [ 'teams', 'players', 'max' ], [ String(summary.rules.teams), String(summary.players), String(summary.maxPlayers) ])}</span>
                                    </span>
                                    <Button variant="success" disabled={busy || summary.state !== 'waiting' || summary.players >= summary.maxPlayers} onClick={() => run(() => BattleBallApi.join(summary.id))}>
                                        {summary.state === 'waiting' ? bbt('join', 'Join') : bbt('state.playing', 'Playing')}
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <div className="bb-lobby__actions">
                            <Button variant="secondary" onClick={() => setRulesOpen('help')}>{bbt('rules.help', 'Rules of the game')}</Button>
                            <Button variant="success" onClick={() => setRulesOpen('create')}>{bbt('create', 'Create a game')}</Button>
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {rulesOpen && (
                <BattleBallRulesView
                    rules={game?.rules ?? BATTLEBALL_DEFAULT_RULES}
                    editable={rulesOpen === 'create' || rulesOpen === 'edit'}
                    mode={rulesOpen}
                    busy={busy}
                    onClose={() => setRulesOpen(null)}
                    onSave={(rules: IBattleBallRules) => {
                        setRulesOpen(null);
                        run(() => (rulesOpen === 'create' ? BattleBallApi.create(rules) : BattleBallApi.setRules(rules)));
                    }} />
            )}
        </NativeTextTree>
    );
};
