import { GetConfiguration } from '@octane/renderer';
import { getAccessToken } from '../auth';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { localizeWithFallback } from '../utils/localizeWithFallback';

/** The games of the game hall, in the order of its tabs. */
export const HALL_GAMES = [ 'tictactoe', 'connect4', 'battleships', 'chess', 'poker' ] as const;

export type HallTabName = typeof HALL_GAMES[number];

/**
 * Every game the server's tables run: the game hall's, and the games that have their own world (the snail race, the
 * quiz, Tetris) but share the tables (`/api/hall`).
 */
export type HallGameName = HallTabName | 'snails' | 'quiz' | 'tetris' | 'diving';

/** The seats a table of each game may have (from, to). */
export const HALL_SEATS: Record<HallGameName, [number, number]> = { tictactoe: [ 2, 2 ], connect4: [ 2, 2 ], battleships: [ 2, 2 ], chess: [ 2, 2 ], poker: [ 2, 4 ], snails: [ 2, 6 ], quiz: [ 2, 8 ], tetris: [ 2, 4 ], diving: [ 2, 8 ] };

export interface IHallPlayer {
    userId: number;
    name: string;
    figure: string;
    gender: string;
    bot: boolean;
    wins: number;
    gone: boolean;
    /** Their move is awaited. */
    waiting: boolean;
    /** The time left to play (ms), -1 if not counted. */
    timeLeft: number;
}

export interface IHallSummary {
    id: number;
    game: HallGameName;
    host: string;
    players: number;
    size: number;
    bots: boolean;
    state: 'waiting' | 'playing' | 'finished';
}

/** What a game shows: each game adds its own fields (board, seas, hands...). */
export interface IHallBoard {
    /** The seat to play (-1: everybody, or nobody). */
    turn: number;
    moves?: number;
    [key: string]: unknown;
}

export interface IHallTable extends Omit<IHallSummary, 'players'> {
    hostId: number;
    youAreHost: boolean;
    /** The player's seat (-1: not at the table). */
    you: number;
    round: number;
    /** What ended the last game besides the rules: `left:<name>`, `timeout:<name>`. */
    note: string;
    turnMs: number;
    players: IHallPlayer[];
    board?: IHallBoard;
    winners?: number[];
}

export interface IHallView {
    enabled: boolean;
    userId: number;
    table?: IHallTable;
    tables: IHallSummary[];
}

export class HallApiError extends Error {
    constructor(public readonly code: string) {
        super(code);
    }
}

const baseUrl = (): string => {
    const template = GetConfigurationValue<string>('hall.endpoint', '${api.url}/api/hall');

    try {
        return GetConfiguration().interpolate(template).replace(/\/+$/, '');
    } catch {
        return template.replace(/\/+$/, '');
    }
};

const request = async (path: string, body?: unknown): Promise<IHallView> => {
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'OctaneHall' };
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

    if (!response.ok) throw new HallApiError(String(json?.code ?? 'http_error'));

    return json as unknown as IHallView;
};

export const HallApi = {
    view: (game: string) => request(`?game=${encodeURIComponent(game)}`),
    create: (game: string, size: number, bots: boolean) => request('/create', { game, size, bots }),
    join: (tableId: number, game: string) => request('/join', { tableId, game }),
    leave: (game: string) => request('/leave', { game }),
    options: (game: string, size: number, bots: boolean) => request('/options', { game, size, bots }),
    addBot: (game: string) => request('/bot', { game }),
    removeBot: (game: string) => request('/bot/remove', { game }),
    start: (game: string) => request('/start', { game }),
    move: (game: string, move: Record<string, unknown>) => request('/move', { game, move })
};

/** A text of the game hall, `hall.<key>`, with its fallback. */
export const hallt = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`hall.${key}`, fallback, parameters, replacements);

const GAME_NAMES: Record<HallGameName, string> = { tictactoe: 'Tic-tac-toe', connect4: 'Four in a row', battleships: 'Battleships', chess: 'Chess', poker: 'Poker', snails: 'Snail race', quiz: 'Habbi quiz', tetris: 'Blocks duel', diving: 'The diving board' };

export const hallGameName = (game: string): string => hallt(`game.${game}`, GAME_NAMES[game as HallGameName] ?? game);

const ERRORS: Record<string, string> = {
    disabled: 'The game hall is closed for now.',
    offline: 'You need to be in the hotel to play.',
    no_table: 'This table does not exist any more.',
    no_game: 'This game does not exist.',
    table_full: 'This table is full.',
    already_started: 'The game has already started.',
    too_many_games: 'Too many tables are open: join one of them.',
    not_host: 'Only the host can do that.',
    not_enough_players: 'Not enough players: invite a friend or add a robot.',
    no_bots: 'Robots are not allowed at this table.',
    no_bot: 'There is no robot to remove.',
    bad_fleet: 'Your ships must all be in the sea and never touch each other.'
};

/** A refused action's text; null for the game's own refusals (not your turn, a move the board refuses). */
export const hallErrorText = (caught: unknown): string | null => {
    const code = caught instanceof HallApiError ? caught.code : 'http_error';

    if ([ 'not_your_turn', 'bad_move', 'finished', 'not_started' ].includes(code)) return null;

    return hallt(`error.${code}`, ERRORS[code] ?? 'Something went wrong, try again.');
};
