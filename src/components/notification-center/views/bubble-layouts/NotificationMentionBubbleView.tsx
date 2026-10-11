import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { LocalizeText, MentionNotificationBubbleItem, MentionType } from '../../../../api';
import { LayoutAvatarImageView, LayoutNotificationBubbleViewProps } from '../../../../common';
import { useUserDataSnapshot } from '../../../../hooks/session/useSessionSnapshots';
import { MentionMessageView } from '../../../mentions/MentionMessageView';
import { NotificationItemLayoutView } from './NotificationItemLayoutView';

export interface NotificationMentionBubbleViewProps extends LayoutNotificationBubbleViewProps {
    item: MentionNotificationBubbleItem;
}

/**
 * A mention in the layout of the other hotel notifications: the sender's head in the icon slot,
 * their name and room, and the line. One click opens the panel, where go to and delete live.
 */
export const NotificationMentionBubbleView: FC<NotificationMentionBubbleViewProps> = (props) => {
    const { item = null, onClose = null, ...rest } = props;
    const { userName: ownUsername = '' } = useUserDataSnapshot();

    if (!item) return null;

    const mention = item.mention;
    const isRoom = mention.mentionType === MentionType.ROOM;

    const open = () => {
        CreateLinkEvent('mentions/toggle');
        onClose();
    };

    return (
        <NotificationItemLayoutView
            classNames={['octane-mention-notification']}
            icon={
                <span className="octane-mention-notification__head">
                    <LayoutAvatarImageView headOnly compactHead compactHeadSize={44} compactHeadPadding={0} direction={2} figure={mention.senderFigure} />
                </span>
            }
            onClick={open}
            onClose={onClose}
            {...rest}
        >
            <span className="octane-mention-notification__sender">
                <b>{mention.senderUsername}</b> {LocalizeText(isRoom ? 'mentions.type.room' : 'mentions.type.direct').toLowerCase()}
            </span>
            {mention.roomName && mention.roomName.length > 0 && <span className="octane-mention-notification__room">{mention.roomName}</span>}
            <MentionMessageView className="octane-mention-notification__message" ownUsername={ownUsername} text={mention.message} />
        </NotificationItemLayoutView>
    );
};
