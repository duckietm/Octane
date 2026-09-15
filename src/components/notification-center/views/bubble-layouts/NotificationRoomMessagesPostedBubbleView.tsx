import { FC } from 'react';
import { FaEnvelope } from 'react-icons/fa';
import { NotificationBubbleItem, OpenUrl, SanitizeHtml } from '../../../../api';
import { Flex, LayoutNotificationBubbleView, Text } from '../../../../common';

interface NotificationRoomMessagesPostedBubbleViewProps {
    item: NotificationBubbleItem;
    onClose: () => void;
}

/**
 * "New messages were posted in your room" (`roommessagesposted`): the official bubble
 * shows a small envelope beside the text; a click opens the room the link points at.
 */
export const NotificationRoomMessagesPostedBubbleView: FC<NotificationRoomMessagesPostedBubbleViewProps> = (props) => {
    const { item = null, onClose = null } = props;
    const htmlText = (item?.message || '').replace(/\r\n|\r|\n/g, '<br />');

    return (
        <LayoutNotificationBubbleView
            alignItems="center"
            gap={2}
            onClick={() => item?.linkUrl && item.linkUrl.length && OpenUrl(item.linkUrl)}
            onClose={onClose}
        >
            <Flex center className="w-[36px] h-[36px] shrink-0 rounded-full bg-sky-600/40" data-testid="roommessagesposted-icon">
                <FaEnvelope className="text-white" size={16} />
            </Flex>
            <Text wrap dangerouslySetInnerHTML={{ __html: SanitizeHtml(htmlText) }} variant="white" />
        </LayoutNotificationBubbleView>
    );
};
