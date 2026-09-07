import { GetConfiguration } from '@octane/renderer';
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

export const fetchBadgeLeaderboard = async (force = false): Promise<BadgeLeaderboardResponse> => {
    if (!force) {
        if (cacheValue) return cacheValue;
        if (cachePromise) return cachePromise;
    }

    cachePromise = (async () => {
        const response = await fetch(getUrl(), {
            method: 'GET',
            credentials: 'include',
            headers: authHeaders()
        });

        await throwOnError(response);

        const payload = await parseJson<BadgeLeaderboardResponse>(response);

        cacheValue = payload;
        cacheStatsMap = buildStatsMap(payload);

        return payload;
    })();

    try {
        return await cachePromise;
    } finally {
        cachePromise = null;
    }
};

export const getCachedBadgeLeaderboard = (): BadgeLeaderboardResponse => {
    return cacheValue;
};

export const getCachedBadgeRarityStat = (badgeCode: string): BadgeLeaderboardStat => {
    if (!badgeCode) return null;

    return cacheStatsMap.get(badgeCode) || null;
};

export const ensureBadgeLeaderboardLoaded = async (): Promise<BadgeLeaderboardResponse> => {
    return fetchBadgeLeaderboard(false);
};
