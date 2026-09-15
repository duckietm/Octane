import { describe, expect, it } from 'vitest';
import type { IRoomCompetitionState } from '../../../../hooks/rooms/widgets/useRoomCompetition';
import {
    COMPETITION_RESULT_CONFIRM,
    COMPETITION_RESULT_DOOR_CLOSED,
    COMPETITION_RESULT_MISSING_FURNI,
    COMPETITION_RESULT_NOT_ELIGIBLE,
    COMPETITION_RESULT_READY,
    COMPETITION_RESULT_RULES,
    COMPETITION_RESULT_SUBMITTED,
    competitionAction,
    plainText
} from './roomCompetition.helpers';

const state = (overrides: Partial<IRoomCompetitionState>): IRoomCompetitionState => ({
    mode: 'submit',
    goalId: 1,
    goalCode: 'spring',
    result: COMPETITION_RESULT_RULES,
    requiredFurnis: [],
    missingFurnis: [],
    votesRemaining: 0,
    ...overrides
});

describe('competitionAction', () => {
    it('walks the three official steps in order', () => {
        expect(competitionAction(state({ result: COMPETITION_RESULT_RULES }))).toBe('accept');
        expect(competitionAction(state({ result: COMPETITION_RESULT_READY }))).toBe('submit');
        expect(competitionAction(state({ result: COMPETITION_RESULT_CONFIRM }))).toBe('confirm');
    });

    it('offers nothing to press for a room the owner cannot fix from here', () => {
        expect(competitionAction(state({ result: COMPETITION_RESULT_MISSING_FURNI }))).toBeNull();
        expect(competitionAction(state({ result: COMPETITION_RESULT_DOOR_CLOSED }))).toBeNull();
    });

    it('closes once the room is in, and sends you looking for another one when it cannot enter', () => {
        expect(competitionAction(state({ result: COMPETITION_RESULT_SUBMITTED }))).toBe('close');
        expect(competitionAction(state({ result: COMPETITION_RESULT_NOT_ELIGIBLE }))).toBe('navigator');
    });

    it('offers the vote only to somebody eligible with votes left', () => {
        expect(competitionAction(state({ mode: 'vote', result: 0, votesRemaining: 2 }))).toBe('vote');
        expect(competitionAction(state({ mode: 'vote', result: 0, votesRemaining: 0 }))).toBeNull();
        expect(competitionAction(state({ mode: 'vote', result: 1, votesRemaining: 2 }))).toBeNull();
    });

    it('has nothing to offer without a competition', () => {
        expect(competitionAction(null)).toBeNull();
    });
});

describe('plainText', () => {
    it('drops the markup the official texts carry', () => {
        expect(plainText('<u>See all participants</u>')).toBe('See all participants');
        expect(plainText('Jump back to our <u>landing page</u>!')).toBe('Jump back to our landing page!');
        expect(plainText('no markup')).toBe('no markup');
    });
});
