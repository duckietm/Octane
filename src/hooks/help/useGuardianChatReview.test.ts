import { describe, expect, it, vi } from 'vitest';

vi.mock('../../api', async () => {
    const review = await import('../../api/guide-tool/GuardianChatReview');
    const state = await import('../../api/guide-tool/GuideSessionState');

    return { ...review, ...state, SendMessageComposer: vi.fn() };
});
vi.mock('../events', () => ({ useMessageEvent: vi.fn() }));
vi.mock('../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

import { GuideSessionState } from '../../api/guide-tool/GuideSessionState';
import { GUARDIAN_NO_VOTE, guardianChatReviewReducer, initialGuardianChatReviewState } from './useGuardianChatReview';

describe('guardianChatReviewReducer', () => {
    it('walks the AIR states from the offer to the verdict', () => {
        let state = guardianChatReviewReducer(initialGuardianChatReviewState, { type: 'offered', acceptanceTimeout: 90 });

        expect(state.state).toBe(GuideSessionState.GUARDIAN_CHAT_REVIEW_ACCEPT);
        expect(state.countdownSeconds).toBe(90);

        state = guardianChatReviewReducer(state, { type: 'accepted' });
        expect(state.state).toBe(GuideSessionState.GUARDIAN_CHAT_REVIEW_WAIT_FOR_VOTERS);
        expect(state.countdownSeconds).toBe(-1);

        state = guardianChatReviewReducer(state, { type: 'started', votingTimeout: 117, chatRecord: '2026 1 2 3 4 5;\runused;0;hey' });
        expect(state.state).toBe(GuideSessionState.GUARDIAN_CHAT_REVIEW_VOTE);
        expect(state.countdownSeconds).toBe(117);
        expect(state.record?.lines).toEqual([{ userIndex: 0, messages: ['hey'] }]);

        state = guardianChatReviewReducer(state, { type: 'voted', vote: 1 });
        expect(state.state).toBe(GuideSessionState.GUARDIAN_CHAT_REVIEW_WAIT_FOR_RESULTS);
        expect(state.ownVote).toBe(1);

        state = guardianChatReviewReducer(state, { type: 'status', statuses: [0, 2, 5] });
        expect(state.statuses).toEqual([0, 2, 5]);

        state = guardianChatReviewReducer(state, { type: 'results', winningVote: 1, ownVote: 1, statuses: [2, 2] });
        expect(state.state).toBe(GuideSessionState.GUARDIAN_CHAT_REVIEW_RESULTS);
        expect(state.winningVote).toBe(1);
        expect(state.statuses).toEqual([2, 2]);

        state = guardianChatReviewReducer(state, { type: 'closed' });
        expect(state.state).toBeNull();
        expect(state.ownVote).toBe(GUARDIAN_NO_VOTE);
    });

    it('ignores the voting status outside the "waiting for results" window, as AIR does', () => {
        const voting = guardianChatReviewReducer(initialGuardianChatReviewState, { type: 'started', votingTimeout: 30, chatRecord: '' });

        expect(guardianChatReviewReducer(voting, { type: 'status', statuses: [1] })).toBe(voting);
    });

    it('restarts the countdown on every window', () => {
        const offered = guardianChatReviewReducer(initialGuardianChatReviewState, { type: 'offered', acceptanceTimeout: 90 });
        const again = guardianChatReviewReducer(offered, { type: 'offered', acceptanceTimeout: 90 });

        expect(again.countdownId).not.toBe(offered.countdownId);
    });
});
