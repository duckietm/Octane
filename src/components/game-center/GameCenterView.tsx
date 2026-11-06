import { AddLinkEventTracker, Game2GetAccountGameStatusMessageComposer, GetGameStatusMessageComposer, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { useEffect } from 'react';
import { GetConfigurationValue, LocalizeText, SendMessageComposer } from '../../api';
import { useGameCenter } from '../../hooks';
import { GameStageView } from './views/GameStageView';
import { GameTileView } from './views/GameTileView';
import { UnoGameTileView } from './views/UnoGameTileView';
import { WerewolfGameTileView } from './views/WerewolfGameTileView';
import { WobbleGameTileView } from './views/WobbleGameTileView';
import { BattleBallGameTileView } from './views/BattleBallGameTileView';
import { FastFoodGameTileView } from './views/FastFoodGameTileView';
import { HallGameTileView } from './views/HallGameTileView';
import { SnailGameTileView } from './views/SnailGameTileView';
import { QuizGameTileView } from './views/QuizGameTileView';
import { SnowWarInstructionsView } from './views/snowwar/SnowWarInstructionsView';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

const localizeWithFallback = (key: string, fallback: string) =>
{
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

export const GameCenterView = () => {
    const { isVisible, setIsVisible, games, selectedGame, accountStatus, instructionsOpen } = useGameCenter();

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

    if (!isVisible || !games || !accountStatus) return;

    return (
        <NativeTextTree>
            <div className="game-center-main">
                <div className="game-center-header">
                    <div className="game-center-header__title">{localizeWithFallback('gamecenter.game_list_title', 'Choose a game')}</div>
                    <BaseButton className="game-center-header__close" type="button" onClick={() => setIsVisible(false)}>&times;</BaseButton>
                </div>
                {instructionsOpen
                    ? <SnowWarInstructionsView />
                    : (
                        <div className="game-tile-grid">
                            {games.map((game) => <GameTileView key={game.gameId} game={game} />)}
                            {GetConfigurationValue<boolean>('uno.enabled', true) && <UnoGameTileView onOpen={() => setIsVisible(false)} />}
                            {GetConfigurationValue<boolean>('werewolf.enabled', true) && <WerewolfGameTileView onOpen={() => setIsVisible(false)} />}
                            {GetConfigurationValue<boolean>('wobble.enabled', true) && <WobbleGameTileView onOpen={() => setIsVisible(false)} />}
                            {GetConfigurationValue<boolean>('battleball.enabled', true) && <BattleBallGameTileView onOpen={() => setIsVisible(false)} />}
                            {GetConfigurationValue<boolean>('fastfood.enabled', true) && <FastFoodGameTileView onOpen={() => setIsVisible(false)} />}
                            {GetConfigurationValue<boolean>('hall.enabled', true) && <HallGameTileView onOpen={() => setIsVisible(false)} />}
                            {GetConfigurationValue<boolean>('hall.enabled', true) && <SnailGameTileView onOpen={() => setIsVisible(false)} />}
                            {GetConfigurationValue<boolean>('hall.enabled', true) && <QuizGameTileView onOpen={() => setIsVisible(false)} />}
                        </div>
                    )}
                <GameStageView />
            </div>
        </NativeTextTree>
    );
};
