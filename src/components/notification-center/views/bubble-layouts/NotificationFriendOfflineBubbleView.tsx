import { FC } from 'react';
import { NotificationBubbleItem } from '../../../../api';
import { NotificationFriendOnlineBubbleView } from './NotificationFriendOnlineBubbleView';

interface NotificationFriendOfflineBubbleViewProps {
    item: NotificationBubbleItem;
    onClose: () => void;
}

/**
 * A friend going offline uses the same slide-in strip as coming online, greyed out, and
 * does not open the messenger: there is nobody on the other end to talk to.
 */
export const NotificationFriendOfflineBubbleView: FC<NotificationFriendOfflineBubbleViewProps> = (props) => (
    <NotificationFriendOnlineBubbleView {...props} offline />
);
