import { describe, expect, it } from 'vitest';
import {
    CHAT_REVIEW_STATUS_BAD,
    CHAT_REVIEW_STATUS_OK,
    CHAT_REVIEW_STATUS_REFUSED,
    CHAT_REVIEW_STATUS_SEARCHING,
    CHAT_REVIEW_STATUS_VERY_BAD,
    CHAT_REVIEW_STATUS_WAITING,
    CHAT_REVIEW_VOTE_BAD,
    CHAT_REVIEW_VOTE_NONE,
    CHAT_REVIEW_VOTE_OK,
    CHAT_REVIEW_VOTE_VERY_BAD,
    chatReviewStatusFromVote,
    getChatReviewCreationCode,
    getChatReviewReporterTextKeys,
    getChatReviewResolutionCode,
    getChatReviewResultKey,
    getChatReviewStatusKey,
    isChatReviewStatusAnimated,
    parseChatReviewRecord
} from './ChatReviewUtilities';

describe('chat review utilities', () => {
    it('maps the vote codes to the status indexes like statusFromVote', () => {
        expect(chatReviewStatusFromVote(CHAT_REVIEW_VOTE_NONE)).toBe(CHAT_REVIEW_STATUS_REFUSED);
        expect(chatReviewStatusFromVote(CHAT_REVIEW_VOTE_OK)).toBe(CHAT_REVIEW_STATUS_OK);
        expect(chatReviewStatusFromVote(CHAT_REVIEW_VOTE_BAD)).toBe(CHAT_REVIEW_STATUS_BAD);
        expect(chatReviewStatusFromVote(CHAT_REVIEW_VOTE_VERY_BAD)).toBe(CHAT_REVIEW_STATUS_VERY_BAD);
        expect(chatReviewStatusFromVote(99)).toBe(CHAT_REVIEW_STATUS_WAITING);
    });

    it('reads the status text keys from STATUS_KEYS and the verdict from RESULT_KEYS', () => {
        expect(getChatReviewStatusKey(CHAT_REVIEW_STATUS_REFUSED)).toBe('guide.bully.request.guide.results.outcome.refused');
        expect(getChatReviewStatusKey(CHAT_REVIEW_STATUS_SEARCHING)).toBe('guide.bully.request.guide.results.outcome.searching');
        expect(getChatReviewStatusKey(42)).toBe('guide.bully.request.guide.results.outcome.waiting');
        expect(getChatReviewResultKey(CHAT_REVIEW_VOTE_NONE)).toBe('guide.bully.request.guide.results.outcome.inconclusive');
        expect(getChatReviewResultKey(CHAT_REVIEW_VOTE_VERY_BAD)).toBe('guide.bully.request.guide.results.outcome.very_bad');
    });

    it('animates only the waiting and searching statuses', () => {
        expect(isChatReviewStatusAnimated(CHAT_REVIEW_STATUS_WAITING)).toBe(true);
        expect(isChatReviewStatusAnimated(CHAT_REVIEW_STATUS_SEARCHING)).toBe(true);
        expect(isChatReviewStatusAnimated(CHAT_REVIEW_STATUS_OK)).toBe(false);
    });

    it('parses the incident time and groups consecutive lines of the same user', () => {
        const now = new Date(2026, 8, 8, 12, 10, 0);
        const record = '2026 09 08 12 00 00;\runused;0;hey you\runused;0;are you there?\runused;3;leave me alone\runused;0;ok; fine\r';

        const parsed = parseChatReviewRecord(record, now);

        expect(parsed.incidentAgeSeconds).toBe(600);
        expect(parsed.entries).toEqual([
            { userIndex: 0, isSuspect: true, lines: ['hey you', 'are you there?'] },
            { userIndex: 3, isSuspect: false, lines: ['leave me alone'] },
            { userIndex: 0, isSuspect: true, lines: ['ok; fine'] }
        ]);
    });

    it('falls back to "now" when the timestamp has fewer than six numbers and skips broken lines', () => {
        const parsed = parseChatReviewRecord('2026 9 8 24 30;\rgarbage\runused;x;nope\runused;1;hello\r', new Date());

        expect(parsed.incidentAgeSeconds).toBe(0);
        expect(parsed.entries).toEqual([{ userIndex: 1, isSuspect: false, lines: ['hello'] }]);
    });

    it('maps the reporter feedback codes like the official parsers', () => {
        expect(getChatReviewCreationCode(0)).toBe('sent');
        expect(getChatReviewCreationCode(1)).toBe('blocked');
        expect(getChatReviewCreationCode(2)).toBe('nochat');
        expect(getChatReviewCreationCode(3)).toBe('alreadyreported');
        expect(getChatReviewCreationCode(7)).toBe('invalid');
        expect(getChatReviewResolutionCode(0)).toBe('valid');
        expect(getChatReviewResolutionCode(1)).toBe('valid');
        expect(getChatReviewResolutionCode(2)).toBe('invalid');
        expect(getChatReviewReporterTextKeys('sent', 'note')).toEqual(['guide.bully.request.reporter.sent.note', 'guide.bully.request.reporter.note']);
    });
});
