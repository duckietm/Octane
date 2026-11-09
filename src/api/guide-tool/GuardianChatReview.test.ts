import { describe, expect, it, vi } from 'vitest';

vi.mock('../utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

import {
    creationResultCode,
    GUARDIAN_STATUS_FINDING_NEW_VOTER,
    GUARDIAN_STATUS_NO_VOTE,
    GUARDIAN_STATUS_VOTED_BAD,
    GUARDIAN_STATUS_VOTED_OK,
    GUARDIAN_VOTE_FORWARDED,
    guardianResultText,
    guardianStatusIcon,
    guardianStatusText,
    guardianText,
    isAnimatedStatus,
    parseChatReviewRecord,
    pendingTicketWindow,
    reporterFeedbackText,
    reportingStatusCode,
    resolutionCode,
    secondsSinceIncident,
    statusFromVote
} from './GuardianChatReview';

describe('parseChatReviewRecord', () => {
    it('reads the incident date and joins consecutive lines of one user', () => {
        const record = parseChatReviewRecord('2026 10 21 14 24 30;\runused;0;you are dumb\runused;0;really\runused;1;stop it\runused;0;no\r');

        expect(record.incidentTime).toEqual(new Date(2026, 9, 21, 14, 24, 30));
        expect(record.lines).toEqual([
            { userIndex: 0, messages: ['you are dumb', 'really'] },
            { userIndex: 1, messages: ['stop it'] },
            { userIndex: 0, messages: ['no'] }
        ]);
    });

    it('has no date when the header has fewer than six numbers, and skips broken lines', () => {
        const record = parseChatReviewRecord('2026 10 21 14 24;\rbroken line\runused;2;hi');

        expect(record.incidentTime).toBeNull();
        expect(record.lines).toEqual([{ userIndex: 2, messages: ['hi'] }]);
    });

    it('cuts the message at a further ";" as AIR split(";", 3) does', () => {
        expect(parseChatReviewRecord('x;\runused;3;a;b').lines[0].messages).toEqual(['a']);
    });

    it('survives an empty record', () => {
        expect(parseChatReviewRecord('')).toEqual({ incidentTime: null, lines: [] });
        expect(parseChatReviewRecord(null)).toEqual({ incidentTime: null, lines: [] });
    });
});

describe('vote and status tables', () => {
    it('maps the vote codes to the statuses like statusFromVote', () => {
        expect(statusFromVote(0)).toBe(GUARDIAN_STATUS_VOTED_OK);
        expect(statusFromVote(1)).toBe(GUARDIAN_STATUS_VOTED_BAD);
        expect(statusFromVote(2)).toBe(3);
        expect(statusFromVote(GUARDIAN_VOTE_FORWARDED)).toBe(GUARDIAN_STATUS_NO_VOTE);
        expect(statusFromVote(9)).toBe(0);
    });

    it('animates only waiting and searching', () => {
        expect(isAnimatedStatus(0)).toBe(true);
        expect(isAnimatedStatus(GUARDIAN_STATUS_FINDING_NEW_VOTER)).toBe(true);
        expect(isAnimatedStatus(GUARDIAN_STATUS_VOTED_OK)).toBe(false);
    });

    it('reads a refused vote as "refused" in the list and as "inconclusive" as the verdict', () => {
        expect(guardianStatusText(GUARDIAN_STATUS_NO_VOTE)).toBe('The Guardian did not vote.');
        expect(guardianResultText(GUARDIAN_STATUS_NO_VOTE)).toBe('This report has been forwarded to us.');
        expect(guardianStatusIcon(3)).toBe('very-bad');
        expect(guardianStatusIcon(99)).toBe('waiting');
    });

    it('fills parameters of the English fallback', () => {
        expect(guardianText('guide.bully.request.guide.vote.anonymous', ['id'], ['$2'])).toBe('USER $2');
    });
});

describe('reporter feedback', () => {
    it('uses the code of each packet like the official parsers', () => {
        expect([0, 1, 2, 3, 4].map(creationResultCode)).toEqual(['sent', 'blocked', 'nochat', 'alreadyreported', 'invalid']);
        expect([0, 1, 2].map(resolutionCode)).toEqual(['valid', 'valid', 'invalid']);
        expect([0, 1, 2, 3].map(reportingStatusCode)).toEqual(['', '', 'blocked', 'tooquick']);
    });

    it('falls back to the shared note when a code has none of its own', () => {
        expect(reporterFeedbackText('sent', 'note')).toContain('Tools -> Ignore');
        expect(reporterFeedbackText('nochat', 'note')).toContain('call for help');
        expect(reporterFeedbackText('valid', 'caption')).toBe('Thank you!');
    });
});

describe('pending tickets', () => {
    it('opens the window of the request type, or the guide one for its guide', () => {
        expect(pendingTicketWindow(3, false)).toBe('bully');
        expect(pendingTicketWindow(1, false)).toBe('instructions');
        expect(pendingTicketWindow(0, false)).toBe('tour');
        expect(pendingTicketWindow(2, false)).toBe('tour');
        expect(pendingTicketWindow(3, true)).toBe('guide');
        expect(pendingTicketWindow(7, false)).toBeNull();
    });

    it('counts the time since the incident from now', () => {
        expect(secondsSinceIncident(new Date(1_000_000), 1_065_500)).toBe(65);
        expect(secondsSinceIncident(null, 5)).toBe(0);
    });
});
