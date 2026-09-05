import {
    Game2AccountGameStatusMessageEvent,
    Game2AccountGameStatusMessageParser,
    GameConfigurationData,
    GameListMessageEvent,
    GameStatusMessageEvent,
    GetGameListMessageComposer,
    LoadGameUrlEvent,
    RoomEnterEvent
} from '@octane/renderer';
import { useCallback, useEffect, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { GetRoomSession, SendMessageComposer, setSnowWarReturnRoom, VisitDesktop } from '../../api';
import { useMessageEvent } from '../events';

const useGameCenterState = () => {
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [games, setGames] = useState<GameConfigurationData[]>(null);
    const [selectedGame, setSelectedGame] = useState<GameConfigurationData>(null);
    const [accountStatus, setAccountStatus] = useState<Game2AccountGameStatusMessageParser>(null);
    const [gameOffline, setGameOffline] = useState<boolean>(false);
    const [gameURL, setGameURL] = useState<string>(null);

    useMessageEvent<GameListMessageEvent>(GameListMessageEvent, (event) => {
        let parser = event.getParser();

        if (!parser || (parser && !parser.games.length)) return;

        setSelectedGame(parser.games[0]);

        setGames(parser.games);
    });

    useMessageEvent<Game2AccountGameStatusMessageEvent>(Game2AccountGameStatusMessageEvent, (event) => {
        let parser = event.getParser();

        if (!parser) return;

        setAccountStatus(parser);
    });

    useMessageEvent<GameStatusMessageEvent>(GameStatusMessageEvent, (event) => {
        let parser = event.getParser();

        if (!parser) return;

        setGameOffline(parser.isInMaintenance);
    });

    // Entering a room while the hub is open (e.g. the SnowWar arena editor
    // forwarding the player) must close the fullscreen hub overlay, or the
    // loaded room sits invisible behind it. Normal hub usage never enters a
    // room (opening it calls VisitDesktop), so this only fires on forwards.
    const onRoomEnter = useCallback(() => setIsVisible(false), []);

    useMessageEvent<RoomEnterEvent>(RoomEnterEvent, onRoomEnter);

    useMessageEvent<LoadGameUrlEvent>(LoadGameUrlEvent, (event) => {
        let parser = event.getParser();

        if (!parser) return;

        switch (parser.gameTypeId) {
            case 2:
                // SnowWar runs natively (SnowWarView + useSnowWar), not in an
                // iframe — the server drives it via the SnowWar packets.
                return;
            default:
                return setGameURL(parser.url);
        }
    });

    useEffect(() => {
        if (isVisible) {
            // Remember the room we're leaving so SnowWar can return us to it on
            // exit; VisitDesktop() below drops the room session. Overwrites any
            // stale value (null when we open the hub from outside a room).
            setSnowWarReturnRoom(GetRoomSession()?.roomId ?? null);
            SendMessageComposer(new GetGameListMessageComposer());
            VisitDesktop();
        } else {
            // dispose or wtv
        }
    }, [isVisible]);

    return {
        isVisible,
        setIsVisible,
        games,
        accountStatus,
        selectedGame,
        setSelectedGame,
        gameOffline,
        gameURL,
        setGameURL
    };
};

export const useGameCenter = () => useSharedHook(useGameCenterState);

registerSharedHook(useGameCenterState);
