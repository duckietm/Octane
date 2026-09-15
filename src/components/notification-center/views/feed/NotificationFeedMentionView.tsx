import { FC, MouseEvent } from 'react';
import { FaArrowRight, FaTimes } from 'react-icons/fa';
import { formatMentionTime, IMentionEntry, LocalizeText, MentionType } from '../../../../api';
import { LayoutAvatarImageView } from '../../../../common';
import { MentionMessageView } from '../../../mentions/MentionMessageView';

export interface NotificationFeedMentionViewProps {
    mention: IMentionEntry;
    ownUsername: string;
    onOpen: (mention: IMentionEntry) => void;
    onGoto: (mention: IMentionEntry) => void;
    onRemove: (mention: IMentionEntry) => void;
}

/**
 * One mention as a row of the notification feed: the sender's head, who said it and
 * where, the message with the own name highlighted, and the go-to-room / delete
 * actions the old mentions window offered.
 */
export const NotificationFeedMentionView: FC<NotificationFeedMentionViewProps> = (props) => {
    const { mention, ownUsername, onOpen, onGoto, onRemove } = props;
    const isRoom = mention.mentionType === MentionType.ROOM;
    const time = formatMentionTime(mention.timestamp);

    const stop = (event: MouseEvent, action: () => void) => {
        event.stopPropagation();
        action();
    };

    return (
        <div
            className={`group relative flex items-start gap-2 rounded px-2 py-1.5 border cursor-pointer hover:bg-white/10 ${mention.read ? 'bg-white/5 border-white/10' : 'bg-amber-300/15 border-amber-300/30'}`}
            data-testid="feed-mention"
            onClick={() => onOpen(mention)}
        >
            {!mention.read && <span className="absolute left-[3px] top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-sky-400" aria-hidden />}
            <div className="mention-row-avatar" title={LocalizeText(isRoom ? 'mentions.type.room' : 'mentions.type.direct')}>
                <LayoutAvatarImageView headOnly direction={2} figure={mention.senderFigure} />
                <span className={`mention-row-type ${isRoom ? 'is-room' : 'is-direct'}`}>{isRoom ? '∗' : '@'}</span>
            </div>
            <div className="flex flex-col min-w-0 grow">
                <span className="text-[.65rem] uppercase tracking-wide text-white/60 truncate">
                    {mention.senderUsername}
                    {mention.roomName ? ` · ${mention.roomName}` : ''}
                </span>
                <MentionMessageView className="text-sm break-words" ownUsername={ownUsername} text={mention.message} />
                <span className="text-[.65rem] text-white/50">{time}</span>
            </div>
            <div className="hidden group-hover:flex flex-col gap-1 shrink-0">
                <button
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 hover:bg-sky-500"
                    title={LocalizeText('mentions.action.goto')}
                    type="button"
                    onClick={(event) => stop(event, () => onGoto(mention))}
                >
                    <FaArrowRight size={9} />
                </button>
                <button
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 hover:bg-rose-500"
                    title={LocalizeText('mentions.action.remove')}
                    type="button"
                    onClick={(event) => stop(event, () => onRemove(mention))}
                >
                    <FaTimes size={9} />
                </button>
            </div>
        </div>
    );
};
