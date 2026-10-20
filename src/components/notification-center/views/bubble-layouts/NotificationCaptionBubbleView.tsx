import { FC } from 'react';
import { localizeWithFallback, NotificationBubbleItem, NotificationBubbleType, OpenUrl, SanitizeHtml } from '../../../../api';
import wiredIcon from '../../../../assets/images/notifications/wired/wired-notification.png';
import { LayoutNotificationBubbleView, LayoutNotificationBubbleViewProps } from '../../../../common';

export interface NotificationCaptionBubbleViewProps extends LayoutNotificationBubbleViewProps {
    item: NotificationBubbleItem;
}

interface CaptionStyle {
    caption: [string, string];
    displayMs: number;
    icon: string;
}

/* Official notification_wired, notification_treasurehunt and notification_nft_opening: a 190 px box
   with a coloured caption strip, the icon at the left and the text beside it. They differ in the
   colours (set by the modifier class) and in how long they stay. */
const STYLES: Record<string, CaptionStyle> = {
    [NotificationBubbleType.WIRED]: { caption: ['product.type.wired', 'Wired'], displayMs: 10000, icon: wiredIcon },
    [NotificationBubbleType.TREASURE_HUNT]: { caption: ['treasure_hunt.title', 'Treasure hunt'], displayMs: 15000, icon: null },
    [NotificationBubbleType.NFT_OPENING]: { caption: ['collectibles.reward_box.notif.title', 'Collectible reward'], displayMs: 10000, icon: null }
};

export const NotificationCaptionBubbleView: FC<NotificationCaptionBubbleViewProps> = (props) => {
    const { item = null, onClose = null, ...rest } = props;
    const style = STYLES[item.notificationType] ?? STYLES[NotificationBubbleType.WIRED];
    const icon = item.iconUrl ?? style.icon;
    const htmlText = item.message.replace(/\r\n|\r|\n/g, '<br />');

    return (
        <LayoutNotificationBubbleView
            classNames={['octane-caption-notification', `octane-caption-notification--${item.notificationType}`]}
            timeoutMs={style.displayMs}
            onClick={() => item.linkUrl && OpenUrl(item.linkUrl)}
            onClose={onClose}
            {...rest}
        >
            <div className="octane-caption-notification__caption">{localizeWithFallback(style.caption[0], style.caption[1])}</div>
            <div className="octane-caption-notification__row">
                {icon && <img alt="" className="octane-caption-notification__icon" src={icon} draggable={false} />}
                {/* treasure_hunt_image: the gold key the official layout shows while the bubble has no icon. */}
                {!icon && item.notificationType === NotificationBubbleType.TREASURE_HUNT && (
                    <div aria-hidden className="octane-caption-notification__treasure-key">
                        <div className="octane-caption-notification__treasure-key-base" />
                        <div className="octane-caption-notification__treasure-key-overlay" />
                    </div>
                )}
                <span className="octane-caption-notification__text" dangerouslySetInnerHTML={{ __html: SanitizeHtml(htmlText) }} />
            </div>
        </LayoutNotificationBubbleView>
    );
};
