import { IMentionEntry } from '../../api/mentions';
import { MentionsStatus, useMentionsStore } from './mentionsStore';

export const useMentionsSnapshot = (): { mentions: ReadonlyArray<IMentionEntry>; unreadCount: number; status: MentionsStatus; hasMore: boolean; loadingMore: boolean } => {
    const mentions = useMentionsStore((state) => state.mentions);
    const unreadCount = useMentionsStore((state) => state.unreadCount);
    const status = useMentionsStore((state) => state.status);
    const hasMore = useMentionsStore((state) => state.hasMore);
    const loadingMore = useMentionsStore((state) => state.loadingMore);

    return { mentions, unreadCount, status, hasMore, loadingMore };
};
