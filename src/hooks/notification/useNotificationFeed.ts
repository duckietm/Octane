import { useMemo } from 'react';
import { filterFeedEntries, useNotificationFeedStore } from './notificationFeedStore';

/**
 * The notification feed as a component sees it: the session history, the slice the
 * settings let through, and the controls of the panel. Subscribes to the store slices it
 * reads, so a new entry re-renders the panel and nothing else.
 */
export const useNotificationFeed = () => {
    const entries = useNotificationFeedStore((state) => state.entries);
    const settings = useNotificationFeedStore((state) => state.settings);
    const isOpen = useNotificationFeedStore((state) => state.isOpen);
    const unreadCount = useNotificationFeedStore((state) => state.unreadCount);
    const toggleCategory = useNotificationFeedStore((state) => state.toggleCategory);
    const setAllCategories = useNotificationFeedStore((state) => state.setAllCategories);
    const setOpen = useNotificationFeedStore((state) => state.setOpen);
    const toggleOpen = useNotificationFeedStore((state) => state.toggleOpen);
    const clearEntries = useNotificationFeedStore((state) => state.clearEntries);
    const visibleEntries = useMemo(() => filterFeedEntries(entries, settings), [entries, settings]);

    return { entries, visibleEntries, settings, isOpen, unreadCount, toggleCategory, setAllCategories, setOpen, toggleOpen, clearEntries };
};
