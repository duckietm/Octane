import { describe, expect, it } from 'vitest';
import { FRIEND_ONLINE_EVERYONE, FRIEND_ONLINE_NOBODY, FRIEND_ONLINE_RELATIONSHIPS, shouldNotifyFriendOnline } from './friendOnlineNotificationStore';

describe('friend online notification preference', () => {
    it('announces everyone by default', () => {
        expect(shouldNotifyFriendOnline(FRIEND_ONLINE_EVERYONE, 0)).toBe(true);
        expect(shouldNotifyFriendOnline(FRIEND_ONLINE_EVERYONE, 2)).toBe(true);
        expect(shouldNotifyFriendOnline(7, 0)).toBe(true);
    });

    it('announces only friends with a relationship status when asked to', () => {
        expect(shouldNotifyFriendOnline(FRIEND_ONLINE_RELATIONSHIPS, 0)).toBe(false);
        expect(shouldNotifyFriendOnline(FRIEND_ONLINE_RELATIONSHIPS, -1)).toBe(false);
        expect(shouldNotifyFriendOnline(FRIEND_ONLINE_RELATIONSHIPS, 1)).toBe(true);
        expect(shouldNotifyFriendOnline(FRIEND_ONLINE_RELATIONSHIPS, 3)).toBe(true);
    });

    it('announces nobody when switched off', () => {
        expect(shouldNotifyFriendOnline(FRIEND_ONLINE_NOBODY, 1)).toBe(false);
    });
});
