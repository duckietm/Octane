/**
 * Group forum unread bookkeeping, after the official GroupForumController.
 *
 * The controller polls the unread forums count every `groupforum.poll.period`
 * seconds (300 by default), keeps a "last read message index" per thread and
 * turns a thread click into a jump to the first unread message.
 */

export const GROUP_FORUM_POLL_PERIOD_DEFAULT_SECONDS = 300;

/** GroupForumController.startPollingForUnreadForumsCount: the timer period in ms. */
export const resolveForumPollPeriodMs = (configured: unknown): number => {
    const seconds = Number(configured);

    return (Number.isFinite(seconds) && seconds > 0 ? seconds : GROUP_FORUM_POLL_PERIOD_DEFAULT_SECONDS) * 1000;
};

/**
 * GroupForumController.getThreadLastReadMessageIndex: with no local marker the
 * last read index is derived from the thread counters; -1 when nothing was read.
 */
export const resolveLastReadMessageIndex = (totalMessages: number, unreadMessages: number, localMarker: number | null | undefined): number => {
    if (typeof localMarker === 'number' && localMarker >= -1) return localMarker;

    return Math.max(-1, totalMessages - Math.max(0, unreadMessages) - 1);
};

/**
 * ThreadListView.onGoToFirstUnread: the message to land on is the one after the
 * last read message, clamped to the last message of the thread.
 */
export const resolveFirstUnreadMessageIndex = (totalMessages: number, lastReadMessageIndex: number): number => {
    if (totalMessages <= 0) return 0;

    return Math.max(0, Math.min(lastReadMessageIndex + 1, totalMessages - 1));
};

/** Start index of the page (of `pageSize` messages) that contains `messageIndex`. */
export const resolveMessagePageStart = (messageIndex: number, pageSize: number): number => {
    if (pageSize <= 0) return 0;

    return Math.max(0, Math.floor(Math.max(0, messageIndex) / pageSize) * pageSize);
};

/**
 * GroupForumController.updateUnreadMessageCounts: reading a message advances the
 * thread marker, and the forum's unread count drops by however many of its
 * messages were newly read (the server side does the same on the read marker).
 */
export const applyForumReadProgress = (unreadForumMessages: number, previousLastReadIndex: number, newLastReadIndex: number): number => {
    const newlyRead = Math.max(0, newLastReadIndex - previousLastReadIndex);

    return Math.max(0, unreadForumMessages - newlyRead);
};
