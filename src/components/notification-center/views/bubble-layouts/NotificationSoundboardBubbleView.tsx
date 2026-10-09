import { FC } from 'react';
import { FaVolumeUp } from 'react-icons/fa';
import { localizeWithFallback, NotificationBubbleItem, SanitizeHtml } from '../../../../api';
import { Flex, LayoutNotificationBubbleView, Text } from '../../../../common';

interface NotificationSoundboardBubbleViewProps {
    item: NotificationBubbleItem;
    onClose: () => void;
}

/**
 * A Soundboard notice (a pad on hold, a room mode changed, a pad refused): a speaker
 * beside the text, with the caption above it, laid out like the other hotel bubbles.
 */
export const NotificationSoundboardBubbleView: FC<NotificationSoundboardBubbleViewProps> = (props) => {
    const { item = null, onClose = null } = props;
    const htmlText = (item?.message || '').replace(/\r\n|\r|\n/g, '<br />');

    return (
        <LayoutNotificationBubbleView alignItems="center" gap={2} onClose={onClose}>
            <Flex center className="w-[36px] h-[36px] shrink-0 rounded-full bg-sky-600/40" data-testid="soundboard-icon">
                <FaVolumeUp className="text-white" size={15} />
            </Flex>
            <div className="flex flex-col min-w-0">
                <span className="text-[.6rem] uppercase tracking-wide text-white/70">
                    {localizeWithFallback('notifications.title.soundboard', 'Soundboard')}
                </span>
                <Text wrap dangerouslySetInnerHTML={{ __html: SanitizeHtml(htmlText) }} variant="white" />
            </div>
        </LayoutNotificationBubbleView>
    );
};
