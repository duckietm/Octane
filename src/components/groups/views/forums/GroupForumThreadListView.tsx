import {
    ExtendedForumData,
    GetThreadsMessageComposer,
    GuildForumThread,
    GuildForumThreadsEvent,
    ModerateThreadMessageComposer,
    UpdateThreadMessageComposer,
    UpdateThreadMessageEvent
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { LocalizeText, ReportType, SendMessageComposer } from '../../../../api';
import lockedIcon from '../../../../assets/images/groups/native/forum_forum_locked.png';
import unlockedIcon from '../../../../assets/images/groups/native/forum_forum_unlocked.png';
import hideIcon from '../../../../assets/images/groups/native/forum_forum_hide.png';
import pinnedIcon from '../../../../assets/images/groups/native/forum_forum_pinned.png';
import unpinnedIcon from '../../../../assets/images/groups/native/forum_forum_unpinned.png';
import reportIcon from '../../../../assets/images/groups/native/forum_forum_report.png';
import unhideIcon from '../../../../assets/images/groups/native/forum_forum_unhide.png';
import { ClassicScrollAreaView } from '../../../../common';
import { useHelp, useMessageEvent } from '../../../../hooks';
import { flatText, GroupText } from '../GroupNativeLayout';
import { FORUM_PAGE_SIZE, FORUM_SURFACE, stripTags, ForumButton, forumAge, ForumPager } from './GroupForumLayout';
import { BaseButton } from '../../../../common/BaseButton';

// Thread states: 1 visible, 10 hidden by a group administrator, 20 deleted by Hotel staff.
export const THREAD_HIDDEN_BY_ADMIN = 10;
export const THREAD_DELETED_BY_STAFF = 20;
export const THREAD_VISIBLE = 1;

/** ThreadListView.getThreadColor: hidden by an admin grey, deleted by staff red, the others alternate starting light. */
const threadColor = (state: number, rowIndex: number): number => {
    if (state === THREAD_HIDDEN_BY_ADMIN) return 0xaaaaaa;
    if (state === THREAD_DELETED_BY_STAFF) return 0xffb0a5;

    return rowIndex % 2 === 1 ? 0xb2e6fa : 0xeefeff;
};

/** ThreadListView.getModerationMessage. */
const moderationMessage = (thread: GuildForumThread): string => {
    if (thread.state === THREAD_HIDDEN_BY_ADMIN) return LocalizeText('groupforum.view.thread_hidden_by_admin', ['ADMIN_NAME', 'admin_name'], [thread.adminName, thread.adminName]);
    if (thread.state === THREAD_DELETED_BY_STAFF) return LocalizeText('groupforum.view.thread_hidden_by_staff', ['ADMIN_NAME', 'admin_name'], [thread.adminName, thread.adminName]);

    return '';
};

const ROW_WIDTH = 532;
const BUTTON_WIDTH = 25;

/** Maps the error code of a permission to the text of that refusal ("Only group owner can start new threads."). */
export const forumPermissionText = (code: string, operationKey: string): string => {
    const operation = LocalizeText(`groupforum.view.error.${operationKey}`);

    return LocalizeText(`groupforum.view.error.${code}`, ['operation', 'OPERATION'], [operation, operation]);
};

interface GroupForumThreadListViewProps {
    forumData: ExtendedForumData;
    groupId: number;
    pageIndex: number;
    /** Changes whenever the controller asks for the page again (requestThreadList), e.g. after a new thread was posted. */
    reloadKey?: number;
    /** GroupForumController.getThreadLastReadMessageIndex: the index of the last message of the thread the reader has seen. */
    getLastReadMessageIndex: (thread: GuildForumThread) => number;
    onLeave: () => void;
    onNewThread: () => void;
    onOpenThread: (thread: GuildForumThread) => void;
    onPageChange: (pageIndex: number) => void;
}


export const GroupForumThreadListView: FC<GroupForumThreadListViewProps> = ({ forumData, groupId, pageIndex, reloadKey = 0, getLastReadMessageIndex, onLeave, onNewThread, onOpenThread, onPageChange }) => {
    const [threads, setThreads] = useState<GuildForumThread[]>([]);
    const { report = null } = useHelp();
    const canModerate = forumData.canModerate;
    const isStaff = forumData.isStaff;
    // ThreadListView: moderators and Hotel staff get working lock, pin and hide buttons.
    const canManage = canModerate || isStaff;
    const canReport = forumData.canReport;
    const canPostThread = forumData.canPostThread;
    const pageCount = Math.ceil(forumData.totalThreads / FORUM_PAGE_SIZE);

    useMessageEvent<GuildForumThreadsEvent>(GuildForumThreadsEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== groupId || parser.startIndex !== pageIndex * FORUM_PAGE_SIZE) return;

        setThreads(parser.threads);
    });

    useMessageEvent<UpdateThreadMessageEvent>(UpdateThreadMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== groupId) return;

        setThreads((previous) => previous.map((thread) => (thread.threadId === parser.thread.threadId ? parser.thread : thread)));
    });

    useEffect(() => {
        if (!groupId) return;

        SendMessageComposer(new GetThreadsMessageComposer(groupId, pageIndex * FORUM_PAGE_SIZE, FORUM_PAGE_SIZE));
    }, [groupId, pageIndex, reloadKey]);

    // handleButtonVisibility: a visible thread can be hidden, one hidden by an admin shown again, and one deleted by staff only shown again by staff.
    const hideActionOf = (thread: GuildForumThread): 'hide' | 'unhide' | null => {
        if (!canManage) return null;
        if (thread.state === THREAD_HIDDEN_BY_ADMIN) return 'unhide';
        if (thread.state === THREAD_DELETED_BY_STAFF) return isStaff ? 'unhide' : null;

        return 'hide';
    };

    // GroupForumController.deleteThread hides with 10 for a group admin and 20 for staff; unDeleteThread sends 1.
    const moderate = (thread: GuildForumThread, action: 'hide' | 'unhide') => {
        const hiddenState = isStaff ? THREAD_DELETED_BY_STAFF : canModerate ? THREAD_HIDDEN_BY_ADMIN : 0;

        SendMessageComposer(new ModerateThreadMessageComposer(groupId, thread.threadId, action === 'unhide' ? THREAD_VISIBLE : hiddenState));
    };

    const statusKey = !canPostThread ? forumData.postThreadPermissionError : '';

    return (
        <>
            <GroupText background={FORUM_SURFACE} height={25} overrides={flatText(16, { bold: true, color: 0xa6a6a2 })} text={LocalizeText('groupforum.view.all_threads')} width={541} x={0} y={115} />
            <div className="octane-forum__list">
                <ClassicScrollAreaView className="octane-forum__scroll" contentClassName="octane-forum__scroll-content" minThumbSize={26} scrollStep={41}>
                    {/* ThreadListView.update lists the threads in the order the server sends them. */}
                    {threads.map((thread, rowIndex) => {
                        // ThreadListView.updateListItem: the unread count follows what the reader has seen of the thread this session.
                        const unreadCount = thread.totalMessages - getLastReadMessageIndex(thread) - 1;
                        const isUnread = unreadCount > 0;
                        const background = threadColor(thread.state, rowIndex);
                        const rowColor = '#' + background.toString(16).padStart(6, '0');
                        const subject = thread.header === '' ? '(No Subject)' : thread.header;
                        const header = thread.state > 1 && !canModerate && !isStaff ? moderationMessage(thread) : subject;
                        const details = stripTags(
                            LocalizeText(
                                'groupforum.view.thread_details',
                                ['THREAD_AUTHOR_NAME', 'CREATION_TIME', 'LAST_AUTHOR_NAME', 'UPDATE_TIME'],
                                [thread.authorName, forumAge(thread.creationTimeAsSecondsAgo), thread.lastUserName, forumAge(thread.lastCommentTime)]
                            )
                        );
                        const hideAction = hideActionOf(thread);
                        const buttonCount = (hideAction ? 1 : 0) + (canReport ? 1 : 0);
                        const buttonsWidth = buttonCount * BUTTON_WIDTH;
                        const textsWidth = ROW_WIDTH - 20 - 1 - 1 - 140 - (buttonCount ? 1 + buttonsWidth : 0);

                        return (
                            <div key={thread.threadId} className="octane-forum__thread">
                                {/* handleLeftButtonsVisibility: others only see the lock and the pin of a locked or pinned thread, disabled; info_buttons is a
                                    vertical item list, so a pin without a lock moves up. */}
                                <div className="octane-forum__thread-flags" style={{ background: rowColor }}>
                                    {(canManage || thread.isLocked) && (
                                        <BaseButton
                                            className="octane-forum__flag"
                                            disabled={!canManage}
                                            style={{ top: 0 }}
                                            type="button"
                                            onClick={() => SendMessageComposer(new UpdateThreadMessageComposer(groupId, thread.threadId, !thread.isLocked, thread.isPinned))}
                                        >
                                            <img alt="" draggable={false} src={thread.isLocked ? lockedIcon : unlockedIcon} style={{ left: 3, top: 1 }} />
                                        </BaseButton>
                                    )}
                                    {(canManage || thread.isPinned) && (
                                        <BaseButton
                                            className="octane-forum__flag"
                                            disabled={!canManage}
                                            style={{ top: canManage || thread.isLocked ? 20 : 0 }}
                                            type="button"
                                            onClick={() => SendMessageComposer(new UpdateThreadMessageComposer(groupId, thread.threadId, thread.isLocked, !thread.isPinned))}
                                        >
                                            <img alt="" draggable={false} src={thread.isPinned ? pinnedIcon : unpinnedIcon} style={{ left: 3, top: 2 }} />
                                        </BaseButton>
                                    )}
                                </div>
                                <div className="octane-forum__thread-body" style={{ left: 21, width: textsWidth, background: rowColor }}>
                                    <GroupText background={background} overrides={isUnread ? { bold: true } : undefined} text={header} x={0} y={0} />
                                    <GroupText background={background} overrides={flatText(10)} text={details} x={0} y={16} />
                                    {/* header_region and unread_region go to the first unread message (onGoToFirstUnread). */}
                                    <BaseButton className="octane-forum__thread-header" type="button" onClick={() => onOpenThread(thread)} />
                                </div>
                                <BaseButton className="octane-forum__thread-counts" type="button" style={{ left: 21 + textsWidth + 1, background: rowColor }} onClick={() => onOpenThread(thread)}>
                                    <GroupText
                                        background={background}
                                        overrides={flatText(10, { bold: isUnread })}
                                        text={LocalizeText('groupforum.view.thread_details1', ['TOTAL_MESSAGES', 'total_messages'], [String(thread.totalMessages), String(thread.totalMessages)])}
                                        x={0}
                                        y={0}
                                    />
                                    <GroupText
                                        background={background}
                                        overrides={flatText(10, { bold: isUnread })}
                                        text={LocalizeText('groupforum.view.thread_details2', ['NEW_MESSAGES', 'new_messages'], [String(unreadCount), String(unreadCount)])}
                                        x={0}
                                        y={15}
                                    />
                                </BaseButton>
                                {buttonCount > 0 && (
                                    <div className="octane-forum__thread-actions" style={{ left: ROW_WIDTH - buttonsWidth, width: buttonsWidth }}>
                                        {hideAction && (
                                            <BaseButton className="octane-forum__action is-hide" type="button" onClick={() => moderate(thread, hideAction)}>
                                                <img alt="" draggable={false} src={hideAction === 'unhide' ? unhideIcon : hideIcon} style={{ left: 5, top: 11 }} />
                                            </BaseButton>
                                        )}
                                        {canReport && (
                                            <BaseButton className="octane-forum__action is-report" style={{ left: hideAction ? BUTTON_WIDTH : 0 }} type="button" onClick={() => report(ReportType.THREAD, { groupId, threadId: thread.threadId })}>
                                                <img alt="" draggable={false} src={reportIcon} style={{ left: 4, top: 12 }} />
                                            </BaseButton>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </ClassicScrollAreaView>
            </div>
            <div className="octane-forum__footer">
                <ForumButton label={LocalizeText('groupforum.view.mark_read')} width={95} x={10} onClick={onLeave} />
                <ForumButton disabled={!canPostThread} label={LocalizeText('groupforum.view.start_thread')} right={178} tint="blue" width={115} onClick={onNewThread} />
                <ForumPager pageCount={pageCount} pageIndex={pageIndex} onPage={onPageChange} />
            </div>
            {statusKey && (
                <div className="octane-forum__status">
                    <GroupText align="center" background={FORUM_SURFACE} overrides={flatText(11)} text={forumPermissionText(statusKey, 'operation_post_thread')} width={300} x={3} y={3} />
                </div>
            )}
        </>
    );
};
