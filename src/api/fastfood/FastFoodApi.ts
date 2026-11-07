import { GetConfiguration } from '@octane/renderer';
import { gamesLeftErrorText } from '../gamecenter/GameCenterApi';
import { getAccessToken } from '../auth';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { localizeWithFallback } from '../utils/localizeWithFallback';

/** The rules of a Fast Food game, chosen by its host. */
export interface IFastFoodRules {
    /** The tables (players): 2 or 3. */
    tables: number;
    /** The plates to serve to win: 3 to 6. */
    plates: number;
    bots: boolean;
    powers: boolean;
}

export const FASTFOOD_DEFAULT_RULES: IFastFoodRules = { tables: 3, plates: 6, bots: true, powers: true };

/** The power-ups: 1 the missile, 2 the shield, 3 the big parachute. */
export const FASTFOOD_MISSILE = 1;
export const FASTFOOD_SHIELD = 2;
export const FASTFOOD_BIG_PARACHUTE = 3;

export type FastFoodPhase = 'hanging' | 'falling' | 'chute' | 'broken' | 'landed' | 'crashed';

export interface IFastFoodPlate {
    id: number;
    /** An index of physics.foods. */
    food: number;
    phase: FastFoodPhase;
    /** Its height, from 1 (up high) to 0 (the table), and its speed (heights a second). */
    y: number;
    v: number;
    /** How long ago the server had the plate at y, v. */
    ago: number;
    /** How long ago it was dropped (-1: not yet). */
    elapsed: number;
    big: boolean;
    shield: boolean;
    falseStart: boolean;
    /** On the table, the landing not decided yet. */
    touched: boolean;
    speed: number;
    readyIn: number;
    endedAgo: number;
}

export interface IFastFoodPlayer {
    userId: number;
    name: string;
    figure: string;
    gender: string;
    bot: boolean;
    you: boolean;
    seat: number;
    stars: number;
    held: number;
    plate?: IFastFoodPlate;
}

export interface IFastFoodEvent {
    seq: number;
    ago: number;
    type: string;
    userId: number;
    a: number;
    b: number;
    c: number;
}

export interface IFastFoodSummary {
    id: number;
    host: string;
    players: number;
    maxPlayers: number;
    state: 'waiting' | 'countdown' | 'playing' | 'finished';
    rules: IFastFoodRules;
}

export interface IFastFoodGame extends Omit<IFastFoodSummary, 'players'> {
    hostId: number;
    youAreHost: boolean;
    timeLeft: number;
    serverTime: number;
    winners: number[];
    players: IFastFoodPlayer[];
    missiles: { from: number; to: number; hitIn: number }[];
    log: IFastFoodEvent[];
}

export interface IFastFoodFood {
    name: string;
    gravity: number;
    brake: number;
    terminal: number;
}

export interface IFastFoodPhysics {
    foods: IFastFoodFood[];
    safeSpeed: number;
    bigBrake: number;
    bigTerminal: number;
    stepMs: number;
    plateTimerMs: number;
    falseStartPenaltyMs: number;
}

export interface IFastFoodView {
    enabled: boolean;
    userId: number;
    physics: IFastFoodPhysics;
    game?: IFastFoodGame;
    games: IFastFoodSummary[];
}

export class FastFoodApiError extends Error {
    constructor(public readonly code: string) {
        super(code);
    }
}

const baseUrl = (): string => {
    const template = GetConfigurationValue<string>('fastfood.endpoint', '${api.url}/api/fastfood');

    try {
        return GetConfiguration().interpolate(template).replace(/\/+$/, '');
    } catch {
        return template.replace(/\/+$/, '');
    }
};

const request = async (path: string, body?: unknown): Promise<IFastFoodView> => {
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'OctaneFastFood' };
    const token = getAccessToken();

    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${baseUrl()}${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'include', headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    let json: Record<string, unknown> = {};

    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        json = {};
    }

    if (!response.ok) throw new FastFoodApiError(String(json?.code ?? 'http_error'));

    return json as unknown as IFastFoodView;
};

export const FastFoodApi = {
    view: () => request(''),
    create: (rules: IFastFoodRules) => request('/create', { rules }),
    join: (gameId: number) => request('/join', { gameId }),
    leave: () => request('/leave', {}),
    setRules: (rules: IFastFoodRules) => request('/rules', { rules }),
    addBot: () => request('/bot', {}),
    removeBot: () => request('/bot/remove', {}),
    start: () => request('/start', {}),
    drop: () => request('/drop', {}),
    /** Opens the parachute when the player saw it: this long after the drop, as their screen counted. */
    chute: (elapsed: number) => request('/chute', { elapsed: Math.max(0, Math.round(elapsed)) }),
    power: () => request('/power', {})
};

/**
 * Moves a plate on as the game does (steps of physics.stepMs: speed += acceleration, a parachute never slower than
 * its terminal speed, height -= speed) from y, v for `ms`; chute: under its parachute; big: the big parachute.
 */
export const fastFoodFly = (physics: IFastFoodPhysics, food: number, y: number, v: number, ms: number, chute: boolean, big: boolean): { y: number; v: number } => {
    const kind = physics.foods[food] ?? physics.foods[0];
    const dt = physics.stepMs / 1000;
    let steps = Math.max(0, Math.floor(ms / physics.stepMs));

    while (steps-- > 0 && y > 0) {
        if (chute) {
            v -= kind.brake * (big ? physics.bigBrake : 1) * dt;
            v = Math.max(v, big ? physics.bigTerminal : kind.terminal);
        } else {
            v += kind.gravity * dt;
        }

        y -= v * dt;
    }

    return { y: Math.max(0, y), v };
};

/** A text of the game, `fastfood.<key>`, with its fallback. */
export const fft = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`fastfood.${key}`, fallback, parameters, replacements);

const ERRORS: Record<string, string> = {
    disabled: 'Fast Food is closed for now.',
    offline: 'You need to be in the hotel to play.',
    no_table: 'This game does not exist any more.',
    table_full: 'This game is full.',
    already_started: 'The game has already started.',
    too_many_games: 'Too many games are open: join one of them.',
    not_host: 'Only the host can do that.',
    not_enough_players: 'Two players at least to start: invite a friend or add a robot.',
    no_bots: 'Robots are not allowed in this game.',
    no_bot: 'There is no robot to remove.',
    no_target: 'No plate in the air to aim at.'
};

/** A refused action's text (`fastfood.error.<code>`); null for the game's own refusals, which stay silent. */
export const fastFoodErrorText = (caught: unknown): string | null => {
    const code = caught instanceof FastFoodApiError ? caught.code : 'http_error';
    const limit = gamesLeftErrorText(code);

    if (limit) return limit;

    if ([ 'not_ready', 'no_plate', 'too_late', 'chute_broken', 'no_power', 'not_started' ].includes(code)) return null;

    return fft(`error.${code}`, ERRORS[code] ?? 'Something went wrong, try again.');
};

const POWER_NAMES = [ '', 'Missile', 'Shield', 'Big parachute' ];
const POWER_TEXTS = [
    '',
    'Fires at the player in the lead: it bursts the parachute of their plate, which falls to bits unless it is very close to the table.',
    'Protects your plate from one missile, until it is served.',
    'Your next parachute brakes ten times harder: open it at the very last moment!'
];

export const fastFoodPowerName = (power: number): string => fft(`power.${power}`, POWER_NAMES[power] ?? '');
export const fastFoodPowerText = (power: number): string => fft(`power.${power}.text`, POWER_TEXTS[power] ?? '');
