import { createOctaneStore } from '../../state/createOctaneStore';

/** Whose coming online is announced (the official "Other settings" choice; the server keeps it per account). */
export const FRIEND_ONLINE_EVERYONE = 0;
export const FRIEND_ONLINE_RELATIONSHIPS = 1;
export const FRIEND_ONLINE_NOBODY = 2;

interface FriendOnlineNotificationState {
    preference: number;
    setPreference: (preference: number) => void;
}

export const useFriendOnlineNotificationStore = createOctaneStore<FriendOnlineNotificationState>()((set) => ({
    preference: FRIEND_ONLINE_EVERYONE,
    setPreference: (preference) => set({ preference })
}));

/** Official FriendCategories.shouldNotifyFriendOnline: everyone, only friends with a relationship status, or nobody. */
export const shouldNotifyFriendOnline = (preference: number, relationshipStatus: number): boolean => {
    switch (preference) {
        case FRIEND_ONLINE_RELATIONSHIPS:
            return relationshipStatus > 0;
        case FRIEND_ONLINE_NOBODY:
            return false;
        default:
            return true;
    }
};
