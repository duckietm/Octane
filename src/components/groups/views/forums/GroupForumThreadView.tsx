import {
    ExtendedForumData,
    GetMessagesMessageComposer,
    GuildForumThread,
    MessageData,
    ModerateMessageMessageComposer,
    ModerateThreadMessageComposer,
    PostMessageMessageComposer,
    PostMessageMessageEvent,
    PostThreadMessageEvent,
    ThreadMessagesMessageEvent,
    UpdateForumReadMarkerEntry,
    UpdateForumReadMarkerMessageComposer,
    UpdateMessageMessageEvent,
    UpdateThreadMessageComposer,
    UpdateThreadMessageEvent
} from '@octane/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { GetUserProfile, LocalizeText, localizeWithFallback, ReportType, SendMessageComposer } from '../../../../api';
import { Button, Column, Flex, LayoutAvatarImageView, Text } from '../../../../common';
import { resolveMessagePageStart, useGroupForumUnread, useHelp, useMessageEvent } from '../../../../hooks';

const MESSAGES_PER_PAGE = 20;

// Message states
const STATE_NORMAL = 0;
const STATE_VISIBLE = 1;
const STATE_HIDDEN_BY_ADMIN = 10;
const STATE_DELETED_BY_MODERATOR = 20;

interface GroupForumThreadViewProps {
    groupId: number;
    threadId: number;
    initialThread?: GuildForumThread;
    /** GroupForumController.goToMessageIndex: the message the view opens on (its page is loaded first). */
    initialMessageIndex?: number;
    forumData: ExtendedForumData;
    onBack: () => void;
}

export const GroupForumThreadView: FC<GroupForumThreadViewProps> = (props) => {
    const { groupId = 0, threadId = 0, initialThread = null, initialMessageIndex = 0, forumData = null, onBack = null } = props;
    const effectiveGroupId = forumData?.groupId || groupId;
    const [messages, setMessages] = useState<MessageData[]>([]);
    const { markThreadRead = null } = useGroupForumUnread();
    const { report = null } = useHelp();
    const pendingScrollIndexRef = useRef<number>(-1);
    const [totalMessages, setTotalMessages] = useState<number>(0);
    const [replyText, setReplyText] = useState<string>('');
    const [threadInfo, setThreadInfo] = useState<GuildForumThread>(initialThread);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesListRef = useRef<HTMLDivElement>(null);

    useMessageEvent<ThreadMessagesMessageEvent>(ThreadMessagesMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== effectiveGroupId || parser.threadId !== threadId) return;

        setTotalMessages(parser.amount);

        // Pages can arrive before or after the ones already shown (jump to the
        // first unread message, then "earlier" / "more"): merge by message index.
        setMessages((prev) => {
            const byId = new Map<number, MessageData>();

            for (const message of [...prev, ...parser.messages]) byId.set(message.messageId, message);

            return [...byId.values()].sort((a, b) => a.messageIndex - b.messageIndex);
        });

        // Mark messages as read
        if (parser.messages.length > 0) {
            const lastMessage = parser.messages[parser.messages.length - 1];
            SendMessageComposer(new UpdateForumReadMarkerMessageComposer(new UpdateForumReadMarkerEntry(effectiveGroupId, lastMessage.messageId, true)));
            markThreadRead?.(threadId, lastMessage.messageIndex);
        }
    });

    useMessageEvent<PostMessageMessageEvent>(PostMessageMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== effectiveGroupId || parser.threadId !== threadId) return;

        setMessages((prev) => [...prev, parser.message]);
        markThreadRead?.(threadId, parser.message.messageIndex);
    });

    useMessageEvent<PostThreadMessageEvent>(PostThreadMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== effectiveGroupId) return;

        // Update thread info if this is our thread
        if (parser.thread.threadId === threadId) {
            setThreadInfo(parser.thread);
        }
    });

    useMessageEvent<UpdateMessageMessageEvent>(UpdateMessageMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== effectiveGroupId || parser.threadId !== threadId) return;

        setMessages((prev) =>
            prev.map((msg) => {
                if (msg.messageId === parser.message.messageId) {
                    return parser.message;
                }

                return msg;
            })
        );
    });

    useMessageEvent<UpdateThreadMessageEvent>(UpdateThreadMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== effectiveGroupId) return;

        if (parser.thread.threadId === threadId) {
            setThreadInfo(parser.thread);
        }
    });

    useEffect(() => {
        if (!effectiveGroupId || !threadId) return;

        setMessages([]);
        pendingScrollIndexRef.current = initialMessageIndex;
        SendMessageComposer(new GetMessagesMessageComposer(effectiveGroupId, threadId, resolveMessagePageStart(initialMessageIndex, MESSAGES_PER_PAGE), MESSAGES_PER_PAGE));
    }, [effectiveGroupId, threadId, initialMessageIndex]);

    // Once the requested page is in, land on the message the thread was opened for.
    useEffect(() => {
        const index = pendingScrollIndexRef.current;

        if (index < 0 || !messages.some((message) => message.messageIndex === index)) return;

        pendingScrollIndexRef.current = -1;
        messagesListRef.current?.querySelector<HTMLElement>(`[data-message-index="${index}"]`)?.scrollIntoView({ block: 'start' });
    }, [messages]);

    const firstLoadedIndex = messages.length ? messages[0].messageIndex : 0;
    const lastLoadedIndex = messages.length ? messages[messages.length - 1].messageIndex : -1;

    const loadEarlierMessages = useCallback(() => {
        const start = Math.max(0, firstLoadedIndex - MESSAGES_PER_PAGE);

        SendMessageComposer(new GetMessagesMessageComposer(effectiveGroupId, threadId, start, Math.min(MESSAGES_PER_PAGE, firstLoadedIndex - start)));
    }, [effectiveGroupId, threadId, firstLoadedIndex]);

    /** MessageListView.onReport -> HabboHelp.reportMessage: the call for help flow with reason category 8. */
    const reportMessage = useCallback(
        (messageId: number) => report?.(ReportType.MESSAGE, { groupId: effectiveGroupId, threadId, messageId }),
        [report, effectiveGroupId, threadId]
    );

    const sendReply = useCallback(() => {
        if (replyText.trim().length < 10 || isSubmitting) return;

        setIsSubmitting(true);
        SendMessageComposer(new PostMessageMessageComposer(effectiveGroupId, threadId, '', replyText.trim()));
        setReplyText('');

        setTimeout(() => setIsSubmitting(false), 1000);
    }, [effectiveGroupId, threadId, replyText, isSubmitting]);

    const togglePinThread = useCallback(() => {
        if (!threadInfo) return;

        // UpdateThreadMessageComposer swaps 3rd/4th params internally: (groupId, threadId, isLocked, isPinned)
        SendMessageComposer(new UpdateThreadMessageComposer(effectiveGroupId, threadId, threadInfo.isLocked, !threadInfo.isPinned));
    }, [effectiveGroupId, threadId, threadInfo]);

    const toggleLockThread = useCallback(() => {
        if (!threadInfo) return;

        // UpdateThreadMessageComposer swaps 3rd/4th params internally: (groupId, threadId, isLocked, isPinned)
        SendMessageComposer(new UpdateThreadMessageComposer(effectiveGroupId, threadId, !threadInfo.isLocked, threadInfo.isPinned));
    }, [effectiveGroupId, threadId, threadInfo]);

    const hideMessage = useCallback(
        (messageId: number) => {
            SendMessageComposer(new ModerateMessageMessageComposer(effectiveGroupId, threadId, messageId, STATE_HIDDEN_BY_ADMIN));
        },
        [effectiveGroupId, threadId]
    );

    const restoreMessage = useCallback(
        (messageId: number) => {
            SendMessageComposer(new ModerateMessageMessageComposer(effectiveGroupId, threadId, messageId, STATE_VISIBLE));
        },
        [effectiveGroupId, threadId]
    );

    const hideThread = useCallback(() => {
        SendMessageComposer(new ModerateThreadMessageComposer(effectiveGroupId, threadId, STATE_HIDDEN_BY_ADMIN));
        onBack();
    }, [effectiveGroupId, threadId, onBack]);

    const deleteThread = useCallback(() => {
        SendMessageComposer(new ModerateThreadMessageComposer(effectiveGroupId, threadId, STATE_DELETED_BY_MODERATOR));
        onBack();
    }, [effectiveGroupId, threadId, onBack]);

    const formatTimeAgo = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s ${LocalizeText('messageboard.time.ago')}`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${LocalizeText('messageboard.time.ago')}`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${LocalizeText('messageboard.time.ago')}`;

        return `${Math.floor(seconds / 86400)}d ${LocalizeText('messageboard.time.ago')}`;
    };

    const getMessageStateText = (message: MessageData): string => {
        if (message.state === STATE_HIDDEN_BY_ADMIN) {
            return LocalizeText('messageboard.message.hidden.by.admin');
        }

        if (message.state === STATE_DELETED_BY_MODERATOR) {
            return LocalizeText('messageboard.message.permanently.deleted.by.moderator');
        }

        return null;
    };

    const canModerate = forumData && forumData.hasModeratePermissionError;
    const canPost = forumData && forumData.hasPostMessagePermissionError;
    const canReport = !!(forumData && forumData.canReport);
    const isLocked = threadInfo ? threadInfo.isLocked : false;

    // Derive thread info from first message if we don't have explicit thread info
    const threadHeader = messages.length > 0 && messages[0] ? messages[0].messageText : '';

    return (
        <Column className="h-full" gap={0}>
            <Flex className="bg-muted p-2 border-b" gap={2} alignItems="center" justifyContent="between">
                <Flex gap={2} alignItems="center">
                    <Text pointer bold onClick={onBack}>
                        <span className="inline-block w-[7px] h-[7px] border-l-2 border-b-2 border-current rotate-45 mr-1 align-middle" />{' '}
                        {LocalizeText('groupforum.view.back')}
                    </Text>
                </Flex>
                {canModerate && (
                    <Flex gap={1}>
                        <Button
                            variant="outline-secondary"
                            className="btn-sm rounded-md text-white bg-[#5cb85c] border-[#5cb85c] [box-shadow:inset_0_2px_#ffffff26,inset_0_-2px_#0000001a,0_1px_#0000001a] hover:text-white hover:bg-[#4cae4c] hover:border-[#47a447]"
                            onClick={togglePinThread}
                        >
                            {threadInfo?.isPinned ? LocalizeText('groupforum.thread.unpin') : LocalizeText('groupforum.thread.pin')}
                        </Button>
                        <Button
                            variant="outline-secondary"
                            className="btn-sm rounded-md text-white bg-[#5cb85c] border-[#5cb85c] [box-shadow:inset_0_2px_#ffffff26,inset_0_-2px_#0000001a,0_1px_#0000001a] hover:text-white hover:bg-[#4cae4c] hover:border-[#47a447]"
                            onClick={toggleLockThread}
                        >
                            {isLocked ? LocalizeText('groupforum.thread.unlock') : LocalizeText('groupforum.thread.lock')}
                        </Button>
                        <Button
                            variant="outline-secondary"
                            className="btn-sm rounded-md text-white bg-[#5cb85c] border-[#5cb85c] [box-shadow:inset_0_2px_#ffffff26,inset_0_-2px_#0000001a,0_1px_#0000001a] hover:text-white hover:bg-[#4cae4c] hover:border-[#47a447]"
                            onClick={hideThread}
                        >
                            {LocalizeText('groupforum.thread.hide')}
                        </Button>
                        <Button variant="danger" className="btn-sm" onClick={deleteThread}>
                            {LocalizeText('groupforum.thread.delete')}
                        </Button>
                    </Flex>
                )}
            </Flex>
            <Column className="overflow-auto flex-1" gap={0} innerRef={messagesListRef}>
                {firstLoadedIndex > 0 && (
                    <Flex justifyContent="center" className="p-2">
                        <Text pointer underline onClick={loadEarlierMessages}>
                            {localizeWithFallback('groupforum.thread.load_earlier', 'Show earlier messages')}
                        </Text>
                    </Flex>
                )}
                {messages.map((message, index) => {
                    const stateText = getMessageStateText(message);

                    if (stateText && !canModerate) {
                        return (
                            <Flex key={message.messageId} className="p-2 border-b bg-danger bg-opacity-10" alignItems="center">
                                <Text small variant="muted">
                                    {stateText}
                                </Text>
                            </Flex>
                        );
                    }

                    return (
                        <Flex
                            key={message.messageId}
                            className={`p-3 border-b ${message.state !== STATE_NORMAL ? 'bg-danger bg-opacity-10' : ''}`}
                            gap={3}
                            data-message-index={message.messageIndex}
                        >
                            <Column className="flex-shrink-0 items-center w-[50px]" gap={1}>
                                <div className="relative w-[40px] h-[40px] rounded-full mx-auto overflow-hidden bg-[rgba(255,255,255,0.1)]">
                                    <LayoutAvatarImageView
                                        figure={message.authorFigure}
                                        headOnly={true}
                                        direction={2}
                                        style={{ backgroundSize: '80px auto', backgroundPosition: '-19px -28px' }}
                                    />
                                </div>
                                <Text small bold pointer underline onClick={() => GetUserProfile(message.authorId)}>
                                    {message.authorName}
                                </Text>
                                <Text small variant="muted">
                                    {message.authorPostCount} {LocalizeText('messageboard.messages')}
                                </Text>
                            </Column>
                            <Column className="flex-1" gap={1}>
                                <Flex justifyContent="between" alignItems="center">
                                    <Text small variant="muted">
                                        {formatTimeAgo(message.creationTime)}
                                    </Text>
                                    {canModerate && message.state !== STATE_NORMAL && (
                                        <Flex gap={1}>
                                            <Text small variant="muted">
                                                {stateText}
                                            </Text>
                                            <Text small pointer underline variant="primary" onClick={() => restoreMessage(message.messageId)}>
                                                {LocalizeText('groupforum.message.restore')}
                                            </Text>
                                        </Flex>
                                    )}
                                    <Flex gap={2} alignItems="center">
                                        {canReport && message.state === STATE_NORMAL && (
                                            <Text small pointer underline variant="muted" onClick={() => reportMessage(message.messageId)}>
                                                {localizeWithFallback('groupforum.message.report', 'Report')}
                                            </Text>
                                        )}
                                        {canModerate && message.state === STATE_NORMAL && (
                                            <Text small pointer underline variant="danger" onClick={() => hideMessage(message.messageId)}>
                                                {LocalizeText('groupforum.message.hide')}
                                            </Text>
                                        )}
                                    </Flex>
                                </Flex>
                                {(message.state === STATE_NORMAL || canModerate) && (
                                    <Text className="whitespace-pre-wrap break-words">{message.messageText}</Text>
                                )}
                            </Column>
                        </Flex>
                    );
                })}
                {lastLoadedIndex + 1 < totalMessages && (
                    <Flex justifyContent="center" className="p-2">
                        <Text
                            pointer
                            underline
                            onClick={() => {
                                SendMessageComposer(new GetMessagesMessageComposer(effectiveGroupId, threadId, lastLoadedIndex + 1, MESSAGES_PER_PAGE));
                            }}
                        >
                            {LocalizeText('groupforum.thread.load_more')}
                        </Text>
                    </Flex>
                )}
                <div ref={messagesEndRef} />
            </Column>
            {canPost && !isLocked && (
                <Flex className="p-2 border-t bg-light" gap={2}>
                    <textarea
                        className="form-control form-control-sm flex-1"
                        placeholder={LocalizeText('messageboard.message.replying.to')}
                        rows={2}
                        maxLength={4000}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendReply();
                            }
                        }}
                    />
                    <Button variant="primary" className="btn-sm align-self-end" onClick={sendReply} disabled={replyText.trim().length < 10 || isSubmitting}>
                        {LocalizeText('messageboard.reply.button')}
                    </Button>
                </Flex>
            )}
            {isLocked && (
                <Flex className="p-2 border-t bg-warning bg-opacity-10" justifyContent="center">
                    <Text small variant="muted">
                        {LocalizeText('groupforum.thread.locked')}
                    </Text>
                </Flex>
            )}
            {!canPost && !isLocked && forumData && (
                <Flex className="p-2 border-t bg-muted" justifyContent="center">
                    <Text small variant="muted">
                        {LocalizeText('groupforum.view.error.' + forumData.postMessagePermissionError)}
                    </Text>
                </Flex>
            )}
        </Column>
    );
};
