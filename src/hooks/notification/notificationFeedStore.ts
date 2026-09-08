import { createOctaneStore } from '@/state/createOctaneStore';
import { GetLocalStorage, NotificationBubbleType, SetLocalStorage } from '../../api';

/**
 * The three feed categories of the official notification feed (`FeedSettings`): what
 * happened to me, what my friends did, and what the hotel announced; plus the mentions
 * the server keeps for the user, which this client folds into the same feed.
 */
export type NotificationFeedCategory = 'mentions' | 'me' | 'friends' | 'hotel';

export const NOTIFICATION_FEED_CATEGORIES: NotificationFeedCategory[] = ['mentions', 'friends', 'me', 'hotel'];

export interface NotificationFeedEntry {
    id: number;
    category: NotificationFeedCategory;
    /** The bubble or alert type the entry came from, so a pane can pick an icon for it. */
    type: string;
    title: string;
    message: string;
    iconUrl: string | null;
    /** A picture shown under the text, as the official `decorationImage` of a feed row. */
    decorationUrl: string | null;
    linkUrl: string | null;
    /** The caption of the action button; without one the whole row is the link. */
    buttonCaption: string;
    senderName: string;
    receivedAt: number;
}

export type NotificationFeedEntryInput = Pick<NotificationFeedEntry, 'category' | 'type' | 'message'> &
    Partial<Pick<NotificationFeedEntry, 'title' | 'iconUrl' | 'decorationUrl' | 'linkUrl' | 'buttonCaption' | 'senderName'>>;

export type NotificationFeedSettings = Record<NotificationFeedCategory, boolean>;

/** The panes of the feed panel: the filtered history and the raw stream. */
export type NotificationFeedPane = 'notifications' | 'stream';

/** The feed keeps a session's worth of history; older entries fall off the end. */
export const MAX_FEED_ENTRIES = 200;

const STORAGE_SETTINGS_KEY = 'notificationFeedSettings';
const STORAGE_OPEN_KEY = 'notificationFeedOpen';
const STORAGE_TAB_KEY = 'notificationFeedTab';

/** Where the folded tab sits by default, in pixels from the bottom of the screen; the user can drag it. */
export const DEFAULT_FEED_TAB_BOTTOM = 64;
export const MIN_FEED_TAB_BOTTOM = 56;

const DEFAULT_SETTINGS: NotificationFeedSettings = { mentions: true, friends: true, me: true, hotel: true };

/** Same per-user suffix `useLocalStorage` applies, so two accounts on one browser keep their own feed settings. */
const storageKey = (name: string): string => {
    try {
        const userId = new URLSearchParams(window.location.search).get('userid') || '';

        return userId ? `${name}.${userId}` : name;
    } catch {
        return name;
    }
};

const readSettings = (): NotificationFeedSettings => {
    try {
        const stored = GetLocalStorage<Partial<NotificationFeedSettings>>(storageKey(STORAGE_SETTINGS_KEY));

        return { ...DEFAULT_SETTINGS, ...(stored || {}) };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
};

const readTabBottom = (): number => {
    try {
        const stored = GetLocalStorage<number>(storageKey(STORAGE_TAB_KEY));

        return typeof stored === 'number' && Number.isFinite(stored) ? Math.max(MIN_FEED_TAB_BOTTOM, stored) : DEFAULT_FEED_TAB_BOTTOM;
    } catch {
        return DEFAULT_FEED_TAB_BOTTOM;
    }
};

const readOpen = (): boolean => {
    try {
        const stored = GetLocalStorage<boolean>(storageKey(STORAGE_OPEN_KEY));

        return typeof stored === 'boolean' ? stored : false;
    } catch {
        return false;
    }
};

const persist = <T>(name: string, value: T) => {
    try {
        SetLocalStorage(storageKey(name), value);
    } catch {
        // A full or blocked storage only costs the preference on the next visit.
    }
};

/**
 * Where a bubble belongs in the feed. Mentions have their own section, friend presence
 * is about other people, hotel-wide chatter (info, sound machines, room messages) is about the hotel,
 * and everything else (badges, respect, pets, club, purchases) happened to me.
 */
export const getFeedCategoryForBubbleType = (type: string): NotificationFeedCategory => {
    switch (type) {
        case NotificationBubbleType.FRIENDONLINE:
        case NotificationBubbleType.FRIENDOFFLINE:
        case NotificationBubbleType.THIRDPARTYFRIENDONLINE:
        case NotificationBubbleType.THIRDPARTYFRIENDOFFLINE:
            return 'friends';
        case NotificationBubbleType.MENTION:
            return 'mentions';
        case NotificationBubbleType.INFO:
        case NotificationBubbleType.SOUNDMACHINE:
        case NotificationBubbleType.SOUNDBOARD:
        case NotificationBubbleType.ROOMMESSAGESPOSTED:
            return 'hotel';
        default:
            return 'me';
    }
};

interface NotificationFeedState {
    entries: NotificationFeedEntry[];
    settings: NotificationFeedSettings;
    isOpen: boolean;
    pane: NotificationFeedPane;
    /** Pixels from the bottom of the screen where the folded tab sits. */
    tabBottom: number;
    unreadCount: number;
    addEntry: (entry: NotificationFeedEntryInput) => void;
    clearEntries: () => void;
    toggleCategory: (category: NotificationFeedCategory) => void;
    setAllCategories: (visible: boolean) => void;
    setOpen: (open: boolean) => void;
    toggleOpen: () => void;
    setPane: (pane: NotificationFeedPane) => void;
    /** Opens the panel on a pane, or folds it away when it already shows that pane. */
    togglePane: (pane: NotificationFeedPane) => void;
    setTabBottom: (bottom: number) => void;
    markAllRead: () => void;
}

let nextEntryId = 0;

export const useNotificationFeedStore = createOctaneStore<NotificationFeedState>()((set) => ({
    entries: [],
    settings: readSettings(),
    isOpen: readOpen(),
    pane: 'notifications',
    tabBottom: readTabBottom(),
    unreadCount: 0,
    addEntry: (entry) =>
        set((state) => {
            const next: NotificationFeedEntry = {
                id: ++nextEntryId,
                category: entry.category,
                type: entry.type,
                title: entry.title || '',
                message: entry.message || '',
                iconUrl: entry.iconUrl || null,
                decorationUrl: entry.decorationUrl || null,
                linkUrl: entry.linkUrl || null,
                buttonCaption: entry.buttonCaption || '',
                senderName: entry.senderName || '',
                receivedAt: Date.now()
            };

            return {
                entries: [next, ...state.entries].slice(0, MAX_FEED_ENTRIES),
                // Only what arrives while the panel is folded away counts as unread; an open
                // panel is being looked at.
                unreadCount: state.isOpen ? 0 : state.unreadCount + 1
            };
        }),
    clearEntries: () => set({ entries: [], unreadCount: 0 }),
    toggleCategory: (category) =>
        set((state) => {
            const settings = { ...state.settings, [category]: !state.settings[category] };

            persist(STORAGE_SETTINGS_KEY, settings);

            return { settings };
        }),
    setAllCategories: (visible) =>
        set(() => {
            const settings: NotificationFeedSettings = { mentions: visible, friends: visible, me: visible, hotel: visible };

            persist(STORAGE_SETTINGS_KEY, settings);

            return { settings };
        }),
    setOpen: (open) =>
        set(() => {
            persist(STORAGE_OPEN_KEY, open);

            return { isOpen: open, unreadCount: 0 };
        }),
    toggleOpen: () =>
        set((state) => {
            const isOpen = !state.isOpen;

            persist(STORAGE_OPEN_KEY, isOpen);

            return { isOpen, unreadCount: 0 };
        }),
    setPane: (pane) => set({ pane }),
    togglePane: (pane) =>
        set((state) => {
            const isOpen = !(state.isOpen && state.pane === pane);

            persist(STORAGE_OPEN_KEY, isOpen);

            return { isOpen, pane, unreadCount: 0 };
        }),
    setTabBottom: (bottom) =>
        set(() => {
            const tabBottom = Math.max(MIN_FEED_TAB_BOTTOM, Math.round(bottom));

            persist(STORAGE_TAB_KEY, tabBottom);

            return { tabBottom };
        }),
    markAllRead: () => set({ unreadCount: 0 })
}));

/** Adds an entry from code that has no React hook at hand (the notification message handlers). */
export const pushNotificationFeedEntry = (entry: NotificationFeedEntryInput): void => useNotificationFeedStore.getState().addEntry(entry);

/** Entries the settings let through, in the order the store keeps them (newest first). */
export const filterFeedEntries = (entries: NotificationFeedEntry[], settings: NotificationFeedSettings): NotificationFeedEntry[] =>
    entries.filter((entry) => settings[entry.category] !== false);
