import type { MessengerRequest } from '../../../../../api';
import type { FriendRequestRowState } from './FriendsListRequestItemView';

export interface FriendRequestRow {
    request: MessengerRequest;
    state: FriendRequestRowState;
}

/**
 * AIR FriendRequests keeps an answered request in the list, showing "accepted" or "declined", until the requests tab
 * is clicked again. The store drops a request as soon as it is answered, so the rows keep the answered ones, take in
 * new requests at the end, and let go of open rows the store no longer has (answered somewhere else).
 */
export const mergeFriendRequestRows = (rows: FriendRequestRow[], requests: MessengerRequest[]): FriendRequestRow[] => {
    const open = new Map(requests.map((request) => [request.id, request]));
    const next: FriendRequestRow[] = [];

    for (const row of rows) {
        if (row.state !== 'open') next.push(row);
        else if (open.has(row.request.id)) next.push({ request: open.get(row.request.id), state: 'open' });

        open.delete(row.request.id);
    }

    for (const request of open.values()) next.push({ request, state: 'open' });

    return next;
};

export const markFriendRequestRows = (rows: FriendRequestRow[], requestIds: number[], state: FriendRequestRowState): FriendRequestRow[] => {
    const ids = new Set(requestIds);

    return rows.map((row) => (row.state === 'open' && ids.has(row.request.id) ? { ...row, state } : row));
};

/** AIR FriendRequestsView.tabClicked: clicking the tab clears the answered rows. */
export const clearAnsweredFriendRequestRows = (rows: FriendRequestRow[]): FriendRequestRow[] => rows.filter((row) => row.state === 'open');
