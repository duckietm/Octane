import { GameConfigurationData, JoinQueueMessageComposer } from '@octane/renderer';
import { FC } from 'react';
import { ColorUtils, GetConfigurationValue, LocalizeText, SendMessageComposer } from '../../../api';
import snowStormLogo from '../../../assets/images/snowstorm/snowstorm.png';
import { useGameCenter, useSnowWar } from '../../../hooks';

const localizeWithFallback = (key: string, fallback: string) =>
{
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

const ERROR_TEXTS: Record<number, [string, string]> = {
    1: ['snowwar.error.queue_full', 'The queue is full, try again soon!'],
    2: ['snowwar.error.already_in_game', 'You are already in a game.'],
    3: ['snowwar.error.not_enough_players', 'Not enough players to start.'],
    4: ['snowwar.error.no_tickets', 'You have no games left.'],
    5: ['snowwar.error.internal', 'Something went wrong, try again.'],
};

/**
 * One 275x250 game card in the game center hub. Play joins the game's queue
 * on the server; for SnowWar the queue/countdown status is shown inside the
 * tile until the match starts and the arena takes over the screen.
 */
export const GameTileView: FC<{ game: GameConfigurationData }> = ({ game }) =>
{
    const { accountStatus, setSelectedGame } = useGameCenter();
    const { phase, queuePosition, queueSize, lobbySeconds, queueInfo, errorCode, leaveQueue, requestLeaderboard, startEditing } = useSnowWar();

    const isSnowWar = (game.gameNameId === 'snowwar');
    const inQueue = isSnowWar && ((phase === 'queued') || (phase === 'lobby'));
    // Not enough players yet to start the countdown - show "awaiting players"
    // (X/min) instead of a bare "1/1" queue position.
    const minPlayers = queueInfo?.minPlayers ?? 0;
    const awaitingPlayers = (phase === 'queued') && (minPlayers > 1) && (queueSize < minPlayers);

    const canPlay = accountStatus && (accountStatus.hasUnlimitedGames || (accountStatus.freeGamesLeft > 0));
    const showLeaderboard = GetConfigurationValue<boolean>('games.highscores.enabled', true);

    const onPlay = () =>
    {
        setSelectedGame(game);
        SendMessageComposer(new JoinQueueMessageComposer(game.gameId));
    };

    const title = localizeWithFallback(`gamecenter.${game.gameNameId}.description_title`, game.gameNameId);
    const description = localizeWithFallback(`gamecenter.${game.gameNameId}.description_content`, '');
    const errorEntry = (isSnowWar && (phase === 'idle') && errorCode) ? (ERROR_TEXTS[errorCode] ?? ERROR_TEXTS[5]) : null;

    return (
        <div className="game-tile">
            <div
                className="game-tile__banner"
                style={{ backgroundColor: ColorUtils.uintHexColor(game.bgColor), backgroundImage: `url(${game.assetUrl}${game.gameNameId}_theme.png)` }}>
                <img alt={game.gameNameId} className="game-tile__logo" src={isSnowWar ? snowStormLogo : `${game.assetUrl}${game.gameNameId}_logo.png`} />
            </div>
            <div className="game-tile__body">
                <div className="game-tile__title">{title}</div>
                {!inQueue && description && <div className="game-tile__desc">{description}</div>}
                {inQueue && (
                    <div className="game-tile__queue">
                        <div>
                            {(phase !== 'queued')
                                ? localizeWithFallback('snowwar.queue.starting', 'Game starts in %seconds%s...')
                                    .replace('%seconds%', lobbySeconds.toString())
                                : awaitingPlayers
                                    ? localizeWithFallback('snowwar.queue.awaiting', 'Waiting for players: %count%/%min%')
                                        .replace('%count%', queueSize.toString())
                                        .replace('%min%', minPlayers.toString())
                                    : localizeWithFallback('snowwar.queue.position', 'In queue: %position% / %size%')
                                        .replace('%position%', queuePosition.toString())
                                        .replace('%size%', queueSize.toString())}
                        </div>
                        <button className="snowwar-button snowwar-button--danger" type="button" onClick={() => leaveQueue()}>
                            {localizeWithFallback('snowwar.queue.leave', 'Leave queue')}
                        </button>
                    </div>
                )}
                {!isSnowWar && (
                    <button disabled className="snowwar-button game-tile__play" type="button">
                        {localizeWithFallback('gamecenter.coming_soon', 'Coming soon!')}
                    </button>
                )}
                {isSnowWar && !inQueue && (
                    <div className="game-tile__actions">
                        {canPlay && (
                            <button className="snowwar-button game-tile__play" type="button" onClick={onPlay}>
                                {localizeWithFallback('gamecenter.play_now', 'Play now')}
                            </button>
                        )}
                        {queueInfo?.canEdit && (
                            <button className="snowwar-button snowwar-button--edit" type="button" onClick={() => startEditing()}>
                                {localizeWithFallback('snowwar.editor.build_custom', 'Build Custom Arena')}
                            </button>
                        )}
                        {showLeaderboard && (
                            <button className="game-tile__leaderboard" type="button" onClick={() => requestLeaderboard(true, false, 0)}>
                                {localizeWithFallback('gamecenter.leaderboard_link', 'Leaderboard')}
                            </button>
                        )}
                    </div>
                )}
                {errorEntry && <div className="game-tile__error">{localizeWithFallback(errorEntry[0], errorEntry[1])}</div>}
            </div>
        </div>
    );
};
