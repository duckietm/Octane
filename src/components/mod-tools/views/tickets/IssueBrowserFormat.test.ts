import { describe, expect, it } from 'vitest';
import {
    countBundledMessages,
    formatIssueOpenTime,
    getIssueIdsPickedBy,
    getIssueOpenMilliseconds,
    IssueBrowserEntry,
    pickNextPriorityIssue,
    sortIssuesForBrowser
} from './IssueBrowserFormat';

const issue = (overrides: Partial<IssueBrowserEntry>): IssueBrowserEntry => ({
    issueId: 1,
    state: 1,
    priority: 5,
    groupingId: 0,
    issueAgeInMilliseconds: 0,
    reportedUserId: 100,
    pickerUserId: 0,
    message: '',
    ...overrides
});

describe('formatIssueOpenTime', () => {
    it('renders minutes and seconds with two digits each', () => {
        expect(formatIssueOpenTime(0)).toBe('00:00');
        expect(formatIssueOpenTime(65_000)).toBe('01:05');
    });

    it('keeps counting minutes past the hour instead of folding them away', () => {
        expect(formatIssueOpenTime(2 * 3_600_000 + 5_000)).toBe('120:05');
    });

    it('treats garbage as zero', () => {
        expect(formatIssueOpenTime(Number.NaN)).toBe('00:00');
        expect(formatIssueOpenTime(-5_000)).toBe('00:00');
    });
});

describe('getIssueOpenMilliseconds', () => {
    it('adds the time elapsed since the packet arrived to the age it carried', () => {
        expect(getIssueOpenMilliseconds(30_000, 1_000, 11_000)).toBe(40_000);
    });

    it('never goes backwards when clocks disagree', () => {
        expect(getIssueOpenMilliseconds(30_000, 11_000, 1_000)).toBe(30_000);
    });
});

describe('pickNextPriorityIssue', () => {
    it('picks the lowest priority number among the open issues', () => {
        const chosen = pickNextPriorityIssue([issue({ issueId: 1, priority: 3 }), issue({ issueId: 2, priority: 1 }), issue({ issueId: 3, priority: 2 })]);

        expect(chosen.issueId).toBe(2);
    });

    it('breaks a tie on the smaller age, as the official client does', () => {
        const chosen = pickNextPriorityIssue([
            issue({ issueId: 1, priority: 1, issueAgeInMilliseconds: 5_000 }),
            issue({ issueId: 2, priority: 1, issueAgeInMilliseconds: 2_000 })
        ]);

        expect(chosen.issueId).toBe(2);
    });

    it('ignores issues someone already picked', () => {
        expect(pickNextPriorityIssue([issue({ issueId: 1, priority: 0, state: 2 }), issue({ issueId: 2, priority: 9 })]).issueId).toBe(2);
        expect(pickNextPriorityIssue([issue({ state: 2 })])).toBeNull();
        expect(pickNextPriorityIssue([])).toBeNull();
    });
});

describe('getIssueIdsPickedBy', () => {
    it('lists only the issues this moderator holds', () => {
        const issues = [
            issue({ issueId: 1, state: 2, pickerUserId: 7 }),
            issue({ issueId: 2, state: 2, pickerUserId: 8 }),
            issue({ issueId: 3, state: 1, pickerUserId: 7 }),
            issue({ issueId: 4, state: 2, pickerUserId: 7 })
        ];

        expect(getIssueIdsPickedBy(issues, 7)).toEqual([1, 4]);
    });
});

describe('countBundledMessages', () => {
    it('counts messages across the reports bundled with the issue', () => {
        const bundle = [
            issue({ issueId: 1, groupingId: 5, message: 'he swore' }),
            issue({ issueId: 2, groupingId: 5, message: '' }),
            issue({ issueId: 3, groupingId: 5, message: 'again' }),
            issue({ issueId: 4, groupingId: 5, reportedUserId: 999, message: 'other user' }),
            issue({ issueId: 5, groupingId: 5, state: 2, pickerUserId: 3, message: 'picked' })
        ];

        expect(countBundledMessages(bundle, bundle[0])).toBe(2);
    });

    it('stands alone without a grouping id', () => {
        const alone = issue({ groupingId: 0, message: 'hi' });

        expect(countBundledMessages([alone, issue({ groupingId: 0, message: 'other' })], alone)).toBe(1);
        expect(countBundledMessages([], issue({ groupingId: 0 }))).toBe(0);
    });
});

describe('sortIssuesForBrowser', () => {
    it('orders by score and then by age without touching the input', () => {
        const input = [
            issue({ issueId: 1, priority: 2, issueAgeInMilliseconds: 10 }),
            issue({ issueId: 2, priority: 1, issueAgeInMilliseconds: 50 }),
            issue({ issueId: 3, priority: 1, issueAgeInMilliseconds: 5 })
        ];

        expect(sortIssuesForBrowser(input).map((entry) => entry.issueId)).toEqual([3, 2, 1]);
        expect(input.map((entry) => entry.issueId)).toEqual([1, 2, 3]);
    });
});
