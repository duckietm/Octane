import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { LocalStorageKeys, MessengerFriend } from '../../api';
import { useLocalStorage } from '../useLocalStorage';

// Same numbering as the official online indicator preference (FriendCategories.shouldNotifyFriendOnline).
export const FRIEND_ONLINE_NOTIFY_EVERYONE = 0;
export const FRIEND_ONLINE_NOTIFY_RELATIONSHIPS = 1;
export const FRIEND_ONLINE_NOTIFY_NOBODY = 2;

export const FRIEND_ONLINE_NOTIFICATION_OPTIONS = [FRIEND_ONLINE_NOTIFY_EVERYONE, FRIEND_ONLINE_NOTIFY_RELATIONSHIPS, FRIEND_ONLINE_NOTIFY_NOBODY] as const;

export type FriendOnlineNotificationPreference = (typeof FRIEND_ONLINE_NOTIFICATION_OPTIONS)[number];

export const sanitizeFriendOnlineNotificationPreference = (value: unknown): FriendOnlineNotificationPreference =>
    (FRIEND_ONLINE_NOTIFICATION_OPTIONS as readonly number[]).includes(value as number)
        ? (value as FriendOnlineNotificationPreference)
        : FRIEND_ONLINE_NOTIFY_EVERYONE;

/**
 * Whether a friend coming online deserves a bubble: everyone, only friends with a relationship
 * set (heart, smile or bobba), or nobody. An unknown preference behaves like "everyone", as in
 * the official client.
 */
export const shouldNotifyFriendOnline = (preference: number, relationshipStatus: number): boolean => {
    switch (preference) {
        case FRIEND_ONLINE_NOTIFY_RELATIONSHIPS:
            return relationshipStatus > MessengerFriend.RELATIONSHIP_NONE;
        case FRIEND_ONLINE_NOTIFY_NOBODY:
            return false;
        default:
            return true;
    }
};

const useFriendOnlineNotificationPreferenceState = () => {
    const [storedValue, setStoredValue] = useLocalStorage<number>(LocalStorageKeys.FRIEND_ONLINE_NOTIFICATION, FRIEND_ONLINE_NOTIFY_EVERYONE);
    const setPreference = (value: number) => setStoredValue(sanitizeFriendOnlineNotificationPreference(value));

    return [sanitizeFriendOnlineNotificationPreference(storedValue), setPreference] as const;
};

export const useFriendOnlineNotificationPreference = () => useSharedHook(useFriendOnlineNotificationPreferenceState);

registerSharedHook(useFriendOnlineNotificationPreferenceState);
