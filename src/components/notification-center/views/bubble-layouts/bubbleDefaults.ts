import { NotificationBubbleType } from '../../../../api';
import earningIcon from '../../../../assets/images/notifications/types/earning.png';
import clubIcon from '../../../../assets/images/notifications/types/hc.png';
import ltdIcon from '../../../../assets/images/notifications/types/ltd.png';
import recyclerIcon from '../../../../assets/images/notifications/types/recycler.png';
import infoIcon from '../../../../assets/images/notifications/types/temp.png';
import vipIcon from '../../../../assets/images/notifications/types/vip.png';

/* What the official habbo_notifications_config gives a bubble style when the server sends no
   icon or link of its own. */
const DEFAULT_ICONS: Record<string, string> = {
    [NotificationBubbleType.INFO]: infoIcon,
    [NotificationBubbleType.CLUB]: clubIcon,
    [NotificationBubbleType.VIP]: vipIcon,
    [NotificationBubbleType.RECYCLEROK]: recyclerIcon,
    [NotificationBubbleType.LTD]: ltdIcon,
    [NotificationBubbleType.EARNING]: earningIcon
};

const DEFAULT_LINKS: Record<string, string> = {
    [NotificationBubbleType.PETLEVEL]: 'inventory/show/pets',
    [NotificationBubbleType.FRIENDOFFLINE]: 'friends/show',
    [NotificationBubbleType.THIRDPARTYFRIENDONLINE]: 'friends/show',
    [NotificationBubbleType.THIRDPARTYFRIENDOFFLINE]: 'friends/show'
};

export const getBubbleIcon = (type: string, iconUrl: string | null): string | null => iconUrl ?? DEFAULT_ICONS[type] ?? null;

export const getBubbleLink = (type: string, linkUrl: string | null): string | null => (linkUrl && linkUrl.length ? linkUrl : (DEFAULT_LINKS[type] ?? null));
