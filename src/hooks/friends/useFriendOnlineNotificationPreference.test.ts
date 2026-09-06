import { describe, expect, it, vi } from 'vitest';

vi.mock('@octane/renderer', () => ({
    OctaneLogger: { error: vi.fn(), warn: vi.fn() }
}));

vi.mock('@/state/useSharedHook', () => ({
    registerSharedHook: vi.fn(),
    useSharedHook: <T>(useSourceHook: () => T) => useSourceHook()
}));

vi.mock('../../api', () => ({
    LocalStorageKeys: { FRIEND_ONLINE_NOTIFICATION: 'friendOnlineNotification' },
    MessengerFriend: { RELATIONSHIP_NONE: 0, RELATIONSHIP_HEART: 1, RELATIONSHIP_SMILE: 2, RELATIONSHIP_BOBBA: 3 },
    GetLocalStorage: () => undefined,
    SetLocalStorage: vi.fn()
}));

import {
    FRIEND_ONLINE_NOTIFY_EVERYONE,
    FRIEND_ONLINE_NOTIFY_NOBODY,
    FRIEND_ONLINE_NOTIFY_RELATIONSHIPS,
    sanitizeFriendOnlineNotificationPreference,
    shouldNotifyFriendOnline
} from './useFriendOnlineNotificationPreference';

describe('shouldNotifyFriendOnline', () => {
    it('notifies for every friend by default', () => {
        expect(shouldNotifyFriendOnline(FRIEND_ONLINE_NOTIFY_EVERYONE, 0)).toBe(true);
        expect(shouldNotifyFriendOnline(FRIEND_ONLINE_NOTIFY_EVERYONE, -1)).toBe(true);
    });

    it('only notifies for friends with a relationship when limited to relationships', () => {
        expect(shouldNotifyFriendOnline(FRIEND_ONLINE_NOTIFY_RELATIONSHIPS, 0)).toBe(false);
        expect(shouldNotifyFriendOnline(FRIEND_ONLINE_NOTIFY_RELATIONSHIPS, -1)).toBe(false);
        expect(shouldNotifyFriendOnline(FRIEND_ONLINE_NOTIFY_RELATIONSHIPS, 1)).toBe(true);
        expect(shouldNotifyFriendOnline(FRIEND_ONLINE_NOTIFY_RELATIONSHIPS, 3)).toBe(true);
    });

    it('never notifies when set to nobody', () => {
        expect(shouldNotifyFriendOnline(FRIEND_ONLINE_NOTIFY_NOBODY, 1)).toBe(false);
    });

    it('treats an unknown stored preference as everyone', () => {
        expect(sanitizeFriendOnlineNotificationPreference(9)).toBe(FRIEND_ONLINE_NOTIFY_EVERYONE);
        expect(sanitizeFriendOnlineNotificationPreference('1')).toBe(FRIEND_ONLINE_NOTIFY_EVERYONE);
        expect(sanitizeFriendOnlineNotificationPreference(2)).toBe(FRIEND_ONLINE_NOTIFY_NOBODY);
    });
});
