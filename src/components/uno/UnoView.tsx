import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { IUnoRules, IUnoTable, IUnoView, UNO_DEFAULT_RULES, UnoApi, UnoCardCode, UnoColour, unoBubble, unoColourName, unoErrorText, unoEventText, ut } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { UnoCardView, UNO_CARD_WIDTH } from './UnoCardView';
import { ROOM_HEIGHT, ROOM_WIDTH, UnoRoomScene } from './UnoRoomScene';
import { UnoRulesView } from './UnoRulesView';
import '../../css/uno/UnoView.css';

const COLOURS: UnoColour[] = [ 'R', 'Y', 'G', 'B' ];
const POLL_TABLE_MS = 1000;
const POLL_LOBBY_MS = 3000;
const BUBBLE_MS = 2600;
/** The hand: cards at 3x, overlapping once they no longer fit. */
const HAND_ZOOM = 3;
const HAND_WIDTH = 760;
const TOP_BAR = 40;

/** The room at a whole zoom: twice when the screen has room for it. */
const useSceneZoom = (): number => {
    // The hand covers the front of the floor, so the room only has to fit under the top bar.
    const read = () => (typeof window === 'undefined' ? 1 : Math.max(1, Math.floor(Math.min(window.innerWidth / ROOM_WIDTH, (window.innerHeight - TOP_BAR) / ROOM_HEIGHT))));
    const [zoom, setZoom] = useState(read);

    useEffect(() => {
        const onResize = () => setZoom(read());

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    return zoom;
};

const RULE_BADGES: { key: keyof IUnoRules; label: string }[] = [
    { key: 'stackTwo', label: '+2/+2' },
    { key: 'stackFour', label: '+4/+2' },
    { key: 'jumpIn', label: 'Interception' },
    { key: 'noSpecialFinish', label: 'Fin chiffre' },
    { key: 'drawUntilPlayable', label: 'Pioche+' },
    { key: 'bots', label: 'Robots' }
];

const RuleBadges: FC<{ rules: IUnoRules }> = ({ rules }) => (
    <span className="uno-badges">
        {RULE_BADGES.filter((badge) => rules[badge.key]).map((badge) => <span key={badge.key} className="uno-badge">{ut(`badge.${badge.key}`, badge.label)}</span>)}
    </span>
);

/**
 * UNO (`uno/show`, from the Game Center): a room with a card table. Out of a table, a window lists the open
 * tables; at a table the players sit on its chairs, the host chooses the rules and adds robots, and the game is played
 * with the hand at the bottom of the screen. The server keeps the game; the room asks for it every second.
 */
export const UnoView: FC = () => {
    const [visible, setVisible] = useState(false);
    const [view, setView] = useState<IUnoView | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [wild, setWild] = useState<UnoCardCode | null>(null);
    const [rulesOpen, setRulesOpen] = useState<'create' | 'edit' | 'read' | null>(null);
    const [bubbles, setBubbles] = useState<Map<string, string>>(new Map());
    const busyRef = useRef(false);
    const tableRef = useRef(0);
    const leavingRef = useRef(false);
    const lastSeqRef = useRef(0);
    const zoom = useSceneZoom();

    // What the players say: one bubble per new event, for a moment.
    const showBubbles = (table: IUnoTable | undefined) => {
        if (!table) return;

        const fresh = table.log.filter((event) => event.seq > lastSeqRef.current);

        if (!fresh.length) return;

        const first = lastSeqRef.current === 0;

        lastSeqRef.current = Math.max(...table.log.map((event) => event.seq));

        if (first) return;

        for (const event of fresh) {
            const bubble = unoBubble(event);

            if (!bubble) continue;

            setBubbles((current) => new Map(current).set(bubble.name, bubble.text));
            setTimeout(() => setBubbles((current) => {
                if (current.get(bubble.name) !== bubble.text) return current;

                const next = new Map(current);

                next.delete(bubble.name);
                return next;
            }), BUBBLE_MS);
        }
    };

    const receive = (next: IUnoView) => {
        const tableId = next.table?.id ?? 0;

        if (tableRef.current && !tableId && !leavingRef.current) setError(ut('removed', 'You were taken off the table: you let the time run out three turns in a row.'));
        if (tableId !== tableRef.current) lastSeqRef.current = 0;

        leavingRef.current = false;
        tableRef.current = tableId;
        showBubbles(next.table);
        setView(next);
    };

    const refresh = useCallback(() => {
        if (busyRef.current) return;

        UnoApi.view()
            .then(receive)
            .catch((caught) => setError(unoErrorText(caught)));
    }, []);

    const run = useCallback(async (action: () => Promise<IUnoView>) => {
        if (busyRef.current) return;

        busyRef.current = true;
        setBusy(true);
        setError('');

        try {
            receive(await action());
        } catch (caught) {
            setError(unoErrorText(caught));
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
            eventUrlPrefix: 'uno/'
        };

        AddLinkEventTracker(tracker);

        return () => RemoveLinkEventTracker(tracker);
    }, []);

    const atTable = !!view?.table;

    useEffect(() => {
        if (!visible) return;

        refresh();

        const timer = setInterval(refresh, atTable ? POLL_TABLE_MS : POLL_LOBBY_MS);

        return () => clearInterval(timer);
    }, [visible, atTable, refresh]);

    const yourTurn = !!view?.table?.yourTurn;

    // The colour is chosen on one's turn: the window goes when the turn has gone (the time ran out).
    useEffect(() => {
        if (!yourTurn) setWild(null);
    }, [yourTurn]);

    if (!visible) return null;

    const table = view?.table;
    const playing = table?.state === 'playing';
    const close = () => {
        setVisible(false);
        setWild(null);
        setRulesOpen(null);
    };
    const leave = () => {
        leavingRef.current = true;
        setWild(null);
        setRulesOpen(null);
        run(() => UnoApi.leave());
    };
    const play = (code: UnoCardCode) => {
        if (code.startsWith('W')) {
            setWild(code);
            return;
        }

        run(() => UnoApi.play(code));
    };
    const chooseColour = (colour: UnoColour) => {
        const code = wild;

        setWild(null);
        if (code) run(() => UnoApi.play(code, colour));
    };
    const onChair = (chair: number) => {
        if (table) run(() => UnoApi.sit(chair));
    };
    const handCount = table?.hand.length ?? 0;
    const cardWidth = UNO_CARD_WIDTH * HAND_ZOOM;
    const overlap = handCount < 2 ? 6 : Math.min(6, Math.floor((HAND_WIDTH - handCount * cardWidth) / (handCount - 1)));
    const currentName = table?.seats.find((seat) => seat.turn)?.name ?? '';

    return (
        <NativeTextTree>
            <div className="uno-room">
                <div className="uno-room__stage" style={{ width: ROOM_WIDTH * zoom, height: ROOM_HEIGHT * zoom }}>
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
                        <UnoRoomScene table={table ?? null} userId={view?.userId ?? 0} bubbles={bubbles} onChair={onChair} zoom={zoom} />
                    </div>
                </div>

                <div className="uno-topbar">
                    <Button variant="danger" onClick={table ? leave : close}>{table ? ut('leave', 'Leave the table') : ut('close_room', 'Leave the room')}</Button>
                    {table && (
                        <>
                            <span className="uno-topbar__title">{ut('table_of', 'Table of %name%', [ 'name' ], [ table.host ])}</span>
                            <RuleBadges rules={table.rules} />
                            <Button variant="secondary" onClick={() => setRulesOpen(table.youAreHost && table.state !== 'playing' ? 'edit' : 'read')}>{ut('rules.button', 'Rules')}</Button>
                        </>
                    )}
                </div>

                {table && playing && (
                    <div className="uno-infobox">
                        <div className="uno-infobox__head">UNO</div>
                        <div className="uno-infobox__body">
                            <div className="uno-infobox__row">
                                <span className={`uno-infobox__colour is-${table.colour}`} />
                                <span>{unoColourName(table.colour)}</span>
                                <span className={`uno-infobox__direction ${table.direction < 0 ? 'is-reversed' : ''}`} title={ut('direction', 'Direction')}>↻</span>
                            </div>
                            <div className={`uno-infobox__turn ${table.yourTurn ? 'is-you' : ''}`} key={`turn-${table.yourTurn}`}>
                                {table.yourTurn ? ut('your_turn', 'Your turn! %seconds% s', [ 'seconds' ], [ String(table.turnSecondsLeft) ]) : ut('turn_of', 'Turn of %name%', [ 'name' ], [ currentName ])}
                            </div>
                            {table.pendingDraw > 0 && <div className="uno-infobox__pending" key="pending">{ut('pending', '+%count% waiting!', [ 'count' ], [ String(table.pendingDraw) ])}</div>}
                            <ul className="uno-infobox__log" data-browser-text>
                                {table.log.slice(-4).map((event) => <li key={event.seq}>{unoEventText(event)}</li>)}
                            </ul>
                        </div>
                    </div>
                )}

                {table && table.state === 'waiting' && (
                    <div className="uno-panel uno-panel--waiting">
                        <div data-browser-text className="uno-panel__text">
                            {ut('waiting', 'Waiting for players (%count%/%max%). Click a free chair to change seat.', [ 'count', 'max' ], [ String(table.players), String(table.maxPlayers) ])}
                        </div>
                        {table.youAreHost
                            ? (
                                <div className="uno-panel__actions">
                                    {table.rules.bots && <Button variant="secondary" disabled={busy || table.players >= table.maxPlayers} onClick={() => run(() => UnoApi.addBot())}>{ut('add_bot', 'Add a robot')}</Button>}
                                    {table.rules.bots && table.seats.some((seat) => seat.bot) && (
                                        <Button variant="secondary" disabled={busy} onClick={() => run(() => UnoApi.removeBot([ ...table.seats ].reverse().find((seat) => seat.bot).userId))}>{ut('remove_bot', 'Remove a robot')}</Button>
                                    )}
                                    <Button variant="success" disabled={busy || table.players < 2} onClick={() => run(() => UnoApi.start())}>{ut('start', 'Start the game')}</Button>
                                </div>
                            )
                            : <div className="uno-panel__text">{ut('waiting_host', 'The host starts the game.')}</div>}
                    </div>
                )}

                {table && playing && (
                    <div className="uno-hand">
                        <div className="uno-hand__cards" style={{ width: HAND_WIDTH }}>
                            {table.hand.map((card, index) => (
                                <div key={`${card.code}-${index}`} className="uno-hand__slot" style={{ marginLeft: index ? overlap : 0, zIndex: index }}>
                                    <UnoCardView code={card.code} zoom={HAND_ZOOM} playable={card.playable} dimmed={!card.playable} onClick={card.playable && !busy ? () => play(card.code) : () => null} />
                                </div>
                            ))}
                        </div>
                        <div className="uno-hand__actions">
                            {table.canDraw && (
                                <Button variant="primary" disabled={busy} onClick={() => run(() => UnoApi.draw())}>
                                    {table.pendingDraw > 0 ? ut('draw_many', 'Draw %count%', [ 'count' ], [ String(table.pendingDraw) ]) : ut('draw', 'Draw')}
                                </Button>
                            )}
                            {table.canPass && <Button variant="secondary" disabled={busy} onClick={() => run(() => UnoApi.pass())}>{ut('pass', 'Pass')}</Button>}
                            {table.canUno && <Button variant="danger" classNames={[ 'uno-hand__uno' ]} disabled={busy} onClick={() => run(() => UnoApi.uno())}>UNO !</Button>}
                            {table.seats.filter((seat) => seat.catchable).map((seat) => (
                                <Button key={seat.userId} variant="warning" disabled={busy} onClick={() => run(() => UnoApi.catchUno(seat.userId))}>
                                    {ut('catch_name', 'Counter-UNO %name%!', [ 'name' ], [ seat.name ])}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {error && <div className="uno-toast" data-browser-text>{error}</div>}
            </div>

            {!table && !rulesOpen && (
                <OctaneCardView className="uno-lobby" theme="primary-slim" uniqueKey="uno-lobby">
                    <OctaneCardHeaderView headerText={ut('lobby.title', 'UNO tables')} onCloseClick={close} />
                    <OctaneCardContentView className="text-black" gap={2}>
                        <div className="uno-lobby__intro" data-browser-text>{ut('intro', 'Get rid of all your cards first! Match the colour or the value of the pile, and say UNO when you have one card left.')}</div>
                        <div className="uno-lobby__list">
                            {!view?.tables.length && <div className="uno-lobby__empty">{ut('no_tables', 'No table yet: open one and invite robots or friends.')}</div>}
                            {view?.tables.map((summary) => (
                                <div key={summary.id} className="uno-lobby__table">
                                    <div className="uno-lobby__info">
                                        <span className="uno-lobby__host">{ut('table_of', 'Table of %name%', [ 'name' ], [ summary.host ])}</span>
                                        <RuleBadges rules={summary.rules} />
                                    </div>
                                    <span className="uno-lobby__count">{summary.players}/{summary.maxPlayers}</span>
                                    <Button variant="success" disabled={busy || summary.state === 'playing' || summary.players >= summary.maxPlayers} onClick={() => run(() => UnoApi.join(summary.id))}>
                                        {summary.state === 'playing' ? ut('state.playing', 'Playing') : ut('join', 'Sit down')}
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="success" onClick={() => setRulesOpen('create')}>{ut('create', 'Open a table')}</Button>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {rulesOpen && (
                <UnoRulesView
                    rules={table?.rules ?? UNO_DEFAULT_RULES}
                    editable={rulesOpen !== 'read'}
                    seated={table?.players ?? 1}
                    mode={rulesOpen}
                    busy={busy}
                    onClose={() => setRulesOpen(null)}
                    onSave={(rules) => {
                        setRulesOpen(null);
                        run(() => (rulesOpen === 'create' ? UnoApi.create(rules) : UnoApi.setRules(rules)));
                    }} />
            )}

            {wild && (
                <OctaneCardView className="uno-colours" theme="primary-slim" uniqueKey="uno-colours" isResizable={false}>
                    <OctaneCardHeaderView headerText={ut('choose_colour', 'Choose a colour')} onCloseClick={() => setWild(null)} />
                    <OctaneCardContentView className="text-black" gap={2}>
                        <div className="uno-colours__list">
                            {COLOURS.map((colour) => (
                                <button key={colour} type="button" className={`uno-colours__choice is-${colour}`} onClick={() => chooseColour(colour)}>
                                    <span>{unoColourName(colour)}</span>
                                </button>
                            ))}
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}

            {table && table.state === 'finished' && (
                <OctaneCardView className="uno-end" theme="primary-slim" uniqueKey="uno-end" isResizable={false}>
                    <OctaneCardHeaderView headerText={ut('end.title', 'End of the game')} onCloseClick={leave} />
                    <OctaneCardContentView className="text-black items-center" gap={2}>
                        <UnoCardView code={table.top} zoom={3} />
                        <div className="uno-end__winner">
                            {table.winner?.userId === view.userId ? ut('you_win', 'You win!') : ut('winner', '%name% wins!', [ 'name' ], [ table.winner?.name ?? '' ])}
                        </div>
                        <div className="uno-panel__actions">
                            <Button variant="secondary" onClick={leave}>{ut('leave', 'Leave the table')}</Button>
                            {table.youAreHost && table.players >= 2 && <Button variant="success" disabled={busy} onClick={() => run(() => UnoApi.start())}>{ut('again', 'Play again')}</Button>}
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            )}
        </NativeTextTree>
    );
};
