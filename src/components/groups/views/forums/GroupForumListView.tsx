import { CreateLinkEvent, ForumData } from '@octane/renderer';
import { FC } from 'react';
import { GetGroupInformation, LocalizeText } from '../../../../api';
import { ClassicScrollAreaView, LayoutBadgeImageView } from '../../../../common';
import { flatText, GroupText } from '../GroupNativeLayout';
import { FORUM_PAGE_SIZE, FORUM_SURFACE, stripTags, ForumButton, forumAge, ForumPager } from './GroupForumLayout';
import { BaseButton } from '../../../../common/BaseButton';

const ROW_WIDTH = 532;

/** ForumsListData: one answer to GetForumsList, as the forum window shows it. */
export interface GroupForumsListData {
    listCode: number;
    totalAmount: number;
    startIndex: number;
    forums: ForumData[];
}

interface GroupForumListViewProps {
    list: GroupForumsListData;
    onMarkAsRead: () => void;
    onOpenForum: (groupId: number) => void;
    onPage: (pageIndex: number) => void;
}

/** GroupForumView.openForumsList + ForumsListView: the page shown is the one the answer starts at, out of ceil(total / 20). */
export const GroupForumListView: FC<GroupForumListViewProps> = ({ list, onMarkAsRead, onOpenForum, onPage }) => {
    const { listCode, forums } = list;
    const pageIndex = Math.ceil(list.startIndex / FORUM_PAGE_SIZE);
    const pageCount = Math.ceil(list.totalAmount / FORUM_PAGE_SIZE);

    // "Did you know? You can get your own group forum <u><a href=...>here</a></u>." keeps its link as a separate, working piece.
    const status = LocalizeText('groupforum.view.forums_list.status');
    const linkMatch = status.match(/^(.*?)<u><a[^>]*>(.*?)<\/a><\/u>(.*)$/);
    const before = linkMatch ? stripTags(linkMatch[1]) : stripTags(status);
    const linkText = linkMatch ? linkMatch[2] : '';
    const after = linkMatch ? stripTags(linkMatch[3]) : '';

    return (
        <>
            <GroupText background={FORUM_SURFACE} height={25} overrides={flatText(16, { bold: true, color: 0xa6a6a2 })} text={LocalizeText(`groupforum.view.forums_list.${listCode}`)} width={541} x={0} y={115} />
            <div className="octane-forum__list">
                <ClassicScrollAreaView className="octane-forum__scroll" contentClassName="octane-forum__scroll-content" minThumbSize={26} scrollStep={42}>
                    {forums.map((forum, rowIndex) => {
                        const isUnread = forum.unreadMessages > 0;
                        const background = rowIndex % 2 === 1 ? 0xb2e6fa : 0xeefeff;
                        const rowColor = '#' + background.toString(16).padStart(6, '0');
                        const details = stripTags(
                            LocalizeText(
                                'groupforum.view.forum_details',
                                ['RATING', 'LAST_AUTHOR_NAME', 'UPDATE_TIME'],
                                [String(forum.leaderboardScore), forum.lastMessageAuthorName, forumAge(forum.lastMessageTimeAsSecondsAgo)]
                            )
                        );

                        return (
                            <div key={forum.groupId} className="octane-forum__forum">
                                {/* group_icon: a group badge widget, its click asks for the group details (GetHabboGroupDetails, open). */}
                                <BaseButton type="button" className="octane-forum__forum-badge" style={{ background: rowColor }} onClick={() => GetGroupInformation(forum.groupId)}>
                                    <LayoutBadgeImageView badgeCode={forum.icon} isGroup={true} />
                                </BaseButton>
                                <div className="octane-forum__forum-body" style={{ left: 42, width: ROW_WIDTH - 42 - 1 - 100, background: rowColor }}>
                                    <GroupText background={background} overrides={isUnread ? { bold: true } : undefined} text={forum.name} x={0} y={0} />
                                    <GroupText background={background} overrides={flatText(10)} text={details} x={0} y={16} />
                                    {/* header_region: the 280x17 strip over the group name opens the forum. */}
                                    <BaseButton className="octane-forum__forum-header" type="button" onClick={() => onOpenForum(forum.groupId)} />
                                </div>
                                {/* unread_region: the message counts open the forum too. */}
                                <BaseButton className="octane-forum__forum-counts" type="button" style={{ left: ROW_WIDTH - 100, background: rowColor }} onClick={() => onOpenForum(forum.groupId)}>
                                    <GroupText
                                        background={background}
                                        overrides={flatText(10, { bold: isUnread })}
                                        text={LocalizeText('groupforum.view.thread_details1', ['TOTAL_MESSAGES', 'total_messages'], [String(forum.totalMessages), String(forum.totalMessages)])}
                                        x={0}
                                        y={0}
                                    />
                                    <GroupText
                                        background={background}
                                        overrides={flatText(10, { bold: isUnread })}
                                        text={LocalizeText('groupforum.view.thread_details2', ['NEW_MESSAGES', 'new_messages'], [String(forum.unreadMessages), String(forum.unreadMessages)])}
                                        x={0}
                                        y={15}
                                    />
                                </BaseButton>
                            </div>
                        );
                    })}
                </ClassicScrollAreaView>
            </div>
            <div className="octane-forum__footer">
                <ForumButton label={LocalizeText('groupforum.view.mark_read')} width={95} x={10} onClick={onMarkAsRead} />
                <ForumPager pageCount={pageCount} pageIndex={pageIndex} onPage={onPage} />
            </div>
            <div className="octane-forum__status is-list">
                <GroupText background={FORUM_SURFACE} className="is-static" overrides={flatText(11)} text={before} x={0} y={0} />
                {linkText && (
                    <GroupText background={FORUM_SURFACE} className="is-static is-link" overrides={flatText(11, { underline: true })} text={linkText} x={0} y={0} onClick={() => CreateLinkEvent('catalog/open/guild_forum')} />
                )}
                {after && <GroupText background={FORUM_SURFACE} className="is-static" overrides={flatText(11)} text={after} x={0} y={0} />}
            </div>
        </>
    );
};
