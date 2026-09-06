import {
    ExtendedForumData,
    GetThreadsMessageComposer,
    GuildForumThread,
    GuildForumThreadsEvent,
    ModerateThreadMessageComposer,
    PostThreadMessageEvent
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetUserProfile, LocalizeText, SendMessageComposer } from '../../../../api';
import { Button, Column, Flex, LayoutBadgeImageView, Text } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';

const THREADS_PER_PAGE = 20;

interface GroupForumThreadListViewProps {
    groupId: number;
    forumData: ExtendedForumData;
    onOpenThread: (groupId: number, threadId: number, thread?: GuildForumThread) => void;
    onNewThread: () => void;
    onOpenSettings: () => void;
    onBack: () => void;
}

export const GroupForumThreadListView: FC<GroupForumThreadListViewProps> = (props) => {
    const { groupId = 0, forumData = null, onOpenThread = null, onNewThread = null, onOpenSettings = null, onBack = null } = props;
    const effectiveGroupId = forumData?.groupId || groupId;
    const [threads, setThreads] = useState<GuildForumThread[]>([]);
    const [startIndex, setStartIndex] = useState<number>(0);
    const [totalThreads, setTotalThreads] = useState<number>(0);

    useMessageEvent<GuildForumThreadsEvent>(GuildForumThreadsEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== effectiveGroupId) return;

        setTotalThreads(parser.amount);

        if (parser.startIndex === 0) {
            setThreads(parser.threads);
        } else {
            setThreads((prev) => [...prev, ...parser.threads]);
        }
    });

    useMessageEvent<PostThreadMessageEvent>(PostThreadMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== effectiveGroupId) return;

        setThreads((prev) => [parser.thread, ...prev]);
    });

    useEffect(() => {
        if (!effectiveGroupId) return;

        setThreads([]);
        setStartIndex(0);
        SendMessageComposer(new GetThreadsMessageComposer(effectiveGroupId, 0, THREADS_PER_PAGE));
    }, [effectiveGroupId]);

    const formatTimeAgo = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s ${LocalizeText('messageboard.time.ago')}`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${LocalizeText('messageboard.time.ago')}`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${LocalizeText('messageboard.time.ago')}`;

        return `${Math.floor(seconds / 86400)}d ${LocalizeText('messageboard.time.ago')}`;
    };

    const getThreadStateText = (thread: GuildForumThread): string => {
        if (thread.state === 10) return LocalizeText('messageboard.thread.hidden.by.admin');
        if (thread.state === 20) return LocalizeText('messageboard.thread.permanently.deleted.by.moderator');

        return null;
    };

    const canModerate = forumData && forumData.hasModeratePermissionError;

    const pinnedThreads = threads.filter((t) => t.isPinned);
    const normalThreads = threads.filter((t) => !t.isPinned);
    const sortedThreads = [...pinnedThreads, ...normalThreads];

    const restoreThread = (thread: GuildForumThread) => {
        SendMessageComposer(new ModerateThreadMessageComposer(effectiveGroupId, thread.threadId, 1));
    };

    return (
        <Column className="h-full" gap={0}>
            <Flex className="bg-muted p-2 border-b" gap={2} alignItems="center" justifyContent="between">
                <Flex gap={2} alignItems="center">
                    <Text pointer bold onClick={onBack}>
                        <span className="inline-block w-[7px] h-[7px] border-l-2 border-b-2 border-current rotate-45 mr-1 align-middle" />{' '}
                        {LocalizeText('groupforum.view.back')}
                    </Text>
                </Flex>
                <Flex gap={1} alignItems="center">
                    {forumData && forumData.canChangeSettings && (
                        <Button variant="link" className="btn-sm" onClick={onOpenSettings}>
                            {LocalizeText('groupforum.view.settings.header')}
                        </Button>
                    )}
                    {forumData && forumData.hasReadPermissionError && forumData.hasPostThreadPermissionError && (
                        <Button variant="primary" className="btn-sm" onClick={onNewThread}>
                            {LocalizeText('messageboard.new.thread.button')}
                        </Button>
                    )}
                </Flex>
            </Flex>
            {forumData && (
                <Flex className="bg-light p-2 border-b" gap={2} alignItems="center">
                    <LayoutBadgeImageView badgeCode={forumData.icon} isGroup={true} />
                    <Column className="flex-1" gap={0}>
                        <Text bold>{forumData.name}</Text>
                        <Text small variant="muted">
                            {forumData.description}
                        </Text>
                    </Column>
                    <Column className="text-end" gap={0}>
                        <Text small>
                            {forumData.totalThreads} {LocalizeText('groupforum.view.threads')}
                        </Text>
                        <Text small>
                            {forumData.totalMessages} {LocalizeText('messageboard.messages')}
                        </Text>
                    </Column>
                </Flex>
            )}
            {forumData && !forumData.hasReadPermissionError && (
                <Flex className="flex-1 p-4" justifyContent="center" alignItems="center">
                    <Column alignItems="center" gap={2}>
                        <Text bold>{LocalizeText('groupforum.view.error.operation_read')}</Text>
                        <Text small variant="muted">
                            {LocalizeText('groupforum.view.error.' + forumData.readPermissionError)}
                        </Text>
                    </Column>
                </Flex>
            )}
            {(!forumData || forumData.hasReadPermissionError) && (
                <Column className="overflow-auto flex-1" gap={0}>
                    {sortedThreads.map((thread, index) => {
                        const stateText = getThreadStateText(thread);

                        if (stateText) {
                            return (
                                <Flex key={thread.threadId} className="p-2 border-b bg-danger bg-opacity-10" alignItems="center" justifyContent="between">
                                    <Column gap={0}>
                                        <Text small variant="muted">
                                            {stateText}
                                        </Text>
                                        {canModerate && (
                                            <Text small variant="muted">
                                                {thread.header}
                                            </Text>
                                        )}
                                    </Column>
                                    {canModerate && (
                                        <Button variant="outline-success" className="btn-sm" onClick={() => restoreThread(thread)}>
                                            {LocalizeText('groupforum.thread.restore')}
                                        </Button>
                                    )}
                                </Flex>
                            );
                        }

                        return (
                            <Flex
                                key={thread.threadId}
                                className={`p-2 border-b hover:bg-muted cursor-pointer ${thread.isPinned ? 'bg-warning bg-opacity-10' : ''} ${thread.unreadMessagesCount > 0 ? 'fw-bold' : ''}`}
                                gap={2}
                                alignItems="center"
                                onClick={() => onOpenThread(effectiveGroupId, thread.threadId, thread)}
                            >
                                <Column className="flex-1 overflow-hidden" gap={0}>
                                    <Flex gap={1} alignItems="center">
                                        {thread.isPinned && <i className="fas fa-thumbtack text-warning" />}
                                        {thread.isLocked && <i className="fas fa-lock text-muted" />}
                                        <Text bold={thread.unreadMessagesCount > 0} className="truncate">
                                            {thread.header}
                                        </Text>
                                    </Flex>
                                    <Flex gap={1}>
                                        <Text small variant="muted">
                                            {LocalizeText('messageboard.started.by')}
                                        </Text>
                                        <Text
                                            small
                                            pointer
                                            underline
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                GetUserProfile(thread.authorId);
                                            }}
                                        >
                                            {thread.authorName}
                                        </Text>
                                        <Text small variant="muted">
                                            - {formatTimeAgo(thread.creationTimeAsSecondsAgo)}
                                        </Text>
                                    </Flex>
                                </Column>
                                <Column className="flex-shrink-0 text-center min-w-[60px]" gap={0}>
                                    <Text small>{thread.totalMessages}</Text>
                                    <Text small variant="muted">
                                        {LocalizeText('messageboard.messages')}
                                    </Text>
                                </Column>
                                {thread.unreadMessagesCount > 0 && (
                                    <Column className="flex-shrink-0 text-center min-w-[60px]" gap={0}>
                                        <Text small bold variant="danger">
                                            {thread.unreadMessagesCount}
                                        </Text>
                                        <Text small variant="danger">
                                            {LocalizeText('messageboard.unread')}
                                        </Text>
                                    </Column>
                                )}
                                <Column className="flex-shrink-0 text-end min-w-[100px]" gap={0}>
                                    <Text small variant="muted">
                                        {LocalizeText('messageboard.last.message')}
                                    </Text>
                                    <Text
                                        small
                                        pointer
                                        underline
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            GetUserProfile(thread.lastUserId);
                                        }}
                                    >
                                        {thread.lastUserName}
                                    </Text>
                                    <Text small variant="muted">
                                        {formatTimeAgo(thread.lastCommentTime)}
                                    </Text>
                                </Column>
                            </Flex>
                        );
                    })}
                    {sortedThreads.length === 0 && (
                        <Flex className="p-4" justifyContent="center">
                            <Text variant="muted">{LocalizeText('groupforum.view.no_threads')}</Text>
                        </Flex>
                    )}
                    {threads.length < totalThreads && (
                        <Flex justifyContent="center" className="p-2">
                            <Text
                                pointer
                                underline
                                onClick={() => {
                                    const nextIndex = threads.length;
                                    setStartIndex(nextIndex);
                                    SendMessageComposer(new GetThreadsMessageComposer(effectiveGroupId, nextIndex, THREADS_PER_PAGE));
                                }}
                            >
                                {LocalizeText('groupforum.list.load_more')}
                            </Text>
                        </Flex>
                    )}
                </Column>
            )}
        </Column>
    );
};
