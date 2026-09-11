import {
    Game2AccountGameStatusMessageEvent,
    Game2AccountGameStatusMessageParser,
    Game2CheckGameDirectoryStatusMessageComposer,
    Game2GameDirectoryStatusMessageEvent,
    Game2GetAccountGameStatusMessageComposer,
    Game2UserBlockedMessageEvent,
    GameConfigurationData,
    GameListMessageEvent,
    GameStatusMessageEvent,
    GetGameListMessageComposer,
    GetSnowWarGameTokensOfferComposer,
    LoadGameUrlEvent,
    PurchaseSnowWarGameTokensOfferComposer,
    RoomEnterEvent,
    SnowWarGameTokenOffer,
    SnowWarGameTokensMessageEvent
} from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { GetRoomSession, SendMessageComposer, setSnowWarReturnRoom, snowWarDeadlineFromSeconds, snowWarSecondsRemaining, VisitDesktop } from '../../api';
import { useMessageEvent } from '../events';

const useGameCenterState = () => {
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [games, setGames] = useState<GameConfigurationData[]>(null);
    const [selectedGame, setSelectedGame] = useState<GameConfigurationData>(null);
    const [accountStatus, setAccountStatus] = useState<Game2AccountGameStatusMessageParser>(null);
    const [gameOffline, setGameOffline] = useState<boolean>(false);
    const [gameURL, setGameURL] = useState<string>(null);
    // AIR games_main: the "How To Play" pages replace the teaser in place.
    const [instructionsOpen, setInstructionsOpen] = useState<boolean>(false);
    // Game2GameDirectoryStatus: total games played (drives the promo) and the
    // remaining block after leaving a game early (the play button counts it
    // down as m:ss). The block is a wall-clock deadline: timers are throttled
    // in background tabs, so every tick re-derives the seconds from Date.now().
    const [gamesPlayed, setGamesPlayed] = useState<number>(0);
    const [blockSeconds, setBlockSeconds] = useState<number>(0);
    const blockDeadlineRef = useRef<number>(null);
    // AIR SnowWarGameTokens (3419): the offers behind games_main's
    // btn_more_games_10 / _100 / _300 buttons.
    const [tokenOffers, setTokenOffers] = useState<SnowWarGameTokenOffer[]>([]);

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

    // AIR onGameDirectoryStatus: status 0 refreshes the block countdown, the
    // games-played total and the free games (gamesLeft(0, freeGamesLeft == -1,
    // freeGamesLeft)); any other status only means the directory is offline.
    useMessageEvent<Game2GameDirectoryStatusMessageEvent>(Game2GameDirectoryStatusMessageEvent, (event) => {
        let parser = event.getParser();

        if (!parser) return;

        if (parser.status !== 0) {
            setGameOffline(true);
            return;
        }

        setGameOffline(false);
        setGamesPlayed(parser.gamesPlayed);
        blockDeadlineRef.current = (parser.blockLength > 0) ? snowWarDeadlineFromSeconds(Date.now(), parser.blockLength) : null;
        setBlockSeconds(Math.max(0, parser.blockLength));
        setAccountStatus((current) => {
            if (current && (current.freeGamesLeft === parser.freeGamesLeft)) return current;
            // Same shape as Game2AccountGameStatusMessageParser for game type 0 (SnowWar).
            return {
                gameTypeId: 0,
                freeGamesLeft: parser.freeGamesLeft,
                gamesPlayedTotal: parser.gamesPlayed,
                hasUnlimitedGames: parser.freeGamesLeft === -1,
            } as Game2AccountGameStatusMessageParser;
        });
    });

    // AIR Game2UserBlocked (3508) -> GamesMainViewController.changeBlockStatus:
    // leaving a live match blocks the play button for a while.
    useMessageEvent<Game2UserBlockedMessageEvent>(Game2UserBlockedMessageEvent, (event) => {
        let parser = event.getParser();

        if (!parser) return;

        const seconds = Math.max(0, parser.playerBlockLength);

        blockDeadlineRef.current = (seconds > 0) ? snowWarDeadlineFromSeconds(Date.now(), seconds) : null;
        setBlockSeconds(seconds);
    });

    useMessageEvent<SnowWarGameTokensMessageEvent>(SnowWarGameTokensMessageEvent, (event) => {
        let parser = event.getParser();

        if (!parser) return;

        setTokenOffers(parser.offers ?? []);
    });

    // AIR HabboCatalog.purchaseGameTokensOffer: buy by offer id, then refresh
    // the games-left counter the purchase just changed.
    const purchaseTokenOffer = useCallback((offerId: number) => {
        SendMessageComposer(new PurchaseSnowWarGameTokensOfferComposer(offerId));
        SendMessageComposer(new Game2GetAccountGameStatusMessageComposer(0));
    }, []);

    const blockTicking = (blockSeconds > 0);

    useEffect(() => {
        if (!blockTicking) return;

        const tick = () => {
            const left = (blockDeadlineRef.current !== null) ? snowWarSecondsRemaining(blockDeadlineRef.current, Date.now()) : 0;

            setBlockSeconds(left);

            if (left <= 0) blockDeadlineRef.current = null;
        };
        const interval = window.setInterval(tick, 1000);

        return () => window.clearInterval(interval);
    }, [blockTicking]);

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
            // AIR HTIE_ICON_GAMES: refresh the game directory (block status,
            // games played, free games) every time the hub opens.
            SendMessageComposer(new Game2CheckGameDirectoryStatusMessageComposer());
            // AIR HabboCatalog.buySnowWarTokensOffer: the offers are fetched
            // once and cached, so the "get more games" buttons can price
            // themselves before anyone clicks.
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
        instructionsOpen,
        setInstructionsOpen,
        gamesPlayed,
        blockSeconds,
        tokenOffers,
        purchaseTokenOffer
    };
};

export const useGameCenter = () => useSharedHook(useGameCenterState);

registerSharedHook(useGameCenterState);
