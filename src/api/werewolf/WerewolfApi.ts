import { GetConfiguration } from '@octane/renderer';
import { gamesLeftErrorText } from '../gamecenter/GameCenterApi';
import { getAccessToken } from '../auth';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { localizeWithFallback } from '../utils/localizeWithFallback';

export type WerewolfRoleCode =
    | 'werewolf' | 'villager' | 'seer' | 'witch' | 'hunter' | 'cupid' | 'guard' | 'little_girl' | 'elder' | 'idiot'
    | 'scapegoat' | 'raven' | 'fox' | 'bear_tamer' | 'knight' | 'sister' | 'wild_child' | 'wolf_dog' | 'big_bad_wolf'
    | 'accursed_father' | 'white_wolf' | 'piper' | 'angel';
export type WerewolfCamp = 'village' | 'wolves' | 'alone';
export type WerewolfStep =
    | 'none' | 'cupid' | 'wolf_dog' | 'wild_child' | 'guard' | 'seer' | 'fox' | 'raven' | 'wolves' | 'accursed'
    | 'big_bad_wolf' | 'white_wolf' | 'witch' | 'piper' | 'dawn' | 'debate' | 'vote' | 'hunter';

/** Every role, in the order of the emulator's WerewolfRole and of the pictures (werewolf-roles.png). */
export const WEREWOLF_ROLES: WerewolfRoleCode[] = [
    'werewolf', 'villager', 'seer', 'witch', 'hunter', 'cupid', 'guard', 'little_girl', 'elder', 'idiot', 'scapegoat',
    'raven', 'fox', 'bear_tamer', 'knight', 'sister', 'wild_child', 'wolf_dog', 'big_bad_wolf', 'accursed_father',
    'white_wolf', 'piper', 'angel'
];

const ROLE_CAMPS: Record<WerewolfRoleCode, WerewolfCamp> = {
    werewolf: 'wolves', villager: 'village', seer: 'village', witch: 'village', hunter: 'village', cupid: 'village',
    guard: 'village', little_girl: 'village', elder: 'village', idiot: 'village', scapegoat: 'village', raven: 'village',
    fox: 'village', bear_tamer: 'village', knight: 'village', sister: 'village', wild_child: 'village', wolf_dog: 'village',
    big_bad_wolf: 'wolves', accursed_father: 'wolves', white_wolf: 'alone', piper: 'alone', angel: 'alone'
};

export const werewolfRoleCamp = (role: string): WerewolfCamp => ROLE_CAMPS[role as WerewolfRoleCode] ?? 'village';

/** The roles a host can put in the village, by camp (the werewolves and villagers fill the rest). */
export const WEREWOLF_SPECIALS: Record<WerewolfCamp, WerewolfRoleCode[]> = {
    village: [ 'seer', 'witch', 'hunter', 'cupid', 'guard', 'little_girl', 'elder', 'idiot', 'scapegoat', 'raven', 'fox', 'bear_tamer', 'knight', 'sister', 'wild_child', 'wolf_dog' ],
    wolves: [ 'big_bad_wolf', 'accursed_father' ],
    alone: [ 'white_wolf', 'piper', 'angel' ]
};

/** The rules a village plays with, chosen by its host. */
export interface IWerewolfRules {
    maxPlayers: number;
    /** 0: as many as the village calls for (1 up to 5 players, 2 up to 8, 3 beyond). */
    wolves: number;
    roles: WerewolfRoleCode[];
    bots: boolean;
    revealRoles: boolean;
    /** 1 fast, 2 normal, 3 slow. */
    speed: number;
}

export const WEREWOLF_DEFAULT_RULES: IWerewolfRules = { maxPlayers: 8, wolves: 0, roles: [ 'seer', 'witch', 'hunter', 'cupid', 'little_girl' ], bots: true, revealRoles: true, speed: 2 };

export const werewolfAutoWolves = (players: number): number => (players <= 5 ? 1 : players <= 8 ? 2 : players <= 12 ? 3 : Math.min(12, Math.floor(players / 4)));

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
    /** A member of the pack (seen by the pack). */
    pack: boolean;
    /** Charmed by the piper (seen by the piper and the charmed). */
    charmed: boolean;
    /** The village idiot spared by the vote. */
    revealed: boolean;
    /** Marked by the raven: two votes against them today. */
    raven: boolean;
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
    winner: '' | 'village' | 'wolves' | 'lovers' | 'nobody' | 'white_wolf' | 'piper' | 'angel';
    /** The village killed its elder: its special roles have lost their powers. */
    powersLost: boolean;
    seats: IWerewolfSeat[];
    you: {
        role?: WerewolfRoleCode;
        camp?: WerewolfCamp;
        pack?: boolean;
        charmed?: boolean;
        canVote?: boolean;
        foxActive?: boolean;
        /** The little girl, peeking at the pack tonight. */
        peeks?: boolean;
        alive?: boolean;
        seated: boolean;
        won?: boolean;
        /** What the player has to do now, empty when nothing. */
        action?: '' | Exclude<WerewolfStep, 'none' | 'dawn' | 'debate'> | 'ready';
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
    choose: (yes: boolean) => request('/choose', { yes }),
    pass: () => request('/pass', {}),
    ready: () => request('/ready', {}),
    say: (text: string) => request('/say', { text })
};

/** A text of the game, `werewolf.<key>`, with its fallback. */
export const wt = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null): string =>
    localizeWithFallback(`werewolf.${key}`, fallback, parameters, replacements);

const ROLE_NAMES: Record<string, string> = {
    werewolf: 'Werewolf', villager: 'Villager', seer: 'Seer', witch: 'Witch', hunter: 'Hunter', cupid: 'Cupid', guard: 'Guard',
    little_girl: 'Little girl', elder: 'Elder', idiot: 'Village idiot', scapegoat: 'Scapegoat', raven: 'Raven', fox: 'Fox',
    bear_tamer: 'Bear tamer', knight: 'Knight with the rusty sword', sister: 'Sister', wild_child: 'Wild child',
    wolf_dog: 'Wolf dog', big_bad_wolf: 'Big bad wolf', accursed_father: 'Accursed wolf father', white_wolf: 'White werewolf',
    piper: 'Piper', angel: 'Angel'
};
const ROLE_PLURALS: Record<string, string> = {
    werewolf: 'Werewolves', villager: 'Villagers', seer: 'Seers', witch: 'Witches', hunter: 'Hunters', cupid: 'Cupids',
    guard: 'Guards', sister: 'Sisters'
};

export const werewolfRoleName = (role: string, plural = false): string =>
    plural ? wt(`role.${role}.plural`, ROLE_PLURALS[role] ?? werewolfRoleName(role)) : wt(`role.${role}`, ROLE_NAMES[role] ?? role);

const POWERS: Record<string, string> = {
    werewolf: 'Each night, with your pack, choose a villager to devour. By day, hide among the villagers.',
    villager: 'You have no power: find the werewolves by listening and voting well.',
    seer: 'Each night, look at one player and learn their role.',
    witch: 'You have two potions, once each: one saves the werewolves\' prey, the other kills a player.',
    hunter: 'When you die, you shoot a player of your choice, who dies with you.',
    cupid: 'The first night, choose two players who fall in love: if one dies, the other dies of grief.',
    guard: 'Each night, protect a player from the werewolves. Never the same one two nights running.',
    little_girl: 'At night, you peek at the werewolves: you read their words and their prey, without seeing who they are.',
    elder: 'You survive the first attack of the werewolves. If the village kills you, it loses its powers.',
    idiot: 'If the village votes you out, it spares you once you are known: you stay, but you no longer vote.',
    scapegoat: 'If the vote ends in a tie, you are the one eliminated.',
    raven: 'Each night, mark a player: tomorrow they start the vote with two votes against them.',
    fox: 'Each night, sniff a player and their two neighbours: you learn whether a werewolf is among them. Wrong once, you lose your nose.',
    bear_tamer: 'Each morning, your bear growls if a werewolf sits next to you.',
    knight: 'If the werewolves devour you, your rusty sword kills the first werewolf on your left the next night.',
    sister: 'You and your sister know each other: you can trust one another.',
    wild_child: 'The first night, choose a model. If your model dies, you become a werewolf.',
    wolf_dog: 'The first night, choose your side: stay a villager, or join the werewolves.',
    big_bad_wolf: 'You hunt with the pack, then alone: one more prey each night, as long as no werewolf has died.',
    accursed_father: 'Once in the game, instead of devouring the pack\'s prey, you infect them: they become a werewolf.',
    white_wolf: 'You hunt with the pack, but you play alone: every second night, you may devour a werewolf. Win alone.',
    piper: 'Each night, charm two players. You win alone when every other living player is charmed.',
    angel: 'Get eliminated on the first day (or the first night) and you win alone. Otherwise, you play with the village.'
};

export const werewolfRolePower = (role: string): string => wt(`power.${role}`, POWERS[role] ?? '');

const DESCRIPTIONS: Record<string, string> = {
    werewolf: 'Every night the pack wakes up, chooses a victim together and devours them. By day, the werewolves sit among the villagers and pretend to be one of them. They win when only werewolves are left.',
    villager: 'A villager has no power but their vote. Listen, ask questions, spot the lies: the village wins when every werewolf is gone.',
    seer: 'Every night, the seer looks into her crystal ball at a player of her choice and learns their role. Use what you know without giving yourself away: the werewolves would love to devour you.',
    witch: 'The witch wakes up after the werewolves and learns who they attacked. She has a potion of life, to save that player, and a potion of death, to kill anyone. Each potion can be used once in the game.',
    hunter: 'When the hunter dies, whatever the cause, he fires a last shot: he chooses a player who dies with him. Aim well!',
    cupid: 'The first night, Cupid chooses two lovers (himself included, if he wants). They learn each other\'s role. If one dies, the other dies of grief. A villager and a werewolf in love win together if they are the last two.',
    guard: 'Every night, the guard protects a player (himself included) from the werewolves\' attack. He cannot protect the same player two nights running. His protection does not stop the witch\'s poison.',
    little_girl: 'While the werewolves choose their victim, the little girl peeks through her fingers: she reads what the pack says and whom it chooses, but she cannot see who speaks.',
    elder: 'The elder is tough: the werewolves must attack him twice to kill him. But if the village kills him (by vote, by the witch or by the hunter), the village loses its special powers in shame.',
    idiot: 'When the village votes the idiot out, everybody discovers who he is and spares him: he stays in the village, but he can no longer vote.',
    scapegoat: 'When the vote ends in a tie, nobody else is eliminated: the scapegoat is. Poor thing.',
    raven: 'Every night, the raven may mark a player. The next day, that player starts the vote with two votes against them, and everybody knows it.',
    fox: 'Every night, the fox sniffs a player and that player\'s two living neighbours. If a werewolf is among the three, he learns it. If not, he loses his nose and his power for the rest of the game.',
    bear_tamer: 'Every morning, the bear tamer\'s bear growls (for everybody to hear) if at least one of the tamer\'s two living neighbours is a werewolf.',
    knight: 'If the werewolves devour the knight, his rusty sword wounds one of them: the first werewolf on his left dies of tetanus the next night.',
    sister: 'The two sisters know each other from the first night. Two players who can trust each other: a precious help for the village.',
    wild_child: 'The first night, the wild child chooses a model. As long as the model lives, the child plays for the village. If the model dies, the child becomes a werewolf and joins the pack.',
    wolf_dog: 'The first night, the wolf dog chooses: stay a faithful villager, or join the werewolves and hunt with them for the rest of the game.',
    big_bad_wolf: 'The big bad wolf hunts with the pack, then wakes up again alone and devours a second victim, as long as no werewolf (nor wild child, nor wolf dog of the pack) has died.',
    accursed_father: 'Once in the game, after the pack has chosen its prey, the accursed wolf father can infect them instead of devouring them: the prey survives, but becomes a werewolf, keeping their power.',
    white_wolf: 'The white werewolf hunts with the pack, but plays only for himself: every second night, he may devour a werewolf. He wins if he is the last one alive.',
    piper: 'Every night, the piper charms two players. The charmed learn who else is charmed. The piper wins alone as soon as every other living player is charmed.',
    angel: 'The angel wants to go to heaven straight away: if he is eliminated on the first day (or devoured the first night), he wins alone and the game ends. Otherwise he becomes a simple villager.'
};

export const werewolfRoleDescription = (role: string): string => wt(`desc.${role}`, DESCRIPTIONS[role] ?? werewolfRolePower(role));

const CAMP_NAMES: Record<WerewolfCamp, string> = { village: 'The village', wolves: 'The werewolves', alone: 'Alone' };

export const werewolfCampName = (camp: string): string => wt(`camp.${camp}`, CAMP_NAMES[camp as WerewolfCamp] ?? camp);

const STEP_NAMES: Record<string, string> = {
    cupid: 'Cupid', wolf_dog: 'The wolf dog', wild_child: 'The wild child', guard: 'The guard', seer: 'The seer', fox: 'The fox',
    raven: 'The raven', wolves: 'The werewolves', accursed: 'The accursed father', big_bad_wolf: 'The big bad wolf',
    white_wolf: 'The white werewolf', witch: 'The witch', piper: 'The piper', dawn: 'Dawn', debate: 'Debate', vote: 'Vote',
    hunter: 'The hunter', none: ''
};

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
    already_done: 'You have already done it.',
    nothing_to_do: 'There is nothing to do now.'
};

export const werewolfErrorText = (error: unknown): string => {
    const code = error instanceof WerewolfApiError ? error.code : 'http_error';
    const limit = gamesLeftErrorText(code);

    if (limit) return limit;

    return wt(`error.${code}`, ERRORS[code] ?? 'Something went wrong, try again.');
};

const composition = (text: string): string => text.split(',').filter(Boolean).map((part) => {
    const [ role, count ] = part.split(':');
    const number = parseInt(count, 10);

    return number > 1 ? `${number} ${werewolfRoleName(role, true)}` : werewolfRoleName(role);
}).join(' · ');

const CAUSES: Record<string, string> = {
    wolves: 'did not survive the werewolves\' attack', poison: 'drank the witch\'s poison', vote: 'got the most votes: the village eliminates them',
    hunter: 'takes the hunter\'s bullet', grief: 'dies of grief', left: 'left the village', white_wolf: 'was devoured by the white werewolf',
    rust: 'dies of tetanus from the knight\'s rusty sword', scapegoat: 'pays for the tie'
};

/** Why somebody died, as the narrator says it. */
export const werewolfCauseText = (cause: string): string => wt(`cause.${cause}`, CAUSES[cause] ?? cause);
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
        case 'wolf_choice': return wt('log.wolf_choice', '%name% wants to devour %target%.', [ 'name', 'target' ], [ event.a || wt('a_werewolf', 'A werewolf'), event.b ]);
        case 'witch_sees': return event.a ? wt('log.witch_sees', 'Tonight, the werewolves attacked %name%.', [ 'name' ], [ event.a ]) : wt('log.witch_nobody', 'Tonight, the werewolves attacked nobody.');
        case 'lovers': return wt('log.lovers', 'Cupid\'s arrow! You love %name% (%role%). If one of you dies, the other dies of grief.', [ 'name', 'role' ], [ event.a, role(event.b) ]);
        case 'cupid_done': return wt('log.cupid_done', '%a% and %b% are now in love.', [ 'a', 'b' ], [ event.a, event.b ]);
        case 'day': return wt('log.day', 'The sun rises on the village.');
        case 'nobody_died': return wt('log.nobody_died', 'Miracle: nobody died tonight!');
        case 'death': return event.b
            ? wt('log.death', '%name% %cause%. Role: %role%.', [ 'name', 'cause', 'role' ], [ event.a, werewolfCauseText(event.c), role(event.b) ])
            : wt('log.death_hidden', '%name% %cause%.', [ 'name', 'cause' ], [ event.a, werewolfCauseText(event.c) ]);
        case 'sister': return wt('log.sister', 'Your sister is %name%. You can trust each other.', [ 'name' ], [ event.a ]);
        case 'fox_yes': return wt('log.fox_yes', 'Your nose twitches: there is a werewolf next to %name% (or %name% is one).', [ 'name' ], [ event.a ]);
        case 'fox_no': return wt('log.fox_no', 'No werewolf near %name%... you have lost your nose.', [ 'name' ], [ event.a ]);
        case 'raven': return wt('log.raven', 'A raven sat on %name%\'s shoulder: two votes against them.', [ 'name' ], [ event.a ]);
        case 'pack_joins': return wt(`log.pack_joins.${event.b}`, '%name% joins the pack!', [ 'name' ], [ event.a || wt('someone', 'Someone') ]);
        case 'infected': return wt('log.infected', 'The accursed father bit you: you are now a werewolf! Keep your power, and hunt with the pack.');
        case 'wolf_dog_wolf': return wt('log.wolf_dog_wolf', 'You join the werewolves: you hunt with the pack from tonight.');
        case 'wolf_dog_village': return wt('log.wolf_dog_village', 'You stay a faithful villager.');
        case 'wild_child_model': return wt('log.wild_child_model', 'Your model is %name%. If they die, you become a werewolf.', [ 'name' ], [ event.a ]);
        case 'wild_child_turns': return wt('log.wild_child_turns', 'Your model %name% is dead: you become a werewolf!', [ 'name' ], [ event.a ]);
        case 'elder_survives': return wt('log.elder_survives', 'The werewolves attacked you, but you survived. Next time, you will not.');
        case 'elder_curse': return wt('log.elder_curse', 'The village killed its elder %name%: in shame, the special roles of the village lose their powers.', [ 'name' ], [ event.a ]);
        case 'idiot_spared': return wt('log.idiot_spared', '%name% is the village idiot: the village spares them, but they will vote no more.', [ 'name' ], [ event.a ]);
        case 'scapegoat': return wt('log.scapegoat', 'Tie! The scapegoat %name% pays for everybody.', [ 'name' ], [ event.a ]);
        case 'vote_none': return wt('log.vote_none', 'Nobody voted: nobody is eliminated.');
        case 'bear_growls': return wt('log.bear_growls', 'Grrr! %name%\'s bear growls: a werewolf sits next to them!', [ 'name' ], [ event.a ]);
        case 'bear_quiet': return wt('log.bear_quiet', '%name%\'s bear stays calm.', [ 'name' ], [ event.a ]);
        case 'charmed': return wt('log.charmed', 'The piper\'s music: the charmed are %names%.', [ 'names' ], [ event.a ]);
        case 'vote': return wt('log.vote', '%name% votes against %target%.', [ 'name', 'target' ], [ event.a, event.b ]);
        case 'vote_tie': return wt('log.vote_tie', 'Tie: the village cannot agree, nobody is eliminated.');
        case 'hunter_wakes': return wt('log.hunter_wakes', '%name% was the hunter: they take their rifle...', [ 'name' ], [ event.a ]);
        case 'hunter_shoots': return wt('log.hunter_shoots', '%name% shoots %target%!', [ 'name', 'target' ], [ event.a, event.b ]);
        case 'win': return wt(`log.win.${event.a}`, ({ village: 'The village wins: the werewolves are gone!', wolves: 'The werewolves win: the village is devoured!', lovers: 'The lovers win, together against everybody!', nobody: 'Nobody survived...', white_wolf: 'The white werewolf wins, alone on the ruins of the village!', piper: 'The piper wins: the whole village dances to his tune!', angel: 'The angel wins: he went straight to heaven!' } as Record<string, string>)[event.a] ?? '');
        case 'reveal': return wt('log.reveal', '%name% was %role%.', [ 'name', 'role' ], [ event.a, role(event.b) ]);
        case 'bot_line': return wt(`bot.${event.b}`, BOT_LINES[parseInt(event.b, 10)] ?? '...', [ 'name' ], [ event.c || '?' ]);
        case 'chat': return event.b;
        default: return null;
    }
};

/** Who says the line: a player for chat and robots' lines (a hidden werewolf for the little girl), the narrator otherwise. */
export const werewolfEventSpeaker = (event: IWerewolfEvent): string | null => (event.type === 'chat' || event.type === 'bot_line' ? event.a || wt('a_werewolf', 'A werewolf') : null);
