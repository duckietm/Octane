import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { IWerewolfEvent, IWerewolfGame, IWerewolfRules, IWerewolfView, WEREWOLF_DEFAULT_RULES, WerewolfApi, werewolfCampName, werewolfCauseText, werewolfErrorText, werewolfEventSpeaker, werewolfEventText, werewolfRoleDescription, werewolfRoleName, werewolfStepName, wt } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { FOREST_BACKDROP, IForestLayout, WerewolfScene, forestLayout } from './WerewolfScene';
import { IWerewolfReveal, WerewolfReveal } from './WerewolfReveal';
import { WerewolfRoleCard } from './WerewolfRoleCard';
import { WerewolfRoleIcon } from './WerewolfRoleIcon';
import { WerewolfRulesView } from './WerewolfRulesView';
import '../../css/werewolf/WerewolfView.css';

const POLL_GAME_MS = 1000;
const POLL_LOBBY_MS = 3000;
const BUBBLE_MS = 4000;
const TOP_BAR = 40;

const useSceneZoom = (layout: IForestLayout): number => {
    // The floor decides the zoom; the forest's edge above it may go off the top of the screen.
    const read = () => (typeof window === 'undefined' ? 1 : Math.max(1, Math.floor(Math.min(window.innerWidth / layout.width, (window.innerHeight - TOP_BAR) / (layout.height - FOREST_BACKDROP)))));
    const [zoom, setZoom] = useState(read);

    useEffect(() => {
        const onResize = () => setZoom(read());

        onResize();
        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, [ layout ]);

    return zoom;
};

/** The clearing's top: under the top bar, or higher when it is too tall for the screen (its bottom then at the bottom). */
const stageTop = (layout: IForestLayout, zoom: number): number => (typeof window === 'undefined' ? TOP_BAR : Math.min(TOP_BAR, window.innerHeight - layout.height * zoom));

const INSTRUCTIONS: Record<string, [string, string]> = {
    cupid: [ 'Choose two players who will fall in love (you can choose yourself), then confirm.', 'Unite the lovers' ],
    wild_child: [ 'Choose your model. If they die, you become a werewolf.', 'Choose' ],
    fox: [ 'Choose a player to sniff: you will learn whether a werewolf is among them and their two neighbours.', 'Sniff' ],
    raven: [ 'Choose a player to mark: tomorrow they start the vote with two votes against them.', 'Mark' ],
    big_bad_wolf: [ 'Alone now: choose a second prey to devour.', 'Devour' ],
    white_wolf: [ 'You may devour a werewolf of the pack tonight, or spare them.', 'Devour' ],
    piper: [ 'Choose two players to charm.', 'Charm' ],
    guard: [ 'Choose a player to protect from the werewolves tonight.', 'Protect' ],
    seer: [ 'Choose a player whose role you want to see.', 'See their role' ],
    wolves: [ 'Choose tonight\'s prey with your pack.', 'Devour' ],
    vote: [ 'Vote against the player you suspect.', 'Vote' ],
    hunter: [ 'You are dead... but you still have your rifle! Choose who you take with you.', 'Shoot' ]
};

/** The big card an event shows: the player's role at the start, a death (for everybody), a player joining the pack. */
const revealOf = (event: IWerewolfEvent, game: IWerewolfGame): IWerewolfReveal | null => {
    const key = `${game.id}-${event.seq}`;

    switch (event.type) {
        case 'your_role':
            return { key, kind: 'role', role: event.a, title: wt('reveal.your_role', 'Your role'), subtitle: wt('reveal.secret', 'Keep it secret!') };
        case 'death': {
            const seat = game.seats.find((other) => other.name === event.a);

            return {
                key,
                kind: 'death',
                role: event.b,
                title: seat?.you ? wt('reveal.you_died', 'You are dead!') : wt('reveal.died', '%name% is dead', [ 'name' ], [ event.a ]),
                subtitle: `${event.a} ${werewolfCauseText(event.c)}.`,
                text: event.b ? '' : wt('reveal.hidden', 'Their role stays a secret.'),
                figure: seat?.figure,
                gender: seat?.gender
            };
        }
        case 'infected':
        case 'wolf_dog_wolf':
        case 'wild_child_turns':
            return { key, kind: 'side', role: game.you.role ?? 'werewolf', camp: 'wolves', title: wt('reveal.pack', 'You join the pack!'), text: werewolfEventText(event) ?? '' };
        default:
            return null;
    }
};

/**
 * Habbi's werewolf game (`werewolf/show`, from the Game Center): a clearing in the woods with a fire. Out of a village,
 * a window lists the open villages; in a village the players sit round the fire, the host chooses the roles and adds
 * robots, and the game is played night after day, with the narrator's lines and the chat at the bottom right.
 */
export const WerewolfView: FC = () => {
    const [visible, setVisible] = useState(false);
    const [view, setView] = useState<IWerewolfView | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [rulesOpen, setRulesOpen] = useState<'create' | 'edit' | 'read' | 'help' | null>(null);
    const [powerOpen, setPowerOpen] = useState(false);
    const [selected, setSelected] = useState<number[]>([]);
    const [poisoning, setPoisoning] = useState(false);
    const [text, setText] = useState('');
    const [bubbles, setBubbles] = useState<Map<string, string>>(new Map());
    const [reveals, setReveals] = useState<IWerewolfReveal[]>([]);
    const nextReveal = useCallback(() => setReveals((current) => current.slice(1)), []);
    const busyRef = useRef(false);
    const lastSeqRef = useRef(0);
    const gameRef = useRef(0);
    const logRef = useRef<HTMLDivElement>(null);
    const layout = forestLayout(view?.game?.maxPlayers ?? 12);
    const zoom = useSceneZoom(layout);

    const showBubbles = (game: IWerewolfGame | undefined) => {
        if (!game) return;

        const fresh = game.log.filter((event) => event.seq > lastSeqRef.current);

        if (!fresh.length) return;

        const first = lastSeqRef.current === 0;

        lastSeqRef.current = Math.max(...game.log.map((event) => event.seq));

        if (first) return;

        const cards = fresh.map((event) => revealOf(event, game)).filter(Boolean);

        if (cards.length) setReveals((current) => [ ...current, ...cards ]);

        for (const event of fresh) {
            const speaker = werewolfEventSpeaker(event);
            const line = speaker ? werewolfEventText(event) : null;

            if (!speaker || !line || event.channel !== 'all') continue;

            setBubbles((current) => new Map(current).set(speaker, line));
            setTimeout(() => setBubbles((current) => {
                if (current.get(speaker) !== line) return current;

                const next = new Map(current);

                next.delete(speaker);
                return next;
            }), BUBBLE_MS);
        }
    };

    const receive = (next: IWerewolfView) => {
        const gameId = next.game?.id ?? 0;

        if (gameId !== gameRef.current) {
            lastSeqRef.current = 0;
            setReveals([]);
        }

        gameRef.current = gameId;
        showBubbles(next.game);
        setView(next);
    };

    const refresh = useCallback(() => {
        if (busyRef.current) return;

        WerewolfApi.view().then(receive).catch((caught) => setError(werewolfErrorText(caught)));
    }, []);

    const run = useCallback(async (action: () => Promise<IWerewolfView>) => {
        if (busyRef.current) return;

        busyRef.current = true;
        setBusy(true);
        setError('');

        try {
            receive(await action());
        } catch (caught) {
            setError(werewolfErrorText(caught));
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }, []);

    useEffect(() => {
        const tracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const action = url.split('/')[1];

                if (action === 'show') setVisible(true);
                else if (action === 'hide') setVisible(false);
                else if (action === 'toggle') setVisible((value) => !value);
            },
            eventUrlPrefix: 'werewolf/'
        };

        AddLinkEventTracker(tracker);

        return () => RemoveLinkEventTracker(tracker);
    }, []);

    const inGame = !!view?.game;

    useEffect(() => {
        if (!visible) return;

        refresh();

        const timer = setInterval(refresh, inGame ? POLL_GAME_MS : POLL_LOBBY_MS);

        return () => clearInterval(timer);
    }, [visible, inGame, refresh]);

    const stepKey = `${view?.game?.night}-${view?.game?.step}`;

    useEffect(() => {
        setSelected([]);
        setPoisoning(false);
    }, [stepKey]);

    const logLength = view?.game?.log.length ?? 0;
    const lastSeq = view?.game?.log[logLength - 1]?.seq ?? 0;

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [lastSeq]);

    if (!visible) return null;

    const game = view?.game;
    const you = game?.you;
    const action = you?.action ?? '';
    const close = () => {
        setVisible(false);
        setRulesOpen(null);
    };
    const leave = () => {
        setRulesOpen(null);
        run(() => WerewolfApi.leave());
    };
    const onSelect = (userId: number) => {
        if (action === 'cupid' || action === 'piper') {
            setSelected((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [ ...current, userId ].slice(-2)));
            return;
        }

        if (action === 'witch' && !poisoning) return;

        setSelected((current) => (current[0] === userId ? [] : [ userId ]));
    };
    const onChair = (chair: number) => game && run(() => WerewolfApi.sit(chair));
    const say = (event: FormEvent) => {
        event.preventDefault();

        const message = text.trim();

        if (!message) return;

        setText('');
        run(() => WerewolfApi.say(message));
    };
    const selectedName = (index = 0) => game?.seats.find((seat) => seat.userId === selected[index])?.name ?? '';
    const chatPlaceholder = !you?.chat
        ? wt('chat.sleeping', 'Hush... the village is asleep.')
        : you.chat === 'wolves' ? wt('chat.wolves', 'Whisper to your pack...') : you.chat === 'dead' ? wt('chat.dead', 'Talk with the other dead...') : wt('chat.all', 'Talk to the village...');
    const dayNumber = game ? Math.max(1, game.night) : 1;

    const actionPanel = () => {
        if (!game) return null;

        if (game.state === 'waiting') {
            return (
                <div className="ww-panel">
                    <div className="ww-panel__text">{wt('waiting', 'Waiting for villagers (%count%/%max%, at least 5). Click a free stump to change seat.', [ 'count', 'max' ], [ String(game.players), String(game.maxPlayers) ])}</div>
                    {game.youAreHost
                        ? (
                            <div className="ww-panel__actions">
                                {game.rules.bots && <Button variant="secondary" disabled={busy || game.players >= game.maxPlayers} onClick={() => run(() => WerewolfApi.addBot())}>{wt('add_bot', 'Add a robot')}</Button>}
                                {game.rules.bots && <Button variant="secondary" disabled={busy || game.players >= game.maxPlayers} onClick={() => run(() => WerewolfApi.fillBots())}>{wt('fill_bots', 'Fill with robots')}</Button>}
                                {game.seats.some((seat) => seat.bot) && <Button variant="secondary" disabled={busy} onClick={() => run(() => WerewolfApi.removeBot([ ...game.seats ].reverse().find((seat) => seat.bot).userId))}>{wt('remove_bot', 'Remove a robot')}</Button>}
                                <Button variant="success" disabled={busy || game.players < 5} onClick={() => run(() => WerewolfApi.start())}>{wt('start', 'Start the game')}</Button>
                            </div>
                        )
                        : <div className="ww-panel__text">{wt('waiting_host', 'The host starts the game.')}</div>}
                </div>
            );
        }

        if (game.state === 'finished') {
            return (
                <div className="ww-panel ww-panel--end">
                    <div className="ww-panel__title">{you?.won ? wt('you_won', 'You won!') : wt('you_lost', 'You lost...')}</div>
                    <div className="ww-panel__actions">
                        <Button variant="secondary" onClick={leave}>{wt('leave', 'Leave the village')}</Button>
                        {game.youAreHost && game.players >= 5 && <Button variant="success" disabled={busy} onClick={() => run(() => WerewolfApi.start())}>{wt('again', 'Play again')}</Button>}
                    </div>
                </div>
            );
        }

        if (!you?.alive && action !== 'hunter') return <div className="ww-panel"><div className="ww-panel__text">{wt('dead', 'You are dead: watch the game, and talk with the other dead.')}</div></div>;

        if (!action) {
            const hunter = [ ...game.log ].reverse().find((event) => event.type === 'hunter_wakes')?.a ?? '';
            const waiting = game.step === 'hunter'
                ? wt('hunter_aims', 'The hunter %name% takes aim...', [ 'name' ], [ hunter ])
                : game.isNight
                    ? (you?.peeks && game.step === 'wolves' ? wt('peeking', 'You peek at the werewolves through your fingers... read their words in the chat.') : wt('sleeping', 'The village sleeps... close your eyes.'))
                    : game.step === 'dawn' ? wt('dawn', 'The village wakes up...') : game.step === 'vote' && you?.canVote === false ? wt('no_vote', 'You no longer vote: watch the others.') : wt('wait', 'Wait for the others...');

            return <div className="ww-panel"><div className="ww-panel__text">{waiting}</div></div>;
        }

        if (you.done) return <div className="ww-panel"><div className="ww-panel__text">{wt('done', 'Noted. Waiting for the others...')}</div></div>;

        if (action === 'ready') {
            return (
                <div className="ww-panel">
                    <div className="ww-panel__text">{wt('debate', 'Debate! Who are the werewolves? When you are ready, go to the vote.')}</div>
                    <div className="ww-panel__actions"><Button variant="success" disabled={busy} onClick={() => run(() => WerewolfApi.ready())}>{wt('ready', 'Ready to vote')}</Button></div>
                </div>
            );
        }

        if (action === 'wolf_dog') {
            return (
                <div className="ww-panel">
                    <div className="ww-panel__text">{wt('wolf_dog.what', 'Choose your side, for the whole game.')}</div>
                    <div className="ww-panel__actions">
                        <Button variant="success" disabled={busy} onClick={() => run(() => WerewolfApi.choose(false))}>{wt('wolf_dog.village', 'Stay a villager')}</Button>
                        <Button variant="danger" disabled={busy} onClick={() => run(() => WerewolfApi.choose(true))}>{wt('wolf_dog.wolf', 'Join the werewolves')}</Button>
                    </div>
                </div>
            );
        }

        if (action === 'accursed') {
            return (
                <div className="ww-panel">
                    <div className="ww-panel__text">{wt('accursed.what', 'The pack chose %name%. Infect them instead (once in the game)?', [ 'name' ], [ you.victim || '?' ])}</div>
                    <div className="ww-panel__actions">
                        <Button variant="danger" disabled={busy} onClick={() => run(() => WerewolfApi.choose(true))}>{wt('accursed.infect', 'Infect %name%', [ 'name' ], [ you.victim || '?' ])}</Button>
                        <Button variant="secondary" disabled={busy} onClick={() => run(() => WerewolfApi.choose(false))}>{wt('accursed.devour', 'Let them be devoured')}</Button>
                    </div>
                </div>
            );
        }

        if (action === 'witch') {
            return (
                <div className="ww-panel">
                    <div className="ww-panel__text">
                        {you.victim ? wt('witch.victim', 'The werewolves attacked %name%.', [ 'name' ], [ you.victim ]) : wt('witch.nobody', 'The werewolves attacked nobody.')}
                        {' '}
                        {poisoning ? wt('witch.choose', 'Choose who you poison.') : wt('witch.what', 'What do you do?')}
                    </div>
                    <div className="ww-panel__actions">
                        {you.lifePotion && you.victimId > 0 && !poisoning && <Button variant="success" disabled={busy} onClick={() => run(() => WerewolfApi.witch(true, 0))}>{wt('witch.save', 'Save %name%', [ 'name' ], [ you.victim ])}</Button>}
                        {you.deathPotion && !poisoning && <Button variant="danger" disabled={busy} onClick={() => setPoisoning(true)}>{wt('witch.poison', 'Poison someone')}</Button>}
                        {poisoning && <Button variant="danger" disabled={busy || !selected.length} onClick={() => run(() => WerewolfApi.witch(false, selected[0]))}>{selected.length ? wt('witch.poison_name', 'Poison %name%', [ 'name' ], [ selectedName() ]) : wt('witch.poison', 'Poison someone')}</Button>}
                        <Button variant="secondary" disabled={busy} onClick={() => (poisoning ? setPoisoning(false) : run(() => WerewolfApi.witch(false, 0)))}>{poisoning ? wt('cancel', 'Cancel') : wt('witch.nothing', 'Do nothing')}</Button>
                    </div>
                </div>
            );
        }

        const [ instruction, label ] = INSTRUCTIONS[action] ?? [ '', '' ];
        const choices = game.seats.filter((seat) => seat.targetable).length;
        const needed = action === 'cupid' ? 2 : action === 'piper' ? Math.min(2, Math.max(1, choices)) : 1;
        const optional = action === 'raven' || action === 'white_wolf';

        return (
            <div className="ww-panel">
                <div className="ww-panel__text">{wt(`instruction.${action}`, instruction)}</div>
                <div className="ww-panel__actions">
                    <Button variant={action === 'hunter' ? 'danger' : 'success'} disabled={busy || selected.length < needed} onClick={() => run(() => WerewolfApi.act(selected[0], selected[1] ?? 0))}>
                        {selected.length >= needed ? `${wt(`button.${action}`, label)} : ${needed === 2 ? `${selectedName()} + ${selectedName(1)}` : selectedName()}` : wt(`button.${action}`, label)}
                    </Button>
                    {optional && <Button variant="secondary" disabled={busy} onClick={() => run(() => WerewolfApi.pass())}>{wt(`pass.${action}`, 'Nobody')}</Button>}
                </div>
            </div>
        );
    };

    return (
        <NativeTextTree>
            <div className="ww-room">
                <div className="ww-room__stage" style={{ width: layout.width * zoom, height: layout.height * zoom, marginTop: stageTop(layout, zoom) }}>
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
                        <WerewolfScene game={game ?? null} bubbles={bubbles} selected={selected} zoom={zoom} onSelect={onSelect} onChair={onChair} />
                    </div>
                </div>

                <div className="ww-topbar">
                    {game && <Button variant="secondary" onClick={() => setRulesOpen(game.youAreHost && game.state !== 'playing' ? 'edit' : 'read')}>{wt('rules.button', 'Rules')}</Button>}
                    <Button variant="danger" onClick={game ? leave : close}>{game ? wt('leave', 'Leave the village') : wt('close', 'Leave the clearing')}</Button>
                </div>

                {game && you?.role && game.state !== 'waiting' && (
                    <button type="button" className={`ww-rolecard is-${you.camp ?? 'village'}`} onClick={() => setPowerOpen(true)}>
                        <WerewolfRoleIcon role={you.role} zoom={3} />
                        <span className="ww-rolecard__text">
                            <span className="ww-rolecard__label">{wt('your_role', 'Your role')}</span>
                            <span className="ww-rolecard__name">{werewolfRoleName(you.role)}</span>
                            <span className="ww-rolecard__camp">{you.pack && you.role !== 'werewolf' && you.camp === 'wolves' ? wt('in_pack', 'In the pack') : werewolfCampName(you.camp ?? 'village')}{you.charmed ? ` · ${wt('charmed', 'Charmed')}` : ''}</span>
                            <span className="ww-rolecard__link">{wt('see_power', 'see the power')}</span>
                        </span>
                    </button>
                )}

                {game && game.state === 'playing' && (
                    <div className={`ww-phase ${game.isNight ? 'is-night' : 'is-day'}`}>
                        <div className="ww-phase__text">
                            <span className="ww-phase__label">{game.isNight ? wt('night_n', 'Night %n%', [ 'n' ], [ String(dayNumber) ]) : wt('day_n', 'Day %n%', [ 'n' ], [ String(dayNumber) ])}</span>
                            <span className="ww-phase__step">{werewolfStepName(game.step)}</span>
                        </div>
                        <span className="ww-phase__timer">{game.secondsLeft}</span>
                    </div>
                )}

                {game && <div className="ww-bottom">{actionPanel()}</div>}

                {game && (
                    <div className="ww-chat">
                        <div className="ww-chat__log" ref={logRef} data-browser-text>
                            {game.log.map((event) => {
                                const line = werewolfEventText(event);

                                if (!line) return null;

                                const speaker = werewolfEventSpeaker(event);

                                return (
                                    <div key={event.seq} className={`ww-line is-${event.channel} ${speaker ? 'is-chat' : 'is-narrator'} is-${event.type}`}>
                                        {speaker ? <strong>{speaker}:</strong> : <span className="ww-line__icon" />}
                                        <span>{line}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <form className="ww-chat__input" onSubmit={say}>
                            <input value={text} maxLength={120} disabled={!you?.chat || busy} placeholder={chatPlaceholder} onChange={(event) => setText(event.target.value)} data-browser-text />
                            <Button variant="primary" disabled={!you?.chat || busy || !text.trim()} onClick={say}>OK</Button>
                        </form>
                    </div>
                )}

                {error && <div className="ww-toast" data-browser-text>{error}</div>}

                {reveals.length > 0 && <WerewolfReveal key={reveals[0].key} reveal={reveals[0]} onClose={nextReveal} />}
            </div>

            {!game && !rulesOpen && (
                <OctaneCardView className="ww-lobby" theme="primary-slim" uniqueKey="werewolf-lobby">
                    <OctaneCardHeaderView headerText={wt('lobby.title', 'Werewolf villages')} onCloseClick={close} />
                    <OctaneCardContentView className="text-black" gap={2}>
                        <div className="ww-lobby__intro" data-browser-text>{wt('intro', 'Night falls on the village... Werewolves hide among the villagers. Find them and eliminate them by vote before they devour everybody!')}</div>
                        <div className="ww-lobby__list">
                            {!view?.games.length && <div className="ww-lobby__empty">{wt('no_games', 'No village yet: create one and invite robots or friends.')}</div>}
                            {view?.games.map((summary) => (
                                <div key={summary.id} className="ww-lobby__game">
                                    <span className="ww-lobby__host">{wt('village_of', 'Village of %name%', [ 'name' ], [ summary.host ])}</span>
                                    <span className="ww-lobby__count">{summary.players}/{summary.maxPlayers}</span>
                                    <Button variant="success" disabled={busy || summary.state !== 'waiting' || summary.players >= summary.maxPlayers} onClick={() => run(() => WerewolfApi.join(summary.id))}>
                                        {summary.state === 'waiting' ? wt('join', 'Sit by the fire') : wt('state.playing', 'Playing')}
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <div className="ww-lobby__actions">
                            <Button variant="secondary" onClick={() => setRulesOpen('help')}>{wt('rules.help', 'Rules of the game')}</Button>
                            <Button variant="success" onClick={() => setRulesOpen('create')}>{wt('create', 'Create a village')}</Button>
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {rulesOpen && (
                <WerewolfRulesView
                    rules={game?.rules ?? WEREWOLF_DEFAULT_RULES}
                    editable={rulesOpen === 'create' || rulesOpen === 'edit'}
                    tab={rulesOpen === 'read' && game?.state === 'playing' ? 'roles' : undefined}
                    mode={rulesOpen}
                    busy={busy}
                    onClose={() => setRulesOpen(null)}
                    onSave={(rules: IWerewolfRules) => {
                        setRulesOpen(null);
                        run(() => (rulesOpen === 'create' ? WerewolfApi.create(rules) : WerewolfApi.setRules(rules)));
                    }} />
            )}

            {powerOpen && you?.role && (
                <OctaneCardView className="ww-power" theme="primary-slim" uniqueKey="werewolf-power" isResizable={false}>
                    <OctaneCardHeaderView headerText={werewolfRoleName(you.role)} onCloseClick={() => setPowerOpen(false)} />
                    <OctaneCardContentView className="text-black items-center" gap={2}>
                        <WerewolfRoleCard role={you.role} camp={you.camp} zoom={3} />
                        <span className={`ww-camp is-${you.camp ?? 'village'}`}>{werewolfCampName(you.camp ?? 'village')}</span>
                        <div className="ww-power__text" data-browser-text>{werewolfRoleDescription(you.role)}</div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}
        </NativeTextTree>
    );
};
