import { MentionNotificationBubbleItem, NotificationBubbleItem, NotificationBubbleType } from '../../../../api';
import { NotificationBadgeReceivedBubbleView } from './NotificationBadgeReceivedBubbleView';
import { NotificationClubGiftBubbleView } from './NotificationClubGiftBubbleView';
import { NotificationDefaultBubbleView } from './NotificationDefaultBubbleView';
import { NotificationFriendOfflineBubbleView } from './NotificationFriendOfflineBubbleView';
import { NotificationFriendOnlineBubbleView } from './NotificationFriendOnlineBubbleView';
import { NotificationMentionBubbleView } from './NotificationMentionBubbleView';
import { NotificationRoomMessagesPostedBubbleView } from './NotificationRoomMessagesPostedBubbleView';
import { NotificationSoundMachineBubbleView } from './NotificationSoundMachineBubbleView';

export const GetBubbleLayout = (item: NotificationBubbleItem, onClose: () => void) => {
    if (!item) return null;

    const props = { item, onClose };

    switch (item.notificationType) {
        case NotificationBubbleType.BADGE_RECEIVED:
            return <NotificationBadgeReceivedBubbleView key={item.id} {...props} />;
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
            return <NotificationDefaultBubbleView key={item.id} {...props} />;
    }
};
