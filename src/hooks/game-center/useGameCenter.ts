import {
    Game2AccountGameStatusMessageEvent,
    Game2AccountGameStatusMessageParser,
    Game2CheckGameDirectoryStatusMessageComposer,
    Game2GameDirectoryStatusMessageEvent,
    Game2UserBlockedMessageEvent,
    GameConfigurationData,
    GameListMessageEvent,
    GameStatusMessageEvent,
    GetGameListMessageComposer,
    GetSnowWarGameTokensOfferComposer,
    SnowWarGameTokenOffer,
    SnowWarGameTokensMessageEvent,
    LoadGameUrlEvent,
    RoomEnterEvent
} from '@octane/renderer';
import { useCallback, useEffect, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { GetRoomSession, SendMessageComposer, setSnowWarReturnRoom, snowWarBlockDeadline, VisitDesktop } from '../../api';
import { useMessageEvent } from '../events';

const useGameCenterState = () => {
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [games, setGames] = useState<GameConfigurationData[]>(null);
    const [selectedGame, setSelectedGame] = useState<GameConfigurationData>(null);
    const [accountStatus, setAccountStatus] = useState<Game2AccountGameStatusMessageParser>(null);
    const [gameOffline, setGameOffline] = useState<boolean>(false);
    const [gameURL, setGameURL] = useState<string>(null);
    // Wall-clock end of the leave block (0 = not blocked).
    const [blockedUntil, setBlockedUntil] = useState<number>(0);
    // AIR games_main "How To Play" pages replace the tile grid while open.
    const [instructionsOpen, setInstructionsOpen] = useState<boolean>(false);
    // The "get more games" token offers (GetSnowWarGameTokensOffer).
    const [tokenOffers, setTokenOffers] = useState<SnowWarGameTokenOffer[]>([]);

    useMessageEvent<SnowWarGameTokensMessageEvent>(SnowWarGameTokensMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setTokenOffers(parser.offers ?? []);
    });

    // Leaving a running match blocks starting a new one; the hub shows the
    // countdown on the play button.
    useMessageEvent<Game2UserBlockedMessageEvent>(Game2UserBlockedMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setBlockedUntil(snowWarBlockDeadline(parser.playerBlockLength, Date.now()));
    });

    useMessageEvent<Game2GameDirectoryStatusMessageEvent>(Game2GameDirectoryStatusMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setBlockedUntil(snowWarBlockDeadline(parser.blockLength, Date.now()));
    });

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
            SendMessageComposer(new Game2CheckGameDirectoryStatusMessageComposer());
            SendMessageComposer(new GetSnowWarGameTokensOfferComposer());
            VisitDesktop();
        } else {
            setInstructionsOpen(false);
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
        setGameURL,
        blockedUntil,
        instructionsOpen,
        setInstructionsOpen,
        tokenOffers
    };
};

export const useGameCenter = () => useSharedHook(useGameCenterState);

registerSharedHook(useGameCenterState);
