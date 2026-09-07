import { FindNewFriendsMessageComposer, MouseEventType } from '@octane/renderer';
import { AnimatePresence, motion } from 'framer-motion';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { GetUserProfile, LocalizeText, MessengerFriend, OpenMessengerChat, SendMessageComposer } from '../../../../api';
import messengerTokenIcon from '../../../../assets/images/friends/messenger_notification_icon.png';
import staffChatFrankIcon from '../../../../assets/images/friends/staff-chat-frank.svg';
import addFriendsIcon from '../../../../assets/images/friends/swf/add_friends_icon.png';
import chatIcon from '../../../../assets/images/friends/swf/friendlist_chat.png';
import profileIcon from '../../../../assets/images/friends/swf/friendlist_eye.png';
import visitIcon from '../../../../assets/images/friends/swf/friendlist_go_room.png';
import notifyTokenIcon from '../../../../assets/images/friends/swf/friendlist_notify_1.png';
import searchFriendsIcon from '../../../../assets/images/friends/swf/search_friends_icon.png';
import { LayoutAvatarImageView, LayoutBadgeImageView } from '../../../../common';
import { useFriends, useMessenger } from '../../../../hooks';
import { FriendBarToken, resolveFriendBarTokens } from '../../../../hooks/friends/friendBarTokens';
import { selectFriendNotifications, useFriendNotificationsStore } from '../../../../hooks/friends/friendNotificationsStore';
import { isStaffChatIdentity } from '../../staffChatIdentity';
import { StaffChatFrankIconView } from '../../StaffChatFrankIconView';

const tokenIconSrc = (token: FriendBarToken): string => (token.tag === 'message' ? messengerTokenIcon : notifyTokenIcon);

export const FriendBarItemView: FC<{ friend: MessengerFriend }> = (props) => {
    const { friend = null } = props;
    const [isVisible, setVisible] = useState(false);
    const { followFriend = null } = useFriends();
    const { messageThreads = [] } = useMessenger();
    const friendId = friend ? friend.id : 0;
    const notifications = useFriendNotificationsStore(selectFriendNotifications(friendId));
    const elementRef = useRef<HTMLDivElement>(null);
    const wasVisibleRef = useRef(false);

    // Official friend tab tokens: an unread console thread raises the
    // messenger token, the FriendNotification packet the event / achievement /
    // quest / game ones (FriendEntityTab.addNotificationToken).
    const unreadMessageCount = useMemo(() => {
        if (friendId === 0) return 0;

        const thread = messageThreads.find((entry) => entry && entry.participant && entry.participant.id === friendId);

        return thread ? thread.unreadCount : 0;
    }, [friendId, messageThreads]);
    const tokens = useMemo(
        () => (friendId === 0 ? [] : resolveFriendBarTokens(notifications, unreadMessageCount)),
        [friendId, notifications, unreadMessageCount]
    );

    // FriendEntityTab.deselect: view-once tokens leave once the tab was opened and closed again.
    useEffect(() => {
        if (wasVisibleRef.current && !isVisible && friendId !== 0) useFriendNotificationsStore.getState().markViewed(friendId);

        wasVisibleRef.current = isVisible;
    }, [friendId, isVisible]);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            const element = elementRef.current;
            if (!element) return;
            if (event.target !== element && !element.contains(event.target as Node)) {
                setVisible(false);
            }
        };
        document.addEventListener(MouseEventType.MOUSE_CLICK, onClick);
        return () => document.removeEventListener(MouseEventType.MOUSE_CLICK, onClick);
    }, []);

    if (!friend) {
        return (
            <div ref={elementRef} className={`friend-bar-find-friends ${isVisible ? 'is-selected' : ''}`}>
                <button
                    type="button"
                    className="friend-bar-item friend-bar-search find-friends"
                    aria-expanded={isVisible}
                    onClick={() => setVisible((prev) => !prev)}
                >
                    <img className="friend-bar-search-icon" src={searchFriendsIcon} alt="" />
                    <span className="friend-bar-text">{LocalizeText('friend.bar.find.title')}</span>
                </button>

                <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.12 }}
                            className="friend-bar-find-friends-panel"
                        >
                            <div className="friend-bar-find-friends-header">
                                <img src={addFriendsIcon} alt="" />
                                <span>{LocalizeText('friend.bar.find.title')}</span>
                            </div>
                            <div className="friend-bar-find-friends-copy">{LocalizeText('friend.bar.find.text')}</div>
                            <button
                                className="friend-bar-find-friends-button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    SendMessageComposer(new FindNewFriendsMessageComposer());
                                    setVisible(false);
                                }}
                            >
                                {LocalizeText('friend.bar.find.button')}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    const isStaffChat = isStaffChatIdentity(friend);

    return (
        <div ref={elementRef} className={`friend-bar-friend relative ${isVisible ? 'is-selected' : ''}`}>
            {isStaffChat ? (
                <div className="friend-bar-item-head avatar staff-chat absolute left-[-3px] bottom-[-2px] z-10 h-[40px] w-[40px] overflow-hidden pointer-events-none">
                    <StaffChatFrankIconView size={40} className="friend-bar-staff-chat-frank" />
                </div>
            ) : friend.id > 0 ? (
                <div className="friend-bar-item-head avatar friend-bar-item-head-avatar absolute left-[-3px] bottom-[-2px] z-10 h-[40px] w-[40px] overflow-hidden pointer-events-none">
                    <LayoutAvatarImageView
                        direction={2}
                        figure={friend.figure}
                        headOnly={true}
                        style={{ backgroundPosition: '50% 42%', backgroundSize: '80px auto' }}
                        className="block h-auto w-auto pointer-events-none"
                    />
                </div>
            ) : (
                <div className="friend-bar-item-head group friend-bar-item-head-group absolute left-[6px] top-1/2 -translate-y-1/2 z-10 flex h-[28px] w-[28px] items-center justify-center pointer-events-none">
                    <LayoutBadgeImageView badgeCode="ADM" isGroup={false} className="block pointer-events-none drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)]" />
                </div>
            )}
            <motion.button
                type="button"
                className={`friend-bar-item friend-bar-tab find-friends-active ${friend.id <= 0 ? 'group' : ''}${tokens.length ? ' has-tokens' : ''}`}
                onClick={() => setVisible((prev) => !prev)}
            >
                <div className="friend-bar-text">{friend.name}</div>
                {tokens.length > 0 && (
                    <div className="friend-bar-tokens">
                        {tokens.map((token) => {
                            const title = `${friend.name} ${LocalizeText(token.titleKey)}${token.message ? `: ${token.message}` : ''}`;

                            return (
                                <span
                                    key={token.typeCode}
                                    role={token.tag === 'message' ? 'button' : undefined}
                                    className={`friend-bar-token friend-bar-token--${token.tag}`}
                                    data-token-type={token.typeCode}
                                    title={title}
                                    aria-label={title}
                                    onClick={(event) => {
                                        if (token.tag !== 'message') return;

                                        event.stopPropagation();
                                        OpenMessengerChat(friend.id);
                                        setVisible(false);
                                    }}
                                >
                                    <img src={tokenIconSrc(token)} alt="" draggable={false} />
                                </span>
                            );
                        })}
                    </div>
                )}
            </motion.button>

            <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="friend-bar-actions friend-bar-item find-friends-active"
                        >
                        <div className="friend-bar-actions-buttons">
                            <div
                                className="cursor-pointer friend-bar-action-icon"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    OpenMessengerChat(friend.id);
                                    setVisible(false);
                                }}
                            ><img src={chatIcon} alt="" /></div>
                            {!isStaffChat && friend.online && (
                                <div
                                    className="cursor-pointer friend-bar-action-icon"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        followFriend(friend);
                                        setVisible(false);
                                    }}
                                ><img src={visitIcon} alt="" /></div>
                            )}
                            {!isStaffChat && (
                                <div
                                    className="cursor-pointer friend-bar-action-icon"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        GetUserProfile(friend.id);
                                        setVisible(false);
                                    }}
                                ><img src={profileIcon} alt="" /></div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
