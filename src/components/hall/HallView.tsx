import { AddLinkEventTracker, AvatarAction, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { HALL_GAMES, HALL_SEATS, HallApi, HallGameName, HallTabName, IHallPlayer, IHallTable, IHallView, hallErrorText, hallGameName, hallt } from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../common';
import { Checkbox } from '../../common/Checkbox';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import bannerImage from '../../assets/images/hall/hall-banner.png';
import { useUnoAvatar } from '../uno/useUnoAvatar';
import { BattleshipsBoard, ChessBoard, ConnectFourBoard, HallSprite, PokerBoard, TicTacToeBoard } from './HallBoards';
import '../../css/hall/HallView.css';

const POLL_TABLE_MS = 1000;
const POLL_LOBBY_MS = 3000;

const RULES: Record<HallTabName, string> = {
    tictactoe: 'Line up five of your marks in a row, straight or across, before the other! X begins.',
    connect4: 'Drop your discs into the columns in turn: the first to line up four, straight or across, wins.',
    battleships: 'Place your fleet without the ships touching, then shoot at the other\'s sea in turns. A hit shoots again: sink every ship to win!',
    chess: 'The real rules of chess: castling, en passant, promotion. Checkmate the other king to win; white begins.',
    poker: 'Five-card draw with two jokers: change the cards you like once, then the best hand wins.'
};

/** The mark of each seat (tic-tac-toe X / O, the discs, the colours of chess). */
const SEAT_MARKS: Partial<Record<HallGameName, string[]>> = { tictactoe: [ 'TicTacToe.X', 'TicTacToe.O' ], connect4: [ 'c4_red', 'c4_yellow' ], chess: [ 'Wkg', 'Bkg' ] };

const PlayerHead: FC<{ player: IHallPlayer }> = ({ player }) => {
    const picture = useUnoAvatar(player.figure, player.gender, 2, AvatarAction.POSTURE_STAND);

    return <span className="hall-player__head">{picture && <img src={picture} alt="" draggable={false} />}</span>;
};

const Players: FC<{ table: IHallTable }> = ({ table }) => (
    <div className="hall-players">
        {table.players.map((player, seat) => {
            const mark = SEAT_MARKS[table.game]?.[seat];
            const won = table.state === 'finished' && table.winners?.includes(seat);

            return (
                <div key={player.userId} className={`hall-player ${player.waiting ? 'is-waiting' : ''} ${seat === table.you ? 'is-you' : ''} ${won ? 'is-winner' : ''}`}>
                    <PlayerHead player={player} />
                    <span className="hall-player__info" data-browser-text>
                        <strong>{player.name}{player.bot ? ` (${hallt('robot', 'robot')})` : ''}</strong>
                        <span>{hallt('wins', '%n% won', [ 'n' ], [ String(player.wins) ])}{player.waiting && player.timeLeft >= 0 ? ` · ${Math.ceil(player.timeLeft / 1000)} s` : ''}</span>
                    </span>
                    {mark && <HallSprite name={mark} scale={mark.startsWith('TicTac') ? 2 : 1} className="is-static hall-player__mark" />}
                </div>
            );
        })}
    </div>
);

const resultText = (table: IHallTable): string => {
    const winners = table.winners ?? [];
    const [ kind, name ] = table.note.split(':');

    if (kind === 'left') return hallt('result.left', '%name% left the table.', [ 'name' ], [ name ?? '' ]);
    if (kind === 'timeout') return hallt('result.timeout', '%name% ran out of time too often.', [ 'name' ], [ name ?? '' ]);
    if (!winners.length) return hallt('result.draw', 'A draw!');
    if (winners.includes(table.you)) return winners.length > 1 ? hallt('result.shared', 'You share the win!') : hallt('result.you_won', 'You won!');

    return hallt('result.winner', '%name% wins!', [ 'name' ], [ winners.map((seat) => table.players[seat]?.name ?? '').join(', ') ]);
};

const statusText = (table: IHallTable): string => {
    const board = table.board;

    if (!board) return '';
    if (table.state === 'finished') return resultText(table);
    if (table.game === 'chess' && board.ending === '' && board.check) return board.turn === table.you ? hallt('chess.you_check', 'Check! Protect your king.') : hallt('chess.check', 'Check!');
    if (board.turn === -1) return table.players[table.you]?.waiting ? hallt('your_move_all', 'Your move!') : hallt('wait_others', 'Waiting for the others...');

    return board.turn === table.you ? hallt('your_turn', 'Your turn!') : hallt('their_turn', '%name% is playing...', [ 'name' ], [ table.players[board.turn]?.name ?? '' ]);
};

/**
 * The game hall (`hall/show[/<game>]`, from the Game Center): the Cunning Fox Gamehall's games of Habbo's 2004
 * hotel (tic-tac-toe, battleships, chess, poker) and four in a row. A window lists the tables of each game; at a
 * table, the board, the players and their score, round after round.
 */
export const HallView: FC = () => {
    const [ visible, setVisible ] = useState(false);
    const [ game, setGame ] = useState<HallTabName>('tictactoe');
    const [ view, setView ] = useState<IHallView | null>(null);
    const [ error, setError ] = useState('');
    const [ busy, setBusy ] = useState(false);
    const [ size, setSize ] = useState(2);
    const [ bots, setBots ] = useState(true);
    const busyRef = useRef(false);
    const pollingRef = useRef(false);

    const table = view?.table;
    const current = (table?.game ?? game) as HallGameName;

    const refresh = useCallback(() => {
        if (busyRef.current || pollingRef.current) return;

        pollingRef.current = true;
        HallApi.view(current)
            .then((next) => {
                setView(next);
            })
            .catch((caught) => setError(hallErrorText(caught) ?? ''))
            .finally(() => {
                pollingRef.current = false;
            });
    }, [ current ]);

    const run = useCallback(async (action: () => Promise<IHallView>) => {
        if (busyRef.current) return;

        busyRef.current = true;
        setBusy(true);
        setError('');

        try {
            const next = await action();

            setView(next);
        } catch (caught) {
            setError(hallErrorText(caught) ?? '');
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }, []);

    useEffect(() => {
        const tracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts[1] === 'show') {
                    if (HALL_GAMES.includes(parts[2] as HallTabName)) setGame(parts[2] as HallTabName);
                    setVisible(true);
                } else if (parts[1] === 'hide') setVisible(false);
                else if (parts[1] === 'toggle') setVisible((value) => !value);
            },
            eventUrlPrefix: 'hall/'
        };

        AddLinkEventTracker(tracker);

        return () => RemoveLinkEventTracker(tracker);
    }, []);

    useEffect(() => {
        if (!visible) return;

        refresh();

        const timer = setInterval(refresh, table ? POLL_TABLE_MS : POLL_LOBBY_MS);

        return () => clearInterval(timer);
    }, [ visible, !!table, refresh ]);

    useEffect(() => {
        if (!error) return;

        const timer = setTimeout(() => setError(''), 4000);

        return () => clearTimeout(timer);
    }, [ error ]);

    useEffect(() => {
        setSize(HALL_SEATS[game][1]);
    }, [ game ]);

    if (!visible) return null;

    const close = () => setVisible(false);
    const play = (move: Record<string, unknown>) => run(() => HallApi.move(current, move));

    if (table) {
        const board = table.board;
        const myTurn = !!board && table.state === 'playing' && !!table.players[table.you]?.waiting;
        const seats = HALL_SEATS[table.game];

        return (
            <NativeTextTree>
                <OctaneCardView className={`hall-table is-${table.game}`} theme="primary-slim" uniqueKey="hall-table">
                    <OctaneCardHeaderView headerText={`${hallGameName(table.game)} · ${hallt('table_of', '%name%\'s table', [ 'name' ], [ table.host ])}`} onCloseClick={() => run(() => HallApi.leave(current))} />
                    <OctaneCardContentView className="text-black hall-table__content" gap={2}>
                        <Players table={table} />
                        {board && table.state !== 'waiting' && <div className={`hall-table__status ${table.state === 'finished' ? 'is-over' : myTurn ? 'is-turn' : ''}`} data-browser-text>{statusText(table)}</div>}
                        {board && table.state !== 'waiting' && (
                            <div className="hall-table__board">
                                {table.game === 'tictactoe' && <TicTacToeBoard board={board} myTurn={myTurn} play={play} />}
                                {table.game === 'connect4' && <ConnectFourBoard board={board} myTurn={myTurn} play={play} />}
                                {table.game === 'battleships' && <BattleshipsBoard key={table.round} board={board} you={table.you} myTurn={myTurn} play={play} />}
                                {table.game === 'chess' && <ChessBoard board={board} you={table.you} myTurn={myTurn} play={play} />}
                                {table.game === 'poker' && <PokerBoard key={table.round} board={board} table={table} play={play} />}
                            </div>
                        )}
                        {table.state === 'waiting' && (
                            <div className="hall-table__waiting" data-browser-text>
                                <img src={bannerImage} alt="" draggable={false} />
                                <span>{hallt(`rules.${table.game}`, RULES[table.game as HallTabName])}</span>
                                {seats[1] > seats[0] && table.youAreHost && (
                                    <div className="hall-table__seats">
                                        <span>{hallt('seats', 'Players')}</span>
                                        {Array.from({ length: seats[1] - seats[0] + 1 }, (_, index) => seats[0] + index).map((count) => (
                                            <Button key={count} variant={count === table.size ? 'success' : 'secondary'} disabled={busy} onClick={() => run(() => HallApi.options(current, count, table.bots))}>{String(count)}</Button>
                                        ))}
                                    </div>
                                )}
                                <span>{hallt('seated', '%players%/%size% at the table', [ 'players', 'size' ], [ String(table.players.length), String(table.size) ])}</span>
                            </div>
                        )}
                        <div className="hall-table__actions">
                            {table.youAreHost && table.state !== 'playing' && (
                                <>
                                    {table.bots && table.players.length < table.size && <Button variant="secondary" disabled={busy} onClick={() => run(() => HallApi.addBot(current))}>{hallt('add_bot', 'Add a robot')}</Button>}
                                    {table.players.some((player) => player.bot) && <Button variant="secondary" disabled={busy} onClick={() => run(() => HallApi.removeBot(current))}>{hallt('remove_bot', 'Remove a robot')}</Button>}
                                    <Button variant="success" disabled={busy || table.players.length < seats[0]} onClick={() => run(() => HallApi.start(current))}>{table.state === 'finished' ? hallt('again', 'Play again') : hallt('start', 'Start the game!')}</Button>
                                </>
                            )}
                            {!table.youAreHost && table.state !== 'playing' && <span data-browser-text>{hallt('waiting_host', 'The host starts the game.')}</span>}
                            <Button variant="danger" onClick={() => run(() => HallApi.leave(current))}>{hallt('leave', 'Leave the table')}</Button>
                        </div>
                        {error && <div className="hall-toast" data-browser-text>{error}</div>}
                    </OctaneCardContentView>
                </OctaneCardView>
            </NativeTextTree>
        );
    }

    const seats = HALL_SEATS[game];

    return (
        <NativeTextTree>
            <OctaneCardView className="hall-lobby" theme="primary-slim" uniqueKey="hall-lobby">
                <OctaneCardHeaderView headerText={hallt('title', 'The game hall')} onCloseClick={close} />
                <OctaneCardTabsView>
                    {HALL_GAMES.map((name) => <OctaneCardTabsItemView key={name} isActive={game === name} onClick={() => setGame(name)}>{hallGameName(name)}</OctaneCardTabsItemView>)}
                </OctaneCardTabsView>
                <OctaneCardContentView className="text-black" gap={2}>
                    <div className="hall-lobby__intro" data-browser-text>
                        <img src={bannerImage} alt="" draggable={false} />
                        <span>{hallt(`rules.${game}`, RULES[game])}</span>
                    </div>
                    <div className="hall-lobby__list">
                        {!view?.tables.length && <div className="hall-lobby__empty" data-browser-text>{hallt('no_tables', 'No table yet: open one and invite your friends or robots.')}</div>}
                        {view?.tables.map((summary) => (
                            <div key={summary.id} className="hall-lobby__table">
                                <span className="hall-lobby__info" data-browser-text>
                                    <strong>{hallt('table_of', '%name%\'s table', [ 'name' ], [ summary.host ])}</strong>
                                    <span>{hallt('seated', '%players%/%size% at the table', [ 'players', 'size' ], [ String(summary.players), String(summary.size) ])}</span>
                                </span>
                                <Button variant="success" disabled={busy || summary.state === 'playing' || summary.players >= summary.size} onClick={() => run(() => HallApi.join(summary.id, game))}>
                                    {summary.state === 'playing' ? hallt('state.playing', 'Playing') : hallt('join', 'Sit down')}
                                </Button>
                            </div>
                        ))}
                    </div>
                    <div className="hall-lobby__create">
                        {seats[1] > seats[0] && (
                            <span className="hall-lobby__seats" data-browser-text>
                                {hallt('seats', 'Players')}
                                {Array.from({ length: seats[1] - seats[0] + 1 }, (_, index) => seats[0] + index).map((count) => (
                                    <Button key={count} variant={count === size ? 'success' : 'secondary'} onClick={() => setSize(count)}>{String(count)}</Button>
                                ))}
                            </span>
                        )}
                        <label className="hall-lobby__bots" data-browser-text>
                            <Checkbox checked={bots} onCheckedChange={setBots} />
                            {hallt('allow_bots', 'Robots allowed')}
                        </label>
                        <Button variant="success" disabled={busy} onClick={() => run(() => HallApi.create(game, size, bots))}>{hallt('create', 'Open a table')}</Button>
                    </div>
                    {error && <div className="hall-toast" data-browser-text>{error}</div>}
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
