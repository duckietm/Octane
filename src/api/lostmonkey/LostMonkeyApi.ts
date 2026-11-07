import { GetConfiguration } from '@octane/renderer';
import { getAccessToken } from '../auth';
import { gamesLeftErrorText } from '../gamecenter/GameCenterApi';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { localizeWithFallback } from '../utils/localizeWithFallback';

/** The player's Lost Monkey island (`/api/lostmonkey`). */
export interface ILostMonkeyIsland {
    hunger: number;
    energy: number;
    hygiene: number;
    fun: number;
    bananas: number;
    coins: number;
    /** The parts of the rocket built, 0 to `rocketReady`. */
    rocket: number;
    rocketReady: number;
    parts: number[];
    launches: number;
    colour: number;
    /** The monkey's name, chosen with its colour on the first visit (`created`). */
    name: string;
    created: boolean;
    asleep: boolean;
    /** The bunches on each banana tree (0 to 3), and when the next grows (ms). */
    trees: number[];
    nextBunch: number[];
    bananaPrice: number;
    /** 0 (happy) to 4 (miserable). */
    mood: number;
    tvIn: number;
    gamesLeft: number;
    coinsToday: number;
    dailyCoins: number;
    /** After a game: the coins it gave. */
    coinsWon?: number;
}

export type LostMonkeyAction = 'create' | 'colour' | 'harvest' | 'feed' | 'wash' | 'tv' | 'sleep' | 'wake' | 'bananas' | 'build' | 'launch' | 'play' | 'score';

export class LostMonkeyApiError extends Error {
    constructor(public readonly code: string) {
        super(code);
    }
}

const baseUrl = (): string => {
    const template = GetConfigurationValue<string>('lostmonkey.endpoint', '${api.url}/api/lostmonkey');

    try {
        return GetConfiguration().interpolate(template).replace(/\/+$/, '');
    } catch {
        return template.replace(/\/+$/, '');
    }
};

const request = async (path: string, body?: unknown): Promise<ILostMonkeyIsland> => {
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'OctaneLostMonkey' };
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

    if (!response.ok) throw new LostMonkeyApiError(String(json?.code ?? 'http_error'));

    return json as unknown as ILostMonkeyIsland;
};

export const LostMonkeyApi = {
    island: () => request(''),
    act: (action: LostMonkeyAction, body: Record<string, unknown> = {}) => request(`/${ action }`, body)
};

/** A text of Lost Monkey, `lostmonkey.<key>`. */
export const lmt = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`lostmonkey.${ key }`, fallback, parameters, replacements);

const ERRORS: Record<string, string> = {
    asleep: 'Shh... your monkey is asleep. Wake him up first!',
    no_bananas: 'No banana left: pick some from the trees, or buy some at the machine.',
    not_hungry: 'Your monkey is not hungry.',
    too_soon: 'The TV is warming up, try again in a moment.',
    no_coins: 'Not enough coins: play the island\'s games to win some!',
    rocket_ready: 'The rocket is ready: launch it!',
    rocket_not_ready: 'The rocket is not finished.',
    too_tired: 'Your monkey is too tired to play: let him sleep in the hammock.',
    disabled: 'Lost Monkey is closed for now.',
    bad_name: 'Your monkey\'s name: 2 to 16 letters or numbers (spaces, - _ and \' allowed).',
    not_created: 'Choose your monkey first!'
};

export const lostMonkeyErrorText = (caught: unknown): string => {
    const code = caught instanceof LostMonkeyApiError ? caught.code : 'http_error';

    return gamesLeftErrorText(code) ?? lmt(`error.${ code }`, ERRORS[code] ?? 'Something went wrong, try again.');
};
