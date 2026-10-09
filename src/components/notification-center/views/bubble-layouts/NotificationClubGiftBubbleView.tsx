import { FC } from 'react';
import { LocalizeText, NotificationBubbleItem, OpenUrl } from '../../../../api';
import clubIcon from '../../../../assets/images/notifications/club_icon_square.png';
import { LayoutNotificationBubbleView, LayoutNotificationBubbleViewProps } from '../../../../common';

export interface NotificationClubGiftBubbleViewProps extends LayoutNotificationBubbleViewProps {
    item: NotificationBubbleItem;
}

/* Official club_gift_notification: a 192x82 border_9 box that stays until the user
   opens the gift list or picks "later". */
export const NotificationClubGiftBubbleView: FC<NotificationClubGiftBubbleViewProps> = (props) => {
    const { item = null, onClose = null, ...rest } = props;

    return (
        <LayoutNotificationBubbleView classNames={['octane-club-gift-notification']} closeOnClick={false} fadesOut={false} onClose={onClose} {...rest}>
            <div className="octane-club-gift-notification__border" />
            <img alt="" className="octane-club-gift-notification__icon" src={clubIcon} draggable={false} />
            <div className="octane-club-gift-notification__text">{LocalizeText('notifications.text.club_gift')}</div>
            <button
                className="octane-club-gift-notification__button"
                type="button"
                onClick={() => {
                    OpenUrl(item.linkUrl);
                    onClose();
                }}
            >
                {LocalizeText('notifications.button.show_gift_list')}
            </button>
            <button className="octane-club-gift-notification__later" type="button" onClick={() => onClose()}>
                {LocalizeText('notifications.button.later')}
            </button>
        </LayoutNotificationBubbleView>
    );
};
