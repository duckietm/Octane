import { IgnoreUserIdComposer, RemoveFriendComposer } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import { buildReportFollowUpComposers, shouldIgnoreAndUnfriendReportedUser } from './reportFollowUp';

describe('report follow-up', () => {
    it('ignores and unfriends the reported user after a normal report', () => {
        expect(shouldIgnoreAndUnfriendReportedUser(12, 3)).toBe(true);
    });

    it('leaves the relationship alone for topic 21 and for reports without a user', () => {
        expect(shouldIgnoreAndUnfriendReportedUser(12, 21)).toBe(false);
        expect(shouldIgnoreAndUnfriendReportedUser(0, 3)).toBe(false);
        expect(shouldIgnoreAndUnfriendReportedUser(-1, 3)).toBe(false);
    });

    it('sends the ignore alone for a stranger and adds the friend removal for a friend', () => {
        const stranger = buildReportFollowUpComposers(12, false);
        const friend = buildReportFollowUpComposers(12, true);

        expect(stranger).toHaveLength(1);
        expect(stranger[0]).toBeInstanceOf(IgnoreUserIdComposer);
        expect(stranger[0].getMessageArray()).toEqual([12]);

        expect(friend).toHaveLength(2);
        expect(friend[1]).toBeInstanceOf(RemoveFriendComposer);
        expect(friend[1].getMessageArray()).toEqual([1, 12]);
    });
});
