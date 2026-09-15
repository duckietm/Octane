import { FC } from 'react';
import { FaMusic } from 'react-icons/fa';
import { localizeWithFallback, NotificationBubbleItem, SanitizeHtml } from '../../../../api';
import { Flex, LayoutNotificationBubbleView, Text } from '../../../../common';

interface NotificationSoundMachineBubbleViewProps {
    item: NotificationBubbleItem;
    onClose: () => void;
}

/**
 * "Now playing" from a sound machine (`soundmachine.notification.playing`): a note
 * beside the song line, with the caption the official layout carries above the text.
 */
export const NotificationSoundMachineBubbleView: FC<NotificationSoundMachineBubbleViewProps> = (props) => {
    const { item = null, onClose = null } = props;
    const htmlText = (item?.message || '').replace(/\r\n|\r|\n/g, '<br />');

    return (
        <LayoutNotificationBubbleView alignItems="center" gap={2} onClose={onClose}>
            <Flex center className="w-[36px] h-[36px] shrink-0 rounded-full bg-fuchsia-600/40" data-testid="soundmachine-icon">
                <FaMusic className="text-white" size={15} />
            </Flex>
            <div className="flex flex-col min-w-0">
                <span className="text-[.6rem] uppercase tracking-wide text-white/70">
                    {localizeWithFallback('notifications.title.soundmachine', 'Sound machine')}
                </span>
                <Text wrap dangerouslySetInnerHTML={{ __html: SanitizeHtml(htmlText) }} variant="white" />
            </div>
        </LayoutNotificationBubbleView>
    );
};
