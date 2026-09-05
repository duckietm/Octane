import { ForumData, ForumsListMessageEvent, GetForumsListMessageComposer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetUserProfile, LocalizeText, SendMessageComposer } from '../../../../api';
import { Column, Flex, LayoutBadgeImageView, Text } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';

const FORUMS_PER_PAGE = 20;

interface GroupForumListViewProps {
    onOpenForum: (groupId: number) => void;
}

export const GroupForumListView: FC<GroupForumListViewProps> = (props) => {
    const { onOpenForum = null } = props;
    const [forums, setForums] = useState<ForumData[]>([]);
    const [listMode, setListMode] = useState<number>(0); // 0 = most active
    const [startIndex, setStartIndex] = useState<number>(0);
    const [totalForums, setTotalForums] = useState<number>(0);

    useMessageEvent<ForumsListMessageEvent>(ForumsListMessageEvent, (event) => {
        const parser = event.getParser();

        setTotalForums(parser.totalAmount);

        if (parser.startIndex === 0) {
            setForums(parser.forums);
        } else {
            setForums((prev) => [...prev, ...parser.forums]);
        }
    });

    useEffect(() => {
        SendMessageComposer(new GetForumsListMessageComposer(listMode, startIndex, FORUMS_PER_PAGE));
    }, [listMode, startIndex]);

    const formatTimeAgo = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s ${LocalizeText('messageboard.time.ago')}`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${LocalizeText('messageboard.time.ago')}`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${LocalizeText('messageboard.time.ago')}`;

        return `${Math.floor(seconds / 86400)}d ${LocalizeText('messageboard.time.ago')}`;
    };

    return (
        <Column className="h-full" gap={0}>
            <Flex className="bg-muted p-2 border-b" gap={2} alignItems="center" justifyContent="between">
                <Text bold>{LocalizeText('messageboard.all.threads.header')}</Text>
                <Flex gap={1}>
                    <select
                        className="form-select form-select-sm"
                        value={listMode}
                        onChange={(e) => {
                            setListMode(parseInt(e.target.value));
                            setStartIndex(0);
                        }}
                    >
                        <option value={0}>{LocalizeText('groupforum.list.tab.most_active')}</option>
                        <option value={2}>{LocalizeText('groupforum.list.tab.my_forums')}</option>
                    </select>
                </Flex>
            </Flex>
            <Column className="overflow-auto flex-1 p-2" gap={1}>
                {forums.map((forum, index) => {
                    return (
                        <Flex
                            key={forum.groupId}
                            className="p-2 rounded bg-white hover:bg-muted cursor-pointer border"
                            gap={2}
                            alignItems="center"
                            onClick={() => onOpenForum(forum.groupId)}
                        >
                            <div className="flex-shrink-0">
                                <LayoutBadgeImageView badgeCode={forum.icon} isGroup={true} />
                            </div>
                            <Column className="flex-1 overflow-hidden" gap={0}>
                                <Text bold className="truncate">
                                    {forum.name}
                                </Text>
                                <Text small variant="muted" className="truncate">
                                    {forum.description}
                                </Text>
                            </Column>
                            <Column className="flex-shrink-0 text-end" gap={0}>
                                <Text small>
                                    {forum.totalThreads} {LocalizeText('groupforum.view.threads')}
                                </Text>
                                <Text small>
                                    {forum.totalMessages} {LocalizeText('messageboard.messages')}
                                </Text>
                                {forum.unreadMessages > 0 && (
                                    <Text small bold variant="danger">
                                        {forum.unreadMessages} {LocalizeText('messageboard.unread')}
                                    </Text>
                                )}
                            </Column>
                            <Column className="flex-shrink-0 text-end min-w-[100px]" gap={0}>
                                {forum.lastMessageAuthorId > 0 && (
                                    <>
                                        <Text small variant="muted">
                                            {LocalizeText('messageboard.last.message')}
                                        </Text>
                                        <Text
                                            small
                                            pointer
                                            underline
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                GetUserProfile(forum.lastMessageAuthorId);
                                            }}
                                        >
                                            {forum.lastMessageAuthorName}
                                        </Text>
                                        <Text small variant="muted">
                                            {formatTimeAgo(forum.lastMessageTimeAsSecondsAgo)}
                                        </Text>
                                    </>
                                )}
                            </Column>
                        </Flex>
                    );
                })}
                {forums.length === 0 && (
                    <Flex className="p-4" justifyContent="center">
                        <Text variant="muted">{LocalizeText('groupforum.list.no_forums')}</Text>
                    </Flex>
                )}
                {forums.length < totalForums && (
                    <Flex justifyContent="center" className="p-2">
                        <Text pointer underline onClick={() => setStartIndex(forums.length)}>
                            {LocalizeText('groupforum.list.load_more')}
                        </Text>
                    </Flex>
                )}
            </Column>
        </Column>
    );
};
