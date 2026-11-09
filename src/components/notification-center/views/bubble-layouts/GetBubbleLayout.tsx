import { MentionNotificationBubbleItem, NotificationBubbleItem, NotificationBubbleType } from '../../../../api';
import { NotificationBadgeReceivedBubbleView } from './NotificationBadgeReceivedBubbleView';
import { NotificationCaptionBubbleView } from './NotificationCaptionBubbleView';
import { NotificationClubGiftBubbleView } from './NotificationClubGiftBubbleView';
import { NotificationDefaultBubbleView } from './NotificationDefaultBubbleView';
import { NotificationFriendOnlineBubbleView } from './NotificationFriendOnlineBubbleView';
import { NotificationMentionBubbleView } from './NotificationMentionBubbleView';
import { NotificationSoundboardBubbleView } from './NotificationSoundboardBubbleView';

export const GetBubbleLayout = (item: NotificationBubbleItem, onClose: () => void) => {
    if (!item) return null;

    const props = { item, onClose };

    switch (item.notificationType) {
        case NotificationBubbleType.ACHIEVEMENT:
        case NotificationBubbleType.BADGE_RECEIVED:
            return <NotificationBadgeReceivedBubbleView key={item.id} {...props} />;
        case NotificationBubbleType.WIRED:
        case NotificationBubbleType.TREASURE_HUNT:
        case NotificationBubbleType.NFT_OPENING:
            return <NotificationCaptionBubbleView key={item.id} {...props} />;
        case NotificationBubbleType.CLUBGIFT:
            return <NotificationClubGiftBubbleView key={item.id} {...props} />;
        case NotificationBubbleType.FRIENDONLINE:
            return <NotificationFriendOnlineBubbleView key={item.id} {...props} />;
        case NotificationBubbleType.SOUNDBOARD:
            return <NotificationSoundboardBubbleView key={item.id} {...props} />;
        case NotificationBubbleType.MENTION:
            return <NotificationMentionBubbleView key={item.id} item={item as MentionNotificationBubbleItem} onClose={onClose} />;
        default:
            return <NotificationDefaultBubbleView key={item.id} {...props} />;
    }
};
