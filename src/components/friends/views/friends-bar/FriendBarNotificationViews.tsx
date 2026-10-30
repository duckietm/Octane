import { motion } from 'framer-motion';
import { FC } from 'react';
import { LocalizeBadgeName, LocalizeText, localizeWithFallback } from '../../../../api';
import eventIcon from '../../../../assets/images/friends/air/friend_bar_event_notification_icon.png';
import gameIcon from '../../../../assets/images/friends/air/game_center_snowball_notification_icon.png';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { FriendBarNotification, FriendNotificationType } from '../../../../hooks/friends/friendBarNotifications.helpers';

export const isGameNotification = (notification: FriendBarNotification): boolean => notification.type === FriendNotificationType.PLAYING_GAME;

const localizedOr = (key: string, fallback: string): string => {
    const value = LocalizeText(key);

    return value && value !== key ? value : fallback;
};

/** AIR tokens: `RoomEventToken`, `AchievementToken`, `QuestToken`, `GameToken` (title + message captions). */
export const friendNotificationTexts = (notification: FriendBarNotification): { title: string; message: string } => {
    const message = notification.message ?? '';

    switch (notification.type) {
        case FriendNotificationType.ROOM_EVENT:
            return { title: localizeWithFallback('friendbar.notify.event', 'started an event'), message };
        case FriendNotificationType.ACHIEVEMENT: {
            const name = LocalizeBadgeName(message);

            return {
                title: localizeWithFallback('friendbar.notify.achievement', 'unlocked an achievement'),
                message: name && name !== `badge_name_${message}` ? name : message
            };
        }
        case FriendNotificationType.QUEST: {
            const campaign = message.includes('.') ? message.substring(0, message.indexOf('.')) : message;

            return {
                title: localizeWithFallback('friendbar.notify.quest', 'completed a quest'),
                message: localizedOr(`quests.${message}.name`, localizedOr(`quests.${campaign}.name`, message))
            };
        }
        case FriendNotificationType.PLAYING_GAME:
            return { title: localizeWithFallback('friendbar.notify.game', 'is playing a game.'), message: localizedOr(`gamecenter.${message}.name`, message) };
        default:
            return { title: '', message };
    }
};

/**
 * The token icon in the tab's `icons` list (25x25 at the tab's top right): `friend_bar_event_notification_icon`,
 * or `game_center_snowball_notification_icon` for a game. It drops in with AIR's DropBounce (600 ms, 32 px).
 */
export const FriendBarNotificationIconView: FC<{ notification: FriendBarNotification; onClick: () => void }> = ({ notification, onClick }) => {
    const texts = friendNotificationTexts(notification);
    const game = isGameNotification(notification);

    return (
        <NativeTextTree>
            <motion.div
                className="friend-bar-notification-icon-slot"
                initial={{ y: -32, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 520, damping: 14, mass: 0.8 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >
                <BaseButton
                    className={`friend-bar-notification-icon ${game ? 'icon-game' : 'icon-notify'}`}
                    aria-label={texts.message ? `${texts.title} ${texts.message}` : texts.title}
                    onClick={(event) => {
                        event.stopPropagation();
                        onClick();
                    }}
                >
                    <img src={game ? gameIcon : eventIcon} alt="" />
                </BaseButton>
            </motion.div>
        </NativeTextTree>
    );
};

/** `message_piece_xml` (121x37): the italic title over the bold message, shown while the tab is open. */
export const FriendBarNotificationPieceView: FC<{ notification: FriendBarNotification }> = ({ notification }) => {
    const texts = friendNotificationTexts(notification);

    return (
        <NativeTextTree>
            <div className="friend-bar-notification-piece" data-type={notification.type}>
                <div className="friend-bar-notification-title">{texts.title}</div>
                <div className="friend-bar-notification-message">{texts.message}</div>
            </div>
        </NativeTextTree>
    );
};
