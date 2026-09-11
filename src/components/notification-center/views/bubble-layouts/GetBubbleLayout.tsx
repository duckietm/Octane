import { MentionNotificationBubbleItem, NotificationBubbleItem, NotificationBubbleType } from '../../../../api';
import { NotificationAchievementBubbleView } from './NotificationAchievementBubbleView';
import { NotificationBadgeReceivedBubbleView } from './NotificationBadgeReceivedBubbleView';
import { NotificationClubGiftBubbleView } from './NotificationClubGiftBubbleView';
import { NotificationDefaultBubbleView } from './NotificationDefaultBubbleView';
import { NotificationFriendOfflineBubbleView } from './NotificationFriendOfflineBubbleView';
import { NotificationFriendOnlineBubbleView } from './NotificationFriendOnlineBubbleView';
import { NotificationMentionBubbleView } from './NotificationMentionBubbleView';
import { NotificationRoomMessagesPostedBubbleView } from './NotificationRoomMessagesPostedBubbleView';
import { NotificationSoundMachineBubbleView } from './NotificationSoundMachineBubbleView';

/**
 * The fade behaviour a bubble asked for through its extras: `stay` keeps it until closed
 * by hand, `time_display` shortens or lengthens the default delay.
 */
export const getBubbleTimingProps = (item: NotificationBubbleItem): { fadesOut?: boolean; timeoutMs?: number } => {
    const timing: { fadesOut?: boolean; timeoutMs?: number } = {};

    if (item.staysVisible) timing.fadesOut = false;

    if (item.timeDisplayMs) timing.timeoutMs = item.timeDisplayMs;

    return timing;
};

export const GetBubbleLayout = (item: NotificationBubbleItem, onClose: () => void) => {
    if (!item) return null;

    const props = { item, onClose };
    const timedProps = { ...props, ...getBubbleTimingProps(item) };

    switch (item.notificationType) {
        case NotificationBubbleType.ACHIEVEMENT:
            return <NotificationAchievementBubbleView key={item.id} {...timedProps} />;
        case NotificationBubbleType.BADGE_RECEIVED:
            return <NotificationBadgeReceivedBubbleView key={item.id} {...timedProps} />;
        case NotificationBubbleType.CLUBGIFT:
            return <NotificationClubGiftBubbleView key={item.id} {...props} />;
        case NotificationBubbleType.FRIENDONLINE:
            return <NotificationFriendOnlineBubbleView key={item.id} {...props} />;
        case NotificationBubbleType.FRIENDOFFLINE:
            return <NotificationFriendOfflineBubbleView key={item.id} {...props} />;
        case NotificationBubbleType.ROOMMESSAGESPOSTED:
            return <NotificationRoomMessagesPostedBubbleView key={item.id} {...props} />;
        case NotificationBubbleType.SOUNDMACHINE:
            return <NotificationSoundMachineBubbleView key={item.id} {...props} />;
        case NotificationBubbleType.MENTION:
            return <NotificationMentionBubbleView key={item.id} item={item as MentionNotificationBubbleItem} onClose={onClose} />;
        default:
            return <NotificationDefaultBubbleView key={item.id} {...timedProps} />;
    }
};
