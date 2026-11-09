import { describe, expect, it } from 'vitest';
import type { MessengerRequest } from '../../../../../api';
import { clearAnsweredFriendRequestRows, markFriendRequestRows, mergeFriendRequestRows } from './friendRequestRows';

const request = (id: number) => ({ id, requesterUserId: id * 10, name: `user${id}` }) as MessengerRequest;

describe('friend request rows', () => {
    it('keeps an answered request in place after the store drops it, and adds new requests at the end', () => {
        let rows = mergeFriendRequestRows([], [request(1), request(2)]);

        rows = markFriendRequestRows(rows, [1], 'accepted');
        rows = mergeFriendRequestRows(rows, [request(2), request(3)]);

        expect(rows.map((row) => [row.request.id, row.state])).toEqual([
            [1, 'accepted'],
            [2, 'open'],
            [3, 'open']
        ]);
    });

    it('lets go of an open request answered somewhere else', () => {
        const rows = mergeFriendRequestRows(mergeFriendRequestRows([], [request(1), request(2)]), [request(2)]);

        expect(rows.map((row) => row.request.id)).toEqual([2]);
    });

    it('clears the answered rows when the tab is clicked', () => {
        const rows = markFriendRequestRows(mergeFriendRequestRows([], [request(1), request(2)]), [2], 'declined');

        expect(clearAnsweredFriendRequestRows(rows).map((row) => row.request.id)).toEqual([1]);
    });
});
