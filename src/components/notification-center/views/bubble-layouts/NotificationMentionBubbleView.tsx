import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { LocalizeText, MentionNotificationBubbleItem, MentionType } from '../../../../api';
import mentionIcon from '../../../../assets/images/mentions/mentions-16.png';
import { LayoutNotificationBubbleView, LayoutNotificationBubbleViewProps } from '../../../../common';
import { useUserDataSnapshot } from '../../../../hooks/session/useSessionSnapshots';
import { MentionMessageView } from '../../../mentions/MentionMessageView';

export interface NotificationMentionBubbleViewProps extends LayoutNotificationBubbleViewProps {
    item: MentionNotificationBubbleItem;
}

/**
 * A mention in the layout of the club gift notification: the border_9 box, the mention icon and
 * the line, then "later" and a button that opens the panel, where go to and delete live.
 */
export const NotificationMentionBubbleView: FC<NotificationMentionBubbleViewProps> = (props) => {
    const { item = null, onClose = null, ...rest } = props;
    const { userName: ownUsername = '' } = useUserDataSnapshot();

    if (!item) return null;

    const mention = item.mention;
    const isRoom = mention.mentionType === MentionType.ROOM;

    return (
        <LayoutNotificationBubbleView classNames={['octane-mention-notification']} closeOnClick={false} onClose={onClose} {...rest}>
            <div className="octane-mention-notification__border" />
            <div className="octane-mention-notification__row">
                <img alt="" className="octane-mention-notification__icon" src={mentionIcon} draggable={false} />
                <div className="octane-mention-notification__text">
                    <b>{mention.senderUsername}</b> {LocalizeText(isRoom ? 'mentions.type.room' : 'mentions.type.direct').toLowerCase()}
                    {mention.roomName && mention.roomName.length > 0 && <span className="octane-mention-notification__room">{mention.roomName}</span>}
                    <MentionMessageView className="octane-mention-notification__message" ownUsername={ownUsername} text={mention.message} />
                </div>
            </div>
            <div className="octane-mention-notification__actions">
                <button className="octane-mention-notification__later" type="button" onClick={() => onClose()}>
                    {LocalizeText('notifications.button.later')}
                </button>
                <button
                    className="octane-mention-notification__button"
                    type="button"
                    onClick={() => {
                        CreateLinkEvent('mentions/toggle');
                        onClose();
                    }}
                >
                    {LocalizeText('mentions.window.title')}
                </button>
            </div>
        </LayoutNotificationBubbleView>
    );
};
