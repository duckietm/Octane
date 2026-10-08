import { describe, expect, it } from 'vitest';
import { groupHousekeepingTickets, HK_TICKET_STATE_OPEN, HK_TICKET_STATE_PICKED } from './HousekeepingTickets';

const ticket = (issueId: number, state: number, pickerUserId: number, age: number) => ({ issueId, state, pickerUserId, issueAgeInMilliseconds: age });

describe('groupHousekeepingTickets', () => {
    it('splits open, mine and others, oldest first, and drops closed tickets', () => {
        const groups = groupHousekeepingTickets(
            [
                ticket(1, HK_TICKET_STATE_OPEN, 0, 1_000),
                ticket(2, HK_TICKET_STATE_OPEN, 0, 5_000),
                ticket(3, HK_TICKET_STATE_PICKED, 7, 2_000),
                ticket(4, HK_TICKET_STATE_PICKED, 9, 3_000),
                ticket(5, 3, 7, 9_000)
            ],
            7
        );

        expect(groups.open.map((t) => t.issueId)).toEqual([2, 1]);
        expect(groups.mine.map((t) => t.issueId)).toEqual([3]);
        expect(groups.others.map((t) => t.issueId)).toEqual([4]);
    });
});
