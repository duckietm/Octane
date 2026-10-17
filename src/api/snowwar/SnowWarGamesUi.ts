/**
 * Pure helpers behind the SnowWar (SnowStorm) games UI: the games-left
 * counter and the end-of-game screen. The leave-block countdown is in
 * SnowWarLeaveBlock.
 * Every rule here mirrors the AIR 13 client (GamesMainViewController /
 * GameEndingViewController / GameLoadingViewController) so the views stay
 * declarative and the arithmetic is unit-testable.
 */

/** AIR: `freeGamesLeft == -1` (Game2AccountGameStatus) means unlimited games. */
export const SNOWWAR_UNLIMITED_GAMES = -1;

export interface SnowWarGamesLeftStatus {
    /** The whole "Total Games Left" region — hidden for unlimited (HC) accounts. */
    showCounter: boolean;
    /** AIR paints the number red with 0 games left, blue otherwise. */
    counterTone: 'red' | 'blue';
    /** Play button caption: `snowwar.play` or, with 0 games left, `catalog.vip.buy.title`. */
    playLabelKey: 'snowwar.play' | 'catalog.vip.buy.title';
    /** Whether pressing play starts a game (else it opens the "get more games" offer). */
    canStart: boolean;
}

/**
 * GamesMainViewController.checkGameAmountStatus / GameEndingViewController.
 * updateGamesLeft: the counter region, its colour and the play caption for a
 * given amount of free games (`-1` = unlimited).
 */
export const getGamesLeftStatus = (freeGamesLeft: number, hasUnlimitedGames = freeGamesLeft === SNOWWAR_UNLIMITED_GAMES): SnowWarGamesLeftStatus => {
    if (hasUnlimitedGames || freeGamesLeft < 0) {
        return { showCounter: false, counterTone: 'blue', playLabelKey: 'snowwar.play', canStart: true };
    }

    if (freeGamesLeft === 0) {
        return { showCounter: true, counterTone: 'red', playLabelKey: 'catalog.vip.buy.title', canStart: false };
    }

    return { showCounter: true, counterTone: 'blue', playLabelKey: 'snowwar.play', canStart: true };
};

/** AIR INSTRUCTION_ASSETS / INSTRUCTION_FRAME_COUNTS: five animated pages, one text key each. */
export const SNOWWAR_INSTRUCTION_PAGES: readonly { asset: string; frames: number; textKey: string }[] = [
    { asset: 'move_', frames: 4, textKey: 'snowwar.instructions.1' },
    { asset: 'throw_1_', frames: 4, textKey: 'snowwar.instructions.2' },
    { asset: 'throw_2_', frames: 5, textKey: 'snowwar.instructions.3' },
    { asset: 'throw_3_', frames: 5, textKey: 'snowwar.instructions.4' },
    { asset: 'balls_', frames: 5, textKey: 'snowwar.instructions.5' }
];

/** AIR INSTRUCTION_FRAME_LENGTH: one animation frame per second. */
export const SNOWWAR_INSTRUCTION_FRAME_MS = 1000;

/** onNext / onPrevious wrap around both ends (`(page + delta + count) % count`). */
export const wrapInstructionPage = (page: number, delta: number, pageCount = SNOWWAR_INSTRUCTION_PAGES.length): number => {
    if (pageCount <= 0) return 0;

    return (((page + delta) % pageCount) + pageCount) % pageCount;
};

/** Which frame (0-based) of a page's animation is showing after `elapsedMs`. The AIR files are numbered from 1. */
export const getInstructionFrame = (elapsedMs: number, frames: number, frameMs = SNOWWAR_INSTRUCTION_FRAME_MS): number => {
    if (frames <= 0) return 0;

    return Math.floor(Math.max(0, elapsedMs) / frameMs) % frames;
};

/** showInstructions: pagination balls up to and including the current page are highlighted. */
export const isInstructionPageHighlighted = (ballIndex: number, currentPage: number): boolean => ballIndex <= currentPage;

/**
 * AIR games_main "get more games" buttons (GamesMainViewController
 * windowEventProc): each buys the token offer with that localization id.
 */
export const SNOWWAR_TOKEN_BUTTONS: readonly { localizationId: string; games: number; asset: string }[] = [
    { localizationId: 'GET_SNOWWAR_TOKENS', games: 10, asset: 'btn_more_games_10' },
    { localizationId: 'GET_SNOWWAR_TOKENS2', games: 100, asset: 'btn_more_games_100' },
    { localizationId: 'GET_SNOWWAR_TOKENS3', games: 300, asset: 'btn_more_games_300' }
];

/**
 * The price text of a token offer with the catalogue keys
 * (`catalog.purchase.price.credits`, `...activitypoints.N`,
 * `...credits_and_activitypoints.N`).
 */
export const getSnowWarTokenPrice = (credits: number, points: number, pointsType: number): { key: string; parameters: string[]; replacements: string[] } => {
    if (credits > 0 && points > 0) {
        return {
            key: `catalog.purchase.price.credits_and_activitypoints.${pointsType}`,
            parameters: ['credits', 'activitypoints', 'pixels'],
            replacements: [String(credits), String(points), String(points)]
        };
    }

    if (points > 0) {
        return { key: `catalog.purchase.price.activitypoints.${pointsType}`, parameters: ['activitypoints', 'pixels'], replacements: [String(points), String(points)] };
    }

    return { key: 'catalog.purchase.price.credits', parameters: ['credits'], replacements: [String(Math.max(0, credits))] };
};

export type SnowWarStarTier = 'none' | 'bronze' | 'silver' | 'gold';

export interface SnowWarSkillStars {
    tier: SnowWarStarTier;
    /** How many of the ten stars are filled with the tier's colour. */
    filled: number;
    total: number;
}

/** Skill levels above 30 render like level 30 (three full rows of gold). */
export const SNOWWAR_MAX_SKILL_LEVEL = 30;
export const SNOWWAR_STARS_PER_ROW = 10;

/**
 * GameEndingViewController.getSkillLevelImage: ten stars, levels 1-10 fill
 * bronze, 11-20 silver, 21-30 gold, with `(level - 1) % 10 + 1` of them lit.
 */
export const getSkillLevelStars = (skillLevel: number): SnowWarSkillStars => {
    const level = Math.min(Math.max(0, Math.floor(skillLevel)), SNOWWAR_MAX_SKILL_LEVEL);

    if (level <= 0) return { tier: 'none', filled: 0, total: SNOWWAR_STARS_PER_ROW };

    const filled = ((level - 1) % SNOWWAR_STARS_PER_ROW) + 1;
    const tier: SnowWarStarTier = level > 20 ? 'gold' : level > 10 ? 'silver' : 'bronze';

    return { tier, filled, total: SNOWWAR_STARS_PER_ROW };
};

/**
 * AIR numbers teams 1 (blue) and 2 (red); our packets number them 0 (red)
 * and 1 (blue) (SnowWarGame round robin). The official text keys (`snowwar.team_1_wins`) and colours
 * are keyed by the AIR reference.
 */
export const getOfficialTeamReference = (teamId: number): 1 | 2 => (teamId === 1 ? 1 : 2);

export const SNOWWAR_TEAM_COLORS: Record<1 | 2, string> = {
    1: '#1077ac', // AIR getTeamColor(1) = 0xFF1077AC (blue; also the games-left digit colour)
    2: '#fd6859' // AIR getTeamColor(2) = 0xFFFD6859 (red)
};

/** AIR getNeutralTeamColor() = 0x7D8A9A. */
export const SNOWWAR_NEUTRAL_COLOR = '#7d8a9a';

export type SnowWarResultHeadline =
    | { type: 'tie'; textKey: 'snowwar.result.tie'; color: string }
    | { type: 'winner'; textKey: `snowwar.team_${1 | 2}_wins`; teamId: number; color: string };

/**
 * The ending banner. AIR reads `resultType` (2 = tie) and `winnerId` from
 * Game2GameResult; our OnGameEnding packet only carries the team scores, so
 * the winner is the top-scoring team and equal top scores are a tie.
 */
export const getResultHeadline = (teams: readonly { teamId: number; score: number }[]): SnowWarResultHeadline => {
    if (!teams.length) return { type: 'tie', textKey: 'snowwar.result.tie', color: SNOWWAR_NEUTRAL_COLOR };

    const ordered = [...teams].sort((a, b) => b.score - a.score);
    const isTie = ordered.length > 1 && ordered[0].score === ordered[1].score;

    if (isTie) return { type: 'tie', textKey: 'snowwar.result.tie', color: SNOWWAR_NEUTRAL_COLOR };

    const reference = getOfficialTeamReference(ordered[0].teamId);

    return { type: 'winner', textKey: `snowwar.team_${reference}_wins`, teamId: ordered[0].teamId, color: SNOWWAR_TEAM_COLORS[reference] };
};

export type SnowWarRematchButton =
    | { kind: 'join_hc'; textKey: 'catalog.vip.buy.title' }
    | { kind: 'rematch'; textKey: 'snowwar.rematch'; seconds: number }
    | { kind: 'please_wait'; textKey: 'snowwar.please_wait'; seconds: number };

/**
 * GameEndingViewController.updateDialog: with 0 games left the button sells
 * HC, otherwise it counts down as "Rematch (n)" and, once pressed, as
 * "Please wait (n)".
 */
export const getRematchButton = (freeGamesLeft: number, hasUnlimitedGames: boolean, seconds: number, rematchRequested: boolean): SnowWarRematchButton => {
    if (!hasUnlimitedGames && freeGamesLeft === 0) return { kind: 'join_hc', textKey: 'catalog.vip.buy.title' };

    const clamped = Math.max(0, Math.floor(seconds));

    return rematchRequested
        ? { kind: 'please_wait', textKey: 'snowwar.please_wait', seconds: clamped }
        : { kind: 'rematch', textKey: 'snowwar.rematch', seconds: clamped };
};

/**
 * AIR plural texts such as `snowwar.lobby_game_start_countdown`
 * (`%{seconds|0 seconden|1 seconde|%% seconden} voor de Storm!`): picks the
 * zero / one / many form for `value` and fills `%%`. The renderer only
 * matches upper-case parameter names, so SnowWar texts go through this.
 * Plain `%parameter%` placeholders are filled too.
 */
export const applySnowWarPlural = (text: string, parameter: string, value: number): string =>
{
    if (!text) return text;

    const plural = new RegExp(`%\\{${ parameter }\\|([^|]*)\\|([^|]*)\\|([^}]*)\\}`, 'i');
    const count = String(value);

    return text
        .replace(plural, (_match, zero: string, one: string, many: string) => ((value === 0) ? zero : (value === 1) ? one : many).replace('%%', count))
        .split(`%${ parameter }%`).join(count);
};

export interface SnowWarLeaderboardView
{
    weekly: boolean;
    friendsOnly: boolean;
    groups: boolean;
}

export type SnowWarLeaderboardAction = 'everyone' | 'friends' | 'groups' | 'this_week' | 'all_time';

/**
 * AIR LeaderboardViewController onChangeView / onChangeFriendsView /
 * onChangeGroupView / onThisWeekButtonDown / onAllTimeButtonDown: a category
 * link keeps the period when that category is already showing and opens its
 * weekly table otherwise; the two tabs switch the period within the category.
 */
export const getLeaderboardTarget = (action: SnowWarLeaderboardAction, current: SnowWarLeaderboardView): SnowWarLeaderboardView =>
{
    const category = current.groups ? 'groups' : current.friendsOnly ? 'friends' : 'everyone';

    switch (action)
    {
        case 'this_week':
        case 'all_time':
            return { ...current, weekly: (action === 'this_week') };
        default:
            return {
                weekly: (category === action) ? current.weekly : true,
                friendsOnly: (action === 'friends'),
                groups: (action === 'groups')
            };
    }
};

/**
 * The rows of one page (AIR viewSize 8). In the everyone and group tables
 * the viewer's own row stays visible: when it is not on the page it takes
 * the last slot, with empty rows (`null`) between, as AIR pads its list.
 */
export const getLeaderboardRows = <T extends { userId: number }>(entries: readonly T[], offset: number, pageSize: number, ownId: number, pinOwn: boolean): (T | null)[] =>
{
    const page = entries.slice(offset, offset + pageSize);

    if (!pinOwn || (ownId <= 0) || page.some(entry => entry.userId === ownId)) return page;

    const own = entries.find(entry => entry.userId === ownId);

    if (!own) return page;

    const rows: (T | null)[] = page.slice(0, pageSize - 1);

    while (rows.length < (pageSize - 1)) rows.push(null);

    rows.push(own);

    return rows;
};
