import { GetSessionDataManager, MessengerMessageType } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import {
    FriendlyTime,
    GetGroupChatData,
    LocalizeText,
    MessengerGroupType,
    MessengerThread,
    MessengerThreadChat,
    MessengerThreadChatGroup,
    useHabbiconCatalog
} from '../../../../../api';
import MessengerNotificationIcon from '../../../../../assets/images/friends/messenger_notification_icon.png';
import { LayoutAvatarImageView, LayoutHabbiconImageView } from '../../../../../common';
import { useFriends } from '../../../../../hooks';
import { resolveAvatarFigure } from '../../friends-list/resolveAvatarFigure';
import { MessengerMessageStatusView } from '../MessengerMessageStatusView';
import { getMessageStatusPresentation } from './messageStatus.helpers';

const MessengerMessageTime: FC<{ date: Date }> = ({ date }) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60000);

        return () => window.clearInterval(timer);
    }, []);

    const elapsedSeconds = Math.max(0, Math.round((now - date.getTime()) / 1000));

    return <div className="messenger-message-time">{FriendlyTime.format(elapsedSeconds, '.ago', 1)}</div>;
};

export const FriendsMessengerThreadGroup: FC<{ thread: MessengerThread; group: MessengerThreadChatGroup }> = ({ thread, group }) => {
    const { getFriend = null } = useFriends();
    const habbicons = useHabbiconCatalog();
    const groupChatData = useMemo(() => group.type === MessengerGroupType.GROUP_CHAT && GetGroupChatData(group.chats[0].extraData), [group]);
    const own =
        (group.type === MessengerGroupType.PRIVATE_CHAT && group.userId === GetSessionDataManager().userId) ||
        (!!groupChatData && group.chats.length > 0 && groupChatData.userId === GetSessionDataManager().userId);

    if (!group.userId)
        return (
            <>
                {group.chats.map((chat, index) =>
                    chat.type === MessengerThreadChat.ROOM_INVITE ? (
                        <div key={index} className="messenger-notification">
                            <img src={MessengerNotificationIcon} alt="" />
                            <span>
                                {LocalizeText('messenger.invitation')} {chat.message}
                            </span>
                        </div>
                    ) : chat.type === MessengerThreadChat.STATUS_NOTIFICATION ? (
                        <div key={index} className="messenger-status-notification">
                            {chat.message}
                        </div>
                    ) : null
                )}
            </>
        );

    const friend = getFriend?.(thread.participant.id);
    const name = own ? GetSessionDataManager().userName : groupChatData?.username || thread.participant.name;
    const figure = own
        ? GetSessionDataManager().figure
        : groupChatData?.figure || resolveAvatarFigure(friend?.figure || thread.participant.figure, friend?.gender ?? thread.participant.gender);
    const renderMessage = (chat: MessengerThreadChat) => {
        if (chat.type !== MessengerMessageType.Habbicon) return chat.message;

        const id = Number(chat.message);
        const entry = habbicons.entries.find((item) => item.id === id);
        const mirror = !!entry?.dir && entry.dir !== (own ? 1 : -1);
        return <LayoutHabbiconImageView id={id} size={80} mirror={mirror} className="messenger-habbicon-message" />;
    };

    return (
        <div className={`messenger-message-row${own ? ' own' : ''}`}>
            {own && (
                <div className="message-avatar">
                    <LayoutAvatarImageView direction={2} figure={figure} />
                </div>
            )}
            <div className="messenger-message-body">
                <div className="messenger-message-name">{name}:</div>
                <div className="messenger-message-bubble">
                    {group.chats.map((chat, index) =>
                        !chat.showTranslation ? (
                            <div key={index}>{renderMessage(chat)}</div>
                        ) : (
                            <div key={index} className="messenger-translation-block">
                                <div>
                                    <b>original:</b> {chat.originalMessage || chat.message}
                                </div>
                                <div>
                                    <b>translate:</b> {chat.translatedMessage || chat.message}
                                </div>
                            </div>
                        )
                    )}
                </div>
                <MessengerMessageTime date={group.chats[0].date} />
            </div>
            {!own && (
                <div className="message-avatar">
                    <LayoutAvatarImageView direction={4} figure={figure} />
                </div>
            )}
        </div>
    );
};
