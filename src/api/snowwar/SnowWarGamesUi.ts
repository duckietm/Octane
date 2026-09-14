/**
 * Pure helpers behind the SnowWar (SnowStorm) games UI — the games-left
 * counter, the "How To Play" instructions pager and the end-of-game screen.
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

/** GamesMainViewController.checkBlockStatus: the play button shows `m:ss` while the player is blocked. */
export const formatBlockCountdown = (seconds: number): string => {
    const total = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;

    return `${minutes}:${rest < 10 ? `0${rest}` : rest}`;
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

/** Which frame of a page's animation is showing after `elapsedMs`. */
export const getInstructionFrame = (elapsedMs: number, frames: number, frameMs = SNOWWAR_INSTRUCTION_FRAME_MS): number => {
    if (frames <= 0) return 0;

    return Math.floor(Math.max(0, elapsedMs) / frameMs) % frames;
};

/** showInstructions: pagination balls up to and including the current page are highlighted. */
export const isInstructionPageHighlighted = (ballIndex: number, currentPage: number): boolean => ballIndex <= currentPage;

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
 * and 1 (blue). The official text keys (`snowwar.team_1_wins`) and colours
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
