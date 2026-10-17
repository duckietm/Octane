import { AddLinkEventTracker, FollowFriendMessageComposer, GetSessionDataManager, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { GetUserProfile, LocalizeText, ReportType, SendMessageComposer, useHabbiconCatalog } from '../../../../api';
import { HabbiconsDmIcon } from '../../../../assets/images/habbicons';
import { DraggableWindow, DraggableWindowPosition, LayoutAvatarImageView } from '../../../../common';
import { useFriends, useHelp, useMessenger, useTranslation } from '../../../../hooks';
import { isStaffChatIdentity } from '../../staffChatIdentity';
import { StaffChatFrankIconView } from '../../StaffChatFrankIconView';
import { resolveAvatarFigure } from '../friends-list/resolveAvatarFigure';
import './FriendsMessengerView.css';
import { FriendsMessengerHabbiconPickerView } from './FriendsMessengerHabbiconPickerView';
import { FriendsMessengerThreadView } from './messenger-thread/FriendsMessengerThreadView';
import { BaseButton } from '../../../../common/BaseButton';
import { TabBar, TabBarTab } from '../../../../common/TabBar';

const MESSENGER_VISIBLE_AVATARS = 7;

export const FriendsMessengerView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [lastThreadId, setLastThreadId] = useState(-1);
    const [messageText, setMessageText] = useState('');
    const [isHabbiconPickerVisible, setIsHabbiconPickerVisible] = useState(false);
    const habbiconCatalog = useHabbiconCatalog();
    const [avatarStartIndex, setAvatarStartIndex] = useState(0);
    const {
        visibleThreads = [],
        activeThread = null,
        getMessageThread = null,
        sendMessage = null,
        sendHabbiconMessage,
        setActiveThreadId = null,
        closeThread = null,
        typingUserIds = [],
        sendTypingStatus = null
    } = useMessenger();
    const { getFriend = null } = useFriends();
    const { report = null } = useHelp();
    const { settings, translateOutgoing } = useTranslation();
    const messagesBox = useRef<HTMLDivElement>(null);
    const isTypingRef = useRef<boolean>(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    const stopTyping = () => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        if (isTypingRef.current && activeThread && activeThread.participant && activeThread.participant.id > 0) {
            sendTypingStatus(activeThread.participant.id, false);
        }

        isTypingRef.current = false;
    };

    const handleInputChange = (value: string) => {
        setMessageText(value);

        const peerId = activeThread && activeThread.participant ? activeThread.participant.id : 0;

        if (peerId <= 0) return;

        if (!value.length) {
            stopTyping();
            return;
        }

        if (!isTypingRef.current) {
            sendTypingStatus(peerId, true);
            isTypingRef.current = true;
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => stopTyping(), 4000);
    };

    const followFriend = () => activeThread && activeThread.participant && SendMessageComposer(new FollowFriendMessageComposer(activeThread.participant.id));
    const openProfile = () => activeThread && activeThread.participant && GetUserProfile(activeThread.participant.id);

    const send = async () => {
        if (!activeThread || !messageText.length) return;

        stopTyping();

        const trimmedText = messageText.trimStart();
        const shouldTranslateOutgoing = settings.enabled && !!trimmedText.length && trimmedText.charAt(0) !== ':';

        if (!shouldTranslateOutgoing) {
            sendMessage(activeThread, GetSessionDataManager().userId, messageText);
            setMessageText('');
            return;
        }

        const translation = await translateOutgoing(messageText);

        if (translation && translation.translatedText?.length && translation.translatedText.length <= 255) {
            sendMessage(activeThread, GetSessionDataManager().userId, translation.translatedText, 0, null, undefined, translation);
            setMessageText('');
            return;
        }

        sendMessage(activeThread, GetSessionDataManager().userId, messageText);

        setMessageText('');
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;

        void send();
    };

    const sendHabbicon = (habbiconId: number, keepOpen = false) => {
        if (!activeThread || habbiconId <= 0) return;

        sendHabbiconMessage(activeThread, habbiconId);
        if (!keepOpen) setIsHabbiconPickerVisible(false);
    };

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length === 2) {
                    if (parts[1] === 'open') {
                        setIsVisible(true);

                        return;
                    }

                    if (parts[1] === 'toggle') {
                        setIsVisible((prevValue) => !prevValue);

                        return;
                    }

                    const participantId = parseInt(parts[1]);
                    const friend = getFriend(participantId);
                    if (!friend) return;

                    // Staff Chat (participantId -1) and direct chats resolve the same
                    // way — one path, so both open in the same messenger window.
                    const thread = getMessageThread(participantId);

                    if (!thread) return;

                    setActiveThreadId(thread.threadId);
                    setIsVisible(true);
                }
            },
            eventUrlPrefix: 'friends-messenger/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [getFriend, getMessageThread, setActiveThreadId]);

    useEffect(() => {
        if (!isVisible || !activeThread) return;
        if (!messagesBox.current) return;

        messagesBox.current.scrollTop = messagesBox.current.scrollHeight;
    }, [isVisible, activeThread]);

    useEffect(() => {
        return () => {
            stopTyping();
        };
    }, [activeThread]);

    useEffect(() => {
        if (isVisible && !activeThread) {
            if (lastThreadId > 0) {
                setActiveThreadId(lastThreadId);
            } else {
                if (visibleThreads.length > 0) setActiveThreadId(visibleThreads[0].threadId);
            }

            return;
        }

        if (!isVisible && activeThread) {
            setLastThreadId(activeThread.threadId);
            setActiveThreadId(-1);
        }
    }, [isVisible, activeThread, lastThreadId, visibleThreads, setActiveThreadId]);

    useEffect(() => {
        const maximumStart = Math.max(0, visibleThreads.length - MESSENGER_VISIBLE_AVATARS);
        const activeIndex = activeThread ? visibleThreads.findIndex((thread) => thread.threadId === activeThread.threadId) : -1;

        setAvatarStartIndex((current) => {
            const clamped = Math.min(current, maximumStart);

            if (activeIndex < 0) return clamped;
            if (activeIndex < clamped) return activeIndex;
            if (activeIndex >= clamped + MESSENGER_VISIBLE_AVATARS) return Math.min(activeIndex - MESSENGER_VISIBLE_AVATARS + 1, maximumStart);

            return clamped;
        });
    }, [activeThread, visibleThreads]);

    const maximumAvatarStart = Math.max(0, visibleThreads.length - MESSENGER_VISIBLE_AVATARS);
    const displayedThreads = visibleThreads.slice(avatarStartIndex, avatarStartIndex + MESSENGER_VISIBLE_AVATARS);
    const scrollAvatars = (direction: -1 | 1) => setAvatarStartIndex((current) => Math.max(0, Math.min(maximumAvatarStart, current + direction)));

    if (!isVisible) return null;

    return (
        <>
        <DraggableWindow handleSelector=".messenger-drag" windowPosition={DraggableWindowPosition.TOP_CENTER} offsetTop={8}>
            <div className="messenger-window">
                <div className="messenger-drag" />
                <BaseButton className="messenger-minimize" onClick={() => setIsVisible(false)} />
                <div className="messenger-open-title">{LocalizeText('messenger.window.title', ['OPEN_CHAT_COUNT'], [visibleThreads.length.toString()])}</div>
                <div className="messenger-avatar-navigation">
                    <BaseButton
                        type="button"
                        className="messenger-avatar-scroll left"
                        data-action="scroll-left"
                        aria-label={LocalizeText('generic.previous')}
                        disabled={avatarStartIndex === 0}
                        onClick={() => scrollAvatars(-1)}
                    />
                    <TabBar className="messenger-avatar-bar" value={activeThread?.threadId ?? null}>
                        {displayedThreads.map((thread) => {
                            const isStaff = isStaffChatIdentity(thread.participant);
                            const liveFriend = thread.participant.id > 0 ? getFriend(thread.participant.id) : null;
                            const figure = resolveAvatarFigure(
                                liveFriend?.figure || thread.participant.figure,
                                liveFriend?.gender ?? thread.participant.gender
                            );

                            return (
                                <TabBarTab
                                    key={thread.threadId}
                                    value={thread.threadId}
                                    data-participant-id={thread.participant.id}
                                    className={'messenger-avatar-tab' + (activeThread === thread ? ' active' : '') + (thread.unread ? ' unread' : '')}
                                    aria-label={thread.participant.name}
                                    onClick={() => setActiveThreadId(thread.threadId)}
                                >
                                    {isStaff ? (
                                        <StaffChatFrankIconView size={35} className="staff-chat-frank" />
                                    ) : (
                                        <LayoutAvatarImageView
                                            figure={figure}
                                            headOnly={true}
                                            compactHead={true}
                                            compactHeadSize={35}
                                            compactHeadPadding={0}
                                            direction={thread.participant.id < 0 ? 3 : 2}
                                        />
                                    )}
                                </TabBarTab>
                            );
                        })}
                    </TabBar>
                    <BaseButton
                        type="button"
                        className="messenger-avatar-scroll right"
                        data-action="scroll-right"
                        aria-label={LocalizeText('generic.next')}
                        disabled={avatarStartIndex >= maximumAvatarStart}
                        onClick={() => scrollAvatars(1)}
                    />
                </div>

                {activeThread && (
                    <>
                        <div className="messenger-thread-header">
                            <span className="messenger-thread-name">
                                {LocalizeText('messenger.window.separator', ['FRIEND_NAME'], [activeThread.participant.name])}
                            </span>
                            <div className="messenger-actions">
                                {activeThread.participant.id > 0 && (
                                    <>
                                        <BaseButton
                                            className="messenger-btn icon-btn follow"
                                            aria-label={LocalizeText('friendlist.tip.follow')}
                                            onClick={followFriend}
                                        />
                                        <BaseButton
                                            className="messenger-btn icon-btn profile"
                                            aria-label={LocalizeText('infostand.profile.link.tooltip')}
                                            onClick={openProfile}
                                        />
                                        <BaseButton
                                            className="messenger-btn danger"
                                            onClick={() => report(ReportType.IM, { reportedUserId: activeThread.participant.id })}
                                        >
                                            {LocalizeText('messenger.window.button.report')}
                                        </BaseButton>
                                    </>
                                )}
                                <BaseButton className="messenger-btn close-btn" onClick={(event) => closeThread(activeThread.threadId)}>
                                    <FaTimes />
                                </BaseButton>
                            </div>
                        </div>

                        <div ref={messagesBox} className="chat-messages">
                            <FriendsMessengerThreadView thread={activeThread} />
                        </div>

                        {activeThread.participant && activeThread.participant.id > 0 && typingUserIds.indexOf(activeThread.participant.id) >= 0 && (
                            <div className="messenger-typing-indicator">
                                {LocalizeText('messenger.typing', ['FRIEND_NAME'], [activeThread.participant.name])}
                            </div>
                        )}

                        <div className="messenger-input-row">
                            <input
                                maxLength={255}
                                placeholder={LocalizeText('messenger.window.input.default', ['FRIEND_NAME'], [activeThread.participant.name])}
                                type="text"
                                value={messageText}
                                onChange={(event) => handleInputChange(event.target.value)}
                                onKeyDown={onKeyDown}
                            />
                            <BaseButton className="messenger-btn send" onClick={() => void send()}>
                                {LocalizeText('widgets.chatinput.say')}
                            </BaseButton>
                            <BaseButton
                                className="messenger-btn habbicon"
                                aria-label={LocalizeText('messenger.habbicons.tooltip')}
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={() => setIsHabbiconPickerVisible((value) => !value)}
                            >
                                <img alt="" src={HabbiconsDmIcon} />
                            </BaseButton>
                        </div>
                        {isHabbiconPickerVisible && (
                            <FriendsMessengerHabbiconPickerView
                                onClose={() => setIsHabbiconPickerVisible(false)}
                                onOpenHub={() => {
                                    setIsHabbiconPickerVisible(false);
                                    habbiconCatalog.setBookVisible(true);
                                }}
                                onSelect={sendHabbicon}
                            />
                        )}
                    </>
                )}
            </div>
        </DraggableWindow>
        </>
    );
};
