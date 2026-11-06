import { GetConfiguration } from '@octane/renderer';
import { getAccessToken } from '../auth';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { localizeWithFallback } from '../utils/localizeWithFallback';

/** The rules of a BattleBall game, chosen by its host. */
export interface IBattleBallRules {
    /** 1 Sky Peak, 2 Coral Beach, 3 Maze Park, 4 Gothic Hallway, 5 Barebones Classic (no power-ups). */
    arena: number;
    teams: number;
    perTeam: number;
    /** The power-ups allowed, 1 to 8. */
    powers: number[];
    bots: boolean;
    minutes: number;
}

export const BATTLEBALL_DEFAULT_RULES: IBattleBallRules = { arena: 1, teams: 2, perTeam: 3, powers: [ 1, 2, 3, 4, 5, 6, 7, 8 ], bots: true, minutes: 3 };

/** The power-ups, as the game numbers them (and orders their pictures). */
export const BATTLEBALL_POWERS = [ 1, 2, 3, 4, 5, 6, 7, 8 ];
/** The pictures' names of the power-ups 1 to 9 (9: the question mark). */
export const BATTLEBALL_POWER_SPRITES = [ '', 'lghtbulb', 'spring', 'flashlght', 'cannon', 'pinbox', 'harlequin', 'bomb', 'drill', 'qstnmark' ];
/** The teams' colours, as the original game paints the balls. */
export const BATTLEBALL_TEAM_COLOURS = [ '#E73929', '#217BEF', '#FFCE21', '#8CE700' ];

export type BattleBallPlayerState = 'normal' | 'stunned' | 'high_jumps' | 'cleaning_tiles' | 'colouring_for_opponent' | 'flying' | 'ball_broken';

export interface IBattleBallPlayer {
    userId: number;
    name: string;
    figure: string;
    gender: string;
    bot: boolean;
    you: boolean;
    team: number;
    x: number;
    y: number;
    dir: number;
    moving: boolean;
    state: BattleBallPlayerState;
    stateLeft: number;
    paintsFor: number;
    held: number;
    heldLeft: number;
    score: number;
}

export interface IBattleBallEvent {
    seq: number;
    ago: number;
    type: string;
    userId: number;
    a: number;
    b: number;
    c: number;
    d: number;
}

export interface IBattleBallSummary {
    id: number;
    host: string;
    players: number;
    maxPlayers: number;
    teams: number[];
    state: 'waiting' | 'countdown' | 'playing' | 'finished';
    rules: IBattleBallRules;
}

export interface IBattleBallGame extends Omit<IBattleBallSummary, 'players'> {
    hostId: number;
    youAreHost: boolean;
    width: number;
    height: number;
    /** A character a tile, row by row: '-' no game tile, '0' grey, 'a' + team * 4 + state - 1. */
    tiles: string;
    timeLeft: number;
    serverTime: number;
    scores: number[];
    winners: number[];
    players: IBattleBallPlayer[];
    powerUps: { id: number; type: number; x: number; y: number }[];
    pins: { id: number; x: number; y: number }[];
    log: IBattleBallEvent[];
}

export interface IBattleBallView {
    enabled: boolean;
    userId: number;
    game?: IBattleBallGame;
    games: IBattleBallSummary[];
}

export class BattleBallApiError extends Error {
    constructor(public readonly code: string) {
        super(code);
    }
}

const baseUrl = (): string => {
    const template = GetConfigurationValue<string>('battleball.endpoint', '${api.url}/api/battleball');

    try {
        return GetConfiguration().interpolate(template).replace(/\/+$/, '');
    } catch {
        return template.replace(/\/+$/, '');
    }
};

const request = async (path: string, body?: unknown): Promise<IBattleBallView> => {
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'OctaneBattleBall' };
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

    if (!response.ok) throw new BattleBallApiError(String(json?.code ?? 'http_error'));

    return json as unknown as IBattleBallView;
};

export const BattleBallApi = {
    view: () => request(''),
    create: (rules: IBattleBallRules, team = -1) => request('/create', { rules, team }),
    join: (gameId: number, team = -1) => request('/join', { gameId, team }),
    leave: () => request('/leave', {}),
    team: (team: number) => request('/team', { team }),
    setRules: (rules: IBattleBallRules) => request('/rules', { rules }),
    addBot: (team = -1) => request('/bot', { team }),
    fillBots: () => request('/bots', {}),
    removeBot: () => request('/bot/remove', {}),
    start: () => request('/start', {}),
    walk: (x: number, y: number) => request('/walk', { x, y }),
    power: () => request('/power', {})
};

/** A text of the game, `battleball.<key>`, with its fallback. */
export const bbt = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`battleball.${key}`, fallback, parameters, replacements);

const ARENA_NAMES = [ '', 'Sky Peak', 'Coral Beach', 'Maze Park', 'Gothic Hallway', 'Barebones Classic' ];
const TEAM_NAMES = [ 'Red team', 'Blue team', 'Yellow team', 'Green team' ];
const POWER_NAMES = [ '', 'Light bulb', 'Spring', 'Flashlight', 'Cannon', 'Box of pins', 'Harlequin', 'Bomb', 'Vacuum cleaner', 'Question mark' ];
const POWER_TEXTS = [
    '',
    'The light bulb colours an area around you.',
    'Bouncing on a spring locks tiles in a single jump (10 seconds).',
    'The flashlight colours a straight line ahead of you.',
    'A shot with the cannon locks the tiles of a straight line and knocks over whoever is in the way.',
    'Bouncing on a box of pins bursts your Battle Ball: drop it in front of your opponents.',
    'The harlequin makes everybody colour tiles for your team (10 seconds).',
    'The bomb clears the tiles around you and stuns everybody close, you too.',
    'With the vacuum cleaner, every tile you bounce on goes back to grey (10 seconds).',
    'A surprise: one of the other power-ups.'
];

export const battleBallArenaName = (arena: number): string => bbt(`arena.${arena}`, ARENA_NAMES[arena] ?? '');
export const battleBallTeamName = (team: number): string => bbt(`team.${team}`, TEAM_NAMES[team] ?? '');
export const battleBallPowerName = (power: number): string => bbt(`power.${power}`, POWER_NAMES[power] ?? '');
export const battleBallPowerText = (power: number): string => bbt(`power.${power}.text`, POWER_TEXTS[power] ?? '');

const ERRORS: Record<string, string> = {
    disabled: 'BattleBall is closed for now.',
    offline: 'You need to be in the hotel to play.',
    no_table: 'This game does not exist any more.',
    table_full: 'This game is full.',
    team_full: 'This team is full.',
    already_started: 'The game has already started.',
    too_many_games: 'Too many games are open: join one of them.',
    not_host: 'Only the host can do that.',
    not_enough_teams: 'To start a game, there must be at least two teams of one player each!',
    team_sizes: 'Team sizes can only differ by one player.',
    no_bots: 'Robots are not allowed in this game.',
    no_bot: 'There is no robot to remove.',
    no_arena: 'This arena does not exist.'
};

/** The text of a refused action; null for the refusals of the game itself (no power-up, stunned...), which stay silent. */
export const battleBallErrorText = (error: unknown): string | null => {
    const code = error instanceof BattleBallApiError ? error.code : 'http_error';

    if ([ 'no_power', 'stunned', 'bad_tile', 'not_playing' ].includes(code)) return null;

    return bbt(`error.${code}`, ERRORS[code] ?? 'Something went wrong, try again.');
};
