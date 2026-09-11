import { describe, expect, it } from 'vitest';
import {
    formatBlockCountdown,
    getGamesLeftStatus,
    getInstructionFrame,
    getOfficialTeamReference,
    getRematchButton,
    getResultHeadline,
    getSkillLevelStars,
    isInstructionPageHighlighted,
    SNOWWAR_INSTRUCTION_PAGES,
    SNOWWAR_NEUTRAL_COLOR,
    SNOWWAR_TEAM_COLORS,
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

describe('formatBlockCountdown (AIR checkBlockStatus)', () => {
    it('formats m:ss with a zero-padded second field', () => {
        expect(formatBlockCountdown(0)).toBe('0:00');
        expect(formatBlockCountdown(9)).toBe('0:09');
        expect(formatBlockCountdown(65)).toBe('1:05');
        expect(formatBlockCountdown(120)).toBe('2:00');
    });

    it('never goes negative or fractional', () => {
        expect(formatBlockCountdown(-4)).toBe('0:00');
        expect(formatBlockCountdown(70.9)).toBe('1:10');
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
