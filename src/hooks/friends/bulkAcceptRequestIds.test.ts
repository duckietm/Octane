/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { MessengerRequest } from '../../api';
import { bulkAcceptRequestIds } from './useFriends';

const request = (id: number): MessengerRequest => {
    const value = new MessengerRequest();

    value.populate({ requestId: id, requesterUserId: id, requesterName: `user${id}`, figureString: 'hd-180-1' } as never);

    return value;
};

describe('bulkAcceptRequestIds', () => {
    it('answers every pending request in one packet', () => {
        expect(bulkAcceptRequestIds([request(1), request(2), request(3)])).toEqual([1, 2, 3]);
    });

    it('sends nothing when there is nothing pending', () => {
        expect(bulkAcceptRequestIds([])).toEqual([]);
    });

    it('stays inside the count the server accepts', () => {
        // AcceptFriendRequestEvent refuses a count above 100 outright, so asking for
        // more than that would accept none of them.
        const many = Array.from({ length: 130 }, (_, index) => request(index + 1));

        const ids = bulkAcceptRequestIds(many);

        expect(ids).toHaveLength(100);
        expect(ids[0]).toBe(1);
        expect(ids[99]).toBe(100);
    });
});