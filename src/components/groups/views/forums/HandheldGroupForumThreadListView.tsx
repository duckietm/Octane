import { GuildForumThread } from '@octane/renderer';
import { FC, useState } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { forumAge, stripTags } from './GroupForumLayout';
import { moderationMessage, THREAD_DELETED_BY_STAFF, THREAD_HIDDEN_BY_ADMIN } from './GroupForumThreadListView';
import { ForumIcon, HandheldForumPages } from './HandheldGroupForumParts';

interface HandheldGroupForumThreadListViewProps {
    threads: GuildForumThread[];
    /** Moderators and Hotel staff: they lock, pin and hide. */
    canManage: boolean;
    canReport: boolean;
    canPostThread: boolean;
    pageIndex: number;
    pageCount: number;
    /** Why no thread can be started, when it cannot. */
    statusText: string;
    /** The thread shown beside the list (the phone on its side). */
    activeThreadId: number;
    getLastReadMessageIndex: (thread: GuildForumThread) => number;
    hideActionOf: (thread: GuildForumThread) => 'hide' | 'unhide' | null;
    onLeave: () => void;
    onNewThread: () => void;
    onOpenThread: (thread: GuildForumThread) => void;
    onPageChange: (pageIndex: number) => void;
    onToggleLock: (thread: GuildForumThread) => void;
    onTogglePin: (thread: GuildForumThread) => void;
    onModerate: (thread: GuildForumThread, action: 'hide' | 'unhide') => void;
    onReport: (thread: GuildForumThread) => void;
}

const stateName = (state: number): 'visible' | 'hidden' | 'deleted' => {
    if (state === THREAD_HIDDEN_BY_ADMIN) return 'hidden';

    return state === THREAD_DELETED_BY_STAFF ? 'deleted' : 'visible';
};

/**
 * The threads of a forum on a phone: one card per thread (pinned and locked drawn beside its subject, a hidden one
 * greyed with who hid it), the pages under the last card and the bar with "Mark read" (which leaves the forum, as on
 * the desktop) and "Start thread". What the desktop offers as small icons on a row (lock, pin, hide, report) opens
 * from the row's own button, each with its name, for whoever has the right. GroupForumThreadListView hands it everything.
 */
export const HandheldGroupForumThreadListView: FC<HandheldGroupForumThreadListViewProps> = (props) => {
    const { threads, canManage, canReport, canPostThread, pageIndex, pageCount, statusText, activeThreadId, getLastReadMessageIndex, hideActionOf } = props;
    const { onLeave, onNewThread, onOpenThread, onPageChange, onToggleLock, onTogglePin, onModerate, onReport } = props;
    // The thread whose actions are open; one at a time.
    const [actionsOf, setActionsOf] = useState<number>(0);

    return (
        <NativeTextTree>
            <div className="octane-handheld-forum__page" data-testid="forum-threads">
                <div className="octane-handheld-forum__scroll">
                    <div className="octane-handheld-forum__caption">{LocalizeText('groupforum.view.all_threads')}</div>
                    {threads.length === 0 && <div className="octane-handheld-forum__empty">{LocalizeText('groupforum.view.no_threads')}</div>}
                    <div className="octane-handheld-forum__rows">
                        {threads.map((thread) => {
                            const isActive = thread.threadId === activeThreadId;
                            // The count follows what the reader has seen of the thread this session; the one being read counts as seen.
                            const unreadCount = isActive ? 0 : thread.totalMessages - getLastReadMessageIndex(thread) - 1;
                            const isUnread = unreadCount > 0;
                            const subject = thread.header === '' ? '(No Subject)' : thread.header;
                            const notice = thread.state > 1 ? moderationMessage(thread) : '';
                            // Who may not moderate reads the notice in place of the subject of a hidden thread.
                            const header = notice && !canManage ? notice : subject;
                            const details = stripTags(
                                LocalizeText(
                                    'groupforum.view.thread_details',
                                    ['THREAD_AUTHOR_NAME', 'CREATION_TIME', 'LAST_AUTHOR_NAME', 'UPDATE_TIME'],
                                    [thread.authorName, forumAge(thread.creationTimeAsSecondsAgo), thread.lastUserName, forumAge(thread.lastCommentTime)]
                                )
                            );
                            const hideAction = hideActionOf(thread);
                            const hasActions = canManage || canReport;
                            const isOpen = hasActions && actionsOf === thread.threadId;

                            return (
                                <div
                                    key={thread.threadId}
                                    className="octane-handheld-forum__row is-thread"
                                    data-active={isActive}
                                    data-state={stateName(thread.state)}
                                    data-testid={`thread-${thread.threadId}`}
                                    data-unread={isUnread}
                                >
                                    <BaseButton className="octane-handheld-forum__row-main" onClick={() => onOpenThread(thread)}>
                                        <span className="octane-handheld-forum__row-text">
                                            <span className="octane-handheld-forum__row-title">
                                                {thread.isPinned && (
                                                    <ForumIcon label={localizeWithFallback('octane.handheld.forum.pinned', 'Pinned')} name="pin" />
                                                )}
                                                {thread.isLocked && (
                                                    <ForumIcon label={localizeWithFallback('octane.handheld.forum.locked', 'Locked')} name="lock" />
                                                )}
                                                <span className="octane-handheld-forum__row-subject">{header}</span>
                                            </span>
                                            {notice && header !== notice && <span className="octane-handheld-forum__row-notice">{notice}</span>}
                                            <span className="octane-handheld-forum__row-details">{details}</span>
                                            <span className="octane-handheld-forum__row-meta">
                                                <span className="octane-handheld-forum__count">
                                                    {LocalizeText(
                                                        'groupforum.view.thread_details1',
                                                        ['TOTAL_MESSAGES', 'total_messages'],
                                                        [String(thread.totalMessages), String(thread.totalMessages)]
                                                    )}
                                                </span>
                                                <span className="octane-handheld-forum__count is-unread">
                                                    {LocalizeText(
                                                        'groupforum.view.thread_details2',
                                                        ['NEW_MESSAGES', 'new_messages'],
                                                        [String(unreadCount), String(unreadCount)]
                                                    )}
                                                </span>
                                            </span>
                                        </span>
                                        {!hasActions && <ForumIcon name="forward" />}
                                    </BaseButton>
                                    {hasActions && (
                                        <BaseButton
                                            aria-expanded={isOpen}
                                            aria-label={localizeWithFallback('octane.handheld.forum.thread_actions', 'Thread actions')}
                                            className="octane-handheld-forum__row-more"
                                            onClick={() => setActionsOf(isOpen ? 0 : thread.threadId)}
                                        >
                                            <ForumIcon name="more" />
                                        </BaseButton>
                                    )}
                                    {isOpen && (
                                        <div className="octane-handheld-forum__actions">
                                            {canManage && (
                                                <BaseButton className="octane-handheld-forum__chip" data-action="lock" onClick={() => onToggleLock(thread)}>
                                                    <ForumIcon name={thread.isLocked ? 'unlock' : 'lock'} />
                                                    <span>
                                                        {thread.isLocked
                                                            ? localizeWithFallback('octane.handheld.forum.unlock', 'Unlock')
                                                            : localizeWithFallback('octane.handheld.forum.lock', 'Lock')}
                                                    </span>
                                                </BaseButton>
                                            )}
                                            {canManage && (
                                                <BaseButton className="octane-handheld-forum__chip" data-action="pin" onClick={() => onTogglePin(thread)}>
                                                    <ForumIcon name="pin" />
                                                    <span>
                                                        {thread.isPinned
                                                            ? localizeWithFallback('octane.handheld.forum.unpin', 'Unpin')
                                                            : localizeWithFallback('octane.handheld.forum.pin', 'Pin')}
                                                    </span>
                                                </BaseButton>
                                            )}
                                            {hideAction && (
                                                <BaseButton
                                                    className="octane-handheld-forum__chip"
                                                    data-action={hideAction}
                                                    onClick={() => onModerate(thread, hideAction)}
                                                >
                                                    <ForumIcon name={hideAction === 'unhide' ? 'show' : 'hide'} />
                                                    <span>
                                                        {hideAction === 'unhide'
                                                            ? localizeWithFallback('octane.handheld.forum.unhide', 'Show again')
                                                            : localizeWithFallback('octane.handheld.forum.hide', 'Hide')}
                                                    </span>
                                                </BaseButton>
                                            )}
                                            {canReport && (
                                                <BaseButton
                                                    className="octane-handheld-forum__chip is-report"
                                                    data-action="report"
                                                    onClick={() => onReport(thread)}
                                                >
                                                    <ForumIcon name="report" />
                                                    <span>{localizeWithFallback('octane.handheld.forum.report', 'Report')}</span>
                                                </BaseButton>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <HandheldForumPages pageCount={pageCount} pageIndex={pageIndex} onPage={onPageChange} />
                </div>
                {statusText && <div className="octane-handheld-forum__status">{stripTags(statusText)}</div>}
                <div className="octane-handheld-forum__bar">
                    <BaseButton className="octane-handheld-forum__button" data-testid="forum-leave" onClick={onLeave}>
                        <ForumIcon name="back" />
                        <span>{LocalizeText('groupforum.view.mark_read')}</span>
                    </BaseButton>
                    <BaseButton
                        className="octane-handheld-forum__button is-primary"
                        data-testid="forum-new-thread"
                        disabled={!canPostThread}
                        onClick={onNewThread}
                    >
                        {LocalizeText('groupforum.view.start_thread')}
                    </BaseButton>
                </div>
            </div>
        </NativeTextTree>
    );
};
