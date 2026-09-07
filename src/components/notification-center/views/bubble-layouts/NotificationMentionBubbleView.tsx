import { CreateLinkEvent, MarkMentionsReadComposer } from '@octane/renderer';
import { FC, MouseEvent } from 'react';
import { FaTimes } from 'react-icons/fa';
import { formatMentionTime, LocalizeText, MentionNotificationBubbleItem, MentionType, SendMessageComposer } from '../../../../api';
import { Flex, LayoutAvatarImageView, LayoutNotificationBubbleView, LayoutNotificationBubbleViewProps, Text } from '../../../../common';
import { markRead } from '../../../../hooks/mentions/mentionsStore';
import { useUserDataSnapshot } from '../../../../hooks/session/useSessionSnapshots';
import { MentionMessageView } from '../../../mentions/MentionMessageView';

export interface NotificationMentionBubbleViewProps extends LayoutNotificationBubbleViewProps {
    item: MentionNotificationBubbleItem;
}

export const NotificationMentionBubbleView: FC<NotificationMentionBubbleViewProps> = (props) => {
    const { item = null, onClose = null, ...rest } = props;
    const { userName: ownUsername = '' } = useUserDataSnapshot();

    const mention = item.mention;
    const isRoom = mention.mentionType === MentionType.ROOM;
    const time = formatMentionTime(mention.timestamp);

    const markReadOnServer = () => {
        markRead(mention.mentionId);
        SendMessageComposer(new MarkMentionsReadComposer(1, mention.mentionId));
    };

    // Whole-bubble click opens the mentions panel (and dismisses the bubble).
    const open = () => {
        CreateLinkEvent('mentions/toggle');
        onClose();
    };

    const goto = () => {
        markReadOnServer();
        if (mention.roomId > 0) CreateLinkEvent(`navigator/goto/${mention.roomId}`);
        onClose();
    };

    const act = (event: MouseEvent, fn: () => void) => {
        event.stopPropagation();
        fn();
    };

    return (
        <LayoutNotificationBubbleView
            alignItems="start"
            gap={2}
            classNames={['w-[330px]', 'max-w-[92vw]', 'cursor-pointer']}
            onClick={open}
            onClose={onClose}
            {...rest}
        >
            <div className="mention-toast-avatar">
                <LayoutAvatarImageView headOnly direction={2} figure={mention.senderFigure} />
            </div>
            <Flex column gap={0} className="min-w-0 flex-1">
                <Flex alignItems="center" gap={1} className="min-w-0">
                    <Text bold truncate variant="white">
                        {mention.senderUsername}
                    </Text>
                    <span className={`mention-toast-chip ${isRoom ? 'is-room' : 'is-direct'}`}>
                        {LocalizeText(isRoom ? 'mentions.type.room' : 'mentions.type.direct')}
                    </span>
                    <span className="mention-toast-spacer" />
                    {time.length > 0 && <span className="mention-toast-time">{time}</span>}
                    <button type="button" className="mention-toast-dismiss" title={LocalizeText('generic.cancel')} onClick={(event) => act(event, onClose)}>
                        <FaTimes />
                    </button>
                </Flex>
                {mention.roomName && mention.roomName.length > 0 && <span className="mention-toast-room">· {mention.roomName}</span>}
                <MentionMessageView className="mention-toast-message" ownUsername={ownUsername} text={mention.message} />
                <Flex gap={1} className="mention-toast-actions">
                    <button type="button" className="mention-toast-btn" onClick={(event) => act(event, open)}>
                        {LocalizeText('mentions.window.title')}
                    </button>
                    {mention.roomId > 0 && (
                        <button type="button" className="mention-toast-btn" onClick={(event) => act(event, goto)}>
                            {LocalizeText('mentions.action.goto')}
                        </button>
                    )}
                </Flex>
            </Flex>
        </LayoutNotificationBubbleView>
    );
};
