import { NotificationBubbleItem, NotificationBubbleType } from '../../../../api';
import { NotificationBadgeReceivedBubbleView } from './NotificationBadgeReceivedBubbleView';
import { NotificationClubGiftBubbleView } from './NotificationClubGiftBubbleView';
import { NotificationDefaultBubbleView } from './NotificationDefaultBubbleView';
import { NotificationFriendOnlineBubbleView } from './NotificationFriendOnlineBubbleView';

export const GetBubbleLayout = (item: NotificationBubbleItem, onClose: () => void) => {
    if (!item) return null;

    const props = { item, onClose };

    switch (item.notificationType) {
        case NotificationBubbleType.ACHIEVEMENT:
        case NotificationBubbleType.BADGE_RECEIVED:
            return <NotificationBadgeReceivedBubbleView key={item.id} {...props} />;
        case NotificationBubbleType.CLUBGIFT:
            return <NotificationClubGiftBubbleView key={item.id} {...props} />;
        case NotificationBubbleType.FRIENDONLINE:
            return <NotificationFriendOnlineBubbleView key={item.id} {...props} />;
        default:
            return <NotificationDefaultBubbleView key={item.id} {...props} />;
    }
};
