import { describe, expect, it } from 'vitest';
import {
    dismissViewedNotifications,
    emptyFriendBarNotifications,
    FriendNotificationType as Type,
    orderFriendsForBar,
    pruneFriendNotifications,
    receiveFriendNotification
} from './friendBarNotifications.helpers';

describe('AIR friend bar activity (HabboFriendBarData.makeNotification + friend entity tokens)', () => {
    it('adds a token, newest first, one per type, and moves the friend to the front', () => {
        let state = receiveFriendNotification(emptyFriendBarNotifications, 7, Type.ACHIEVEMENT, 'ACH_Login1');
        state = receiveFriendNotification(state, 9, Type.ROOM_EVENT, 'Party');
        state = receiveFriendNotification(state, 7, Type.QUEST, 'camp.q1');
        state = receiveFriendNotification(state, 7, Type.ACHIEVEMENT, 'ACH_Login2');

        expect(state.byFriend[7].map((entry) => [entry.type, entry.message])).toEqual([
            [Type.ACHIEVEMENT, 'ACH_Login2'],
            [Type.QUEST, 'camp.q1']
        ]);
        expect(state.byFriend[7].every((entry) => entry.viewOnce)).toBe(true);
        expect(state.order).toEqual([7, 9]);
    });

    it('keeps a game until it finishes, and a repeated game only changes its name', () => {
        let state = receiveFriendNotification(emptyFriendBarNotifications, 3, Type.PLAYING_GAME, 'snowwar');
        const first = state.byFriend[3][0];

        expect(first.viewOnce).toBe(false);

        state = receiveFriendNotification({ ...state, order: [] }, 3, Type.PLAYING_GAME, 'basejump');
        expect(state.byFriend[3]).toHaveLength(1);
        expect(state.byFriend[3][0]).toMatchObject({ id: first.id, message: 'basejump' });
        expect(state.order).toEqual([]);

        expect(dismissViewedNotifications(state, 3)).toBe(state);

        state = receiveFriendNotification(state, 3, Type.FINISHED_GAME, 'basejump');
        expect(state.byFriend[3]).toBeUndefined();
        expect(state.order).toEqual([]);
    });

    it('closing an open tab drops what is shown once', () => {
        let state = receiveFriendNotification(emptyFriendBarNotifications, 5, Type.PLAYING_GAME, 'snowwar');
        state = receiveFriendNotification(state, 5, Type.ROOM_EVENT, 'Disco');
        state = dismissViewedNotifications(state, 5);

        expect(state.byFriend[5].map((entry) => entry.type)).toEqual([Type.PLAYING_GAME]);
    });

    it('ignores messenger and unknown types', () => {
        expect(receiveFriendNotification(emptyFriendBarNotifications, 5, Type.MESSENGER, '')).toBe(emptyFriendBarNotifications);
        expect(receiveFriendNotification(emptyFriendBarNotifications, 5, 99, 'x')).toBe(emptyFriendBarNotifications);
        expect(receiveFriendNotification(emptyFriendBarNotifications, 0, Type.ROOM_EVENT, 'x')).toBe(emptyFriendBarNotifications);
    });

    it('a friend who leaves the bar loses their notifications', () => {
        let state = receiveFriendNotification(emptyFriendBarNotifications, 1, Type.ROOM_EVENT, 'A');
        state = receiveFriendNotification(state, 2, Type.ROOM_EVENT, 'B');
        state = pruneFriendNotifications(state, [2, 4]);

        expect(Object.keys(state.byFriend)).toEqual(['2']);
        expect(state.order).toEqual([2]);
        expect(pruneFriendNotifications(state, [2])).toBe(state);
    });

    it('puts notified friends first, most recent first', () => {
        const friends = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

        expect(orderFriendsForBar(friends, [3, 1]).map((friend) => friend.id)).toEqual([3, 1, 2, 4]);
        expect(orderFriendsForBar(friends, []).map((friend) => friend.id)).toEqual([1, 2, 3, 4]);
    });
});
