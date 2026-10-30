import { FC } from 'react';
import { NotificationBubbleItem, OpenUrl, SanitizeHtml } from '../../../../api';
import { LayoutNotificationBubbleViewProps } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { getBubbleIcon, getBubbleLink } from './bubbleDefaults';
import { NotificationItemLayoutView } from './NotificationItemLayoutView';

export interface NotificationDefaultBubbleViewProps extends LayoutNotificationBubbleViewProps {
    item: NotificationBubbleItem;
}

export const NotificationDefaultBubbleView: FC<NotificationDefaultBubbleViewProps> = (props) => {
    const { item = null, onClose = null, ...rest } = props;

    const htmlText = item.message.replace(/\r\n|\r|\n/g, '<br />');

    return (
        <NativeTextTree>
            <NotificationItemLayoutView
                iconUrl={getBubbleIcon(item.notificationType, item.iconUrl)}
                onClick={() => OpenUrl(getBubbleLink(item.notificationType, item.linkUrl))}
                onClose={onClose}
                {...rest}
            >
                <span dangerouslySetInnerHTML={{ __html: SanitizeHtml(htmlText) }} />
            </NotificationItemLayoutView>
        </NativeTextTree>
    );
};
