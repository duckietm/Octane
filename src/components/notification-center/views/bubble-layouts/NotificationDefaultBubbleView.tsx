import { FC } from 'react';
import { NotificationBubbleItem, OpenUrl, SanitizeHtml } from '../../../../api';
import { LayoutNotificationBubbleViewProps } from '../../../../common';
import { NotificationItemLayoutView } from './NotificationItemLayoutView';

export interface NotificationDefaultBubbleViewProps extends LayoutNotificationBubbleViewProps {
    item: NotificationBubbleItem;
}

export const NotificationDefaultBubbleView: FC<NotificationDefaultBubbleViewProps> = (props) => {
    const { item = null, onClose = null, ...rest } = props;

    const htmlText = item.message.replace(/\r\n|\r|\n/g, '<br />');

    return (
        <NotificationItemLayoutView iconUrl={item.iconUrl} onClick={() => OpenUrl(item.linkUrl)} onClose={onClose} {...rest}>
            <span dangerouslySetInnerHTML={{ __html: SanitizeHtml(htmlText) }} />
        </NotificationItemLayoutView>
    );
};
