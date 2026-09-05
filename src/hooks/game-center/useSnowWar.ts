import {
    Game2WeeklyFriendsLeaderboardEvent,
    Game2WeeklyLeaderboardEvent,
    SnowWarCreateSnowballComposer,
    SnowWarEditRoomComposer,
    SnowWarExitEditorComposer,
    SnowWarExitGameComposer,
    SnowWarFullGameStatusEvent,
    SnowWarGameChatComposer,
    SnowWarGameEndedEvent,
    SnowWarGameStatusEvent,
    SnowWarGamesInformationEvent,
    SnowWarGamesLeftEvent,
    SnowWarGenericErrorEvent,
    SnowWarGetAllTimeFriendsLeaderboardComposer,
    SnowWarGetAllTimeLeaderboardComposer,
    SnowWarGetWeeklyFriendsLeaderboardComposer,
    SnowWarGetWeeklyLeaderboardComposer,
    SnowWarInitArenaEvent,
    SnowWarJoinQueueComposer,
    SnowWarLeaveQueueComposer,
    SnowWarLevelDataEvent,
    SnowWarLoadStageReadyComposer,
    SnowWarLobbyTeamsEvent,
    SnowWarOnGameEndingEvent,
    SnowWarOnStageEndingEvent,
    SnowWarOnStageRunningEvent,
    SnowWarOnStageStartEvent,
    SnowWarPlayAgainComposer,
    SnowWarPlayerExitedArenaEvent,
    SnowWarQueuePositionEvent,
    SnowWarRejoinPreviousRoomEvent,
    SnowWarRequestFullGameStatusComposer,
    SnowWarSaveEditorComposer,
    SnowWarSelectArenaComposer,
    SnowWarStartLobbyCounterEvent,
    SnowWarThrowAtLocationComposer,
    SnowWarThrowAtPlayerComposer,
    SnowWarUserChatEvent,
    SnowWarUserRematchedEvent,
    SnowWarWalkComposer,
    WeeklyCompetitiveFriendsLeaderboardEvent,
    WeeklyCompetitiveLeaderboardEvent,
} from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { PlaySound, SendMessageComposer, SoundNames, TryVisitRoom } from '../../api';
import {
    consumeSnowWarReturnRoom,
    SNOWWAR_EVENT_MACHINE_TRANSFER,
    SnowWarSimEvent,
    SnowWarSimulation,
    SUBTURN_MS,
    SUBTURNS_PER_TICK,
    snowWarDeadlineFromSeconds,
    snowWarSecondsRemaining,
} from '../../api/snowwar';
import { useMessageEvent } from '../events';

export type SnowWarPhase =
    | 'idle'
    | 'queued'
    | 'lobby'
    | 'loading'
    | 'preparing'
    | 'playing'
    | 'ending'
    | 'results';

export interface SnowWarLevelState {
    gameLengthSeconds: number;
    canEditRoom: boolean;
    arenaName: string;
    mapId: number;
    teamCount: number;
    heightmapRows: string[];
    items: { name: string; x: number; y: number; rotation: number; imageUrl: string; offsetZ: number; walkableHeight?: number; width?: number; length?: number; state?: number; stateCount?: number }[];
    machines: { objectId: number; x: number; y: number }[];
    players: { objectId: number; userId: number; teamId: number; name: string; figure: string; gender: string }[];
}

export interface SnowWarLobbyTeamsState {
    teamCount: number;
    leaderUserId: number;
    selectedArenaId: number;
    arenas: { id: number; name: string; official: boolean }[];
    players: { userId: number; teamId: number; name: string; figure: string; gender: string }[];
}

export interface SnowWarResultsState {
    secondsToResults: number;
    teams: {
        teamId: number;
        score: number;
        players: { userId: number; name: string; score: number }[];
    }[];
}

export interface SnowWarChatMessage {
    id: number;
    objectId: number;
    name: string;
    message: string;
    receivedAt: number;
}

export interface SnowWarLeaderboardState {
    isOpen: boolean;
    weekly: boolean;
    friendsOnly: boolean;
    loading: boolean;
    year: number;
    week: number;
    maxOffset: number;
    currentOffset: number;
    minutesUntilReset: number;
    totalListSize: number;
    entries: { userId: number; score: number; rank: number; name: string; figure: string; gender: string }[];
}

// One shared world per session — the arena view reads it every animation frame.
const SNOWWAR_SIMULATION = new SnowWarSimulation();

// Dev-only console handle: Vite serves HMR-updated modules under versioned
// URLs, so a plain dynamic import from devtools gets a second instance. This
// is the only reliable way to inspect the live replica while debugging.
if ((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV) (window as Window & { __SNOWWAR_SIM?: SnowWarSimulation }).__SNOWWAR_SIM = SNOWWAR_SIMULATION;

// Sounds fire when the replica APPLIES an event, not when the packet lands —
// the replay can trail the wire by a few subturns, and AIR keys its audio off
// the engine replay too, so this keeps what you hear matched to what you see.
SNOWWAR_SIMULATION.onEventApplied = event =>
{
    switch (event.type)
    {
        case 3:
            PlaySound(SoundNames.SNOWWAR_MAKE_SNOWBALL);
            break;
        case 4:
        case 10:
            PlaySound(SoundNames.SNOWWAR_THROW);
            break;
        case 5:
            PlaySound(SoundNames.SNOWWAR_HIT);
            break;
        case SNOWWAR_EVENT_MACHINE_TRANSFER:
            PlaySound(SoundNames.SNOWWAR_GET_SNOWBALL);
            break;
        case 9:
            PlaySound(SoundNames.SNOWWAR_STUN);
            break;
    }
};

const SNOWWAR_QUEUE_MAX_WAIT_MS = 120000;

let CHAT_MESSAGE_ID = 0;

export const GetSnowWarSimulation = (): SnowWarSimulation => SNOWWAR_SIMULATION;

/** Map a parsed subturn event onto the simulation's positional event shape. */
const toSimEvent = (event: {
    eventType: number;
    objectId: number;
    throwerObjectId: number;
    targetObjectId: number;
    targetX: number;
    targetY: number;
    trajectory: number;
    direction: number;
    machineObjectId: number;
    avatarObjectId: number;
    height: number;
    state: number;
}): SnowWarSimEvent =>
{
    switch (event.eventType)
    {
        case 2: return { type: 2, p1: event.objectId, p2: event.targetX, p3: event.targetY, p4: 0, p5: 0 };
        case 3: return { type: 3, p1: event.objectId, p2: 0, p3: 0, p4: 0, p5: 0 };
        case 4: return {
            type: 4,
            p1: event.objectId,
            p2: event.throwerObjectId,
            p3: event.targetX,
            p4: event.targetY,
            p5: event.trajectory,
        };
        case 5: return { type: 5, p1: event.throwerObjectId, p2: event.targetObjectId, p3: event.direction, p4: 0, p5: 0 };
        case 11: return { type: 11, p1: event.machineObjectId, p2: 0, p3: 0, p4: 0, p5: 0 };
        case 12: return { type: 12, p1: event.avatarObjectId, p2: event.machineObjectId, p3: 0, p4: 0, p5: 0 };
        case 8: return { type: 8, p1: event.objectId, p2: event.targetX, p3: event.targetY, p4: event.height, p5: event.trajectory };
        case 9: return { type: 9, p1: event.targetObjectId, p2: event.throwerObjectId, p3: event.direction, p4: 0, p5: 0 };
        case 10: return {
            type: 10,
            p1: event.objectId,
            p2: event.throwerObjectId,
            p3: event.targetX,
            p4: event.targetY,
            p5: event.trajectory,
        };
        case 13: return { type: 13, p1: event.targetX, p2: event.targetY, p3: event.state, p4: 0, p5: 0 };
        default: return { type: event.eventType, p1: 0, p2: 0, p3: 0, p4: 0, p5: 0 };
    }
};

const useSnowWarState = () =>
{
    const [phase, setPhase] = useState<SnowWarPhase>('idle');
    const [queuePosition, setQueuePosition] = useState(0);
    const [queueSize, setQueueSize] = useState(0);
    const [lobbySeconds, setLobbySeconds] = useState(0);
    const [preparingSeconds, setPreparingSeconds] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [levelData, setLevelData] = useState<SnowWarLevelState>(null);
    const [lobbyTeams, setLobbyTeams] = useState<SnowWarLobbyTeamsState>(null);
    const [results, setResults] = useState<SnowWarResultsState>(null);
    const [chatMessages, setChatMessages] = useState<SnowWarChatMessage[]>([]);
    const [rematchedUserIds, setRematchedUserIds] = useState<number[]>([]);
    const [errorCode, setErrorCode] = useState<number>(null);
    const [queueExpired, setQueueExpired] = useState(false);
    const [gamesLeft, setGamesLeft] = useState(-1);
    const [queueInfo, setQueueInfo] = useState<{ playersInQueue: number; gamesPlayed: number; minPlayers: number; canEdit: boolean }>(null);
    const [leaderboard, setLeaderboard] = useState<SnowWarLeaderboardState>({
        isOpen: false,
        weekly: true,
        friendsOnly: false,
        loading: false,
        year: 0,
        week: 0,
        maxOffset: 0,
        currentOffset: 0,
        minutesUntilReset: 0,
        totalListSize: 0,
        entries: [],
    });
    // In-arena WYSIWYG editor: the client edits the current level snapshot and
    // publishes it with the save packet. editingRef mirrors it for the stable
    // packet callbacks (which capture [] deps).
    const [editing, setEditing] = useState(false);
    const editingRef = useRef(false);
    // AIR stamps every arena action with the last authoritative turn and the
    // locally replayed subturn. Polaris keeps these fields optional server-side
    // so older custom clients remain compatible.
    const protocolTurnRef = useRef(0);
    const lobbyDeadlineRef = useRef<number | null>(null);
    const preparingDeadlineRef = useRef<number | null>(null);
    const gameDeadlineRef = useRef<number | null>(null);
    const lastWalkSentAtRef = useRef(0);
    const queuedWalkRef = useRef<{ worldX: number; worldY: number } | null>(null);
    const walkFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const getProtocolClock = useCallback((): [number, number] => [
        Math.max(0, protocolTurnRef.current),
        SNOWWAR_SIMULATION.subturnCount % SUBTURNS_PER_TICK,
    ], []);

    const resetToIdle = useCallback(() =>
    {
        SNOWWAR_SIMULATION.reset();
        protocolTurnRef.current = 0;
        lobbyDeadlineRef.current = null;
        preparingDeadlineRef.current = null;
        gameDeadlineRef.current = null;
        lastWalkSentAtRef.current = 0;
        queuedWalkRef.current = null;
        if (walkFlushTimerRef.current !== null) clearTimeout(walkFlushTimerRef.current);
        walkFlushTimerRef.current = null;
        editingRef.current = false;
        setEditing(false);
        setPhase('idle');
        setQueuePosition(0);
        setQueueSize(0);
        setLobbySeconds(0);
        setPreparingSeconds(0);
        setSecondsLeft(0);
        setLevelData(null);
        setLobbyTeams(null);
        setResults(null);
        setChatMessages([]);
        setRematchedUserIds([]);
    }, []);

    // Lobby / preparing / game clocks are wall-clock deadlines. setInterval
    // and requestAnimationFrame are throttled in background/minimized tabs, so
    // neither may be used as elapsed time. Server packets reset the deadline;
    // every visible tick derives the display from Date.now().
    const lobbyTicking = (phase === 'lobby') && (lobbySeconds > 0);
    const preparingTicking = (phase === 'preparing') && (preparingSeconds > 0);
    const clockTicking = (phase === 'playing') && (secondsLeft > 0);

    useEffect(() =>
    {
        if (!lobbyTicking) return;
        const tick = () =>
        {
            if (lobbyDeadlineRef.current !== null)
                setLobbySeconds(snowWarSecondsRemaining(lobbyDeadlineRef.current, Date.now()));
        };
        tick();
        const interval = setInterval(tick, 250);
        document.addEventListener('visibilitychange', tick);
        return () =>
        {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [lobbyTicking]);

    useEffect(() =>
    {
        if (!preparingTicking) return;
        const tick = () =>
        {
            if (preparingDeadlineRef.current !== null)
                setPreparingSeconds(snowWarSecondsRemaining(preparingDeadlineRef.current, Date.now()));
        };
        tick();
        const interval = setInterval(tick, 250);
        document.addEventListener('visibilitychange', tick);
        return () =>
        {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [preparingTicking]);

    useEffect(() =>
    {
        if (!clockTicking) return;
        const tick = () =>
        {
            if (gameDeadlineRef.current !== null)
                setSecondsLeft(snowWarSecondsRemaining(gameDeadlineRef.current, Date.now()));
        };
        tick();
        const interval = setInterval(tick, 250);
        document.addEventListener('visibilitychange', tick);
        return () =>
        {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [clockTicking]);

    useEffect(() =>
    {
        if (!errorCode) return;
        const timeout = setTimeout(() => setErrorCode(null), 5000);
        return () => clearTimeout(timeout);
    }, [errorCode]);

    useEffect(() =>
    {
        if (phase !== 'queued') return;
        const timeout = setTimeout(() =>
        {
            SendMessageComposer(new SnowWarLeaveQueueComposer());
            resetToIdle();
            setQueueExpired(true);
        }, SNOWWAR_QUEUE_MAX_WAIT_MS);
        return () => clearTimeout(timeout);
    }, [phase, resetToIdle]);

    useEffect(() =>
    {
        if (!queueExpired) return;
        const timeout = setTimeout(() => setQueueExpired(false), 6000);
        return () => clearTimeout(timeout);
    }, [queueExpired]);

    // All packet handlers are useCallback-stable and read the parser into a
    // local BEFORE any setState. Both rules are load-bearing: this hook lives
    // inside a shared singleton whose effects react to state updates, so
    // synchronously on state updates, so an unstable handler identity makes
    // useMessageEvent unregister+dispose its event (nulling the parser)
    // mid-callback — and briefly leaves the header without a listener, which
    // can drop packets from the 150ms GameStatus stream.

    const onQueuePosition = useCallback((event: SnowWarQueuePositionEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        setQueueExpired(false);
        setPhase(current => (current === 'idle' || current === 'queued' || current === 'lobby') ? 'queued' : current);
        setQueuePosition(parser.position);
        setQueueSize(parser.queueSize);
    }, []);

    const onStartLobbyCounter = useCallback((event: SnowWarStartLobbyCounterEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        const seconds = parser.secondsUntilStart;
        lobbyDeadlineRef.current = snowWarDeadlineFromSeconds(Date.now(), seconds);
        setPhase('lobby');
        setLobbySeconds(seconds);
    }, []);

    const onLobbyTeams = useCallback((event: SnowWarLobbyTeamsEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        setLobbyTeams({
            teamCount: parser.teamCount,
            leaderUserId: parser.leaderUserId,
            selectedArenaId: parser.selectedArenaId,
            arenas: parser.arenas,
            players: parser.players.map(player => ({
                userId: player.userId,
                teamId: player.teamId,
                name: player.name,
                figure: player.figure,
                gender: player.gender,
            })),
        });
    }, []);

    const onInitArena = useCallback(() =>
    {
        SNOWWAR_SIMULATION.reset();
        setResults(null);
        setRematchedUserIds([]);
        setChatMessages([]);
        setPhase('loading');
        SendMessageComposer(new SnowWarLoadStageReadyComposer(100));
    }, []);

    const onLevelData = useCallback((event: SnowWarLevelDataEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        SNOWWAR_SIMULATION.setLevel(parser.heightmapRows, parser.items, parser.machines);
        setLevelData({
            gameLengthSeconds: parser.gameLengthSeconds,
            canEditRoom: parser.canEditRoom,
            arenaName: parser.arenaName,
            mapId: parser.mapId,
            teamCount: parser.teamCount,
            heightmapRows: parser.heightmapRows,
            items: parser.items,
            machines: parser.machines,
            players: parser.players,
        });
        gameDeadlineRef.current = null;
        setSecondsLeft(parser.gameLengthSeconds);
        if (editingRef.current) setPhase('playing');
    }, []);

    const onFullGameStatus = useCallback((event: SnowWarFullGameStatusEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        protocolTurnRef.current = parser.turn;
        SNOWWAR_SIMULATION.applyFullStatus(parser.objects);
        gameDeadlineRef.current = snowWarDeadlineFromSeconds(Date.now(), parser.totalSecondsLeft);
        setSecondsLeft(parser.totalSecondsLeft);
    }, []);

    const onStageStart = useCallback((event: SnowWarOnStageStartEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        const seconds = parser.preparingSeconds;
        preparingDeadlineRef.current = snowWarDeadlineFromSeconds(Date.now(), seconds);
        setPhase('preparing');
        setPreparingSeconds(seconds);
        PlaySound(SoundNames.SNOWWAR_COUNTDOWN);
    }, []);

    const onGameStatus = useCallback((event: SnowWarGameStatusEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        // One server turn always represents exactly three 50 ms subturns.
        // Duplicate/out-of-order packets must not be replayed: doing so applies
        // movement frames twice and makes click-spam appear to accelerate the
        // avatar even though the authoritative server speed is fixed.
        if (parser.turn <= protocolTurnRef.current) return;
        protocolTurnRef.current = parser.turn;
        SNOWWAR_SIMULATION.queueGameStatus(parser.subturns.map(subturn => subturn.map(toSimEvent)));
        setPhase(current => ((current === 'preparing') || (current === 'loading')) ? 'playing' : current);
    }, []);

    const onStageRunning = useCallback((event: SnowWarOnStageRunningEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        gameDeadlineRef.current = snowWarDeadlineFromSeconds(Date.now(), parser.totalSecondsLeft);
        setSecondsLeft(parser.totalSecondsLeft);
        setPhase(current => ((current === 'preparing') || (current === 'loading')) ? 'playing' : current);
    }, []);

    const onStageEnding = useCallback(() => setPhase('ending'), []);

    const onGameEnding = useCallback((event: SnowWarOnGameEndingEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        const nextResults = { secondsToResults: parser.secondsToResults, teams: parser.teams };
        setResults(nextResults);
        setPhase('results');
    }, []);

    const onGameEnded = useCallback(() =>
    {
        setPhase(current => (current === 'results') ? current : 'results');
    }, []);

    const onRejoinPreviousRoom = useCallback(() =>
    {
        if (editingRef.current) return;
        resetToIdle();
        const roomId = consumeSnowWarReturnRoom();
        if (roomId) TryVisitRoom(roomId);
    }, [resetToIdle]);

    const onPlayerExitedArena = useCallback((event: SnowWarPlayerExitedArenaEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        SNOWWAR_SIMULATION.avatars.delete(parser.objectId);
    }, []);

    const onUserChat = useCallback((event: SnowWarUserChatEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        const objectId = parser.objectId;
        const message = parser.message;
        const avatar = SNOWWAR_SIMULATION.avatars.get(objectId);
        setChatMessages(messages => [
            ...messages.slice(-30),
            {
                id: ++CHAT_MESSAGE_ID,
                objectId,
                name: avatar?.name ?? '',
                message,
                receivedAt: Date.now(),
            },
        ]);
    }, []);

    const onGenericError = useCallback((event: SnowWarGenericErrorEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        setErrorCode(parser.errorCode);
    }, []);

    const onUserRematched = useCallback((event: SnowWarUserRematchedEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        const userId = parser.userId;
        setRematchedUserIds(ids => (ids.includes(userId) ? ids : [...ids, userId]));
    }, []);

    const onGamesLeft = useCallback((event: SnowWarGamesLeftEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        setGamesLeft(parser.gamesLeft);
    }, []);

    const onGamesInformation = useCallback((event: SnowWarGamesInformationEvent) =>
    {
        const parser = event.getParser();
        if (!parser) return;
        setQueueInfo({ playersInQueue: parser.playersInQueue, gamesPlayed: parser.gamesPlayed, minPlayers: parser.minPlayers, canEdit: parser.canEdit });
    }, []);

    const applyLeaderboard = useCallback((event: Game2WeeklyLeaderboardEvent | Game2WeeklyFriendsLeaderboardEvent | WeeklyCompetitiveLeaderboardEvent | WeeklyCompetitiveFriendsLeaderboardEvent, weekly: boolean, friendsOnly: boolean) =>
    {
        const parser = event.getParser();
        if (!parser || parser.gameTypeId !== 0) return;
        setLeaderboard({
            isOpen: true,
            weekly,
            friendsOnly,
            loading: false,
            year: parser.year,
            week: parser.week,
            maxOffset: parser.maxOffset,
            currentOffset: parser.currentOffset,
            minutesUntilReset: parser.minutesUntilReset,
            totalListSize: parser.totalListSize,
            entries: parser.leaderboard.map(entry => ({
                userId: entry.userId,
                score: entry.score,
                rank: entry.rank,
                name: entry.name,
                figure: entry.figure,
                gender: entry.gender,
            })),
        });
    }, []);

    const onAllTimeLeaderboard = useCallback((event: Game2WeeklyLeaderboardEvent) =>
        applyLeaderboard(event, false, false), [applyLeaderboard]);
    const onAllTimeFriendsLeaderboard = useCallback((event: Game2WeeklyFriendsLeaderboardEvent) =>
        applyLeaderboard(event, false, true), [applyLeaderboard]);
    const onWeeklyLeaderboard = useCallback((event: WeeklyCompetitiveLeaderboardEvent) =>
        applyLeaderboard(event, true, false), [applyLeaderboard]);
    const onWeeklyFriendsLeaderboard = useCallback((event: WeeklyCompetitiveFriendsLeaderboardEvent) =>
        applyLeaderboard(event, true, true), [applyLeaderboard]);

    useMessageEvent<SnowWarQueuePositionEvent>(SnowWarQueuePositionEvent, onQueuePosition);
    useMessageEvent<SnowWarStartLobbyCounterEvent>(SnowWarStartLobbyCounterEvent, onStartLobbyCounter);
    useMessageEvent<SnowWarLobbyTeamsEvent>(SnowWarLobbyTeamsEvent, onLobbyTeams);
    useMessageEvent<SnowWarInitArenaEvent>(SnowWarInitArenaEvent, onInitArena);
    useMessageEvent<SnowWarLevelDataEvent>(SnowWarLevelDataEvent, onLevelData);
    useMessageEvent<SnowWarFullGameStatusEvent>(SnowWarFullGameStatusEvent, onFullGameStatus);
    useMessageEvent<SnowWarOnStageStartEvent>(SnowWarOnStageStartEvent, onStageStart);
    useMessageEvent<SnowWarGameStatusEvent>(SnowWarGameStatusEvent, onGameStatus);
    useMessageEvent<SnowWarOnStageRunningEvent>(SnowWarOnStageRunningEvent, onStageRunning);
    useMessageEvent<SnowWarOnStageEndingEvent>(SnowWarOnStageEndingEvent, onStageEnding);
    useMessageEvent<SnowWarOnGameEndingEvent>(SnowWarOnGameEndingEvent, onGameEnding);
    useMessageEvent<SnowWarGameEndedEvent>(SnowWarGameEndedEvent, onGameEnded);
    useMessageEvent<SnowWarRejoinPreviousRoomEvent>(SnowWarRejoinPreviousRoomEvent, onRejoinPreviousRoom);
    useMessageEvent<SnowWarPlayerExitedArenaEvent>(SnowWarPlayerExitedArenaEvent, onPlayerExitedArena);
    useMessageEvent<SnowWarUserChatEvent>(SnowWarUserChatEvent, onUserChat);
    useMessageEvent<SnowWarGenericErrorEvent>(SnowWarGenericErrorEvent, onGenericError);
    useMessageEvent<SnowWarUserRematchedEvent>(SnowWarUserRematchedEvent, onUserRematched);
    useMessageEvent<SnowWarGamesLeftEvent>(SnowWarGamesLeftEvent, onGamesLeft);
    useMessageEvent<SnowWarGamesInformationEvent>(SnowWarGamesInformationEvent, onGamesInformation);
    useMessageEvent<Game2WeeklyLeaderboardEvent>(Game2WeeklyLeaderboardEvent, onAllTimeLeaderboard);
    useMessageEvent<Game2WeeklyFriendsLeaderboardEvent>(Game2WeeklyFriendsLeaderboardEvent, onAllTimeFriendsLeaderboard);
    useMessageEvent<WeeklyCompetitiveLeaderboardEvent>(WeeklyCompetitiveLeaderboardEvent, onWeeklyLeaderboard);
    useMessageEvent<WeeklyCompetitiveFriendsLeaderboardEvent>(WeeklyCompetitiveFriendsLeaderboardEvent, onWeeklyFriendsLeaderboard);

    const requestLeaderboard = useCallback((weekly = true, friendsOnly = false, weekOffset = 0) =>
    {
        setLeaderboard(current => ({ ...current, isOpen: true, weekly, friendsOnly, loading: true }));
        const common = [ 0, -1, 0, 8, 50 ] as const;
        if (weekly)
        {
            SendMessageComposer(friendsOnly
                ? new SnowWarGetWeeklyFriendsLeaderboardComposer(0, weekOffset, -1, 0, 8, 50)
                : new SnowWarGetWeeklyLeaderboardComposer(0, weekOffset, -1, 0, 8, 50));
        }
        else
        {
            SendMessageComposer(friendsOnly
                ? new SnowWarGetAllTimeFriendsLeaderboardComposer(...common)
                : new SnowWarGetAllTimeLeaderboardComposer(...common));
        }
    }, []);

    const closeLeaderboard = useCallback(() =>
        setLeaderboard(current => ({ ...current, isOpen: false })), []);

    const joinQueue = useCallback(() => SendMessageComposer(new SnowWarJoinQueueComposer()), []);

    const selectArena = useCallback((arenaId: number) =>
        SendMessageComposer(new SnowWarSelectArenaComposer(arenaId)), []);

    const leaveQueue = useCallback(() =>
    {
        SendMessageComposer(new SnowWarLeaveQueueComposer());
        resetToIdle();
    }, [resetToIdle]);

    const startEditing = useCallback(() =>
    {
        // Server verifies acc_snowwar_arena_build and removes us from the running
        // game/queue; we keep the level snapshot and edit it in place.
        editingRef.current = true;
        setEditing(true);
        SendMessageComposer(new SnowWarEditRoomComposer());
    }, []);

    const saveArena = useCallback((
        mapId: number,
        items: { name: string; x: number; y: number; rotation: number; imageUrl: string; offsetZ: number; state: number }[],
        spawns: { x: number; y: number }[],
        heightmap: string[],
        arenaName: string) =>
    {
        SendMessageComposer(new SnowWarSaveEditorComposer(mapId, items, spawns, heightmap, arenaName));
    }, []);

    const stopEditing = useCallback(() =>
    {
        editingRef.current = false;
        setEditing(false);
        SendMessageComposer(new SnowWarExitEditorComposer());
        resetToIdle();
        const roomId = consumeSnowWarReturnRoom();
        if (roomId) TryVisitRoom(roomId);
    }, [resetToIdle]);

    const exitGame = useCallback(() =>
    {
        SendMessageComposer(new SnowWarExitGameComposer());
        resetToIdle();
    }, [resetToIdle]);

    const playAgain = useCallback(() => SendMessageComposer(new SnowWarPlayAgainComposer()), []);

    const walkTo = useCallback((worldX: number, worldY: number) =>
    {
        const send = (targetX: number, targetY: number) =>
        {
            const [turn, subturn] = getProtocolClock();
            SendMessageComposer(new SnowWarWalkComposer(targetX, targetY, turn, subturn));
            lastWalkSentAtRef.current = Date.now();
        };

        const elapsed = Date.now() - lastWalkSentAtRef.current;
        if (elapsed >= SUBTURN_MS && walkFlushTimerRef.current === null)
        {
            send(worldX, worldY);
            return;
        }

        // AIR can consume at most one new movement goal per subturn. Keep only
        // the latest clicked tile during that 50 ms window; queuing every click
        // just floods duplicate goals and can cause clients to replay excess
        // movement packets.
        queuedWalkRef.current = { worldX, worldY };
        if (walkFlushTimerRef.current !== null) return;

        walkFlushTimerRef.current = setTimeout(() =>
        {
            walkFlushTimerRef.current = null;
            const queued = queuedWalkRef.current;
            queuedWalkRef.current = null;
            if (queued) send(queued.worldX, queued.worldY);
        }, Math.max(0, SUBTURN_MS - elapsed));
    }, [getProtocolClock]);

    const throwAtLocation = useCallback((worldX: number, worldY: number, trajectory: number) =>
    {
        const [turn, subturn] = getProtocolClock();
        SendMessageComposer(new SnowWarThrowAtLocationComposer(worldX, worldY, trajectory, turn, subturn));
    }, [getProtocolClock]);

    const throwAtPlayer = useCallback((targetObjectId: number, trajectory: number) =>
    {
        const [turn, subturn] = getProtocolClock();
        SendMessageComposer(new SnowWarThrowAtPlayerComposer(targetObjectId, trajectory, turn, subturn));
    }, [getProtocolClock]);

    const createSnowball = useCallback(() =>
    {
        const [turn, subturn] = getProtocolClock();
        SendMessageComposer(new SnowWarCreateSnowballComposer(turn, subturn));
    }, [getProtocolClock]);

    const sendChat = useCallback((message: string) =>
    {
        const trimmed = message.trim();
        if (!trimmed.length) return;
        SendMessageComposer(new SnowWarGameChatComposer(trimmed.substring(0, 100)));
    }, []);

    const requestFullStatus = useCallback(() =>
        SendMessageComposer(new SnowWarRequestFullGameStatusComposer()), []);

    return {
        phase,
        queuePosition,
        queueSize,
        lobbySeconds,
        preparingSeconds,
        secondsLeft,
        levelData,
        lobbyTeams,
        results,
        chatMessages,
        rematchedUserIds,
        errorCode,
        gamesLeft,
        queueInfo,
        leaderboard,
        queueExpired,
        editing,
        simulation: SNOWWAR_SIMULATION,
        joinQueue,
        selectArena,
        leaveQueue,
        exitGame,
        startEditing,
        saveArena,
        stopEditing,
        playAgain,
        walkTo,
        throwAtLocation,
        throwAtPlayer,
        createSnowball,
        sendChat,
        requestFullStatus,
        requestLeaderboard,
        closeLeaderboard,
    };
};

export const useSnowWar = () => useSharedHook(useSnowWarState);

registerSharedHook(useSnowWarState);
