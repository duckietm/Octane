import { FC, MouseEvent, useState } from 'react';
import { localizeWithFallback, NotificationBubbleItem, OpenUrl, SanitizeHtml } from '../../../../api';
import { Flex, LayoutNotificationBubbleView, LayoutNotificationBubbleViewProps, Text } from '../../../../common';

export interface NotificationDefaultBubbleViewProps extends LayoutNotificationBubbleViewProps {
    item: NotificationBubbleItem;
}

export const NotificationDefaultBubbleView: FC<NotificationDefaultBubbleViewProps> = (props) => {
    const { item = null, onClose = null, ...rest } = props;
    // The stop / resume button a wired bubble carries (`toggle_callback`): the caption swaps
    // on every press and the callback hears whether the effect is paused now.
    const [paused, setPaused] = useState(false);

    const htmlText = item.message.replace(/\r\n|\r|\n/g, '<br />');
    const toggleCallback = item.extras?.toggleCallback || null;

    const onToggle = (event: MouseEvent) => {
        event.stopPropagation();

        const next = !paused;

        setPaused(next);
        toggleCallback?.(next);
    };

    return (
        <LayoutNotificationBubbleView
            alignItems="center"
            gap={2}
            onClick={(event) => item.linkUrl && item.linkUrl.length && OpenUrl(item.linkUrl)}
            onClose={onClose}
            {...rest}
        >
            <Flex center className="w-[50px] h-[50px]">
                {item.iconUrl && item.iconUrl.length && <img alt="" className="no-select" src={item.iconUrl} />}
            </Flex>
            <Text wrap dangerouslySetInnerHTML={{ __html: SanitizeHtml(htmlText) }} variant="white" />
            {toggleCallback && (
                <button className="btn btn-primary btn-sm shrink-0 ms-auto" data-testid="bubble-toggle" type="button" onClick={onToggle}>
                    {paused ? localizeWithFallback('notification.resume', 'Resume') : localizeWithFallback('notification.stop', 'Stop')}
                </button>
            )}
        </LayoutNotificationBubbleView>
    );
};
