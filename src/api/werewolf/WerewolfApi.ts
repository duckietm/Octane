import { GetConfiguration } from '@octane/renderer';
import { getAccessToken } from '../auth';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { localizeWithFallback } from '../utils/localizeWithFallback';

export type WerewolfRoleCode = 'werewolf' | 'villager' | 'seer' | 'witch' | 'hunter' | 'cupid' | 'guard';
export type WerewolfStep = 'none' | 'cupid' | 'guard' | 'seer' | 'wolves' | 'witch' | 'dawn' | 'debate' | 'vote' | 'hunter';

export const WEREWOLF_ROLES: WerewolfRoleCode[] = [ 'werewolf', 'villager', 'seer', 'witch', 'hunter', 'cupid', 'guard' ];

/** The rules a village plays with, chosen by its host. */
export interface IWerewolfRules {
    maxPlayers: number;
    seer: boolean;
    witch: boolean;
    hunter: boolean;
    cupid: boolean;
    guard: boolean;
    bots: boolean;
    revealRoles: boolean;
    /** 1 fast, 2 normal, 3 slow. */
    speed: number;
}

export const WEREWOLF_DEFAULT_RULES: IWerewolfRules = { maxPlayers: 8, seer: true, witch: true, hunter: true, cupid: true, guard: false, bots: true, revealRoles: true, speed: 2 };

export interface IWerewolfSeat {
    userId: number;
    chair: number;
    name: string;
    figure: string;
    gender: string;
    bot: boolean;
    alive: boolean;
    you: boolean;
    /** The role this player can see, empty when hidden. */
    role: WerewolfRoleCode | '';
    lover: boolean;
    chosen: boolean;
    votes: number;
    ready: boolean;
    /** The wolves who chose this player tonight (seen by the pack). */
    wolves: string[];
    targetable: boolean;
}

export interface IWerewolfEvent {
    seq: number;
    type: string;
    channel: 'all' | 'wolves' | 'dead' | 'lovers' | 'private';
    a: string;
    b: string;
    c: string;
}

export interface IWerewolfSummary {
    id: number;
    host: string;
    players: number;
    maxPlayers: number;
    state: 'waiting' | 'playing' | 'finished';
    rules: IWerewolfRules;
}

export interface IWerewolfGame extends IWerewolfSummary {
    hostId: number;
    youAreHost: boolean;
    step: WerewolfStep;
    night: number;
    isNight: boolean;
    secondsLeft: number;
    winner: '' | 'village' | 'wolves' | 'lovers' | 'nobody';
    seats: IWerewolfSeat[];
    you: {
        role?: WerewolfRoleCode;
        alive?: boolean;
        seated: boolean;
        won?: boolean;
        /** What the player has to do now, empty when nothing. */
        action?: '' | 'cupid' | 'guard' | 'seer' | 'wolves' | 'witch' | 'vote' | 'hunter' | 'ready';
        done?: boolean;
        lifePotion?: boolean;
        deathPotion?: boolean;
        victim?: string;
        victimId?: number;
        /** Where their words go: all, wolves, dead, or empty when the village sleeps. */
        chat: string;
    };
    log: IWerewolfEvent[];
}

export interface IWerewolfView {
    enabled: boolean;
    userId: number;
    game?: IWerewolfGame;
    games: IWerewolfSummary[];
}

export class WerewolfApiError extends Error {
    constructor(public readonly code: string) {
        super(code);
    }
}

const baseUrl = (): string => {
    const template = GetConfigurationValue<string>('werewolf.endpoint', '${api.url}/api/werewolf');

    try {
        return GetConfiguration().interpolate(template).replace(/\/+$/, '');
    } catch {
        return template.replace(/\/+$/, '');
    }
};

const request = async (path: string, body?: unknown): Promise<IWerewolfView> => {
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'OctaneWerewolf' };
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

    if (!response.ok) throw new WerewolfApiError(String(json?.code ?? 'http_error'));

    return json as unknown as IWerewolfView;
};

export const WerewolfApi = {
    view: () => request(''),
    create: (rules: IWerewolfRules) => request('/create', { rules }),
    join: (gameId: number, chair = -1) => request('/join', { gameId, chair }),
    leave: () => request('/leave', {}),
    sit: (chair: number) => request('/sit', { chair }),
    setRules: (rules: IWerewolfRules) => request('/rules', { rules }),
    addBot: () => request('/bot', {}),
    fillBots: () => request('/bots', {}),
    removeBot: (userId: number) => request('/bot/remove', { userId }),
    start: () => request('/start', {}),
    act: (target: number, second = 0) => request('/act', { target, second }),
    witch: (save: boolean, poison: number) => request('/witch', { save, poison }),
    ready: () => request('/ready', {}),
    say: (text: string) => request('/say', { text })
};

/** A text of the game, `werewolf.<key>`, with its fallback. */
export const wt = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`werewolf.${key}`, fallback, parameters, replacements);

const ROLE_NAMES: Record<string, string> = { werewolf: 'Werewolf', villager: 'Villager', seer: 'Seer', witch: 'Witch', hunter: 'Hunter', cupid: 'Cupid', guard: 'Guard' };
const ROLE_PLURALS: Record<string, string> = { werewolf: 'Werewolves', villager: 'Villagers', seer: 'Seers', witch: 'Witches', hunter: 'Hunters', cupid: 'Cupids', guard: 'Guards' };

export const werewolfRoleName = (role: string, plural = false): string =>
    plural ? wt(`role.${role}.plural`, ROLE_PLURALS[role] ?? role) : wt(`role.${role}`, ROLE_NAMES[role] ?? role);

const POWERS: Record<string, string> = {
    werewolf: 'Each night, with your pack, choose a villager to devour. By day, hide among the villagers.',
    villager: 'You have no power: find the werewolves by listening and voting well.',
    seer: 'Each night, look at one player and learn their role.',
    witch: 'You have two potions, once each: one saves the werewolves\' prey, the other kills a player.',
    hunter: 'When you die, you shoot a player of your choice, who dies with you.',
    cupid: 'The first night, choose two players who fall in love: if one dies, the other dies of grief.',
    guard: 'Each night, protect a player from the werewolves. Never the same one two nights running.'
};

export const werewolfRolePower = (role: string): string => wt(`power.${role}`, POWERS[role] ?? '');

const STEP_NAMES: Record<string, string> = { cupid: 'Cupid', guard: 'The guard', seer: 'The seer', wolves: 'The werewolves', witch: 'The witch', dawn: 'Dawn', debate: 'Debate', vote: 'Vote', hunter: 'The hunter', none: '' };

export const werewolfStepName = (step: string): string => wt(`step.${step}`, STEP_NAMES[step] ?? step);

const ERRORS: Record<string, string> = {
    disabled: 'The werewolf game is closed for now.',
    offline: 'You need to be in the hotel to play.',
    no_table: 'This village does not exist any more.',
    table_full: 'This village is full.',
    already_started: 'The game has already started.',
    too_many_games: 'Too many villages are open: join one of them.',
    not_host: 'Only the host can do that.',
    not_enough_players: 'You need at least 5 players.',
    not_your_turn: 'It is not your turn.',
    bad_target: 'You cannot choose this player.',
    same_protection: 'You cannot protect the same player two nights running.',
    pick_two: 'Choose two different players.',
    no_potion: 'You no longer have this potion.',
    village_sleeps: 'Hush... the village is asleep.',
    chair_taken: 'This seat is taken.',
    no_bots: 'Robots are not allowed in this village.',
    already_done: 'You have already done it.'
};

export const werewolfErrorText = (error: unknown): string => {
    const code = error instanceof WerewolfApiError ? error.code : 'http_error';

    return wt(`error.${code}`, ERRORS[code] ?? 'Something went wrong, try again.');
};

const composition = (text: string): string => text.split(',').filter(Boolean).map((part) => {
    const [ role, count ] = part.split(':');
    const number = parseInt(count, 10);

    return number > 1 ? `${number} ${werewolfRoleName(role, true)}` : werewolfRoleName(role);
}).join(' · ');

const CAUSES: Record<string, string> = { wolves: 'devoured by the werewolves', poison: 'poisoned by the witch', vote: 'eliminated by the village', hunter: 'shot by the hunter', grief: 'dead of grief', left: 'gone from the village' };
const BOT_LINES = [
    'I am a simple villager, I promise!',
    'Hmm... %name% is very quiet.',
    'I have a bad feeling about %name%.',
    'Let us vote carefully this time.',
    'It cannot be me, I was asleep!',
    'Why are you all looking at me?',
    '%name%, where were you last night?',
    'I trust %name%, I do not know why.',
    'Somebody is lying here...',
    'We must find them before tonight!',
    'Did anyone hear howling?',
    'I vote against %name% if nobody has a better idea.'
];

/** A line of the narrator, of a player, or of the game, ready to show; null for what is shown elsewhere. */
export const werewolfEventText = (event: IWerewolfEvent): string | null => {
    const role = (code: string) => (code ? werewolfRoleName(code) : '');

    switch (event.type) {
        case 'join': return wt('log.join', '%name% sits by the fire.', [ 'name' ], [ event.a ]);
        case 'leave': return wt('log.leave', '%name% leaves the village.', [ 'name' ], [ event.a ]);
        case 'rules': return wt('log.rules', 'The host changed the rules.');
        case 'welcome': return wt('log.welcome', 'Welcome to the village! Roles: %roles%.', [ 'roles' ], [ composition(event.a) ]);
        case 'your_role': return wt('log.your_role', 'You are %role%. %power%', [ 'role', 'power' ], [ werewolfRoleName(event.a), werewolfRolePower(event.a) ]);
        case 'pack': return wt('log.pack', 'Your pack: %names%.', [ 'names' ], [ event.a ]);
        case 'night': return wt('log.night', 'Night %night% falls on the village. Everybody falls asleep...', [ 'night' ], [ event.a ]);
        case 'step': return wt(`log.step.${event.a}`, `${werewolfStepName(event.a)}...`);
        case 'seer_sees': return wt('log.seer_sees', 'Your vision: %name% is %role%.', [ 'name', 'role' ], [ event.a, role(event.b) ]);
        case 'wolf_choice': return wt('log.wolf_choice', '%name% wants to devour %target%.', [ 'name', 'target' ], [ event.a, event.b ]);
        case 'witch_sees': return event.a ? wt('log.witch_sees', 'Tonight, the werewolves attacked %name%.', [ 'name' ], [ event.a ]) : wt('log.witch_nobody', 'Tonight, the werewolves attacked nobody.');
        case 'lovers': return wt('log.lovers', 'Cupid\'s arrow! You love %name% (%role%). If one of you dies, the other dies of grief.', [ 'name', 'role' ], [ event.a, role(event.b) ]);
        case 'cupid_done': return wt('log.cupid_done', '%a% and %b% are now in love.', [ 'a', 'b' ], [ event.a, event.b ]);
        case 'day': return wt('log.day', 'The sun rises on the village.');
        case 'nobody_died': return wt('log.nobody_died', 'Miracle: nobody died tonight!');
        case 'death': return event.b
            ? wt('log.death', '%name% is %cause%. They were %role%.', [ 'name', 'cause', 'role' ], [ event.a, wt(`cause.${event.c}`, CAUSES[event.c] ?? event.c), role(event.b) ])
            : wt('log.death_hidden', '%name% is %cause%.', [ 'name', 'cause' ], [ event.a, wt(`cause.${event.c}`, CAUSES[event.c] ?? event.c) ]);
        case 'vote': return wt('log.vote', '%name% votes against %target%.', [ 'name', 'target' ], [ event.a, event.b ]);
        case 'vote_tie': return wt('log.vote_tie', 'Tie: the village cannot agree, nobody is eliminated.');
        case 'hunter_wakes': return wt('log.hunter_wakes', '%name% was the hunter: they take their rifle...', [ 'name' ], [ event.a ]);
        case 'hunter_shoots': return wt('log.hunter_shoots', '%name% shoots %target%!', [ 'name', 'target' ], [ event.a, event.b ]);
        case 'win': return wt(`log.win.${event.a}`, ({ village: 'The village wins: the werewolves are gone!', wolves: 'The werewolves win: the village is devoured!', lovers: 'The lovers win, together against everybody!', nobody: 'Nobody survived...' } as Record<string, string>)[event.a] ?? '');
        case 'reveal': return wt('log.reveal', '%name% was %role%.', [ 'name', 'role' ], [ event.a, role(event.b) ]);
        case 'bot_line': return wt(`bot.${event.b}`, BOT_LINES[parseInt(event.b, 10)] ?? '...', [ 'name' ], [ event.c || '?' ]);
        case 'chat': return event.b;
        default: return null;
    }
};

/** Who says the line: a player for chat and robots' lines, the narrator otherwise. */
export const werewolfEventSpeaker = (event: IWerewolfEvent): string | null => (event.type === 'chat' || event.type === 'bot_line' ? event.a : null);
