import { beforeEach, describe, expect, it } from 'vitest';
import { NotificationBubbleType } from '../../api';
import { filterFeedEntries, getFeedCategoryForBubbleType, MAX_FEED_ENTRIES, useNotificationFeedStore } from './notificationFeedStore';

const entry = (message: string, category: 'me' | 'friends' | 'hotel' = 'me') => ({ category, type: 'info', message });

describe('notification feed store', () => {
    beforeEach(() => {
        window.localStorage.clear();
        useNotificationFeedStore.setState({ entries: [], settings: { mentions: true, friends: true, me: true, hotel: true }, isOpen: false, unreadCount: 0 });
    });

    it('keeps the newest entry first', () => {
        const store = useNotificationFeedStore.getState();

        store.addEntry(entry('first'));
        store.addEntry(entry('second'));

        expect(useNotificationFeedStore.getState().entries.map((item) => item.message)).toEqual(['second', 'first']);
    });

    it('drops the oldest entries once the session history is full', () => {
        const store = useNotificationFeedStore.getState();

        for (let index = 0; index < MAX_FEED_ENTRIES + 5; index++) store.addEntry(entry(`n${index}`));

        const entries = useNotificationFeedStore.getState().entries;

        expect(entries).toHaveLength(MAX_FEED_ENTRIES);
        expect(entries[0].message).toBe(`n${MAX_FEED_ENTRIES + 4}`);
    });

    it('counts unread entries only while the panel is folded away', () => {
        const store = useNotificationFeedStore.getState();

        store.addEntry(entry('one'));
        store.addEntry(entry('two'));
        expect(useNotificationFeedStore.getState().unreadCount).toBe(2);

        store.setOpen(true);
        expect(useNotificationFeedStore.getState().unreadCount).toBe(0);

        store.addEntry(entry('three'));
        expect(useNotificationFeedStore.getState().unreadCount).toBe(0);
    });

    it('remembers the category toggles in local storage', () => {
        useNotificationFeedStore.getState().toggleCategory('hotel');

        expect(useNotificationFeedStore.getState().settings.hotel).toBe(false);
        expect(JSON.parse(window.localStorage.getItem('notificationFeedSettings'))).toEqual({ mentions: true, friends: true, me: true, hotel: false });

        useNotificationFeedStore.getState().setAllCategories(true);
        expect(JSON.parse(window.localStorage.getItem('notificationFeedSettings'))).toEqual({ mentions: true, friends: true, me: true, hotel: true });
    });

    it('remembers whether the panel was left open', () => {
        useNotificationFeedStore.getState().toggleOpen();

        expect(JSON.parse(window.localStorage.getItem('notificationFeedOpen'))).toBe(true);
    });

    it('hides the categories the user switched off', () => {
        const entries = [
            { ...entry('friend', 'friends'), id: 1, title: '', iconUrl: null, linkUrl: null, senderName: '', receivedAt: 0 },
            { ...entry('hotel', 'hotel'), id: 2, title: '', iconUrl: null, linkUrl: null, senderName: '', receivedAt: 0 }
        ];

        expect(filterFeedEntries(entries, { mentions: true, friends: true, me: true, hotel: false }).map((item) => item.message)).toEqual(['friend']);
    });
});

describe('getFeedCategoryForBubbleType', () => {
    it('files friend presence under friends and mentions under their own section', () => {
        expect(getFeedCategoryForBubbleType(NotificationBubbleType.FRIENDONLINE)).toBe('friends');
        expect(getFeedCategoryForBubbleType(NotificationBubbleType.FRIENDOFFLINE)).toBe('friends');
        expect(getFeedCategoryForBubbleType(NotificationBubbleType.MENTION)).toBe('mentions');
    });

    it('files hotel chatter under hotel and the rest under me', () => {
        expect(getFeedCategoryForBubbleType(NotificationBubbleType.INFO)).toBe('hotel');
        expect(getFeedCategoryForBubbleType(NotificationBubbleType.SOUNDMACHINE)).toBe('hotel');
        expect(getFeedCategoryForBubbleType(NotificationBubbleType.ROOMMESSAGESPOSTED)).toBe('hotel');
        expect(getFeedCategoryForBubbleType(NotificationBubbleType.BADGE_RECEIVED)).toBe('me');
        expect(getFeedCategoryForBubbleType(NotificationBubbleType.RESPECT)).toBe('me');
    });
});
