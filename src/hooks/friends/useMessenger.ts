import {
    AuthenticatedEvent,
    ConsoleReadReceiptEvent,
    ConsoleTypingComposer,
    FriendIsTypingEvent,
    FriendListUpdateEvent,
    GetSessionDataManager,
    InstantMessageErrorEvent,
    MarkConsoleReadComposer,
    MessengerMessageAckEvent,
    MessengerMessageEvent,
    MessengerMessageFailedEvent,
    MessengerMessageType,
    NewConsoleMessageEvent,
    RoomInviteErrorEvent,
    RoomInviteEvent,
    SendMessageComposer as SendMessageComposerPacket,
    SendMessengerMessageComposer
} from '@octane/renderer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    getInstantMessageErrorTextKey,
    LocalizeText,
    localizeWithFallback,
    MessengerIconState,
    MessengerThread,
    MessengerThreadChat,
    NotificationAlertType,
    PlaySound,
    SendMessageComposer,
    SoundNames,
    selectMessages,
    getMessengerIconState
} from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';
import { IResolvedTranslation, useTranslation } from '../translation';
import { useMessengerHistory, useMessengerRealtime } from './messenger';
import { useFriends } from './useFriends';

const useMessengerState = () => {
    // Still load-bearing after FriendsPersistentMessengerView was removed: the realtime
    // store drives the messenger icon state and history prefetch for the SWF window.
    const persistentState = useMessengerRealtime();
    const persistentHistory = useMessengerHistory();
    const [messageThreads, setMessageThreads] = useState<MessengerThread[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<number>(-1);
    const [hiddenThreadIds, setHiddenThreadIds] = useState<number[]>([]);
    const [iconState, setIconState] = useState<number>(MessengerIconState.HIDDEN);
    // Counts the messages that make the icon blink; clicking the icon remembers the count it has seen.
    const [blinkSignal, setBlinkSignal] = useState(0);
    const [acknowledgedBlinkSignal, setAcknowledgedBlinkSignal] = useState(0);
    const { getFriend = null } = useFriends();
    const { simpleAlert = null } = useNotification();
    const { settings, translateIncoming } = useTranslation();

    const [typingUserIds, setTypingUserIds] = useState<number[]>([]);
    const typingTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
    const habbiconConfirmationId = useRef(0);
    const pendingHabbicons = useRef(new Map<number, { thread: MessengerThread; id: number; timer: ReturnType<typeof setTimeout> }>());
    const historyMessageIdsRef = useRef<Map<number, Set<number>>>(new Map());
    const hiddenThreadIdsRef = useRef(hiddenThreadIds);
    const moderationInfoShownRef = useRef(false);
    const windowOpenRef = useRef(false);

    const messageThreadsRef = useRef(messageThreads);
    messageThreadsRef.current = messageThreads;
    hiddenThreadIdsRef.current = hiddenThreadIds;

    const visibleThreads = useMemo(() => messageThreads.filter((thread) => hiddenThreadIds.indexOf(thread.threadId) === -1), [messageThreads, hiddenThreadIds]);
    const activeThread = useMemo(
        () => activeThreadId > 0 && visibleThreads.find((thread) => thread.threadId === activeThreadId || null),
        [activeThreadId, visibleThreads]
    );

    const getMessageThread = (userId: number) => {
        let thread = messageThreadsRef.current.find((thread) => thread.participant && thread.participant.id === userId);

        if (!thread) {
            const friend = getFriend(userId);

            if (!friend) return null;

            thread = new MessengerThread(friend);

            // AIR MainView.startConversation: the moderation notice once a session, in the first conversation, and
            // the stored-messages notice when the friend is offline.
            if (!moderationInfoShownRef.current) {
                moderationInfoShownRef.current = true;
                thread.addMessage(null, LocalizeText('messenger.moderationinfo'), 0, null, MessengerThreadChat.SECURITY_NOTIFICATION);
            }

            if (!friend.online && friend.id > 0) {
                thread.addMessage(null, LocalizeText('messenger.notification.persisted_messages'), 0, null, MessengerThreadChat.SECURITY_NOTIFICATION);
            }

            thread.setRead();

            messageThreadsRef.current = [...messageThreadsRef.current, thread];
            setMessageThreads((prevValue) => (prevValue.some((existing) => existing.threadId === thread.threadId) ? prevValue : [...prevValue, thread]));
        } else {
            const threadId = thread.threadId;

            // By id, not by an index read from a ref that only refreshes on render.
            if (hiddenThreadIdsRef.current.indexOf(threadId) >= 0) setHiddenThreadIds((prevValue) => prevValue.filter((hiddenId) => hiddenId !== threadId));
        }

        return thread;
    };

    /** The window tells the store whether it is open: AIR plays the received sound only while it is closed. */
    /**
     * AIR MainView: scrolling to the top of a conversation asks the server for the next older page. Returns whether a
     * page was asked for (not while one is loading, nor once the server said there is no more).
     */
    const loadOlderHistory = (thread: MessengerThread): boolean => {
        const participantId = thread?.participant?.id ?? 0;

        if (participantId <= 0) return false;

        const conversation = persistentState.conversationIds
            .map((conversationId) => persistentState.conversationsById[conversationId])
            .find((candidate) => candidate?.type === 0 && candidate.participantId === participantId);
        const history = conversation?.id > 0 ? persistentState.historyByConversation[conversation.id] : null;

        if (!history?.loaded || history.loading || history.hasMore === false) return false;

        persistentHistory.loadOlder(conversation.id);

        return true;
    };

    const setWindowOpen = (open: boolean) => {
        windowOpenRef.current = open;
    };

    const closeThread = (threadId: number) => {
        setHiddenThreadIds((prevValue) => {
            const newValue = [...prevValue];

            if (newValue.indexOf(threadId) >= 0) return prevValue;

            newValue.push(threadId);

            return newValue;
        });

        if (activeThreadId === threadId) setActiveThreadId(-1);
    };

    const sendMessage = (
        thread: MessengerThread,
        senderId: number,
        messageText: string,
        secondsSinceSent: number = 0,
        extraData: string = null,
        messageType: number = MessengerThreadChat.CHAT,
        translation: IResolvedTranslation = null
    ) => {
        if (!thread || !messageText || !messageText.length) return;

        const ownMessage = senderId === GetSessionDataManager().userId;

        if (ownMessage && messageType === MessengerThreadChat.CHAT && messageText.length <= 255)
            SendMessageComposer(new SendMessageComposerPacket(thread.participant.id, messageText));

        const addedChatId = MessengerThreadChat.nextId();

        // Sounds are side effects: decided here, not in the state update, which React may run twice.
        const currentThread = messageThreadsRef.current.find((existing) => existing.threadId === thread.threadId);

        if (currentThread) {
            // AIR MainView: the sent sound when the conversation holds nothing yet, or only the moderation notice.
            const lines = currentThread.groups.flatMap((group) => group.chats);

            if (ownMessage && (!lines.length || (lines.length === 1 && lines[0].type === MessengerThreadChat.SECURITY_NOTIFICATION)))
                PlaySound(SoundNames.MESSENGER_NEW_THREAD);

            if (!ownMessage && MessengerThread.countsAsUnread(messageType)) setBlinkSignal((value) => value + 1);

            // AIR HabboMessenger.onNewConsoleMessage / onRoomInvite: the received sound only while the window is closed.
            if (!ownMessage && MessengerThread.countsAsUnread(messageType) && !windowOpenRef.current) PlaySound(SoundNames.MESSENGER_MESSAGE_RECEIVED);
        }

        setMessageThreads((prevValue) => {
            const newValue = [...prevValue];
            const index = newValue.findIndex((newThread) => newThread.threadId === thread.threadId);

            if (index === -1) return prevValue;

            thread = newValue[index].clone();

            const isNotification =
                messageType === MessengerThreadChat.ROOM_INVITE ||
                messageType === MessengerThreadChat.STATUS_NOTIFICATION ||
                messageType === MessengerThreadChat.SECURITY_NOTIFICATION;
            const addedChat = thread.addMessage(isNotification ? null : senderId, messageText, secondsSinceSent, extraData, messageType, addedChatId);

            if (translation && messageType === MessengerThreadChat.CHAT)
                addedChat?.setTranslation(translation.originalText, translation.translatedText, translation.detectedLanguage, translation.targetLanguage);

            if (ownMessage || activeThreadId === thread.threadId) thread.setRead();

            newValue[index] = thread;

            return newValue;
        });

        const canTranslateMessage = !translation && settings.enabled && messageType === MessengerThreadChat.CHAT && !!messageText?.trim().length;

        if (!canTranslateMessage || addedChatId <= 0) return;

        void translateIncoming(messageText).then((translation) => {
            if (!translation) return;

            setMessageThreads((prevValue) => {
                const newValue = [...prevValue];
                const index = newValue.findIndex((newThread) => newThread.threadId === thread.threadId);

                if (index === -1) return prevValue;

                const clonedThread = newValue[index].clone();
                const chat = clonedThread.getChat(addedChatId);

                if (!chat) return prevValue;

                chat.setTranslation(translation.originalText, translation.translatedText, translation.detectedLanguage, translation.targetLanguage);
                newValue[index] = clonedThread;

                return newValue;
            });
        });
    };

    const sendHabbiconMessage = (thread: MessengerThread, id: number) => {
        if (!thread || id <= 0) return;

        const confirmationId = ++habbiconConfirmationId.current;
        const timer = setTimeout(() => {
            if (!pendingHabbicons.current.delete(confirmationId)) return;
            simpleAlert(localizeWithFallback('messenger.habbicon.failed', 'The Habicon could not be sent. Please try again.'));
        }, 10000);
        pendingHabbicons.current.set(confirmationId, { thread, id, timer });
        SendMessageComposer(new SendMessengerMessageComposer(0, thread.participant.id, confirmationId, MessengerMessageType.Habbicon, String(id), ''));
    };

    const noteHabbiconMessage = (conversationId: number, messageId: number) => {
        const known = historyMessageIdsRef.current.get(conversationId) ?? new Set<number>();
        known.add(messageId);
        historyMessageIdsRef.current.set(conversationId, known);
    };

    useMessageEvent<AuthenticatedEvent>(AuthenticatedEvent, () => {
        for (const pending of pendingHabbicons.current.values()) clearTimeout(pending.timer);
        pendingHabbicons.current.clear();
    });

    useMessageEvent<MessengerMessageAckEvent>(MessengerMessageAckEvent, (event) => {
        const parser = event.getParser();
        const pending = pendingHabbicons.current.get(parser.confirmationId);
        if (!pending) return;

        clearTimeout(pending.timer);
        pendingHabbicons.current.delete(parser.confirmationId);
        noteHabbiconMessage(parser.conversationId, parser.messageId);
        sendMessage(pending.thread, GetSessionDataManager().userId, String(pending.id), 0, null, MessengerMessageType.Habbicon);
    });

    useMessageEvent<MessengerMessageFailedEvent>(MessengerMessageFailedEvent, (event) => {
        const parser = event.getParser();
        const pending = pendingHabbicons.current.get(parser.confirmationId);
        if (!pending) return;

        clearTimeout(pending.timer);
        pendingHabbicons.current.delete(parser.confirmationId);
        simpleAlert(localizeWithFallback('messenger.habbicon.failed', 'The Habicon could not be sent. Please try again.'));
    });

    useMessageEvent<MessengerMessageEvent>(MessengerMessageEvent, (event) => {
        const message = event.getParser().message;
        if (message.type !== MessengerMessageType.Habbicon) return;

        const thread = getMessageThread(message.senderId);
        if (!thread) return;

        noteHabbiconMessage(message.conversationId, message.id);
        stopTypingIndicator(message.senderId);
        sendMessage(thread, message.senderId, message.message, 0, message.metadata, MessengerMessageType.Habbicon);
        if (thread.threadId === activeThreadId) SendMessageComposer(new MarkConsoleReadComposer(message.senderId));
    });

    useEffect(
        () => () => {
            for (const pending of pendingHabbicons.current.values()) clearTimeout(pending.timer);
            pendingHabbicons.current.clear();

            for (const timer of typingTimersRef.current.values()) clearTimeout(timer);
            typingTimersRef.current.clear();
        },
        []
    );

    // A message from a friend ends their typing, as does their own "stopped typing" or the timeout.
    const stopTypingIndicator = (senderId: number) => {
        const timer = typingTimersRef.current.get(senderId);

        if (timer) {
            clearTimeout(timer);
            typingTimersRef.current.delete(senderId);
        }

        setTypingUserIds((prev) => (prev.indexOf(senderId) >= 0 ? prev.filter((id) => id !== senderId) : prev));
    };

    const sendTypingStatus = (peerId: number, isTyping: boolean) => {
        if (!peerId || peerId <= 0) return;

        SendMessageComposer(new ConsoleTypingComposer(peerId, isTyping));
    };

    useMessageEvent<NewConsoleMessageEvent>(NewConsoleMessageEvent, (event) => {
        const parser = event.getParser();
        if (parser.senderId > 0) stopTypingIndicator(parser.senderId);

        const thread = getMessageThread(parser.senderId);

        if (!thread) return;

        if (parser.extraData === 'offline-sent') {
            sendMessage(thread, null, LocalizeText('messenger.notification.persisted_message_sent'), 0, null, MessengerThreadChat.STATUS_NOTIFICATION);
            return;
        }

        sendMessage(thread, parser.senderId, parser.messageText, parser.secondsSinceSent, parser.extraData);
        if (thread.threadId === activeThreadId && parser.senderId > 0) SendMessageComposer(new MarkConsoleReadComposer(parser.senderId));
    });

    // The server refused a console message (muted, flood, not a friend): the line was added
    // optimistically, so mark it as not sent and say why, as Flash does.
    useMessageEvent<InstantMessageErrorEvent>(InstantMessageErrorEvent, (event) => {
        const parser = event.getParser();
        // Newer codes (11-14) may be missing from older hotel texts: fall back to the generic failure.
        const errorText = localizeWithFallback(getInstantMessageErrorTextKey(parser.errorCode), LocalizeText('messenger.error.offline_failed'));
        const ownUserId = GetSessionDataManager().userId;
        // AIR MainView.onInstantMessageError: "error text: the refused message" as a warning.
        const noticeText = parser.message?.length ? `${errorText}: ${parser.message}` : errorText;

        setMessageThreads((prevValue) => {
            const index = prevValue.findIndex((thread) => thread.participant && thread.participant.id === parser.userId);

            if (index === -1) return prevValue;

            const newValue = [...prevValue];
            const thread = newValue[index].clone();

            thread.markOwnMessageFailed(ownUserId, parser.message, errorText);
            thread.addMessage(null, noticeText, 0, null, MessengerThreadChat.SECURITY_NOTIFICATION);

            if (activeThreadId === thread.threadId) thread.setRead();

            newValue[index] = thread;

            return newValue;
        });
    });

    useMessageEvent<FriendListUpdateEvent>(FriendListUpdateEvent, (event) => {
        const parser = event.getParser();

        if (!parser.updatedFriends.length) return;

        // AIR MainView.setOnlineStatus: a closed conversation whose friend comes online or goes offline comes back.
        const reopenedThreadIds = messageThreadsRef.current
            .filter((thread) => {
                const updated = parser.updatedFriends.find((friend) => friend.id === thread.participant?.id);

                return !!updated && updated.online !== thread.participant.online && hiddenThreadIdsRef.current.indexOf(thread.threadId) >= 0;
            })
            .map((thread) => thread.threadId);

        setMessageThreads((prevValue) => {
            const newValue = [...prevValue];
            let changed = false;

            for (const updatedFriend of parser.updatedFriends) {
                const index = newValue.findIndex((thread) => thread.participant?.id === updatedFriend.id);

                if (index === -1) continue;

                const thread = newValue[index].clone();
                const wasOnline = thread.participant.online;

                thread.participant.online = updatedFriend.online;

                if (wasOnline !== updatedFriend.online) {
                    thread.addMessage(
                        null,
                        LocalizeText(updatedFriend.online ? 'messenger.notification.online' : 'messenger.notification.offline'),
                        0,
                        null,
                        MessengerThreadChat.STATUS_NOTIFICATION
                    );

                    if (activeThreadId === thread.threadId) thread.setRead();
                }

                newValue[index] = thread;
                changed = true;
            }

            return changed ? newValue : prevValue;
        });

        if (reopenedThreadIds.length) setHiddenThreadIds((prevValue) => prevValue.filter((threadId) => reopenedThreadIds.indexOf(threadId) === -1));
    });

    useEffect(() => {
        for (const thread of messageThreads) {
            const participantId = thread.participant?.id ?? 0;
            if (participantId <= 0) continue;

            const conversation = persistentState.conversationIds
                .map((conversationId) => persistentState.conversationsById[conversationId])
                .find((candidate) => candidate?.type === 0 && candidate.participantId === participantId);

            if (conversation?.id > 0) persistentHistory.loadInitial(conversation.id);
        }
    }, [messageThreads, persistentHistory, persistentState.conversationIds, persistentState.conversationsById]);

    useEffect(() => {
        const now = Math.floor(Date.now() / 1000);
        // Which history lines each conversation still lacks, worked out here and recorded once: the state update
        // below must stay pure, as React may run it twice.
        const additions = new Map<number, Parameters<MessengerThread['addHistoryMessages']>[0]>();

        for (const currentThread of messageThreadsRef.current) {
            const participantId = currentThread.participant?.id ?? 0;
            if (participantId <= 0) continue;

            const conversation = persistentState.conversationIds
                .map((conversationId) => persistentState.conversationsById[conversationId])
                .find((candidate) => candidate?.type === 0 && candidate.participantId === participantId);
            if (!conversation || !persistentState.historyByConversation[conversation.id]?.loaded) continue;

            const knownMessageIds = historyMessageIdsRef.current.get(conversation.id) ?? new Set<number>();
            // Live console lines carry no server id: a history entry for a line already shown live (same sender and
            // text, sent within a minute of it) is the same message and is skipped, as AIR skips known message ids.
            const liveLines = currentThread.groups.flatMap((group) => group.chats).filter((chat) => chat.type === MessengerThreadChat.CHAT);
            const shownLive = (message: { senderId: number; message: string; createdAt: number }) =>
                liveLines.some(
                    (chat) =>
                        chat.senderId === message.senderId && chat.message === message.message && Math.abs(chat.date.getTime() / 1000 - message.createdAt) < 60
                );
            const historyMessages = selectMessages(persistentState, conversation.id).filter(
                (message) => message.id > 0 && !knownMessageIds.has(message.id) && !shownLive(message)
            );
            const knownBefore = knownMessageIds.size;

            for (const message of selectMessages(persistentState, conversation.id)) if (message.id > 0 && shownLive(message)) knownMessageIds.add(message.id);
            if (knownMessageIds.size !== knownBefore) historyMessageIdsRef.current.set(conversation.id, knownMessageIds);
            if (!historyMessages.length) continue;

            for (const message of historyMessages) knownMessageIds.add(message.id);
            historyMessageIdsRef.current.set(conversation.id, knownMessageIds);
            additions.set(
                currentThread.threadId,
                historyMessages.map((message) => ({
                    senderId: message.senderId,
                    message: message.message,
                    secondsSinceSent: Math.max(0, now - message.createdAt),
                    extraData: message.metadata || null,
                    type: message.type
                }))
            );
        }

        if (!additions.size) return;

        setMessageThreads((previousThreads) =>
            previousThreads.map((currentThread) => {
                const messages = additions.get(currentThread.threadId);

                if (!messages) return currentThread;

                const thread = currentThread.clone();

                thread.addHistoryMessages(messages);

                return thread;
            })
        );
    }, [persistentState]);

    useMessageEvent<RoomInviteEvent>(RoomInviteEvent, (event) => {
        const parser = event.getParser();
        const thread = getMessageThread(parser.senderId);

        if (!thread) return;

        sendMessage(thread, parser.senderId, parser.messageText, 0, null, MessengerThreadChat.ROOM_INVITE);
    });

    useMessageEvent<RoomInviteErrorEvent>(RoomInviteErrorEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            `Received room invite error: ${parser.errorCode},recipients: ${parser.failedRecipients.join(',')}`,
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText('friendlist.alert.title')
        );
    });

    useMessageEvent<FriendIsTypingEvent>(FriendIsTypingEvent, (event) => {
        const parser = event.getParser();
        const senderId = parser.senderId;

        if (senderId <= 0) return;

        if (!parser.isTyping) {
            stopTypingIndicator(senderId);

            return;
        }

        const timers = typingTimersRef.current;
        const existing = timers.get(senderId);

        if (existing) clearTimeout(existing);

        setTypingUserIds((prev) => (prev.indexOf(senderId) >= 0 ? prev : [...prev, senderId]));

        timers.set(
            senderId,
            setTimeout(() => {
                typingTimersRef.current.delete(senderId);
                setTypingUserIds((prev) => prev.filter((id) => id !== senderId));
            }, 6000)
        );
    });

    useMessageEvent<ConsoleReadReceiptEvent>(ConsoleReadReceiptEvent, (event) => {
        const parser = event.getParser();
        const ownUserId = GetSessionDataManager().userId;

        setMessageThreads((prevValue) => {
            const index = prevValue.findIndex((thread) => thread.participant && thread.participant.id === parser.readerId);

            if (index === -1) return prevValue;

            const newValue = [...prevValue];

            newValue[index] = newValue[index].clone();
            newValue[index].setMessagesReadFromUser(ownUserId);

            return newValue;
        });
    });

    useEffect(() => {
        if (activeThreadId <= 0) return;

        const activeThreadValue = messageThreadsRef.current.find((thread) => thread.threadId === activeThreadId);
        const participantId = activeThreadValue?.participant?.id ?? 0;

        setMessageThreads((prevValue) => {
            const newValue = [...prevValue];
            const index = newValue.findIndex((newThread) => newThread.threadId === activeThreadId);

            if (index >= 0) {
                newValue[index] = newValue[index].clone();
                newValue[index].setRead();
            }

            return newValue;
        });

        if (participantId > 0) SendMessageComposer(new MarkConsoleReadComposer(participantId));
    }, [activeThreadId]);

    /** AIR HabboFriendBarView.onOpenMessenger: clicking the icon stops its blinking. */
    const acknowledgeIcon = () => setAcknowledgedBlinkSignal(blinkSignal);

    useEffect(() => {
        setIconState(
            getMessengerIconState(
                visibleThreads.length,
                visibleThreads.some((thread) => thread.unreadCount > 0),
                acknowledgedBlinkSignal >= blinkSignal
            )
        );
    }, [visibleThreads, blinkSignal, acknowledgedBlinkSignal]);

    return {
        messageThreads,
        activeThread,
        iconState,
        acknowledgeIcon,
        visibleThreads,
        getMessageThread,
        setActiveThreadId,
        setWindowOpen,
        loadOlderHistory,
        closeThread,
        sendMessage,
        sendHabbiconMessage,
        typingUserIds,
        sendTypingStatus
    };
};

export const useMessenger = () => useSharedHook(useMessengerState);

registerSharedHook(useMessengerState);
