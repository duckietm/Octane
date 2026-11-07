import { GetConfiguration } from '@octane/renderer';
import { getAccessToken } from '../auth';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { localizeWithFallback } from '../utils/localizeWithFallback';

/** A game of the Game Center (SnowStorm keeps its own counters): its players now and the player's games left. */
export interface IGameCenterGame {
    id: string;
    playing: number;
    /** -1: unlimited (the Habbo Club, or no limit set). */
    gamesLeft: number;
    /** The player's free games a day (with the Habbo Club's extra ones when a member). */
    freePerDay: number;
    /** The free games a day for everybody, and the Habbo Club's extra ones (set in the Moderation). */
    freeDaily: number;
    hcExtra: number;
    /** The packs of games to buy. */
    offers: IGameCenterOffer[];
}

export interface IGameCenterOffer {
    id: number;
    games: number;
    price: number;
    /** -1: credits, else the activity points' type (0 duckets, 5 diamonds...). */
    currency: number;
}

export interface IGameCenterOverview {
    club: boolean;
    /** SnowStorm's players now. */
    snowwar: number;
    games: IGameCenterGame[];
}

export type GameLeaderboardScope = 'everyone' | 'friends' | 'groups';

export interface IGameLeaderboardEntry {
    id: number;
    rank: number;
    name: string;
    figure: string;
    /** "g" for a group (figure: its badge). */
    gender: string;
    score: number;
}

export interface IGameLeaderboard {
    game: string;
    weekly: boolean;
    scope: GameLeaderboardScope;
    weekOffset: number;
    maxOffset: number;
    year: number;
    week: number;
    minutesUntilReset: number;
    favouriteGroupId: number;
    entries: IGameLeaderboardEntry[];
}

/** The Moderation's Games page (`acc_hk_games`). */
export type GameRewardKind = 'play' | 'win' | 'week';
export type GameRewardType = 'furni' | 'clothing' | 'badge' | 'currency';

export interface IGameAdminOffer {
    games: number;
    price: number;
    currency: number;
}

export interface IGameAdminReward {
    kind: GameRewardKind;
    rankFrom: number;
    rankTo: number;
    type: GameRewardType;
    /** The furniture's or the clothes' id, the badge's code, or the currency's type (-1 credits). */
    value: string;
    amount: number;
    label?: string;
}

export interface IGameAdminGame {
    id: string;
    /** -1: unlimited. */
    freeDaily: number;
    hcExtra: number;
    offers: IGameAdminOffer[];
    rewards: IGameAdminReward[];
}

export interface IGameAdminView {
    games: IGameAdminGame[];
    currencies: { id: number; name: string }[];
}

export interface IGameAdminFound {
    id: number;
    name: string;
    detail: string;
}

export class GameCenterApiError extends Error {
    constructor(public readonly code: string) {
        super(code);
    }
}

const baseUrl = (): string => {
    const template = GetConfigurationValue<string>('gamecenter.endpoint', '${api.url}/api/gamecenter');

    try {
        return GetConfiguration().interpolate(template).replace(/\/+$/, '');
    } catch {
        return template.replace(/\/+$/, '');
    }
};

const request = async <T>(path: string, body?: unknown): Promise<T> => {
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'OctaneGameCenter' };
    const token = getAccessToken();

    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${ token }`;

    const response = await fetch(`${ baseUrl() }${ path }`, { method: body === undefined ? 'GET' : 'POST', credentials: 'include', headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    let json: Record<string, unknown> = {};

    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        json = {};
    }

    if (!response.ok) throw new GameCenterApiError(String(json?.code ?? 'http_error'));

    return json as unknown as T;
};

export const GameCenterApi = {
    overview: () => request<IGameCenterOverview>(''),
    buy: (game: string, offerId: number) => request<IGameCenterOverview>('/buy', { game, offerId }),
    leaderboard: (game: string, weekly: boolean, scope: GameLeaderboardScope, week: number) =>
        request<IGameLeaderboard>(`/leaderboard?game=${ encodeURIComponent(game) }&weekly=${ weekly ? 1 : 0 }&scope=${ scope }&week=${ week }`),
    admin: () => request<IGameAdminView>('/admin'),
    adminLookup: (type: 'furni' | 'clothing', query: string) =>
        request<{ found: IGameAdminFound[] }>(`/admin/lookup?type=${ type }&q=${ encodeURIComponent(query) }`),
    adminSave: (game: IGameAdminGame) => request<IGameAdminView>('/admin/save', { game: game.id, freeDaily: game.freeDaily, hcExtra: game.hcExtra, offers: game.offers, rewards: game.rewards })
};

/** A text of the Game Center, `gamecenter.<key>`. */
export const gct = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`gamecenter.${ key }`, fallback, parameters, replacements);

/** The text of a refusal that means "no game left today", whatever the game; null otherwise. */
export const gamesLeftErrorText = (code: string): string | null =>
    code === 'no_games_left'
        ? gct('error.no_games_left', 'No game left today for this game (for you or another player). More games can be bought in the games list, and the Habbo Club gives more each day.')
        : null;
