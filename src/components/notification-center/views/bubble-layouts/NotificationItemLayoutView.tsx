import { FC, PropsWithChildren } from 'react';
import { LayoutNotificationBubbleView, LayoutNotificationBubbleViewProps } from '../../../../common';

interface NotificationItemLayoutViewProps extends LayoutNotificationBubbleViewProps {
    iconUrl?: string;
}

/* Official layout_notification: 190 wide, 50x50 icon at 8,8 and the text beside it,
   on the black border skin. The box grows with the text, never below 66. */
export const NotificationItemLayoutView: FC<PropsWithChildren<NotificationItemLayoutViewProps>> = (props) => {
    const { iconUrl = null, children = null, classNames = [], ...rest } = props;

    return (
        <LayoutNotificationBubbleView classNames={['octane-notification-item', ...classNames]} {...rest}>
            <div className="octane-notification-item__icon">{iconUrl && <img alt="" className="no-select" src={iconUrl} draggable={false} />}</div>
            <div className="octane-notification-item__text">{children}</div>
        </LayoutNotificationBubbleView>
    );
};
