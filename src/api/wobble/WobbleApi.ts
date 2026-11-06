import { GetConfiguration } from '@octane/renderer';
import { getAccessToken } from '../auth';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { localizeWithFallback } from '../utils/localizeWithFallback';

/** The rules of a duel, chosen by its host. */
export interface IWobbleRules {
    /** The rounds to win: 1, 2 or 3. */
    roundsToWin: number;
    bots: boolean;
    /** 1 easy, 2 normal, 3 hard. */
    botLevel: number;
}

export const WOBBLE_DEFAULT_RULES: IWobbleRules = { roundsToWin: 2, bots: true, botLevel: 2 };

export const WOBBLE_BEAM = 8;
/** A fighter falls at this balance, either way. */
export const WOBBLE_FALL = 100;

export interface IWobbleFighter {
    side: 0 | 1;
    userId: number;
    name: string;
    figure: string;
    gender: string;
    bot: boolean;
    you: boolean;
    /** The place on the beam, 0 (left) to 7 (right). */
    pos: number;
    /** -100 (falling left) to 100 (falling right). */
    balance: number;
    speed: number;
    lean: number;
    stabilising: boolean;
    pushIn: number;
    stabiliseIn: number;
    action: '' | 'push' | 'miss' | 'hit' | 'move' | 'stabilise' | 'fall';
    actionDir: number;
    /** How long ago the action was, in milliseconds; -1 for none. */
    actionAgo: number;
    fell: boolean;
    wins: number;
}

export interface IWobbleEvent {
    seq: number;
    type: string;
    a: string;
    b: string;
}

export interface IWobbleSummary {
    id: number;
    host: string;
    left: string;
    right: string;
    players: number;
    state: 'waiting' | 'countdown' | 'playing' | 'round_over' | 'finished';
    rules: IWobbleRules;
}

export interface IWobbleMatch extends IWobbleSummary {
    hostId: number;
    youAreHost: boolean;
    /** Your side, -1 when watching. */
    you: number;
    round: number;
    /** What is left of the countdown or of the pause after a fall, in milliseconds. */
    phaseLeft: number;
    roundTime: number;
    suddenIn: number;
    sudden: boolean;
    winnerSide: number;
    serverTime: number;
    fighters: IWobbleFighter[];
    log: IWobbleEvent[];
}

export interface IWobbleView {
    enabled: boolean;
    userId: number;
    match?: IWobbleMatch;
    matches: IWobbleSummary[];
}

export class WobbleApiError extends Error {
    constructor(public readonly code: string) {
        super(code);
    }
}

const baseUrl = (): string => {
    const template = GetConfigurationValue<string>('wobble.endpoint', '${api.url}/api/wobble');

    try {
        return GetConfiguration().interpolate(template).replace(/\/+$/, '');
    } catch {
        return template.replace(/\/+$/, '');
    }
};

const request = async (path: string, body?: unknown): Promise<IWobbleView> => {
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'OctaneWobble' };
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

    if (!response.ok) throw new WobbleApiError(String(json?.code ?? 'http_error'));

    return json as unknown as IWobbleView;
};

export const WobbleApi = {
    view: () => request(''),
    create: (rules: IWobbleRules) => request('/create', { rules }),
    join: (matchId: number) => request('/join', { matchId }),
    leave: () => request('/leave', {}),
    setRules: (rules: IWobbleRules) => request('/rules', { rules }),
    addBot: () => request('/bot', {}),
    removeBot: () => request('/bot/remove', {}),
    start: () => request('/start', {}),
    lean: (dir: number) => request('/lean', { dir }),
    push: (dir: number) => request('/push', { dir }),
    move: (dir: number) => request('/move', { dir }),
    stabilise: () => request('/stabilise', {})
};

/** A text of the game, `wobble.<key>`, with its fallback. */
export const wbt = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`wobble.${key}`, fallback, parameters, replacements);

const ERRORS: Record<string, string> = {
    disabled: 'Wobble Squabble is closed for now.',
    offline: 'You need to be in the hotel to play.',
    no_table: 'This duel does not exist any more.',
    table_full: 'Two fighters are already on this beam.',
    already_started: 'The duel has already started.',
    too_many_games: 'Too many duels are open: join one of them.',
    not_host: 'Only the host can do that.',
    no_opponent: 'You need an opponent: wait for a player or add a robot.',
    no_bots: 'Robots are not allowed in this duel.',
    no_bot: 'There is no robot to remove.'
};

/** The text of a refused action; null for the refusals of the game itself (too soon, blocked...), which stay silent. */
export const wobbleErrorText = (error: unknown): string | null => {
    const code = error instanceof WobbleApiError ? error.code : 'http_error';

    if ([ 'too_soon', 'stabilising', 'beam_end', 'blocked', 'not_playing' ].includes(code)) return null;

    return wbt(`error.${code}`, ERRORS[code] ?? 'Something went wrong, try again.');
};

/** A line of the narrator, ready to show; null for what is shown elsewhere. */
export const wobbleEventText = (event: IWobbleEvent): string | null => {
    switch (event.type) {
        case 'join': return wbt('log.join', '%name% climbs on the beam.', [ 'name' ], [ event.a ]);
        case 'leave': return wbt('log.leave', '%name% leaves the pool.', [ 'name' ], [ event.a ]);
        case 'rules': return wbt('log.rules', 'The host changed the rules.');
        case 'start': return wbt('log.start', '%a% against %b%: may the steadiest win!', [ 'a', 'b' ], [ event.a, event.b ]);
        case 'round': return wbt('log.round', 'Round %n%!', [ 'n' ], [ event.a ]);
        case 'go': return wbt('log.go', 'Wobble!');
        case 'sudden': return wbt('log.sudden', 'Sudden death: the beam wobbles harder!');
        case 'fall': return wbt('log.fall', 'Splash! %a% falls into the water: the round goes to %b%.', [ 'a', 'b' ], [ event.a, event.b ]);
        case 'win': return wbt('log.win', '%name% wins the duel!', [ 'name' ], [ event.a ]);
        case 'forfeit': return wbt('log.forfeit', '%a% gave up: %b% wins the duel.', [ 'a', 'b' ], [ event.a, event.b ]);
        default: return null;
    }
};
