import { describe, expect, it } from 'vitest';
import {
    applySnowWarPlural,
    getLeaderboardRows,
    getLeaderboardTarget,
    getGamesLeftStatus,
    getInstructionFrame,
    getOfficialTeamReference,
    getRematchButton,
    getResultHeadline,
    getSkillLevelStars,
    getSnowWarTokenPrice,
    isInstructionPageHighlighted,
    SNOWWAR_INSTRUCTION_PAGES,
    SNOWWAR_NEUTRAL_COLOR,
    SNOWWAR_TEAM_COLORS,
    SNOWWAR_TOKEN_BUTTONS,
    wrapInstructionPage
} from './SnowWarGamesUi';

describe('getGamesLeftStatus (AIR checkGameAmountStatus)', () => {
    it('hides the counter and keeps Play for unlimited (HC) accounts', () => {
        expect(getGamesLeftStatus(-1)).toEqual({ showCounter: false, counterTone: 'blue', playLabelKey: 'snowwar.play', canStart: true });
        expect(getGamesLeftStatus(3, true).showCounter).toBe(false);
    });

    it('paints 0 games red and turns the play button into Join HC', () => {
        expect(getGamesLeftStatus(0)).toEqual({ showCounter: true, counterTone: 'red', playLabelKey: 'catalog.vip.buy.title', canStart: false });
    });

    it('paints a positive amount blue with the normal Play caption', () => {
        expect(getGamesLeftStatus(7)).toEqual({ showCounter: true, counterTone: 'blue', playLabelKey: 'snowwar.play', canStart: true });
    });
});

describe('getSkillLevelStars (AIR getSkillLevelImage)', () => {
    it('shows no lit stars at level 0', () => {
        expect(getSkillLevelStars(0)).toEqual({ tier: 'none', filled: 0, total: 10 });
        expect(getSkillLevelStars(-3).filled).toBe(0);
    });

    it('fills bronze for 1-10, silver for 11-20 and gold for 21-30', () => {
        expect(getSkillLevelStars(1)).toEqual({ tier: 'bronze', filled: 1, total: 10 });
        expect(getSkillLevelStars(10)).toEqual({ tier: 'bronze', filled: 10, total: 10 });
        expect(getSkillLevelStars(11)).toEqual({ tier: 'silver', filled: 1, total: 10 });
        expect(getSkillLevelStars(20)).toEqual({ tier: 'silver', filled: 10, total: 10 });
        expect(getSkillLevelStars(21)).toEqual({ tier: 'gold', filled: 1, total: 10 });
        expect(getSkillLevelStars(30)).toEqual({ tier: 'gold', filled: 10, total: 10 });
    });

    it('clamps levels above 30 to a full gold row', () => {
        expect(getSkillLevelStars(57)).toEqual({ tier: 'gold', filled: 10, total: 10 });
    });
});

describe('end-of-game headline (AIR GameEndingViewController)', () => {
    it('maps our team ids to the AIR references (1 blue, 2 red)', () => {
        expect(getOfficialTeamReference(1)).toBe(1);
        expect(getOfficialTeamReference(0)).toBe(2);
    });

    it('names the top-scoring team with the official key and colour', () => {
        expect(
            getResultHeadline([
                { teamId: 0, score: 12 },
                { teamId: 1, score: 30 }
            ])
        ).toEqual({ type: 'winner', textKey: 'snowwar.team_1_wins', teamId: 1, color: SNOWWAR_TEAM_COLORS[1] });
        expect(
            getResultHeadline([
                { teamId: 0, score: 40 },
                { teamId: 1, score: 30 }
            ])
        ).toEqual({ type: 'winner', textKey: 'snowwar.team_2_wins', teamId: 0, color: SNOWWAR_TEAM_COLORS[2] });
    });

    it('calls equal top scores a tie in the neutral colour', () => {
        expect(
            getResultHeadline([
                { teamId: 0, score: 5 },
                { teamId: 1, score: 5 }
            ])
        ).toEqual({ type: 'tie', textKey: 'snowwar.result.tie', color: SNOWWAR_NEUTRAL_COLOR });
        expect(getResultHeadline([]).type).toBe('tie');
    });

    it('sells HC with 0 games left, else counts down Rematch then Please wait', () => {
        expect(getRematchButton(0, false, 20, false)).toEqual({ kind: 'join_hc', textKey: 'catalog.vip.buy.title' });
        expect(getRematchButton(0, true, 20, false)).toEqual({ kind: 'rematch', textKey: 'snowwar.rematch', seconds: 20 });
        expect(getRematchButton(3, false, 12.7, false)).toEqual({ kind: 'rematch', textKey: 'snowwar.rematch', seconds: 12 });
        expect(getRematchButton(3, false, -1, true)).toEqual({ kind: 'please_wait', textKey: 'snowwar.please_wait', seconds: 0 });
    });
});

describe('instructions pager (AIR GamesMainViewController)', () => {
    it('has the five official pages with their frame counts and text keys', () => {
        expect(SNOWWAR_INSTRUCTION_PAGES.map((page) => page.frames)).toEqual([4, 4, 5, 5, 5]);
        expect(SNOWWAR_INSTRUCTION_PAGES.map((page) => page.textKey)).toEqual([1, 2, 3, 4, 5].map((n) => `snowwar.instructions.${n}`));
    });

    it('wraps next and previous around both ends', () => {
        expect(wrapInstructionPage(4, 1)).toBe(0);
        expect(wrapInstructionPage(0, -1)).toBe(4);
        expect(wrapInstructionPage(2, 1)).toBe(3);
        expect(wrapInstructionPage(0, -7, 3)).toBe(2);
        expect(wrapInstructionPage(3, 1, 0)).toBe(0);
    });

    it('advances one animation frame per second and loops', () => {
        expect(getInstructionFrame(0, 4)).toBe(0);
        expect(getInstructionFrame(999, 4)).toBe(0);
        expect(getInstructionFrame(1000, 4)).toBe(1);
        expect(getInstructionFrame(4000, 4)).toBe(0);
        expect(getInstructionFrame(4500, 5)).toBe(4);
        expect(getInstructionFrame(-50, 4)).toBe(0);
        expect(getInstructionFrame(5000, 0)).toBe(0);
    });

    it('highlights every pagination ball up to the current page', () => {
        expect([0, 1, 2, 3, 4].map((ball) => isInstructionPageHighlighted(ball, 2))).toEqual([true, true, true, false, false]);
    });
});

describe('get more games (AIR games_main token buttons)', () => {
    it('maps the three buttons to the three offers', () => {
        expect(SNOWWAR_TOKEN_BUTTONS.map((button) => button.localizationId)).toEqual(['GET_SNOWWAR_TOKENS', 'GET_SNOWWAR_TOKENS2', 'GET_SNOWWAR_TOKENS3']);
        expect(SNOWWAR_TOKEN_BUTTONS.map((button) => button.games)).toEqual([10, 100, 300]);
    });

    it('picks the catalogue price text for credits, points or both', () => {
        expect(getSnowWarTokenPrice(10, 0, 0)).toEqual({ key: 'catalog.purchase.price.credits', parameters: ['credits'], replacements: ['10'] });
        expect(getSnowWarTokenPrice(0, 25, 5).key).toBe('catalog.purchase.price.activitypoints.5');
        expect(getSnowWarTokenPrice(3, 25, 0).key).toBe('catalog.purchase.price.credits_and_activitypoints.0');
    });
});

describe('applySnowWarPlural (AIR %{name|zero|one|many} texts)', () => {
    const text = '%{seconds|0 seconden|1 seconde|%% seconden} voor de Storm!';

    it('picks the zero, one and many forms', () => {
        expect(applySnowWarPlural(text, 'seconds', 0)).toBe('0 seconden voor de Storm!');
        expect(applySnowWarPlural(text, 'seconds', 1)).toBe('1 seconde voor de Storm!');
        expect(applySnowWarPlural(text, 'seconds', 7)).toBe('7 seconden voor de Storm!');
    });

    it('fills plain placeholders and leaves other texts alone', () => {
        expect(applySnowWarPlural('Plaats in wachtrij: %position%', 'position', 3)).toBe('Plaats in wachtrij: 3');
        expect(applySnowWarPlural('Wacht op meer spelers...', 'seconds', 3)).toBe('Wacht op meer spelers...');
        expect(applySnowWarPlural('%{SECONDS|a|b|%% c}', 'seconds', 4)).toBe('4 c');
    });
});

describe('leaderboard views (AIR LeaderboardViewController)', () => {
    const view = (weekly: boolean, friendsOnly: boolean, groups: boolean) => ({ weekly, friendsOnly, groups });

    it('opens the weekly table of another category and keeps the period in the same one', () => {
        expect(getLeaderboardTarget('everyone', view(false, true, false))).toEqual(view(true, false, false));
        expect(getLeaderboardTarget('friends', view(false, true, false))).toEqual(view(false, true, false));
        expect(getLeaderboardTarget('groups', view(false, false, false))).toEqual(view(true, false, true));
        expect(getLeaderboardTarget('groups', view(false, false, true))).toEqual(view(false, false, true));
    });

    it('switches the period within the category with the tabs', () => {
        expect(getLeaderboardTarget('all_time', view(true, true, false))).toEqual(view(false, true, false));
        expect(getLeaderboardTarget('this_week', view(false, false, true))).toEqual(view(true, false, true));
    });

    it('pins the own row to the last slot with empty rows between', () => {
        const entries = Array.from({ length: 20 }, (_, index) => ({ userId: index + 1 }));

        expect(getLeaderboardRows(entries, 0, 8, 3, true).map(row => row?.userId ?? null)).toEqual([ 1, 2, 3, 4, 5, 6, 7, 8 ]);
        expect(getLeaderboardRows(entries, 0, 8, 15, true).map(row => row?.userId ?? null)).toEqual([ 1, 2, 3, 4, 5, 6, 7, 15 ]);
        expect(getLeaderboardRows(entries.slice(0, 3).concat([ { userId: 15 } ]), 0, 8, 15, true).map(row => row?.userId ?? null)).toEqual([ 1, 2, 3, 15 ]);
        expect(getLeaderboardRows(entries.slice(0, 3), 0, 8, 99, true)).toHaveLength(3);
        expect(getLeaderboardRows(entries, 0, 8, 15, false).map(row => row?.userId ?? null)).toEqual([ 1, 2, 3, 4, 5, 6, 7, 8 ]);
    });
});
