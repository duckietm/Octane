import { FC } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../api';
import { LayoutBadgeImageView } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { forumAge, stripTags } from './GroupForumLayout';
import type { GroupForumsListData } from './GroupForumListView';
import { ForumIcon, HandheldForumPages } from './HandheldGroupForumParts';

interface HandheldGroupForumListViewProps {
    list: GroupForumsListData;
    pageIndex: number;
    pageCount: number;
    /** "Did you know? You can get your own group forum here.": the text before the link, the link and what follows it. */
    hint: { before: string; link: string; after: string };
    onHint: () => void;
    onMarkAsRead: () => void;
    onOpenForum: (groupId: number) => void;
    onOpenGroup: (groupId: number) => void;
    onPage: (pageIndex: number) => void;
}

/**
 * A list of forums on a phone: one card per forum (its group badge opens the group, the rest the forum), the pages
 * under the last card, and "Mark as read" as the bar at the bottom. GroupForumListView hands it everything.
 */
export const HandheldGroupForumListView: FC<HandheldGroupForumListViewProps> = ({
    list,
    pageIndex,
    pageCount,
    hint,
    onHint,
    onMarkAsRead,
    onOpenForum,
    onOpenGroup,
    onPage
}) => (
    <NativeTextTree>
        <div className="octane-handheld-forum__page" data-testid="forum-list">
            <div className="octane-handheld-forum__scroll">
                <div className="octane-handheld-forum__caption">{LocalizeText(`groupforum.view.forums_list.${list.listCode}`)}</div>
                {list.forums.length === 0 && (
                    <div className="octane-handheld-forum__empty">
                        {localizeWithFallback('octane.handheld.forum.empty_list', 'There are no forums in this list.')}
                    </div>
                )}
                <div className="octane-handheld-forum__rows">
                    {list.forums.map((forum) => {
                        const isUnread = forum.unreadMessages > 0;
                        const details = stripTags(
                            LocalizeText(
                                'groupforum.view.forum_details',
                                ['RATING', 'LAST_AUTHOR_NAME', 'UPDATE_TIME'],
                                [String(forum.leaderboardScore), forum.lastMessageAuthorName, forumAge(forum.lastMessageTimeAsSecondsAgo)]
                            )
                        );

                        return (
                            <div key={forum.groupId} className="octane-handheld-forum__row" data-testid={`forum-${forum.groupId}`} data-unread={isUnread}>
                                <BaseButton
                                    aria-label={`${forum.name}: ${localizeWithFallback('octane.handheld.forum.group', 'Group details')}`}
                                    className="octane-handheld-forum__row-badge"
                                    onClick={() => onOpenGroup(forum.groupId)}
                                >
                                    <LayoutBadgeImageView badgeCode={forum.icon} isGroup={true} />
                                </BaseButton>
                                <BaseButton className="octane-handheld-forum__row-main" onClick={() => onOpenForum(forum.groupId)}>
                                    <span className="octane-handheld-forum__row-text">
                                        <span className="octane-handheld-forum__row-title">
                                            <span className="octane-handheld-forum__row-subject">{forum.name}</span>
                                        </span>
                                        <span className="octane-handheld-forum__row-details">{details}</span>
                                        <span className="octane-handheld-forum__row-meta">
                                            <span className="octane-handheld-forum__count">
                                                {LocalizeText(
                                                    'groupforum.view.thread_details1',
                                                    ['TOTAL_MESSAGES', 'total_messages'],
                                                    [String(forum.totalMessages), String(forum.totalMessages)]
                                                )}
                                            </span>
                                            <span className="octane-handheld-forum__count is-unread">
                                                {LocalizeText(
                                                    'groupforum.view.thread_details2',
                                                    ['NEW_MESSAGES', 'new_messages'],
                                                    [String(forum.unreadMessages), String(forum.unreadMessages)]
                                                )}
                                            </span>
                                        </span>
                                    </span>
                                    <ForumIcon name="forward" />
                                </BaseButton>
                            </div>
                        );
                    })}
                </div>
                <HandheldForumPages pageCount={pageCount} pageIndex={pageIndex} onPage={onPage} />
                {(hint.before || hint.link) && (
                    <div className="octane-handheld-forum__hint">
                        <span>{hint.before}</span>
                        {hint.link && (
                            <BaseButton className="octane-handheld-forum__link" onClick={onHint}>
                                {hint.link}
                            </BaseButton>
                        )}
                        {hint.after && <span>{hint.after}</span>}
                    </div>
                )}
            </div>
            <div className="octane-handheld-forum__bar">
                <BaseButton className="octane-handheld-forum__button" onClick={onMarkAsRead}>
                    {LocalizeText('groupforum.view.mark_read')}
                </BaseButton>
            </div>
        </div>
    </NativeTextTree>
);
