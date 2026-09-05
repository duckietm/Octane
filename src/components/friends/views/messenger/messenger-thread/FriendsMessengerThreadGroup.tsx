import { GetSessionDataManager } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import {
    FriendlyTime,
    GetConfigurationValue,
    GetGroupChatData,
    LocalizeText,
    MessengerGroupType,
    MessengerThread,
    MessengerThreadChat,
    MessengerThreadChatGroup
} from '../../../../../api';
import MessengerNotificationIcon from '../../../../../assets/images/friends/messenger_notification_icon.png';
import { LayoutAvatarImageView } from '../../../../../common';
import { useFriends } from '../../../../../hooks';
import { resolveAvatarFigure } from '../../friends-list/resolveAvatarFigure';
import { MessengerMessageStatusView } from '../MessengerMessageStatusView';
import { getMessageStatusPresentation } from './messageStatus.helpers';

type HabbiconFrame = { x: number; y: number; width: number; height: number; dir: number };
type HabbiconSheet = { frames: Map<number, HabbiconFrame>; width: number; height: number };
const habbiconFrameCache = new Map<string, HabbiconSheet>();
const HABBICON_MESSAGE_SIZE = 80;
const HABBICON_MESSAGE_SCALE = 2;

const MessengerMessageTime: FC<{ date: Date }> = ({ date }) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60000);

        return () => window.clearInterval(timer);
    }, []);

    const elapsedSeconds = Math.max(0, Math.round((now - date.getTime()) / 1000));

    return <div className="messenger-message-time">{FriendlyTime.format(elapsedSeconds, '.ago', 1)}</div>;
};

const MessengerHabbiconMessage: FC<{ id: number; assetRoot: string; own: boolean }> = ({ id, assetRoot, own }) => {
    const [sheet, setSheet] = useState<HabbiconSheet>(null);

    useEffect(() => {
        if (!assetRoot) return;

        const cached = habbiconFrameCache.get(assetRoot);

        if (cached) {
            setSheet(cached);
            return;
        }

        let disposed = false;

        void fetch(`${assetRoot}habbicons.json`)
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => {
                if (disposed || !Array.isArray(data?.habbicons)) return;

                const frames = new Map<number, HabbiconFrame>();
                let width = 1;
                let height = 1;

                for (const entry of data.habbicons) {
                    const frame: HabbiconFrame = {
                        x: Number(entry.x) || 0,
                        y: Number(entry.y) || 0,
                        width: Number(entry.width) || 42,
                        height: Number(entry.height) || 42,
                        dir: Number(entry.dir) || 0
                    };

                    frames.set(Number(entry.id), frame);
                    width = Math.max(width, frame.x + frame.width);
                    height = Math.max(height, frame.y + frame.height);
                }

                const nextSheet = { frames, width, height };

                habbiconFrameCache.set(assetRoot, nextSheet);
                setSheet(nextSheet);
            });

        return () => {
            disposed = true;
        };
    }, [assetRoot, id]);

    const frame = sheet?.frames.get(id);

    if (!frame || !sheet) return null;

    const facing: number = own ? 1 : -1;
    const mirror = facing !== 0 && frame.dir !== 0 && facing !== frame.dir;

    return (
        <span
            className={`messenger-habbicon-message${mirror ? ' mirrored' : ''}`}
            style={{
                width: HABBICON_MESSAGE_SIZE,
                height: HABBICON_MESSAGE_SIZE,
                backgroundImage: `url(${assetRoot}habbicons_spritesheet.png)`,
                backgroundSize: `${sheet.width * HABBICON_MESSAGE_SCALE}px ${sheet.height * HABBICON_MESSAGE_SCALE}px`,
                backgroundPosition: `-${frame.x * HABBICON_MESSAGE_SCALE}px -${frame.y * HABBICON_MESSAGE_SCALE}px`
            }}
        />
    );
};

export const FriendsMessengerThreadGroup: FC<{ thread: MessengerThread; group: MessengerThreadChatGroup }> = ({ thread, group }) => {
    const { getFriend = null } = useFriends();
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
    const assetRoot = (() => {
        const root = GetConfigurationValue<string>('habbicons.asset.root', '');
        const hash = GetConfigurationValue<string>('habbicons.asset.hash', '');

        if (!root) return '';

        const normalizedRoot = root.endsWith('/') ? root : `${root}/`;

        return hash ? `${normalizedRoot}${hash}/` : normalizedRoot;
    })();
    const renderMessage = (message: string) => {
        const match = /^\uE000(\d+)$/.exec(message || '');

        if (!match || !assetRoot) return message;

        return <MessengerHabbiconMessage id={Number(match[1])} assetRoot={assetRoot} own={own} />;
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
                            <div key={index}>{renderMessage(chat.message)}</div>
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
