import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent = vi.hoisted(() => [] as unknown[]);
const settingsHandlers = vi.hoisted(() => [] as ((event: unknown) => void)[]);

vi.mock('@octane/renderer', () => ({
    UserSettingsEvent: class UserSettingsEvent {},
    UserSettingsOnlineIndicatorComposer: class UserSettingsOnlineIndicatorComposer {
        constructor(public preference: number) {}
    },
    OctaneLogger: { error: vi.fn(), warn: vi.fn() }
}));

vi.mock('@/state/useSharedHook', () => ({
    registerSharedHook: vi.fn(),
    useSharedHook: <T>(useSourceHook: () => T) => useSourceHook()
}));

vi.mock('../events', () => ({
    useMessageEvent: (_eventType: unknown, handler: (event: unknown) => void) => {
        settingsHandlers.push(handler);
    }
}));

vi.mock('../../api', () => ({
    LocalStorageKeys: { FRIEND_ONLINE_NOTIFICATION: 'friendOnlineNotification' },
    MessengerFriend: { RELATIONSHIP_NONE: 0, RELATIONSHIP_HEART: 1, RELATIONSHIP_SMILE: 2, RELATIONSHIP_BOBBA: 3 },
    GetLocalStorage: () => undefined,
    SetLocalStorage: vi.fn(),
    SendMessageComposer: (composer: unknown) => sent.push(composer)
}));

import {
    FRIEND_ONLINE_NOTIFY_EVERYONE,
    FRIEND_ONLINE_NOTIFY_NOBODY,
    FRIEND_ONLINE_NOTIFY_RELATIONSHIPS,
    sanitizeFriendOnlineNotificationPreference,
    shouldNotifyFriendOnline,
    useFriendOnlineNotificationPreference
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

describe('useFriendOnlineNotificationPreference', () => {
    beforeEach(() => {
        sent.length = 0;
        settingsHandlers.length = 0;
    });

    it('sends the sanitized preference to the server when it changes', () => {
        const { result } = renderHook(() => useFriendOnlineNotificationPreference());

        expect(result.current[0]).toBe(FRIEND_ONLINE_NOTIFY_EVERYONE);

        act(() => result.current[1](FRIEND_ONLINE_NOTIFY_NOBODY));
        act(() => result.current[1](7));

        expect(result.current[0]).toBe(FRIEND_ONLINE_NOTIFY_EVERYONE);
        expect(sent).toEqual([{ preference: FRIEND_ONLINE_NOTIFY_NOBODY }, { preference: FRIEND_ONLINE_NOTIFY_EVERYONE }]);
    });

    it('takes the preference from the user settings packet without echoing it back', () => {
        const { result } = renderHook(() => useFriendOnlineNotificationPreference());

        act(() => settingsHandlers.at(-1)?.({ getParser: () => ({ onlineIndicatorPreference: FRIEND_ONLINE_NOTIFY_RELATIONSHIPS }) }));

        expect(result.current[0]).toBe(FRIEND_ONLINE_NOTIFY_RELATIONSHIPS);
        expect(sent).toEqual([]);
    });
});
