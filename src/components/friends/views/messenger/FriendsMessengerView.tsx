import { AddLinkEventTracker, FollowFriendMessageComposer, GetSessionDataManager, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, KeyboardEvent, UIEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { Hint } from '../../../../common/Tooltip';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const MESSENGER_VISIBLE_AVATARS = 7;
/** How long the window keeps its place for an older history page that was asked for. */
const OLDER_PAGE_WAIT_MS = 5000;

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
        setWindowOpen = null,
        loadOlderHistory = null,
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
    // The scroll position to keep while an older history page goes in above the messages.
    const stickToBottomRef = useRef(true);
    const lastScrolledThreadRef = useRef(-1);
    const sendingRef = useRef(false);
    const olderPageAnchorRef = useRef<{ threadId: number; height: number; top: number; at: number }>(null);

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
        if (!activeThread || !messageText.length || sendingRef.current) return;

        stopTyping();
        // Own messages always bring the conversation to its newest line.
        stickToBottomRef.current = true;

        const trimmedText = messageText.trimStart();
        const shouldTranslateOutgoing = settings.enabled && !!trimmedText.length && trimmedText.charAt(0) !== ':';

        if (!shouldTranslateOutgoing) {
            sendMessage(activeThread, GetSessionDataManager().userId, messageText);
            setMessageText('');
            return;
        }

        // Enter again while the translation is pending must not send the text twice.
        sendingRef.current = true;

        // The field is cleared now, so what is typed while the translation is pending stays for the next send.
        const text = messageText;
        setMessageText('');

        let translation: Awaited<ReturnType<typeof translateOutgoing>> = null;

        try {
            translation = await translateOutgoing(text);
        } finally {
            sendingRef.current = false;
        }

        if (translation && translation.translatedText?.length && translation.translatedText.length <= 255) {
            sendMessage(activeThread, GetSessionDataManager().userId, translation.translatedText, 0, null, undefined, translation);
            return;
        }

        sendMessage(activeThread, GetSessionDataManager().userId, text);
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

    useLayoutEffect(() => {
        if (!isVisible || !activeThread) return;
        if (!messagesBox.current) return;

        const box = messagesBox.current;
        const anchor = olderPageAnchorRef.current;

        // Forget the anchor on another conversation, or when the page never came (nothing older to add).
        if (anchor && (anchor.threadId !== activeThread.threadId || Date.now() - anchor.at > OLDER_PAGE_WAIT_MS)) olderPageAnchorRef.current = null;

        // An older page went in above: stay on the message that was in view.
        if (olderPageAnchorRef.current) {
            if (box.scrollHeight > anchor.height) {
                box.scrollTop = box.scrollHeight - anchor.height + anchor.top;
                olderPageAnchorRef.current = null;
            }

            return;
        }

        // Follow new lines only for a reader at the bottom, a newly selected conversation or an own message; someone
        // reading older history stays where they are when a receipt or a line arrives.
        const switched = lastScrolledThreadRef.current !== activeThread.threadId;

        lastScrolledThreadRef.current = activeThread.threadId;

        if (switched || stickToBottomRef.current) box.scrollTop = box.scrollHeight;
    }, [isVisible, activeThread]);

    const onMessagesScroll = (event: UIEvent<HTMLDivElement>) => {
        const box = event.currentTarget;

        stickToBottomRef.current = box.scrollHeight - box.scrollTop - box.clientHeight < 24;

        if (!activeThread || olderPageAnchorRef.current || box.scrollTop >= 48 || box.scrollHeight <= box.clientHeight) return;

        const anchor = { threadId: activeThread.threadId, height: box.scrollHeight, top: box.scrollTop, at: Date.now() };

        if (loadOlderHistory?.(activeThread)) olderPageAnchorRef.current = anchor;
    };

    // Stop typing when the conversation changes, not on every update of it (a clone after each line or receipt).
    const activeThreadId = activeThread?.threadId ?? -1;

    useEffect(() => {
        return () => {
            stopTyping();
        };
    }, [activeThreadId]);

    useEffect(() => setWindowOpen?.(isVisible), [isVisible, setWindowOpen]);

    // AIR MainView: the window hides once its last conversation is closed, and does not open without one.
    useEffect(() => {
        if (isVisible && !visibleThreads.length) setIsVisible(false);
    }, [isVisible, visibleThreads.length]);

    useEffect(() => {
        if (isVisible && !activeThread) {
            const lastThreadOpen = lastThreadId > 0 && visibleThreads.some((thread) => thread.threadId === lastThreadId);

            if (lastThreadOpen) {
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
        <NativeTextTree>
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

                                // AIR MainView: hovering a head shows the friend's name.
                                return (
                                    <Hint key={thread.threadId} content={thread.participant.name}>
                                        <TabBarTab
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
                                    </Hint>
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
                                            <Hint content={LocalizeText('messenger.followfriend.tooltip')}>
                                                <BaseButton
                                                    className="messenger-btn icon-btn follow"
                                                    aria-label={LocalizeText('messenger.followfriend.tooltip')}
                                                    onClick={followFriend}
                                                />
                                            </Hint>
                                            <Hint content={LocalizeText('infostand.profile.link.tooltip')}>
                                                <BaseButton
                                                    className="messenger-btn icon-btn profile"
                                                    aria-label={LocalizeText('infostand.profile.link.tooltip')}
                                                    onClick={openProfile}
                                                />
                                            </Hint>
                                            <Hint content={LocalizeText('messenger.window.button.report.tooltip')}>
                                                <BaseButton
                                                    className="messenger-btn danger"
                                                    onClick={() => report(ReportType.IM, { reportedUserId: activeThread.participant.id })}
                                                >
                                                    {LocalizeText('messenger.window.button.report')}
                                                </BaseButton>
                                            </Hint>
                                        </>
                                    )}
                                    <BaseButton className="messenger-btn close-btn" onClick={(event) => closeThread(activeThread.threadId)}>
                                        <FaTimes />
                                    </BaseButton>
                                </div>
                            </div>

                            <div ref={messagesBox} className="chat-messages" onScroll={onMessagesScroll}>
                                <FriendsMessengerThreadView thread={activeThread} />
                            </div>

                            {activeThread.participant && activeThread.participant.id > 0 && typingUserIds.indexOf(activeThread.participant.id) >= 0 && (
                                <div className="messenger-typing-indicator">
                                    {LocalizeText('messenger.typing', ['FRIEND_NAME'], [activeThread.participant.name])}
                                </div>
                            )}

                            <div className="messenger-input-row">
                                {/* AIR illumina_input: the Say button sits inside the input's border, on its right. */}
                                <div className="messenger-input-box">
                                    <input
                                        maxLength={120}
                                        placeholder={LocalizeText('messenger.window.input.default', ['FRIEND_NAME'], [activeThread.participant.name])}
                                        type="text"
                                        value={messageText}
                                        onChange={(event) => handleInputChange(event.target.value)}
                                        onKeyDown={onKeyDown}
                                    />
                                    <BaseButton className="messenger-btn send" onClick={() => void send()}>
                                        {LocalizeText('widgets.chatinput.say')}
                                    </BaseButton>
                                </div>
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
        </NativeTextTree>
    );
};
