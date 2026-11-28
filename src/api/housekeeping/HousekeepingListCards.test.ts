import { describe, expect, it } from 'vitest';
import { pickHousekeepingListCardFields } from './HousekeepingListCards';

describe('pickHousekeepingListCardFields', () => {
    it('puts the user, the time and the message of a chat log on the card', () => {
        expect(pickHousekeepingListCardFields(['time', 'id', 'user', 'room_id', 'room', 'message'])).toEqual({ title: 2, time: 0, body: 5, chips: [] });
    });

    it('turns short values into at most three chips', () => {
        const fields = pickHousekeepingListCardFields(['id', 'user', 'type', 'staff', 'ip', 'rank', 'reason', 'time']);

        expect(fields.title).toBe(1);
        expect(fields.body).toBe(6);
        expect(fields.time).toBe(7);
        expect(fields.chips).toEqual([2, 5, 3]);
    });

    it('falls back to the first column when no known title is there', () => {
        expect(pickHousekeepingListCardFields(['word', 'replacement'])).toEqual({ title: 0, time: -1, body: -1, chips: [] });
    });

    it('has no fields without columns', () => {
        expect(pickHousekeepingListCardFields([])).toEqual({ title: -1, time: -1, body: -1, chips: [] });
    });
});
