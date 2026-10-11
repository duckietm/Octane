import { IMentionEntry } from '../../api/mentions';
import { createOctaneStore } from '../../state/createOctaneStore';

/** idle: nothing asked yet, loading: waiting for the server, ready: the list arrived, error: it never did. */
export type MentionsStatus = 'idle' | 'loading' | 'ready' | 'error';

/** What the client keeps at most, however many pages were loaded. */
export const MAX_MENTIONS = 1000;

interface MentionsState {
    mentions: ReadonlyArray<IMentionEntry>;
    unreadCount: number;
    status: MentionsStatus;
    /** The panel is on screen, so a mention that lands is already visible and needs no toast. */
    panelOpen: boolean;
    /** Older mentions remain on the server than the ones held. */
    hasMore: boolean;
    /** The next page was asked for and has not arrived. */
    loadingMore: boolean;
}

export const useMentionsStore = createOctaneStore<MentionsState>(() => ({ mentions: [], unreadCount: 0, status: 'idle', panelOpen: false, hasMore: false, loadingMore: false }));

const countUnread = (list: ReadonlyArray<IMentionEntry>): number => list.reduce((count, mention) => count + (mention.read ? 0 : 1), 0);

// Newest first: by time, then by id, so a burst inside one second keeps the order it arrived in.
const byNewest = (a: IMentionEntry, b: IMentionEntry): number => b.timestamp - a.timestamp || b.mentionId - a.mentionId;

const keyOf = (mention: IMentionEntry): string => (mention.mentionId !== 0 ? `id:${mention.mentionId}` : `${mention.senderId}|${mention.timestamp}|${mention.message}`);

const commit = (list: IMentionEntry[], status?: MentionsStatus): void => {
    const next = list.slice(0, MAX_MENTIONS);

    useMentionsStore.setState((state) => ({ mentions: next, unreadCount: countUnread(next), status: status ?? state.status }));
};

const current = (): ReadonlyArray<IMentionEntry> => useMentionsStore.getState().mentions;

export const subscribeMentions = (onChange: () => void): (() => void) => useMentionsStore.subscribe(onChange);

export const getMentionsSnapshot = (): ReadonlyArray<IMentionEntry> => current();

export const getUnreadCount = (): number => useMentionsStore.getState().unreadCount;

export const getMentionsStatus = (): MentionsStatus => useMentionsStore.getState().status;

export const isMentionsPanelOpen = (): boolean => useMentionsStore.getState().panelOpen;

export const setMentionsPanelOpen = (panelOpen: boolean): void => useMentionsStore.setState({ panelOpen });

export const getHasMoreMentions = (): boolean => useMentionsStore.getState().hasMore;

export const isLoadingMoreMentions = (): boolean => useMentionsStore.getState().loadingMore;

export const setLoadingMoreMentions = (loadingMore: boolean): void => useMentionsStore.setState({ loadingMore });

/** The id to ask the next page from: the oldest mention held that the server knows by id. */
export const getOldestMentionId = (): number =>
    current().reduce((oldest, mention) => (mention.mentionId > 0 && (oldest === 0 || mention.mentionId < oldest) ? mention.mentionId : oldest), 0);

export const setMentionsStatus = (status: MentionsStatus): void => useMentionsStore.setState({ status });

/** The list the server sent replaces what is kept, and ends the waiting. */
export const setMentions = (list: IMentionEntry[], hasMore = false): void => {
    const seen = new Set<string>();
    const unique = list.filter((mention) => {
        const key = keyOf(mention);

        if (seen.has(key)) return false;

        seen.add(key);

        return true;
    });

    commit(unique.sort(byNewest), 'ready');
    useMentionsStore.setState({ hasMore, loadingMore: false });
};

/** A page of older mentions joins the list; the ones already held are not added again. */
export const appendMentions = (page: IMentionEntry[], hasMore: boolean): void => {
    const known = new Set(current().map(keyOf));
    const fresh = page.filter((mention) => !known.has(keyOf(mention)));

    commit([...current(), ...fresh].sort(byNewest));
    useMentionsStore.setState({ hasMore, loadingMore: false });
};

export const addMention = (entry: IMentionEntry): void => {
    const key = keyOf(entry);

    if (current().some((mention) => keyOf(mention) === key)) return;

    commit([entry, ...current()].sort(byNewest));
};

export const markRead = (mentionId: number): void => {
    if (!current().some((mention) => mention.mentionId === mentionId && !mention.read)) return;

    commit(current().map((mention) => (mention.mentionId === mentionId ? { ...mention, read: true } : mention)));
};

export const markAllRead = (): void => {
    if (useMentionsStore.getState().unreadCount === 0) return;

    commit(current().map((mention) => (mention.read ? mention : { ...mention, read: true })));
};

export const removeMention = (mentionId: number): void => {
    const next = current().filter((mention) => mention.mentionId !== mentionId);

    if (next.length === current().length) return;

    commit(next);
};

export const resetMentions = (): void => useMentionsStore.setState({ mentions: [], unreadCount: 0, status: 'idle', panelOpen: false, hasMore: false, loadingMore: false });
