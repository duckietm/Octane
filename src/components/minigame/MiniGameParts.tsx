import { AvatarAction } from '@octane/renderer';
import { FC, ReactNode, useState } from 'react';
import { HallApi, HallGameName, IHallPlayer, IHallTable } from '../../api';
import { localizeWithFallback } from '../../api/utils/localizeWithFallback';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { Checkbox } from '../../common/Checkbox';
import { useUnoAvatar } from '../uno/useUnoAvatar';
import { IHallGame } from './useHallGame';
import '../../css/minigame/MiniGame.css';

/** A text shared by the games with their own world, `minigame.<key>`. */
export const mgt = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`minigame.${key}`, fallback, parameters, replacements);

/** A player drawn by the hotel's renderer, standing, facing `direction`. */
export const MiniGameAvatar: FC<{ player: IHallPlayer; direction?: number; className?: string; posture?: string }> = ({ player, direction = 2, className = '', posture = AvatarAction.POSTURE_STAND }) => {
    const picture = useUnoAvatar(player.figure, player.gender, direction, posture);

    return picture ? <img className={`minigame-avatar ${className}`} src={picture} alt="" draggable={false} /> : null;
};

/**
 * The window listing a game's tables, in the game's colours (`className`): open a table (players, robots) or sit at
 * one.
 */
export const MiniGameLobby: FC<{ game: HallGameName; g: IHallGame; className: string; title: string; intro: string; banner: string; seats: [number, number] }> = ({ game, g, className, title, intro, banner, seats }) => {
    const [ size, setSize ] = useState(seats[1] > 4 ? 4 : seats[1]);
    const [ bots, setBots ] = useState(true);
    const tables = g.view?.tables ?? [];

    return (
        <OctaneCardView className={`minigame-lobby ${className}`} theme="primary-slim" uniqueKey={`${game}-lobby`}>
            <OctaneCardHeaderView headerText={title} onCloseClick={g.close} />
            <OctaneCardContentView className="text-black" gap={2}>
                <div className="minigame-lobby__intro" data-browser-text>
                    <img src={banner} alt="" draggable={false} />
                    <span>{intro}</span>
                </div>
                <div className="minigame-lobby__list">
                    {!tables.length && <div className="minigame-lobby__empty" data-browser-text>{mgt('no_tables', 'No game yet: open one and invite your friends or robots.')}</div>}
                    {tables.map((summary) => (
                        <div key={summary.id} className="minigame-lobby__table">
                            <span className="minigame-lobby__info" data-browser-text>
                                <strong>{mgt('game_of', '%name%\'s game', [ 'name' ], [ summary.host ])}</strong>
                                <span>{mgt('seated', '%players%/%size% players', [ 'players', 'size' ], [ String(summary.players), String(summary.size) ])}</span>
                            </span>
                            <Button variant="success" disabled={g.busy || summary.state === 'playing' || summary.players >= summary.size} onClick={() => g.run(() => HallApi.join(summary.id, game))}>
                                {summary.state === 'playing' ? mgt('playing', 'Playing') : mgt('join', 'Join')}
                            </Button>
                        </div>
                    ))}
                </div>
                <div className="minigame-lobby__create" data-browser-text>
                    {seats[1] > seats[0] && (
                        <span className="minigame-lobby__seats">
                            {mgt('players', 'Players')}
                            {Array.from({ length: seats[1] - seats[0] + 1 }, (_, index) => seats[0] + index).map((count) => (
                                <Button key={count} variant={count === size ? 'success' : 'secondary'} onClick={() => setSize(count)}>{String(count)}</Button>
                            ))}
                        </span>
                    )}
                    <label className="minigame-lobby__bots">
                        <Checkbox checked={bots} onCheckedChange={setBots} />
                        {mgt('allow_bots', 'Robots allowed')}
                    </label>
                    <Button variant="success" disabled={g.busy} onClick={() => g.run(() => HallApi.create(game, size, bots))}>{mgt('create', 'Open a game')}</Button>
                </div>
                {g.error && <div className="minigame-toast" data-browser-text>{g.error}</div>}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};

/** The bar at the top of a game's world: leave, the game's name, the rules. */
export const MiniGameTopBar: FC<{ game: HallGameName; g: IHallGame; title: string; children?: ReactNode }> = ({ game, g, title, children }) => (
    <div className="minigame-topbar" data-browser-text>
        <Button variant="danger" onClick={g.table ? () => g.run(() => HallApi.leave(game)) : g.close}>{g.table ? mgt('leave', 'Leave the game') : mgt('close', 'Leave')}</Button>
        <span className="minigame-topbar__title">{title}</span>
        {children}
    </div>
);

/** Before a game: who is there, and for the host the number of players, the robots and the start. */
export const MiniGameWaiting: FC<{ game: HallGameName; g: IHallGame; table: IHallTable; seats: [number, number]; className: string; rules: string }> = ({ game, g, table, seats, className, rules }) => (
    <div className={`minigame-panel ${className}`} data-browser-text>
        <div className="minigame-panel__rules">{rules}</div>
        <div className="minigame-panel__text">{mgt('waiting', 'Waiting for players: %players%/%size%', [ 'players', 'size' ], [ String(table.players.length), String(table.size) ])}</div>
        {table.youAreHost
            ? (
                <>
                    {seats[1] > seats[0] && (
                        <div className="minigame-panel__seats">
                            {mgt('players', 'Players')}
                            {Array.from({ length: seats[1] - seats[0] + 1 }, (_, index) => seats[0] + index).map((count) => (
                                <Button key={count} variant={count === table.size ? 'success' : 'secondary'} disabled={g.busy || count < table.players.length} onClick={() => g.run(() => HallApi.options(game, count, table.bots))}>{String(count)}</Button>
                            ))}
                        </div>
                    )}
                    <div className="minigame-panel__actions">
                        {table.bots && table.players.length < table.size && <Button variant="secondary" disabled={g.busy} onClick={() => g.run(() => HallApi.addBot(game))}>{mgt('add_bot', 'Add a robot')}</Button>}
                        {table.players.some((player) => player.bot) && <Button variant="secondary" disabled={g.busy} onClick={() => g.run(() => HallApi.removeBot(game))}>{mgt('remove_bot', 'Remove a robot')}</Button>}
                        <Button variant="success" disabled={g.busy || table.players.length < seats[0]} onClick={() => g.run(() => HallApi.start(game))}>{mgt('start', 'Start!')}</Button>
                    </div>
                </>
            )
            : <div className="minigame-panel__text">{mgt('waiting_host', 'The host starts the game.')}</div>}
    </div>
);

/** After a game: the ranking given by the game, and for the host "play again". */
export const MiniGameResults: FC<{ game: HallGameName; g: IHallGame; table: IHallTable; className: string; title: string; rows: { seat: number; place: number; detail: string }[] }> = ({ game, g, table, className, title, rows }) => (
    <OctaneCardView className={`minigame-results ${className}`} theme="primary-slim" uniqueKey={`${game}-results`} isResizable={false}>
        <OctaneCardHeaderView headerText={title} onCloseClick={() => g.run(() => HallApi.leave(game))} />
        <OctaneCardContentView className="text-black" gap={2}>
            <div className="minigame-results__head" data-browser-text>
                {table.winners?.includes(table.you) ? mgt('you_won', 'You won!') : table.winners?.length ? mgt('winner', '%name% wins!', [ 'name' ], [ table.winners.map((seat) => table.players[seat]?.name ?? '').join(', ') ]) : mgt('nobody', 'Nobody wins this time.')}
            </div>
            <div className="minigame-results__list">
                {rows.map((row) => {
                    const player = table.players[row.seat];

                    if (!player) return null;

                    return (
                        <div key={row.seat} className={`minigame-results__row ${row.seat === table.you ? 'is-you' : ''} ${row.place === 1 ? 'is-first' : ''}`} data-browser-text>
                            <span className="minigame-results__place">{row.place > 0 ? row.place : '-'}</span>
                            <span className="minigame-results__head-image"><MiniGameAvatar player={player} direction={2} /></span>
                            <strong>{player.name}{player.bot ? ` (${mgt('robot', 'robot')})` : ''}</strong>
                            <span className="minigame-results__detail">{row.detail}</span>
                        </div>
                    );
                })}
            </div>
            {table.note.startsWith('left:') && <div className="minigame-results__note" data-browser-text>{mgt('left', '%name% left the game.', [ 'name' ], [ table.note.slice(5) ])}</div>}
            <div className="minigame-panel__actions">
                <Button variant="secondary" onClick={() => g.run(() => HallApi.leave(game))}>{mgt('leave', 'Leave the game')}</Button>
                {table.youAreHost && <Button variant="success" disabled={g.busy} onClick={() => g.run(() => HallApi.start(game))}>{mgt('again', 'Play again')}</Button>}
            </div>
        </OctaneCardContentView>
    </OctaneCardView>
);
