import { GameConfigurationData, JoinQueueMessageComposer, PurchaseSnowWarGameTokensOfferComposer, SnowWarGameTokenOffer } from '@octane/renderer';
import { CSSProperties, FC, useEffect, useState } from 'react';
import {
    applySnowWarPlural,
    ColorUtils,
    CreateLinkEvent,
    formatSnowWarBlockCountdown,
    GetConfigurationValue,
    getGamesLeftStatus,
    getSnowWarTokenPrice,
    LocalizeText,
    SendMessageComposer,
    snowWarBlockSecondsLeft,
    SNOWWAR_TOKEN_BUTTONS
} from '../../../api';
import { SNOWWAR_AIR_ASSETS } from '../../../assets/images/snowstorm/air';
import snowStormLogo from '../../../assets/images/snowstorm/snowstorm.png';
import { useGameCenter, useNotification, useSnowWar } from '../../../hooks';
import { localizeWithFallback, snowWarErrorText } from './snowwar/SnowWarErrorTexts';
import { SnowWarStrokeText } from './snowwar/SnowWarStrokeText';
import { BaseButton } from '../../../common/BaseButton';

/**
 * One 275x250 game card in the game center hub. Play joins the game's queue
 * on the server; for SnowWar the queue/countdown status is shown inside the
 * tile until the match starts and the arena takes over the screen.
 */
export const GameTileView: FC<{ game: GameConfigurationData }> = ({ game }) =>
{
    const { accountStatus, setSelectedGame, blockedUntil, setInstructionsOpen, tokenOffers } = useGameCenter();
    const { showConfirm = null } = useNotification();
    const [now, setNow] = useState(() => Date.now());

    // Tick once a second while the leave block runs.
    useEffect(() =>
    {
        const tick = () => setNow(Date.now());
        const first = setTimeout(tick, 0);
        const interval = (blockedUntil > Date.now()) ? setInterval(tick, 1000) : null;

        return () =>
        {
            clearTimeout(first);
            if (interval) clearInterval(interval);
        };
    }, [ blockedUntil ]);

    const blockSeconds = snowWarBlockSecondsLeft(blockedUntil, now);
    const { phase, queuePosition, queueSize, lobbySeconds, queueInfo, errorCode, arenaQueuePosition = -1, leaveQueue, requestLeaderboard, startEditing } = useSnowWar();

    const isSnowWar = (game.gameNameId === 'snowwar');
    const inQueue = isSnowWar && ((phase === 'queued') || (phase === 'lobby'));
    // Not enough players yet to start the countdown - show "awaiting players"
    // (X/min) instead of a bare "1/1" queue position.
    const minPlayers = queueInfo?.minPlayers ?? 0;
    const awaitingPlayers = (phase === 'queued') && (minPlayers > 1) && (queueSize < minPlayers);

    // AIR games_main footer: "Total Games Left: N" (red at 0, hidden when
    // unlimited), the token buttons, the HC upsell, and a play button that
    // counts the leave-game block down as m:ss.
    const freeGamesLeft = accountStatus?.freeGamesLeft ?? -1;
    const gamesLeft = getGamesLeftStatus(freeGamesLeft, accountStatus?.hasUnlimitedGames ?? true);
    const tokenButtons = SNOWWAR_TOKEN_BUTTONS
        .map(button => ({ button, offer: (tokenOffers ?? []).find(offer => offer.localizationId === button.localizationId) }))
        .filter(entry => !!entry.offer);

    const openClubCenter = () =>
    {
        const links = GetConfigurationValue<Record<string, string>>('catalog.links', {});
        CreateLinkEvent(`catalog/open/${links?.['hc.buy_hc'] ?? 'habbo_club'}`);
    };

    // AIR buySnowWarTokensOffer: confirm with the price, then buy the offer.
    const buyTokens = (offer: SnowWarGameTokenOffer, games: number) =>
    {
        const price = getSnowWarTokenPrice(offer.priceInCredits, offer.priceInActivityPoints, offer.activityPointType);
        const priceText = LocalizeText(price.key, price.parameters, price.replacements);
        const message = LocalizeText('catalog.purchase.confirmation.dialog.costs', [ 'offer_name', 'price' ], [ `${games}x SnowStorm`, priceText ]);
        const buy = () => SendMessageComposer(new PurchaseSnowWarGameTokensOfferComposer(offer.offerId));

        if (!showConfirm) return buy();

        showConfirm(message, buy, null, null, null, localizeWithFallback('catalog.purchase.confirmation.dialog.title', 'Order Info'));
    };
    const showLeaderboard = GetConfigurationValue<boolean>('games.highscores.enabled', true);

    const onPlay = () =>
    {
        setSelectedGame(game);
        SendMessageComposer(new JoinQueueMessageComposer(game.gameId));
    };

    const title = localizeWithFallback(`gamecenter.${game.gameNameId}.description_title`, game.gameNameId);
    const description = localizeWithFallback(`gamecenter.${game.gameNameId}.description_content`, '');
    const errorText = (isSnowWar && (phase === 'idle') && errorCode) ? snowWarErrorText(errorCode) : null;

    return (
        <div className={`game-tile${isSnowWar ? ' game-tile--snowwar' : ''}`}>
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
                            {((phase === 'queued') && (arenaQueuePosition > 0))
                                ? localizeWithFallback('snowwar.lobby_arena_queue_position', 'Position in queue: %position%')
                                    .replace('%position%', arenaQueuePosition.toString())
                                : (phase !== 'queued')
                                ? applySnowWarPlural(localizeWithFallback('snowwar.lobby_game_start_countdown', '%seconds% seconds until the Storm!'), 'seconds', lobbySeconds)
                                : awaitingPlayers
                                    ? `${localizeWithFallback('snowwar.lobby_waiting_for_more_players', 'Waiting for more players...')} (${queueSize}/${minPlayers})`
                                    : localizeWithFallback('snowwar.queue.position', 'In queue: %position% / %size%')
                                        .replace('%position%', queuePosition.toString())
                                        .replace('%size%', queueSize.toString())}
                        </div>
                        <BaseButton className="snowwar-button snowwar-button--danger" type="button" onClick={() => leaveQueue()}>
                            {localizeWithFallback('snowwar.queue.leave', 'Leave queue')}
                        </BaseButton>
                    </div>
                )}
                {!isSnowWar && (
                    <BaseButton disabled className="snowwar-button game-tile__play" type="button">
                        {localizeWithFallback('gamecenter.coming_soon', 'Coming soon!')}
                    </BaseButton>
                )}
                {isSnowWar && !inQueue && (
                    <div className="game-tile__links">
                        <BaseButton className="game-tile__link" type="button" onClick={() => setInstructionsOpen(true)}>
                            {localizeWithFallback('snowwar.instructions.link', 'How To Play')}
                        </BaseButton>
                        {showLeaderboard && (
                            <BaseButton className="game-tile__link" type="button" onClick={() => requestLeaderboard(false, true, 0)}>
                                {localizeWithFallback('snowwar.leaderboards.link', 'Leaderboard')}
                            </BaseButton>
                        )}
                    </div>
                )}
                {isSnowWar && !inQueue && (
                    <div className="game-tile__footer">
                        {gamesLeft.showCounter && (
                            <div className="game-tile__games-left">
                                <span>{localizeWithFallback('snowwar.games_left', 'Total Games Left:')}</span>
                                {/* AIR games_left over games_left_stroke: red stroke at 0, blue otherwise. */}
                                <span className={`game-tile__games-left-count game-tile__games-left-count--${gamesLeft.counterTone}`}>
                                    <SnowWarStrokeText stroke={(gamesLeft.counterTone === 'red') ? '#ff0000' : '#1077ac'} text={freeGamesLeft} />
                                </span>
                            </div>
                        )}
                        {gamesLeft.showCounter && (tokenButtons.length > 0) && (
                            <div className="game-tile__tokens">
                                <span>{localizeWithFallback('snowwar.buy_more_games', 'Buy more games:')}</span>
                                <div className="game-tile__token-buttons">
                                    {tokenButtons.map(({ button, offer }) => (
                                        <BaseButton
                                            key={offer.offerId}
                                            aria-label={`${button.games}`}
                                            className="game-tile__token"
                                            style={{ '--token-image': `url(${SNOWWAR_AIR_ASSETS[button.asset]})`, '--token-image-hi': `url(${SNOWWAR_AIR_ASSETS[`${button.asset}_hi`]})` } as CSSProperties}
                                            type="button"
                                            onClick={() => buyTokens(offer, button.games)} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {gamesLeft.showCounter && (
                            <BaseButton className="game-tile__vip" type="button" onClick={openClubCenter}>
                                <img alt="" className="game-tile__hc-icon" src={SNOWWAR_AIR_ASSETS.hc_icon} />
                                <span>{localizeWithFallback('snowwar.get_more_games', 'Get additional free daily games with HC!')}</span>
                            </BaseButton>
                        )}
                        <div className="game-tile__actions">
                            {/* AIR updateGettingMoreGamesOption: no play button with 0 games left. */}
                            {gamesLeft.canStart && (
                                <BaseButton
                                    className={`snowwar-button game-tile__play${(blockSeconds > 0) ? ' game-tile__play--blocked' : ''}`}
                                    disabled={blockSeconds > 0}
                                    type="button"
                                    onClick={onPlay}>
                                    {(blockSeconds > 0)
                                        ? formatSnowWarBlockCountdown(blockSeconds)
                                        : localizeWithFallback('snowwar.play', 'Play now!')}
                                </BaseButton>
                            )}
                            {queueInfo?.canEdit && (
                                <BaseButton className="snowwar-button snowwar-button--edit" type="button" onClick={() => startEditing()}>
                                    {localizeWithFallback('snowwar.editor.build_custom', 'Build Custom Arena')}
                                </BaseButton>
                            )}
                        </div>
                    </div>
                )}
                {errorText && <div className="game-tile__error">{errorText}</div>}
            </div>
        </div>
    );
};
