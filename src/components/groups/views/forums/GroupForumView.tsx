import {
    AddLinkEventTracker,
    CreateLinkEvent,
    ExtendedForumData,
    ForumData,
    ForumDataMessageEvent,
    ForumsListMessageEvent,
    GetForumsListMessageComposer,
    GetForumStatsMessageComposer,
    GetThreadMessageComposer,
    GetUnreadForumsCountMessageComposer,
    GuildForumThread,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    UnreadForumsCountMessageEvent,
    UpdateForumReadMarkerEntry,
    UpdateForumReadMarkerMessageComposer,
    UpdateThreadMessageEvent
} from '@octane/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { GetConfigurationValue, GetGroupInformation, LocalizeText, SendMessageComposer } from '../../../../api';
import { useMessageEvent, useNotification } from '../../../../hooks';
import { useGroupForumUnreadStore } from '../../../../state/groupForumUnreadStore';
import listActive from '../../../../assets/images/groups/native/forum_forum_list0.png';
import listViewed from '../../../../assets/images/groups/native/forum_forum_list1.png';
import listMine from '../../../../assets/images/groups/native/forum_forum_list2.png';
import { ForumFrame, ForumHeader, ForumShortcuts, FORUM_PAGE_SIZE } from './GroupForumLayout';
import { GroupForumComposeView } from './GroupForumComposeView';
import { GroupForumListView, GroupForumsListData } from './GroupForumListView';
import { GroupForumSettingsView } from './GroupForumSettingsView';
import { GroupForumThreadListView } from './GroupForumThreadListView';
import { GroupForumThreadView } from './GroupForumThreadView';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

type ForumMode = 'threads' | 'thread' | 'list';
type ForumCompose = { kind: 'thread' } | { kind: 'reply'; threadId: number; subject: string; quote?: string; quoteSeq: number };

// forum_forum_list0..2: most active, most viewed, my forums.
const LIST_ICONS = [listActive, listViewed, listMine];
// GroupForumController.FORUMS_LIST_CODE_ACTIVE / _POPULAR / _MY_FORUMS and their names in "groupforum/list/<name>".
const LIST_CODES: Record<string, number> = { active: 0, popular: 1, my: 2 };
const MY_FORUMS = 2;
// startPollingForUnreadForumsCount: every groupforum.poll.period seconds, 300 when not configured.
const DEFAULT_POLL_PERIOD = 300;

/** ForumsListData.unreadForumsCount: the listed forums with unread messages. */
const countUnreadForums = (forums: ForumData[]) => forums.filter((forum) => forum.unreadMessages > 0).length;

/** ForumsListData.updateUnreadMessages: the entry of the open forum takes its data and what the reader has seen of it. */
const updateUnreadMessages = (list: GroupForumsListData, forum: ExtendedForumData, lastReadMessageId: number) =>
{
    const entry = list.forums.find((listed) => listed.groupId === forum.groupId);

    if (!entry) return;

    entry.updateFrom(forum);
    entry.lastReadMessageId = lastReadMessageId;
};

const WINDOW_WIDTH = 552;
const WINDOW_HEIGHT = 565;
// The v75 client opens the forum 100px below the top of the screen and puts its dialogs to the right of it.
const WINDOW_TOP = 100;

// A forum opened by a link to one of its messages (groupforum/<group>/<thread>/<message index>): the thread is fetched first, then its page opens and scrolls to the message.
interface PendingThread {
    groupId: number;
    threadId: number;
    messageIndex: number;
}

export const GroupForumView: FC<{}> = () =>
{
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [mode, setMode] = useState<ForumMode>('threads');
    const [groupId, setGroupId] = useState<number>(0);
    const [threadId, setThreadId] = useState<number>(0);
    const [currentThread, setCurrentThread] = useState<GuildForumThread>(null);
    const [forumData, setForumData] = useState<ExtendedForumData>(null);
    // GroupForumController: the forums list last shown. It outlives the window and is only forgotten when a link opens a forum.
    const [forumsList, setForumsList] = useState<GroupForumsListData>(null);
    const [threadsPage, setThreadsPage] = useState<number>(0);
    // requestThreadList for the page already shown (after a new thread was posted) asks for it again.
    const [threadsReload, setThreadsReload] = useState<number>(0);
    const [threadStart, setThreadStart] = useState<{ pageIndex: number; scrollIndex: number }>({ pageIndex: 0, scrollIndex: 0 });
    const unreadForumsCount = useGroupForumUnreadStore((state) => state.unreadForumsCount);
    const setUnreadForumsCount = useGroupForumUnreadStore((state) => state.setUnreadForumsCount);
    const [compose, setCompose] = useState<ForumCompose>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const { simpleAlert = null } = useNotification();
    // GroupForumController: the group whose data was asked for, the forum data of it and the newest message the reader has seen in it.
    const requestedGroup = useRef<number>(-1);
    const forumRef = useRef<ExtendedForumData>(null);
    const seenMessageId = useRef<number>(0);
    const pendingThread = useRef<PendingThread>(null);
    // _lastReadMessageIndexByThread: the index of the newest message the reader has seen per thread of the open forum.
    const lastReadIndexByThread = useRef<Map<number, number>>(new Map());
    // _requestedForumsListCode: the list asked for last; -1 while a forum is asked for or the window is closed.
    const requestedListCode = useRef<number>(-1);
    const forumsListRef = useRef<GroupForumsListData>(null);
    const isVisibleRef = useRef<boolean>(false);

    const showForumsList = useCallback((list: GroupForumsListData) =>
    {
        forumsListRef.current = list;
        setForumsList(list);
    }, []);

    useEffect(() =>
    {
        isVisibleRef.current = isVisible;
    }, [isVisible]);

    // startPollingForUnreadForumsCount: once at start, then every poll period. While the window is open the first page of
    // "My Forums" is asked for instead of the count (onUnreadForumsCountUpdateTimerEvent); its answer updates the count too.
    useEffect(() =>
    {
        const configuredPeriod = Number(GetConfigurationValue<number>('groupforum.poll.period', DEFAULT_POLL_PERIOD));
        const period = configuredPeriod > 0 ? configuredPeriod : DEFAULT_POLL_PERIOD;
        const poll = () => SendMessageComposer(isVisibleRef.current ? new GetForumsListMessageComposer(MY_FORUMS, 0, FORUM_PAGE_SIZE) : new GetUnreadForumsCountMessageComposer());

        poll();

        const interval = window.setInterval(poll, period * 1000);

        return () => window.clearInterval(interval);
    }, []);

    useMessageEvent<ForumDataMessageEvent>(ForumDataMessageEvent, (event) =>
    {
        const parser = event.getParser();
        const data = parser.extendedForumData;

        // onForumData: an answer for any other group than the one asked for last is dropped, a refusal included.
        if (data.groupId !== requestedGroup.current) return;

        // A forum without read permission is refused with an alert instead of a window (the error is a localization key).
        if (data.readPermissionError && data.readPermissionError.length > 0)
        {
            requestedGroup.current = 0;
            forumRef.current = null;
            pendingThread.current = null;
            setIsVisible(false);
            setForumData(null);
            simpleAlert(
                LocalizeText(`groupforum.view.error.${data.readPermissionError}`, ['operation', 'OPERATION'], [LocalizeText('groupforum.view.error.operation_read'), LocalizeText('groupforum.view.error.operation_read')]),
                null,
                null,
                null,
                LocalizeText('notification.forums.error.access_denied.title')
            );

            return;
        }

        forumRef.current = data;
        seenMessageId.current = data.lastReadMessageId;
        setForumData(data);
    });

    useMessageEvent<UnreadForumsCountMessageEvent>(UnreadForumsCountMessageEvent, (event) => setUnreadForumsCount(event.getParser().count));

    // markForumAsRead: only when the reader has seen newer messages than the stored marker, or by force ("Mark read"), which marks the whole forum.
    const markForumAsRead = useCallback((force: boolean = false) =>
    {
        const data = forumRef.current;
        const seen = seenMessageId.current;

        if (data && (force || seen > data.lastReadMessageId))
        {
            const entry = force ? new UpdateForumReadMarkerEntry(data.groupId, Math.max(data.totalMessages, seen), seen === 0) : new UpdateForumReadMarkerEntry(data.groupId, seen, false);

            SendMessageComposer(new UpdateForumReadMarkerMessageComposer(entry));
        }

        seenMessageId.current = 0;
        lastReadIndexByThread.current = new Map();
    }, []);

    // updateUnreadMessageCounts: the thread remembers the index of the message seen; a newer seen message also updates the forums list the
    // forum was opened from, and with it the "My Forums" count.
    const onMessagesSeen = useCallback((messageId: number, seenThreadId: number, messageIndex: number) =>
    {
        if (messageId > seenMessageId.current)
        {
            seenMessageId.current = messageId;

            const list = forumsListRef.current;
            const forum = forumRef.current;

            if (list && forum)
            {
                updateUnreadMessages(list, forum, messageId);

                if (list.listCode === MY_FORUMS) setUnreadForumsCount(countUnreadForums(list.forums));
            }
        }

        lastReadIndexByThread.current.set(seenThreadId, messageIndex);
    }, [setUnreadForumsCount]);

    // getThreadLastReadMessageIndex: what was seen this session, else what the server counts as read.
    const getThreadLastReadMessageIndex = useCallback((thread: GuildForumThread) =>
    {
        const seenIndex = lastReadIndexByThread.current.get(thread.threadId);

        if (seenIndex !== undefined) return seenIndex;

        return thread.totalMessages - thread.unreadMessagesCount - 1;
    }, []);

    // initForum: the previous forum is marked read before another one is asked for.
    const initForum = useCallback((id: number) =>
    {
        markForumAsRead();
        requestedListCode.current = -1;
        requestedGroup.current = id;
        forumRef.current = null;
        seenMessageId.current = 0;
        setGroupId(id);
        setThreadId(0);
        setCurrentThread(null);
        setForumData(null);
        setThreadsPage(0);
        setCompose(null);
        setIsSettingsOpen(false);
        setIsVisible(true);
        SendMessageComposer(new GetForumStatsMessageComposer(id));
    }, [markForumAsRead]);

    // openGroupForum. A forum opened by a link forgets the forums list (linkReceived), so its "Mark As Read" closes the window;
    // one opened from the list goes back to that list.
    const openForum = useCallback((id: number, fromList: boolean = false) =>
    {
        pendingThread.current = null;

        if (!fromList) showForumsList(null);

        setMode('threads');
        initForum(id);
    }, [initForum, showForumsList]);

    const openThread = useCallback((thread: GuildForumThread, start: { pageIndex: number; scrollIndex: number } = { pageIndex: 0, scrollIndex: 0 }) =>
    {
        setThreadId(thread.threadId);
        setCurrentThread(thread);
        setThreadStart(start);
        setMode('thread');
    }, []);

    // ThreadListView.onGoToFirstUnread: the thread opens at the message after the last one seen (goToMessageIndex).
    const openThreadAtFirstUnread = useCallback((thread: GuildForumThread) =>
    {
        const messageIndex = Math.max(0, Math.min(getThreadLastReadMessageIndex(thread) + 1, thread.totalMessages - 1));

        openThread(thread, { pageIndex: Math.floor(messageIndex / FORUM_PAGE_SIZE), scrollIndex: messageIndex % FORUM_PAGE_SIZE });
    }, [getThreadLastReadMessageIndex, openThread]);

    // GroupForumController.onPostThreadMessage: the new thread counts as seen, the forums list counts it, and the forum goes to the first
    // page of its thread list.
    const onThreadCreated = useCallback((thread: GuildForumThread) =>
    {
        setCompose(null);

        const forum = forumRef.current;

        if (!forum || forum.groupId !== groupId) return;

        onMessagesSeen(thread.lastMessageId, thread.threadId, thread.totalMessages - 1);
        forumsListRef.current?.forums.find((listed) => listed.groupId === groupId)?.addNewThread(thread);

        setThreadId(0);
        setCurrentThread(null);
        setThreadsPage(0);
        setThreadsReload((value) => value + 1);
        setMode('threads');
    }, [groupId, onMessagesSeen]);

    // linkReceived "groupforum/<group>/<thread>[/<message index>]": initForum, GetThread, then the page that holds the message.
    const openForumThread = useCallback((id: number, linkedThreadId: number, messageIndex: number) =>
    {
        showForumsList(null);
        setMode('threads');
        initForum(id);
        pendingThread.current = { groupId: id, threadId: linkedThreadId, messageIndex };
        SendMessageComposer(new GetThreadMessageComposer(id, linkedThreadId));
    }, [initForum, showForumsList]);

    useMessageEvent<UpdateThreadMessageEvent>(UpdateThreadMessageEvent, (event) =>
    {
        const parser = event.getParser();
        const pending = pendingThread.current;

        if (!pending || parser.groupId !== pending.groupId || parser.thread.threadId !== pending.threadId || requestedGroup.current !== pending.groupId) return;

        pendingThread.current = null;
        openThread(parser.thread, { pageIndex: Math.floor(pending.messageIndex / FORUM_PAGE_SIZE), scrollIndex: pending.messageIndex % FORUM_PAGE_SIZE });
    });

    // closeMainView: the window is gone, so the forum is marked read and answers for it are no longer wanted.
    const closeForum = useCallback(() =>
    {
        markForumAsRead();
        requestedListCode.current = -1;
        requestedGroup.current = -1;
        forumRef.current = null;
        pendingThread.current = null;
        setForumData(null);
        setIsVisible(false);
        setCompose(null);
        setIsSettingsOpen(false);
    }, [markForumAsRead]);

    // openForumsList: the forum that was open is marked read first, then the list is asked for; the window shows it when it arrives.
    const openForumsList = useCallback((listCode: number, startIndex: number = 0) =>
    {
        markForumAsRead();
        requestedListCode.current = listCode;
        requestedGroup.current = -1;
        pendingThread.current = null;
        SendMessageComposer(new GetForumsListMessageComposer(listCode, startIndex, FORUM_PAGE_SIZE));
    }, [markForumAsRead]);

    // onForumsList: a "My Forums" answer sets the unread forums count, whoever asked for it; a list other than the one asked for last is dropped.
    useMessageEvent<ForumsListMessageEvent>(ForumsListMessageEvent, (event) =>
    {
        const parser = event.getParser();
        const list: GroupForumsListData = { listCode: parser.listCode, totalAmount: parser.totalAmount, startIndex: parser.startIndex, forums: parser.forums };

        if (forumRef.current && seenMessageId.current > 0) updateUnreadMessages(list, forumRef.current, seenMessageId.current);

        if (list.listCode === MY_FORUMS) setUnreadForumsCount(countUnreadForums(list.forums));

        if (list.listCode !== requestedListCode.current) return;

        forumRef.current = null;
        showForumsList(list);
        setForumData(null);
        setThreadId(0);
        setCurrentThread(null);
        setCompose(null);
        setIsSettingsOpen(false);
        setMode('list');
        setIsVisible(true);
    });

    // markForumsAsRead (the list's back_button "Mark As Read"): every listed forum with unread messages is marked read as a whole and the
    // unread forums count drops to 0, then the window closes.
    const markForumsAsRead = useCallback(() =>
    {
        const entries = (forumsListRef.current?.forums ?? []).filter((forum) => forum.unreadMessages > 0).map((forum) => new UpdateForumReadMarkerEntry(forum.groupId, forum.totalMessages, true));

        if (entries.length)
        {
            SendMessageComposer(new UpdateForumReadMarkerMessageComposer(...entries));
            setUnreadForumsCount(0);
        }

        closeForum();
    }, [closeForum, setUnreadForumsCount]);

    // The thread list's back button (back_button in a thread list): the forum is marked read, then the list it came from opens again, or the window closes.
    const leaveThreads = useCallback(() =>
    {
        markForumAsRead(true);

        const list = forumsListRef.current;

        if (list) openForumsList(list.listCode, list.startIndex);
        else closeForum();
    }, [closeForum, markForumAsRead, openForumsList]);

    const backToThreads = useCallback(() =>
    {
        setMode('threads');
        setThreadId(0);
        setCurrentThread(null);
    }, []);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1])
                {
                    case 'toggle':
                        if (isVisible) closeForum();
                        else openForumsList(MY_FORUMS);
                        return;
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'list':
                        // linkReceived: only "groupforum/list/<active|popular|my>".
                        if (parts.length === 3 && parts[2] in LIST_CODES) openForumsList(LIST_CODES[parts[2]]);
                        return;
                    case 'hide':
                        closeForum();
                        return;
                    default: {
                        const id = parseInt(parts[1]);

                        if (isNaN(id) || id <= 0) return;

                        if (parts.length === 2) openForum(id);
                        else openForumThread(id, parseInt(parts[2]) || 0, parts.length > 3 ? parseInt(parts[3]) || 0 : 0);
                    }
                }
            },
            eventUrlPrefix: 'groupforum/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [closeForum, isVisible, openForum, openForumThread, openForumsList]);

    if (!isVisible) return null;

    const initialPosition = { x: Math.round((window.innerWidth - WINDOW_WIDTH) / 2), y: WINDOW_TOP };
    const dialogPosition = (width: number) => ({ x: Math.min(initialPosition.x + WINDOW_WIDTH + 1, window.innerWidth - width + 1), y: WINDOW_TOP });
    const isList = mode === 'list' && !!forumsList;
    // Only forum data of the requested group is kept (see the ForumDataMessageEvent handler), so every write goes to that group.
    const effectiveGroupId = groupId;

    return (
        <NativeTextTree>
            <>
                <ForumFrame
                    className="octane-group-forum"
                    height={WINDOW_HEIGHT}
                    initialPosition={initialPosition}
                    isResizable={true}
                    minHeight={525}
                    minWidth={400}
                    title={LocalizeText('groupforum.view.window_title')}
                    uniqueKey="group-forum"
                    width={WINDOW_WIDTH}
                    onClose={closeForum}
                    onHelp={() => CreateLinkEvent('habbopages/forums')}
                >
                    {isList ? (
                        <ForumHeader
                            description={LocalizeText(`groupforum.view.forums_description.${forumsList.listCode}`)}
                            icon={LIST_ICONS[forumsList.listCode]}
                            title={LocalizeText(`groupforum.view.forums_header.${forumsList.listCode}`)}
                        />
                    ) : (
                        <ForumHeader
                            badge={forumData?.icon ?? ''}
                            canChangeSettings={!!forumData?.canChangeSettings}
                            description={forumData?.description ?? ''}
                            title={forumData?.name ?? ''}
                            onClick={() => effectiveGroupId > 0 && GetGroupInformation(effectiveGroupId)}
                            onSettings={() => setIsSettingsOpen(true)}
                        />
                    )}
                    <ForumShortcuts unreadCount={unreadForumsCount} onOpenList={(listMode) => openForumsList(LIST_CODES[listMode] ?? MY_FORUMS)} />
                    {isList && (
                        <GroupForumListView
                            list={forumsList}
                            onMarkAsRead={markForumsAsRead}
                            onOpenForum={(id) => openForum(id, true)}
                            onPage={(pageIndex) => openForumsList(forumsList.listCode, pageIndex * FORUM_PAGE_SIZE)}
                        />
                    )}
                    {mode === 'threads' && forumData && (
                        <GroupForumThreadListView
                            forumData={forumData}
                            getLastReadMessageIndex={getThreadLastReadMessageIndex}
                            groupId={effectiveGroupId}
                            pageIndex={threadsPage}
                            reloadKey={threadsReload}
                            onLeave={leaveThreads}
                            onNewThread={() => setCompose({ kind: 'thread' })}
                            onOpenThread={openThreadAtFirstUnread}
                            onPageChange={setThreadsPage}
                        />
                    )}
                    {mode === 'thread' && (
                        <GroupForumThreadView
                            forumData={forumData}
                            groupId={effectiveGroupId}
                            initialPageIndex={threadStart.pageIndex}
                            initialThread={currentThread}
                            scrollIndex={threadStart.scrollIndex}
                            threadId={threadId}
                            onBack={backToThreads}
                            onMessagesSeen={onMessagesSeen}
                            onReply={(subject, quote) => setCompose((previous) => ({ kind: 'reply', threadId, subject, quote, quoteSeq: previous && previous.kind === 'reply' && previous.threadId === threadId ? previous.quoteSeq + 1 : 0 }))}
                        />
                    )}
                </ForumFrame>
                {compose && forumData && (
                    <GroupForumComposeView
                        compose={compose}
                        forumData={forumData}
                        groupId={effectiveGroupId}
                        initialPosition={dialogPosition(455)}
                        readForumData={() => forumRef.current}
                        onClose={() => setCompose(null)}
                        onThreadCreated={onThreadCreated}
                    />
                )}
                {isSettingsOpen && forumData && (
                    <GroupForumSettingsView forumData={forumData} groupId={effectiveGroupId} initialPosition={dialogPosition(350)} readForumData={() => forumRef.current} onClose={() => setIsSettingsOpen(false)} />
                )}
            </>
        </NativeTextTree>
    );
};
