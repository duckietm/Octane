import { DeleteMentionComposer, MarkMentionsReadComposer, RequestMentionsComposer, RequestMentionsPageComposer } from '@octane/renderer';
import { IMentionEntry, SendMessageComposer } from '../../api';
import {
    getHasMoreMentions,
    getMentionsStatus,
    getOldestMentionId,
    getUnreadCount,
    isLoadingMoreMentions,
    markAllRead,
    markRead,
    removeMention,
    setLoadingMoreMentions,
    setMentionsStatus
} from './mentionsStore';

/** How long the list may take before the panel says it did not come. */
export const MENTIONS_REQUEST_TIMEOUT_MS = 8000;

const pending: { timer: ReturnType<typeof setTimeout> | null; pageTimer: ReturnType<typeof setTimeout> | null } = { timer: null, pageTimer: null };

/** Asks the server for the list once; asking again while it is on its way does nothing. */
export const requestMentions = (): void => {
    if (getMentionsStatus() === 'loading') return;

    setMentionsStatus('loading');
    SendMessageComposer(new RequestMentionsComposer());

    if (pending.timer) clearTimeout(pending.timer);

    pending.timer = setTimeout(() => {
        pending.timer = null;

        if (getMentionsStatus() === 'loading') setMentionsStatus('error');
    }, MENTIONS_REQUEST_TIMEOUT_MS);
};

/** Asks for the page of mentions older than the oldest one held; does nothing when there is none or one is on its way. */
export const requestMoreMentions = (): void => {
    if (!getHasMoreMentions() || isLoadingMoreMentions()) return;

    const beforeId = getOldestMentionId();

    if (beforeId <= 0) return;

    setLoadingMoreMentions(true);
    SendMessageComposer(new RequestMentionsPageComposer(beforeId));

    if (pending.pageTimer) clearTimeout(pending.pageTimer);

    // A page that never comes frees the button, so it can be asked for again.
    pending.pageTimer = setTimeout(() => {
        pending.pageTimer = null;
        setLoadingMoreMentions(false);
    }, MENTIONS_REQUEST_TIMEOUT_MS);
};

export const markMentionRead = (mention: IMentionEntry): void => {
    if (mention.read) return;

    markRead(mention.mentionId);
    SendMessageComposer(new MarkMentionsReadComposer(1, mention.mentionId));
};

export const markAllMentionsRead = (): void => {
    if (getUnreadCount() === 0) return;

    markAllRead();
    SendMessageComposer(new MarkMentionsReadComposer(0, 0));
};

export const deleteMention = (mention: IMentionEntry): void => {
    SendMessageComposer(new DeleteMentionComposer(mention.mentionId));
    removeMention(mention.mentionId);
};
