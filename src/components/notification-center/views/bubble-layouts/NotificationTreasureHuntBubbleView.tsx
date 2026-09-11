import { FC } from 'react';
import { NotificationBubbleItem, OpenUrl, SanitizeHtml } from '../../../../api';
import { Flex, LayoutAvatarImageView, LayoutNotificationBubbleView, LayoutNotificationBubbleViewProps, Text } from '../../../../common';

export interface NotificationTreasureHuntBubbleViewProps extends LayoutNotificationBubbleViewProps {
    item: NotificationBubbleItem;
}

/**
 * `notification_treasurehunt` (`HabboNotificationItemView.showTreasureHuntNotification`):
 * the treasure hunt bubble. The first-winner bubble carries the winner's figure,
 * which the official client renders as a focused head; the progress and fail
 * bubbles carry no figure, so the layout falls back to its own hunt image.
 */
export const NotificationTreasureHuntBubbleView: FC<NotificationTreasureHuntBubbleViewProps> = (props) => {
    const { item = null, onClose = null, ...rest } = props;
    const htmlText = item.message.replace(/\r\n|\r|\n/g, '<br />');
    const figure = item.extras?.figure || '';
    const gender = item.extras?.gender || 'M';

    return (
        <LayoutNotificationBubbleView
            alignItems="center"
            gap={2}
            classNames={['octane-notification-treasure-hunt']}
            onClick={() => item.linkUrl && item.linkUrl.length && OpenUrl(item.linkUrl)}
            onClose={onClose}
            {...rest}
        >
            <Flex center className="h-[50px] w-[50px]">
                {figure ? (
                    <LayoutAvatarImageView figure={figure} gender={gender} headOnly direction={2} />
                ) : item.iconUrl && item.iconUrl.length ? (
                    <img alt="" className="no-select" src={item.iconUrl} />
                ) : (
                    <i className="octane-notification-treasure-hunt__image" aria-hidden="true" />
                )}
            </Flex>
            <Text wrap dangerouslySetInnerHTML={{ __html: SanitizeHtml(htmlText) }} variant="white" />
        </LayoutNotificationBubbleView>
    );
};
