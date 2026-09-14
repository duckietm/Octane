import { ForumsListMessageEvent, GetUnreadForumsCountMessageComposer, UnreadForumsCountMessageEvent } from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { GetConfigurationValue, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import { resolveForumPollPeriodMs } from './groupForumUnread';

/** GetForumsListMessageComposer list code of "My Forums". */
export const FORUM_LIST_MY_FORUMS = 2;

/**
 * Official GroupForumController: the unread forums count behind the me-menu
 * forums badge, polled every `groupforum.poll.period` seconds and refreshed
 * whenever a "My Forums" list arrives, plus the per-thread "last read message"
 * markers that drive the jump to the first unread message.
 */
const useGroupForumUnreadState = () => {
    const [unreadForumsCount, setUnreadForumsCount] = useState<number>(0);
    const lastReadIndexByThreadRef = useRef<Map<number, number>>(new Map());

    const updateUnreadForumsCount = useCallback((count: number) => setUnreadForumsCount(Math.max(0, count)), []);

    const requestUnreadForumsCount = useCallback(() => SendMessageComposer(new GetUnreadForumsCountMessageComposer()), []);

    /** GroupForumController.updateUnreadMessageCounts: remember how far a thread was read. */
    const markThreadRead = useCallback((threadId: number, lastReadMessageIndex: number) => {
        lastReadIndexByThreadRef.current.set(threadId, lastReadMessageIndex);
    }, []);

    const getThreadLastReadIndex = useCallback((threadId: number): number | null => {
        const index = lastReadIndexByThreadRef.current.get(threadId);

        return typeof index === 'number' ? index : null;
    }, []);

    /** GroupForumController.resetGoTo / a new forum opened: local markers only live per forum visit. */
    const clearThreadMarkers = useCallback(() => lastReadIndexByThreadRef.current.clear(), []);

    useMessageEvent<UnreadForumsCountMessageEvent>(UnreadForumsCountMessageEvent, (event) => updateUnreadForumsCount(event.getParser().count));

    useMessageEvent<ForumsListMessageEvent>(ForumsListMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.listCode !== FORUM_LIST_MY_FORUMS || parser.startIndex !== 0) return;

        updateUnreadForumsCount(parser.forums.filter((forum) => forum.unreadMessages > 0).length);
    });

    useEffect(() => {
        const period = resolveForumPollPeriodMs(GetConfigurationValue<number>('groupforum.poll.period', 300));

        requestUnreadForumsCount();

        const interval = window.setInterval(requestUnreadForumsCount, period);

        return () => window.clearInterval(interval);
    }, [requestUnreadForumsCount]);

    return { unreadForumsCount, updateUnreadForumsCount, requestUnreadForumsCount, markThreadRead, getThreadLastReadIndex, clearThreadMarkers };
};

export const useGroupForumUnread = () => useSharedHook(useGroupForumUnreadState);

registerSharedHook(useGroupForumUnreadState);
