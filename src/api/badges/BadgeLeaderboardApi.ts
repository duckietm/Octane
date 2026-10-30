import { GetConfiguration, GetSessionDataManager } from '@octane/renderer';
import { getAccessToken } from '../auth';

export type BadgeRarityKey = 'common' | 'rare' | 'epic' | 'legendary' | 'mythical' | 'unique';

export interface BadgeLeaderboardStat {
    badgeCode: string;
    ownerCount: number;
    rarity: BadgeRarityKey;
}

export interface BadgeLeaderboardEntry {
    userId: number;
    username: string;
    figure: string;
    score: number;
    rank: number;
}

export interface BadgeLeaderboardBoard {
    entries: BadgeLeaderboardEntry[];
    totalPlayers: number;
    viewerEntry?: Partial<BadgeLeaderboardEntry>;
}

export interface BadgeLeaderboardResponse {
    viewerUserId: number;
    badgeStats: BadgeLeaderboardStat[];
    thresholds: {
        commonMinOwners: number;
        rareMinOwners: number;
        epicMinOwners: number;
        legendaryMinOwners: number;
        mythicalMinOwners: number;
        uniqueOwners: number;
    };
    leaderboards: {
        totalBadges: BadgeLeaderboardBoard;
        achievementLevel: BadgeLeaderboardBoard;
        rarity: Record<BadgeRarityKey, BadgeLeaderboardBoard>;
    };
}

const interpolate = (value: string): string => {
    try {
        return GetConfiguration().interpolate(value);
    } catch {
        return value;
    }
};

const getUrl = (): string => {
    const configured = GetConfiguration().getValue<string>('badges.leaderboard.endpoint', '/api/badges/leaderboard');

    return interpolate(configured);
};

const authHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'OctaneBadgeLeaderboard'
    };

    const token = getAccessToken();

    if (token) headers.Authorization = `Bearer ${token}`;

    return headers;
};

const parseJson = async <T>(response: Response): Promise<T> => {
    const text = await response.text();

    if (!text) return {} as T;

    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error('Invalid response from badge leaderboard endpoint.');
    }
};

const throwOnError = async (response: Response): Promise<void> => {
    if (response.ok) return;

    const payload = await parseJson<{ error?: string }>(response);
    const message = payload?.error || `Request failed (${response.status}).`;
    const error = new Error(message) as Error & { status?: number };

    error.status = response.status;

    throw error;
};

let cachePromise: Promise<BadgeLeaderboardResponse> = null;
let cacheValue: BadgeLeaderboardResponse = null;
// The user the cache was loaded for: the reply carries that viewer's own rank, and a second account logged in
// without a reload was shown the first one's.
let cacheViewer: number | null = null;

const currentViewer = (): number | null => {
    try {
        return GetSessionDataManager()?.userId ?? null;
    } catch {
        return null;
    }
};

const buildStatsMap = (response: BadgeLeaderboardResponse | null): Map<string, BadgeLeaderboardStat> => {
    const map = new Map<string, BadgeLeaderboardStat>();

    if (!response?.badgeStats?.length) return map;

    for (const stat of response.badgeStats) {
        if (!stat?.badgeCode) continue;

        map.set(stat.badgeCode, stat);
    }

    return map;
};

let cacheStatsMap: Map<string, BadgeLeaderboardStat> = new Map();

// A failed load is not retried by passive views (infostand, profile) for this long.
const FAILED_RETRY_DELAY_MS = 30_000;
let lastFailureAt = 0;

export const fetchBadgeLeaderboard = async (force = false): Promise<BadgeLeaderboardResponse> => {
    const viewer = currentViewer();

    if (viewer !== cacheViewer) resetBadgeLeaderboardCache();

    if (!force) {
        if (cacheValue) return cacheValue;
        if (cachePromise) return cachePromise;
    }

    cacheViewer = viewer;

    const request = (async () => {
        const response = await fetch(getUrl(), {
            method: 'GET',
            credentials: 'include',
            headers: authHeaders()
        });

        await throwOnError(response);

        const payload = await parseJson<BadgeLeaderboardResponse>(response);

        // A reply for a viewer that is no longer the one logged in is not kept.
        if (cacheViewer === viewer) {
            cacheValue = payload;
            cacheStatsMap = buildStatsMap(payload);
        }

        return payload;
    })();

    cachePromise = request;

    try {
        return await request;
    } catch (error) {
        lastFailureAt = Date.now();

        throw error;
    } finally {
        // A newer (forced) request may have replaced this one meanwhile: only this request's own promise is dropped.
        if (cachePromise === request) cachePromise = null;
    }
};

/** Forgets the loaded leaderboard and any request in flight (another account, or a logout). */
export const resetBadgeLeaderboardCache = (): void => {
    cachePromise = null;
    cacheValue = null;
    cacheViewer = null;
    cacheStatsMap = new Map();
    lastFailureAt = 0;
};

export const getCachedBadgeLeaderboard = (): BadgeLeaderboardResponse => {
    return cacheValue;
};

export const getCachedBadgeRarityStat = (badgeCode: string): BadgeLeaderboardStat => {
    if (!badgeCode) return null;

    return cacheStatsMap.get(badgeCode) || null;
};

export const ensureBadgeLeaderboardLoaded = async (): Promise<BadgeLeaderboardResponse> => {
    if (!cacheValue && !cachePromise && lastFailureAt && Date.now() - lastFailureAt < FAILED_RETRY_DELAY_MS) {
        throw new Error('badge_leaderboard_unavailable');
    }

    return fetchBadgeLeaderboard(false);
};
