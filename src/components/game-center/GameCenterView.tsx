import { AddLinkEventTracker, Game2GetAccountGameStatusMessageComposer, GetGameStatusMessageComposer, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { useEffect } from 'react';
import { LocalizeText, SendMessageComposer } from '../../api';
import { useGameCenter } from '../../hooks';
import { GameStageView } from './views/GameStageView';
import { GameTileView } from './views/GameTileView';

const localizeWithFallback = (key: string, fallback: string) =>
{
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

export const GameCenterView = () => {
    const { isVisible, setIsVisible, games, selectedGame, accountStatus } = useGameCenter();

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

    if (!isVisible || !games || !accountStatus) return;

    return (
        <div className="game-center-main">
            <div className="game-center-header">
                <div className="game-center-header__title">{localizeWithFallback('gamecenter.game_list_title', 'Choose a game')}</div>
                <button className="game-center-header__close" type="button" onClick={() => setIsVisible(false)}>&times;</button>
            </div>
            <div className="game-tile-grid">
                {games.map((game) => <GameTileView key={game.gameId} game={game} />)}
            </div>
            <GameStageView />
        </div>
    );
};
