import { AddLinkEventTracker, Game2GetAccountGameStatusMessageComposer, GetGameStatusMessageComposer, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { useCallback, useEffect, useState } from 'react';
import { GameCenterApi, GameCenterApiError, GetConfigurationValue, IGameCenterOffer, IGameCenterOverview, LocalizeText, SendMessageComposer, gct } from '../../api';
import { useGameCenter } from '../../hooks';
import { GAME_CATALOG } from './GameCatalog';
import { GameCardView } from './views/GameCardView';
import { GameLeaderboardView } from './views/GameLeaderboardView';
import { GameStageView } from './views/GameStageView';
import { GameTileView } from './views/GameTileView';
import { SnowWarInstructionsView } from './views/snowwar/SnowWarInstructionsView';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import '../../css/game-center/GameCards.css';
import '../../css/game-center/GameThemes.css';

const localizeWithFallback = (key: string, fallback: string) =>
{
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

const REFRESH_MS = 10000;

/**
 * The Game Center: every game of the hotel side by side, SnowStorm first (it keeps its own queue and counters), then
 * Habbi's games, each with its players right now, the games left today, packs of games to buy, its leaderboard and
 * Play. The list (`/api/gamecenter`) is asked for again every ten seconds while it shows.
 */
export const GameCenterView = () => {
    const { isVisible, setIsVisible, games, selectedGame, accountStatus, instructionsOpen } = useGameCenter();
    const [ overview, setOverview ] = useState<IGameCenterOverview | null>(null);
    const [ leaderboard, setLeaderboard ] = useState<{ id: string; title: string } | null>(null);
    const [ error, setError ] = useState('');

    useEffect(() => {
        const toggleGameCenter = () => {
            setIsVisible((prev) => !prev);
        };

        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const value = url.split('/');

                switch (value[1]) {
                    case 'toggle':
                        toggleGameCenter();
                        break;
                    case 'show':
                        setIsVisible(true);
                        break;
                }
            },
            eventUrlPrefix: 'games/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [setIsVisible]);

    useEffect(() => {
        if (!selectedGame) return;

        SendMessageComposer(new GetGameStatusMessageComposer(selectedGame.gameId));
        SendMessageComposer(new Game2GetAccountGameStatusMessageComposer(selectedGame.gameId));
    }, [selectedGame]);

    const refresh = useCallback(() => {
        GameCenterApi.overview().then(setOverview).catch(() => undefined);
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        refresh();

        const timer = setInterval(refresh, REFRESH_MS);

        return () => clearInterval(timer);
    }, [ isVisible, refresh ]);

    useEffect(() => {
        if (!error) return;

        const timer = setTimeout(() => setError(''), 5000);

        return () => clearTimeout(timer);
    }, [ error ]);

    const buy = (game: string, offer: IGameCenterOffer) => {
        GameCenterApi.buy(game, offer.id)
            .then(setOverview)
            .catch((caught) => {
                const code = caught instanceof GameCenterApiError ? caught.code : 'http_error';

                setError(code === 'not_enough' ? gct('error.not_enough', 'You do not have enough to buy these games.') : gct('error.buy', 'The purchase did not go through, try again.'));
            });
    };

    if (!isVisible || !games || !accountStatus) return null;

    const close = () => setIsVisible(false);
    const snowWar = games.filter((game) => game.gameNameId === 'snowwar');

    return (
        <NativeTextTree>
            <div className="game-center-main">
                <div className="game-center-header">
                    <div className="game-center-header__title">{localizeWithFallback('gamecenter.game_list_title', 'Choose a game')}</div>
                    <BaseButton className="game-center-header__close" type="button" onClick={close}>&times;</BaseButton>
                </div>
                {instructionsOpen
                    ? <SnowWarInstructionsView />
                    : (
                        <div className="game-tile-grid game-card-grid">
                            {snowWar.map((game) => <GameTileView key={game.gameId} game={game} playing={overview?.snowwar ?? 0} />)}
                            {GAME_CATALOG.filter((entry) => GetConfigurationValue<boolean>(entry.option, true)).map((entry) => (
                                <GameCardView
                                    key={entry.id}
                                    entry={entry}
                                    status={overview?.games.find((game) => game.id === entry.id) ?? null}
                                    offers={overview?.offers ?? []}
                                    club={!!overview?.club}
                                    onOpen={close}
                                    onLeaderboard={() => setLeaderboard({ id: entry.id, title: gct(`${ entry.id }.title`, entry.title) })}
                                    onBuy={(offer) => buy(entry.id, offer)} />
                            ))}
                        </div>
                    )}
                {error && <div className="game-center-toast" data-browser-text>{error}</div>}
                <GameStageView />
            </div>
            {leaderboard && <GameLeaderboardView game={leaderboard.id} title={leaderboard.title} onClose={() => setLeaderboard(null)} />}
        </NativeTextTree>
    );
};
