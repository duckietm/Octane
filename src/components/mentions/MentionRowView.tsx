import { FC } from 'react';
import { formatMentionTime, IMentionEntry, LocalizeText, localizeWithFallback, MentionType } from '../../api';
import { LayoutAvatarImageView } from '../../common';
import { MentionMessageView } from './MentionMessageView';

interface MentionRowViewProps {
    mention: IMentionEntry;
    ownUsername: string;
    onOpen: (mention: IMentionEntry) => void;
    onGoto?: (mention: IMentionEntry) => void;
    onRemove?: (mention: IMentionEntry) => void;
}

export const MentionRowView: FC<MentionRowViewProps> = (props) => {
    const { mention, ownUsername, onOpen, onGoto = null, onRemove = null } = props;

    const isRoom = mention.mentionType === MentionType.ROOM;
    const typeTitle = LocalizeText(isRoom ? 'mentions.type.room' : 'mentions.type.direct');
    const typeChip = isRoom ? localizeWithFallback('mentions.chip.room', 'Room') : localizeWithFallback('mentions.chip.direct', 'Direct');
    const time = formatMentionTime(mention.timestamp);
    const gotoLabel = LocalizeText('mentions.action.goto');
    const removeLabel = LocalizeText('mentions.action.remove');

    return (
        <div className={`mention-row ${mention.read ? '' : 'is-unread'}`} role="listitem">
            {!mention.read && <span className="mention-row-unread-dot" aria-hidden />}
            <button type="button" className="mention-row-main" aria-label={`${mention.senderUsername}: ${mention.message}`} onClick={() => onOpen(mention)}>
                <span className="mention-row-avatar">
                    <LayoutAvatarImageView headOnly compactHead compactHeadSize={40} compactHeadPadding={0} direction={2} figure={mention.senderFigure} />
                </span>
                <span className="mention-row-body">
                    <span className="mention-row-head">
                        <span className="mention-row-name">{mention.senderUsername}</span>
                        <span className={`mention-row-chip ${isRoom ? 'is-room' : 'is-direct'}`} title={typeTitle}>
                            {typeChip}
                        </span>
                        {mention.roomName && mention.roomName.length > 0 && <span className="mention-row-room">· {mention.roomName}</span>}
                    </span>
                    <MentionMessageView className="mention-row-msg" ownUsername={ownUsername} text={mention.message} />
                </span>
            </button>
            <div className="mention-row-meta">
                {time.length > 0 && <span className="mention-row-time">{time}</span>}
                <div className="mention-row-actions">
                    {onGoto && mention.roomId > 0 && (
                        <button type="button" className="mention-row-action" title={gotoLabel} aria-label={gotoLabel} onClick={() => onGoto(mention)}>
                            ›
                        </button>
                    )}
                    {onRemove && (
                        <button type="button" className="mention-row-action is-remove" title={removeLabel} aria-label={removeLabel} onClick={() => onRemove(mention)}>
                            ×
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
