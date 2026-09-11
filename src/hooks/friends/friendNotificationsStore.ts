import { createOctaneStore } from '../../state/createOctaneStore';
import { applyFriendNotification, dropViewedFriendNotifications, FriendNotification } from './friendBarTokens';

/**
 * Per-friend notifications behind the friend bar tokens
 * (HabboFriendBarData: `friend.notifications`). Fed by FriendNotificationEvent,
 * trimmed when a friend tab closes (view-once tokens) and when a friend is
 * removed.
 */
export interface FriendNotificationsState {
    notificationsByFriendId: Record<number, FriendNotification[]>;
    pushNotification(friendId: number, typeCode: number, message: string | null | undefined): void;
    markViewed(friendId: number): void;
    clearFriend(friendId: number): void;
}

export const useFriendNotificationsStore = createOctaneStore<FriendNotificationsState>()((set) => ({
    notificationsByFriendId: {},
    pushNotification: (friendId, typeCode, message) =>
        set((state) => ({
            notificationsByFriendId: {
                ...state.notificationsByFriendId,
                [friendId]: applyFriendNotification(state.notificationsByFriendId[friendId] || [], typeCode, message)
            }
        })),
    markViewed: (friendId) =>
        set((state) => {
            const current = state.notificationsByFriendId[friendId];

            if (!current || !current.length) return state;

            return { notificationsByFriendId: { ...state.notificationsByFriendId, [friendId]: dropViewedFriendNotifications(current) } };
        }),
    clearFriend: (friendId) =>
        set((state) => {
            if (!state.notificationsByFriendId[friendId]) return state;

            const next = { ...state.notificationsByFriendId };

            delete next[friendId];

            return { notificationsByFriendId: next };
        })
}));

const EMPTY_NOTIFICATIONS: FriendNotification[] = [];

export const selectFriendNotifications =
    (friendId: number) =>
    (state: FriendNotificationsState): FriendNotification[] =>
        state.notificationsByFriendId[friendId] || EMPTY_NOTIFICATIONS;
