import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { stripTags } from './GroupForumLayout';

interface HandheldGroupForumComposeViewProps {
    /** The subject of the thread replied to, or null when a new thread is written. */
    replySubject: string | null;
    subject: string;
    message: string;
    subjectMaxLength: number;
    messageMaxLength: number;
    /** What stops the post, or the hint; empty when there is nothing to say. */
    status: string;
    canPost: boolean;
    onSubject: (value: string) => void;
    onMessage: (value: string) => void;
    onFormattingHelp: () => void;
    onPost: () => void;
    onCancel: () => void;
}

/**
 * Writing a thread or a reply on a phone: the subject (typed for a new thread, shown for a reply), the message, what
 * still stops the post, and Cancel / Post. Both fields are 16 px so the browser does not zoom into them.
 * GroupForumComposeView keeps the text, the length rules, the cooldown and the packet.
 */
export const HandheldGroupForumComposeView: FC<HandheldGroupForumComposeViewProps> = (props) => {
    const { replySubject, subject, message, subjectMaxLength, messageMaxLength, status, canPost, onSubject, onMessage, onFormattingHelp, onPost, onCancel } =
        props;
    const isReply = replySubject !== null;
    const subjectLabel = LocalizeText(isReply ? 'groupforum.compose.subject_replying_to' : 'groupforum.compose.subject');
    const messageLabel = LocalizeText('groupforum.compose.message');

    return (
        <NativeTextTree>
            <div className="octane-handheld-forum__page" data-testid="forum-compose">
                <div className="octane-handheld-forum__scroll is-form">
                    <div className="octane-handheld-forum__title">{LocalizeText('groupforum.compose.window_title')}</div>
                    <div className="octane-handheld-forum__field-group">
                        <div className="octane-handheld-forum__label">{subjectLabel}</div>
                        {isReply ? (
                            <div className="octane-handheld-forum__reply-subject">{replySubject}</div>
                        ) : (
                            <input
                                aria-label={subjectLabel}
                                autoComplete="off"
                                className="octane-handheld-forum__field"
                                maxLength={subjectMaxLength}
                                type="text"
                                value={subject}
                                onChange={(event) => onSubject(event.target.value)}
                            />
                        )}
                    </div>
                    <div className="octane-handheld-forum__label">
                        <span>{messageLabel}</span>
                        <BaseButton className="octane-handheld-forum__link" onClick={onFormattingHelp}>
                            {stripTags(LocalizeText('groupforum.compose.formatting_help'))}
                        </BaseButton>
                    </div>
                    <textarea
                        aria-label={messageLabel}
                        className="octane-handheld-forum__field is-message"
                        maxLength={messageMaxLength}
                        value={message}
                        onChange={(event) => onMessage(event.target.value)}
                    />
                </div>
                {status && (
                    <div className="octane-handheld-forum__status" role="status">
                        {status}
                    </div>
                )}
                <div className="octane-handheld-forum__bar">
                    <BaseButton className="octane-handheld-forum__button" data-testid="forum-compose-cancel" onClick={onCancel}>
                        {LocalizeText('groupforum.compose.cancel')}
                    </BaseButton>
                    <BaseButton className="octane-handheld-forum__button is-primary" data-testid="forum-compose-post" disabled={!canPost} onClick={onPost}>
                        {LocalizeText('groupforum.compose.post')}
                    </BaseButton>
                </div>
            </div>
        </NativeTextTree>
    );
};
