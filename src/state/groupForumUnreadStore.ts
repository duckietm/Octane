import { createOctaneStore } from './createOctaneStore';

/**
 * GroupForumController.unreadForumsCount: the number of the reader's forums with unread messages. The forum
 * window shows it in its "My Forums" shortcut and the toolbar on the Me menu (UnseenForumsCountUpdatedEvent).
 */
interface GroupForumUnreadState {
    unreadForumsCount: number;
    setUnreadForumsCount: (count: number) => void;
}

export const useGroupForumUnreadStore = createOctaneStore<GroupForumUnreadState>()((set) => ({
    unreadForumsCount: 0,
    setUnreadForumsCount: (count: number) => set((state) => (state.unreadForumsCount === count ? state : { unreadForumsCount: count }))
}));
