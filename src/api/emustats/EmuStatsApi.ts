import { GetConfiguration } from '@octane/renderer';
import { getAccessToken } from '../auth';

export interface EmuStatsOverview {
    uptimeSeconds: number;
    lastRefreshEpochMs: number;
    guiStatus: string;
    memoryUsedMb: number;
    memoryMaxMb: number;
    memoryAllocatedMb: number;
    memoryUsagePercent: number;
    cpuLoadPercent: number;
    activeOsThreads: number;
    connectedPlayers: number;
    loadedRooms: number;
    wiredTickables: number;
    peakPlayers: number;
    activeWebSocketSessions: number;
    peakWebSocketSessions: number;
    averageRoomCycleMs: number;
    worstRoomCycleMs: number;
    worstRoomCycleRoomId: number;
    worstRoomCycleRoomName: string;
    delayedEventsPending: number;
    overloadedWiredRooms: number;
    heavyWiredRooms: number;
    wiredActivityPerSecond: number;
}

export interface EmuStatsMemoryPoint {
    timestamp: number;
    usedMb: number;
    maxMb: number;
    usagePercent: number;
}

export interface EmuStatsUserRow {
    id: number;
    username: string;
    rank: string;
    credits: number;
    roomId: number;
}

export interface EmuStatsRoomRow {
    roomId: number;
    name: string;
    players: number;
    items: number;
    tickables: number;
    cpuMs: number;
    estimatedRamKb: number;
    thread: string;
}

export interface EmuStatsWiredRow {
    roomId: number;
    averageTickMs: number;
    peakTickMs: number;
    usagePercent: number;
    delayedEventsPending: number;
    overloaded: boolean;
    heavy: boolean;
}

export interface EmuStatsWiredTopRoomRow {
    roomId: number;
    name: string;
    usagePercent: number;
    averageTickMs: number;
    peakTickMs: number;
    delayedEventsPending: number;
    activityPerSecond: number;
    heavy: boolean;
}

export interface EmuStatsDatabasePool {
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
    waitingThreads: number;
    maxConnections: number;
}

export interface EmuStatsScheduler {
    queuedTasks: number;
    activeThreads: number;
    poolSize: number;
    completedTasks: number;
    running: boolean;
}

export interface EmuStatsNetwork {
    incomingPacketsPerSecond: number;
    outgoingPacketsPerSecond: number;
    incomingKilobytesPerSecond: number;
    outgoingKilobytesPerSecond: number;
    totalIncomingPackets: number;
    totalOutgoingPackets: number;
}

export interface EmuStatsGarbageCollector {
    totalCollections: number;
    totalCollectionTimeMs: number;
    collectionsSinceLastSample: number;
    lastObservedPauseMs: number;
    sampledAtEpochMs: number;
}

export interface EmuStatsSnapshot {
    overview: EmuStatsOverview;
    memoryHistory: EmuStatsMemoryPoint[];
    users: EmuStatsUserRow[];
    rooms: EmuStatsRoomRow[];
    wired: EmuStatsWiredRow[];
    wiredTopRooms: EmuStatsWiredTopRoomRow[];
    databasePool: EmuStatsDatabasePool;
    scheduler: EmuStatsScheduler;
    network: EmuStatsNetwork;
    garbageCollector: EmuStatsGarbageCollector;
}

const interpolate = (value: string): string => {
    try {
        return GetConfiguration().interpolate(value);
    } catch {
        return value;
    }
};

const getUrl = (): string => {
    const configured = GetConfiguration().getValue<string>('emustats.endpoint', '${api.url}/api/emustats');

    return interpolate(configured);
};

const buildHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'OctaneEmuStats'
    };

    const token = getAccessToken();

    if (token) headers.Authorization = `Bearer ${token}`;

    return headers;
};

let cacheValue: EmuStatsSnapshot = null;

const parseJson = async <T>(response: Response): Promise<T> => {
    const text = await response.text();

    if (!text) return {} as T;

    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error('Invalid emulator stats response.');
    }
};

export const fetchEmuStats = async (force = false): Promise<EmuStatsSnapshot> => {
    if (!force && cacheValue) return cacheValue;

    const response = await fetch(getUrl(), {
        method: 'GET',
        credentials: 'include',
        headers: buildHeaders()
    });

    const payload = await parseJson<EmuStatsSnapshot & { error?: string }>(response);

    if (!response.ok) {
        throw new Error(payload?.error || `Request failed (${response.status}).`);
    }

    cacheValue = payload;

    return payload;
};

export const getCachedEmuStats = (): EmuStatsSnapshot => {
    return cacheValue;
};
