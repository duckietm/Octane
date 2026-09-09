import { GameConfigurationData, JoinQueueMessageComposer } from '@octane/renderer';
import { FC } from 'react';
import { ColorUtils, CreateLinkEvent, formatBlockCountdown, GetConfigurationValue, getGamesLeftStatus, LocalizeText, SendMessageComposer } from '../../../api';
import snowStormLogo from '../../../assets/images/snowstorm/snowstorm.png';
import { SNOWWAR_ERROR_GAME_CANCELLED, SNOWWAR_ERROR_GAME_NOT_FOUND, useGameCenter, useSnowWar } from '../../../hooks';

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
    [SNOWWAR_ERROR_GAME_CANCELLED]: ['snowwar.error.game_cancelled', 'The game was cancelled.'],
    [SNOWWAR_ERROR_GAME_NOT_FOUND]: ['snowwar.error.game_not_found', 'That game could not be found.'],
};

// AIR games_main: btn_more_games_10 / _100 / _300, each bound to one game-token
// offer by its localization id (GamesMainViewController.as:114-133).
const TOKEN_OFFER_LABELS: Record<string, [string, string]> = {
    GET_SNOWWAR_TOKENS: ['snowwar.buy_games.10', '+10 games'],
    GET_SNOWWAR_TOKENS2: ['snowwar.buy_games.100', '+100 games'],
    GET_SNOWWAR_TOKENS3: ['snowwar.buy_games.300', '+300 games'],
};

/**
 * One 275x250 game card in the game center hub. Play joins the game's queue
 * on the server; for SnowWar the queue/countdown status is shown inside the
 * tile until the match starts and the arena takes over the screen.
 */
export const GameTileView: FC<{ game: GameConfigurationData }> = ({ game }) =>
{
    const { accountStatus, setSelectedGame, setInstructionsOpen, blockSeconds, tokenOffers, purchaseTokenOffer } = useGameCenter();
    const { phase, queuePosition, queueSize, lobbySeconds, queueInfo, errorCode, leaveQueue, requestLeaderboard, startEditing } = useSnowWar();

    const isSnowWar = (game.gameNameId === 'snowwar');
    const inQueue = isSnowWar && ((phase === 'queued') || (phase === 'lobby'));
    // Not enough players yet to start the countdown - show "awaiting players"
    // (X/min) instead of a bare "1/1" queue position.
    const minPlayers = queueInfo?.minPlayers ?? 0;
    const awaitingPlayers = (phase === 'queued') && (minPlayers > 1) && (queueSize < minPlayers);

    // AIR games_main footer: "Total Games Left: N" (red at 0, hidden for HC's
    // unlimited games), the HC upsell, and a play button that reads "Join HC!"
    // once the games run out or counts the leave-game block down as m:ss.
    const gamesLeft = getGamesLeftStatus(accountStatus?.freeGamesLeft ?? -1, accountStatus?.hasUnlimitedGames ?? true);
    const blocked = (blockSeconds > 0);
    const showLeaderboard = GetConfigurationValue<boolean>('games.highscores.enabled', true);

    const openClubCenter = () =>
    {
        const links = GetConfigurationValue<Record<string, string>>('catalog.links', {});
        CreateLinkEvent(`catalog/open/${links?.['hc.buy_hc'] ?? 'habbo_club'}`);
    };

    // AIR games_main only shows the token buttons the server sent offers for.
    const offers = (tokenOffers ?? []).filter(offer => TOKEN_OFFER_LABELS[offer.localizationId]);

    const onPlay = () =>
    {
        if (!gamesLeft.canStart)
        {
            // AIR onPlay with freeGamesLeft == 0: openGetMoreGames — buy more
            // games with tokens when the hotel sells them, otherwise fall back
            // to the HC upsell of games_vip_region.
            if (!offers.length) openClubCenter();
            return;
        }

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
                    <div className="game-tile__links">
                        <button className="game-tile__link" type="button" onClick={() => setInstructionsOpen(true)}>
                            {localizeWithFallback('snowwar.instructions.link', 'How To Play')}
                        </button>
                        {showLeaderboard && (
                            <button className="game-tile__link" type="button" onClick={() => requestLeaderboard(true, 'all', 0)}>
                                {localizeWithFallback('snowwar.leaderboards.link', 'Leaderboard')}
                            </button>
                        )}
                    </div>
                )}
                {isSnowWar && !inQueue && (
                    <div className="game-tile__footer">
                        {gamesLeft.showCounter && (
                            <div className="game-tile__games-left">
                                <span>{localizeWithFallback('snowwar.games_left', 'Total Games Left:')}</span>
                                <span className={`game-tile__games-left-count game-tile__games-left-count--${gamesLeft.counterTone}`}>{accountStatus?.freeGamesLeft ?? 0}</span>
                            </div>
                        )}
                        {offers.length > 0 && (
                            <div className="game-tile__tokens">
                                <span className="game-tile__tokens-label">{localizeWithFallback('snowwar.buy_more_games', 'Buy more games:')}</span>
                                <div className="game-tile__tokens-buttons">
                                    {offers.map(offer => (
                                        <button
                                            key={offer.offerId}
                                            className="game-tile__token"
                                            type="button"
                                            title={`${offer.priceInCredits} ${localizeWithFallback('purse.credits', 'Credits')}`}
                                            onClick={() => purchaseTokenOffer(offer.offerId)}>
                                            {localizeWithFallback(...TOKEN_OFFER_LABELS[offer.localizationId])}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {!offers.length && gamesLeft.showCounter && (
                            <button className="game-tile__vip" type="button" onClick={openClubCenter}>
                                <span className="game-tile__hc-icon" />
                                <span>{localizeWithFallback('snowwar.get_more_games', 'Get additional free daily games with HC!')}</span>
                            </button>
                        )}
                        <div className="game-tile__actions">
                            <button
                                className={`snowwar-button game-tile__play${blocked ? ' game-tile__play--blocked' : ''}`}
                                disabled={blocked}
                                type="button"
                                onClick={onPlay}>
                                {blocked
                                    ? formatBlockCountdown(blockSeconds)
                                    : (gamesLeft.playLabelKey === 'snowwar.play')
                                        ? localizeWithFallback('snowwar.play', 'Play now!')
                                        : localizeWithFallback('catalog.vip.buy.title', 'Join HC!')}
                            </button>
                            {queueInfo?.canEdit && (
                                <button className="snowwar-button snowwar-button--edit" type="button" onClick={() => startEditing()}>
                                    {localizeWithFallback('snowwar.editor.build_custom', 'Build Custom Arena')}
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {errorEntry && <div className="game-tile__error">{localizeWithFallback(errorEntry[0], errorEntry[1])}</div>}
            </div>
        </div>
    );
};
