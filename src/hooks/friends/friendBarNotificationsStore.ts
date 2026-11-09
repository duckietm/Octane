import { createOctaneStore } from '../../state/createOctaneStore';
import {
    dismissViewedNotifications,
    emptyFriendBarNotifications,
    FriendBarNotificationsState,
    pruneFriendNotifications,
    receiveFriendNotification
} from './friendBarNotifications.helpers';

interface FriendBarNotificationsStore extends FriendBarNotificationsState {
    receive: (friendId: number, type: number, message: string) => void;
    dismissViewed: (friendId: number) => void;
    prune: (onlineIds: ReadonlyArray<number>) => void;
    reset: () => void;
}

/** The friend bar activity of AIR `HabboFriendBarData` (fed by `useFriendBarNotificationEvents`). */
export const useFriendBarNotificationsStore = createOctaneStore<FriendBarNotificationsStore>()((set) => ({
    ...emptyFriendBarNotifications,
    receive: (friendId, type, message) => set((state) => receiveFriendNotification(state, friendId, type, message)),
    dismissViewed: (friendId) => set((state) => dismissViewedNotifications(state, friendId)),
    prune: (onlineIds) => set((state) => pruneFriendNotifications(state, onlineIds)),
    reset: () => set(emptyFriendBarNotifications)
}));
