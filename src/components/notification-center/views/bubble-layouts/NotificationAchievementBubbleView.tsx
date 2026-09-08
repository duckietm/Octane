import { FC } from 'react';
import { NotificationBubbleItem, OpenUrl, SanitizeHtml } from '../../../../api';
import { Flex, LayoutNotificationBubbleView, LayoutNotificationBubbleViewProps, Text } from '../../../../common';

export interface NotificationAchievementBubbleViewProps extends LayoutNotificationBubbleViewProps {
    item: NotificationBubbleItem;
}

/**
 * A level-up (`achievement` style, `class_1873.onLevelUp`): the badge of the new level
 * beside "You advanced to <name>!"; a click opens the achievements window on the category
 * of the achievement (`questengine/achievements/<category>`).
 */
export const NotificationAchievementBubbleView: FC<NotificationAchievementBubbleViewProps> = (props) => {
    const { item = null, onClose = null, ...rest } = props;
    const htmlText = (item?.message || '').replace(/\r\n|\r|\n/g, '<br />');

    return (
        <LayoutNotificationBubbleView
            alignItems="center"
            gap={2}
            onClick={() => item?.linkUrl && item.linkUrl.length && OpenUrl(item.linkUrl)}
            onClose={onClose}
            {...rest}
        >
            <Flex center className="w-[50px] h-[50px] shrink-0" data-testid="achievement-icon">
                {item?.iconUrl && item.iconUrl.length && <img alt="" className="no-select" src={item.iconUrl} />}
            </Flex>
            <Text wrap dangerouslySetInnerHTML={{ __html: SanitizeHtml(htmlText) }} variant="white" />
        </LayoutNotificationBubbleView>
    );
};
