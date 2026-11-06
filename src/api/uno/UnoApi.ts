import { GetConfiguration } from '@octane/renderer';
import { getAccessToken } from '../auth';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { localizeWithFallback } from '../utils/localizeWithFallback';

/** A card: its colour (R, Y, G, B, or W for a wild) and its value (0-9, S skip, R reverse, D draw two, C wild, F draw four). */
export type UnoCardCode = string;
export type UnoColour = 'R' | 'Y' | 'G' | 'B';

/** The rules a table plays with, chosen by its host. */
export interface IUnoRules {
    maxPlayers: number;
    handSize: number;
    turnSeconds: number;
    stackTwo: boolean;
    stackFour: boolean;
    jumpIn: boolean;
    noSpecialFinish: boolean;
    drawUntilPlayable: boolean;
    unoPenalty: boolean;
    bots: boolean;
}

export const UNO_DEFAULT_RULES: IUnoRules = {
    maxPlayers: 4,
    handSize: 7,
    turnSeconds: 25,
    stackTwo: false,
    stackFour: false,
    jumpIn: false,
    noSpecialFinish: false,
    drawUntilPlayable: false,
    unoPenalty: true,
    bots: true
};

export interface IUnoSeat {
    userId: number;
    /** The chair, 0 to 7, round the table. */
    chair: number;
    name: string;
    figure: string;
    gender: string;
    bot: boolean;
    cards: number;
    declared: boolean;
    catchable: boolean;
    turn: boolean;
    you: boolean;
}

export interface IUnoEvent {
    seq: number;
    type: string;
    name: string;
    arg: string;
}

export interface IUnoTableSummary {
    id: number;
    host: string;
    players: number;
    maxPlayers: number;
    state: 'waiting' | 'playing' | 'finished';
    rules: IUnoRules;
}

export interface IUnoTable extends IUnoTableSummary {
    hostId: number;
    youAreHost: boolean;
    seats: IUnoSeat[];
    top: UnoCardCode;
    colour: UnoColour;
    direction: number;
    deck: number;
    /** Stacked +2 / +4 waiting for the player whose turn it is. */
    pendingDraw: number;
    turnSecondsLeft: number;
    yourTurn: boolean;
    drew: boolean;
    hand: { code: UnoCardCode; playable: boolean }[];
    canDraw: boolean;
    canPass: boolean;
    canUno: boolean;
    youAreSeated: boolean;
    winner?: { userId: number; name: string };
    log: IUnoEvent[];
    version: number;
}

export interface IUnoView {
    enabled: boolean;
    userId: number;
    table?: IUnoTable;
    tables: IUnoTableSummary[];
}

/** A refusal of the server: its code is the text key `uno.error.<code>`. */
export class UnoApiError extends Error {
    constructor(public readonly code: string) {
        super(code);
    }
}

const baseUrl = (): string => {
    const template = GetConfigurationValue<string>('uno.endpoint', '${api.url}/api/uno');

    try {
        return GetConfiguration().interpolate(template).replace(/\/+$/, '');
    } catch {
        return template.replace(/\/+$/, '');
    }
};

const request = async (path: string, body?: unknown): Promise<IUnoView> => {
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'OctaneUno' };
    const token = getAccessToken();

    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${baseUrl()}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'include',
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    let json: Record<string, unknown> = {};

    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        json = {};
    }

    if (!response.ok) throw new UnoApiError(String(json?.code ?? 'http_error'));

    return json as unknown as IUnoView;
};

export const UnoApi = {
    view: () => request(''),
    create: (rules: IUnoRules) => request('/create', { rules }),
    join: (tableId: number, chair = -1) => request('/join', { tableId, chair }),
    leave: () => request('/leave', {}),
    sit: (chair: number) => request('/sit', { chair }),
    setRules: (rules: IUnoRules) => request('/rules', { rules }),
    addBot: () => request('/bot', {}),
    removeBot: (userId: number) => request('/bot/remove', { userId }),
    start: () => request('/start', {}),
    play: (card: UnoCardCode, colour: UnoColour | '' = '') => request('/play', { card, colour }),
    draw: () => request('/draw', {}),
    pass: () => request('/pass', {}),
    uno: () => request('/uno', {}),
    catchUno: (userId: number) => request('/catch', { userId })
};

/** A text of the game, `uno.<key>`, with its fallback. */
export const ut = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`uno.${key}`, fallback, parameters, replacements);

const ERRORS: Record<string, string> = {
    disabled: 'UNO is closed for now.',
    offline: 'You need to be in the hotel to play.',
    no_table: 'This table does not exist any more.',
    table_full: 'This table is full.',
    already_started: 'The game has already started.',
    too_many_tables: 'Too many tables are open: join one of them.',
    not_host: 'Only the host can do that.',
    not_enough_players: 'You need at least 2 players.',
    not_your_turn: 'It is not your turn.',
    not_playable: 'This card cannot go on the pile.',
    drawn_only: 'You can only play the card you have just drawn.',
    draw_four_rule: 'A +4 can only be played without a card of the colour asked for.',
    choose_colour: 'Choose a colour.',
    already_drew: 'You have already drawn a card.',
    draw_first: 'Draw a card before passing.',
    too_many_cards: 'Say UNO when you have one card left.',
    no_catch: 'Too late!',
    chair_taken: 'This chair is taken.',
    no_bots: 'Robots are not allowed at this table.',
    too_many_seated: 'Too many players are seated for that.',
    must_stack: 'Stack a card on it or draw.',
    special_finish: 'You cannot finish on a special card: draw.'
};

export const unoErrorText = (error: unknown): string => {
    const code = error instanceof UnoApiError ? error.code : 'http_error';

    return ut(`error.${code}`, ERRORS[code] ?? 'Something went wrong, try again.');
};

const COLOUR_NAMES: Record<string, string> = { R: 'red', Y: 'yellow', G: 'green', B: 'blue' };

export const unoColourName = (colour: string): string => ut(`colour.${COLOUR_NAMES[colour] ?? 'red'}`, COLOUR_NAMES[colour] ?? 'red');

/** A card in words, for the log and for screen readers. */
export const unoCardName = (code: UnoCardCode): string => {
    if (!code) return '';

    const value = code.charAt(1);

    if (code.startsWith('W')) {
        const name = value === 'F' ? ut('card.draw_four', 'Wild +4') : ut('card.wild', 'Wild');

        return code.length > 2 ? `${name} (${unoColourName(code.charAt(2))})` : name;
    }

    const colour = unoColourName(code.charAt(0));

    switch (value) {
        case 'S': return ut('card.skip', 'Skip %colour%', [ 'colour' ], [ colour ]);
        case 'R': return ut('card.reverse', 'Reverse %colour%', [ 'colour' ], [ colour ]);
        case 'D': return ut('card.draw_two', '+2 %colour%', [ 'colour' ], [ colour ]);
        default: return `${value} ${colour}`;
    }
};

/** One line of the table's log. */
export const unoEventText = (event: IUnoEvent): string => {
    const name = [ 'name' ];

    switch (event.type) {
        case 'join': return ut('log.join', '%name% sits down.', name, [ event.name ]);
        case 'leave': return ut('log.leave', '%name% leaves the table.', name, [ event.name ]);
        case 'start': return ut('log.start', 'The game begins!');
        case 'play': return ut('log.play', '%name% plays %card%.', [ 'name', 'card' ], [ event.name, unoCardName(event.arg) ]);
        case 'draw': return (event.arg && event.arg !== '1')
            ? ut('log.draw_many', '%name% draws %count% cards.', [ 'name', 'count' ], [ event.name, event.arg ])
            : ut('log.draw', '%name% draws a card.', name, [ event.name ]);
        case 'draw_penalty': return ut('log.penalty', '%name% draws %count% cards.', [ 'name', 'count' ], [ event.name, event.arg ]);
        case 'uno': return ut('log.uno', '%name%: UNO!', name, [ event.name ]);
        case 'caught': return ut('log.caught', '%catcher% caught %name%: 2 cards!', [ 'name', 'catcher' ], [ event.name, event.arg ]);
        case 'timeout': return ut('log.timeout', '%name% ran out of time.', name, [ event.name ]);
        case 'win': return ut('log.win', '%name% wins!', name, [ event.name ]);
        case 'jump': return ut('log.jump', '%name% jumps in!', name, [ event.name ]);
        case 'rules': return ut('log.rules', 'The host changed the rules.');
        default: return '';
    }
};

/** What a player says over their head when something happens to them (a Habbo speech bubble), or null. */
export const unoBubble = (event: IUnoEvent): { name: string; text: string } | null => {
    switch (event.type) {
        case 'uno': return { name: event.name, text: 'UNO !' };
        case 'jump': return { name: event.name, text: ut('say.jump', 'Interception!') };
        case 'caught': return { name: event.arg, text: ut('say.caught', 'Counter-UNO, %name%!', [ 'name' ], [ event.name ]) };
        case 'draw_penalty': return { name: event.name, text: ut('say.penalty', 'Ouch, %count% cards...', [ 'count' ], [ event.arg ]) };
        case 'timeout': return { name: event.name, text: ut('say.timeout', 'Oops, too late!') };
        case 'win': return { name: event.name, text: ut('say.win', 'I won!') };
        case 'play': {
            const value = event.arg.charAt(1);

            if (value === 'S') return { name: event.name, text: ut('say.skip', 'Skip your turn!') };
            if (value === 'R') return { name: event.name, text: ut('say.reverse', 'Reverse!') };
            if (value === 'D') return { name: event.name, text: '+2 !' };
            if (value === 'F') return { name: event.name, text: '+4 !' };
            if (value === 'C') return { name: event.name, text: ut('say.wild', '%colour%!', [ 'colour' ], [ unoColourName(event.arg.charAt(2)) ]) };
            return null;
        }
        default: return null;
    }
};
