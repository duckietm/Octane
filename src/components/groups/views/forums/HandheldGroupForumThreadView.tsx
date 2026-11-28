import { MessageData } from '@octane/renderer';
import { FC, RefObject } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../api';
import { LayoutAvatarImageView } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { forumMessageBlocks, forumMessageLook, MESSAGE_DELETED_BY_STAFF, MESSAGE_HIDDEN_BY_ADMIN } from './forumMessageLook';
import { forumAge } from './GroupForumLayout';
import { ForumIcon, HandheldForumPages } from './HandheldGroupForumParts';

interface HandheldGroupForumThreadViewProps {
    subject: string;
    isPinned: boolean;
    isLocked: boolean;
    messages: MessageData[];
    /** The messages after the last one read. */
    newMessageIds: ReadonlySet<number>;
    canModerate: boolean;
    isStaff: boolean;
    canReport: boolean;
    canReply: boolean;
    pageIndex: number;
    pageCount: number;
    /** Why no reply can be written, when it cannot. */
    statusText: string;
    /** The scrolled list; a link to one message scrolls it there. */
    viewportRef: RefObject<HTMLDivElement>;
    onBack: () => void;
    onPage: (pageIndex: number) => void;
    onReply: () => void;
    onQuote: (message: MessageData) => void;
    onModerate: (message: MessageData, action: 'hide' | 'unhide') => void;
    onReport: (message: MessageData) => void;
    onProfile: (userId: number) => void;
}

/** The look of a message as a name the stylesheet colours: not read yet, hidden by an administrator, removed by staff. */
const lookName = (state: number): 'new' | 'hidden' | 'deleted' | 'read' => {
    if (state === -1) return 'new';
    if (state === MESSAGE_HIDDEN_BY_ADMIN) return 'hidden';

    return state === MESSAGE_DELETED_BY_STAFF ? 'deleted' : 'read';
};

/**
 * A thread on a phone: its subject, then one card per message (the author's head and name open the profile; when it
 * was written and its number; the text, quoted lines set apart), the pages under the last card, and the bar with Back
 * and Reply. forumMessageLook decides, as on the desktop, what a hidden message shows and who may hide or show it;
 * quoting, hiding and reporting are named buttons under each message. GroupForumThreadView hands it everything.
 */
export const HandheldGroupForumThreadView: FC<HandheldGroupForumThreadViewProps> = (props) => {
    const { subject, isPinned, isLocked, messages, newMessageIds, canModerate, isStaff, canReport, canReply, pageIndex, pageCount, statusText, viewportRef } =
        props;
    const { onBack, onPage, onReply, onQuote, onModerate, onReport, onProfile } = props;

    return (
        <NativeTextTree>
            <div className="octane-handheld-forum__page" data-testid="forum-thread">
                <div ref={viewportRef} className="octane-handheld-forum__scroll">
                    <div className="octane-handheld-forum__subject">
                        {isPinned && <ForumIcon label={localizeWithFallback('octane.handheld.forum.pinned', 'Pinned')} name="pin" />}
                        {isLocked && <ForumIcon label={localizeWithFallback('octane.handheld.forum.locked', 'Locked')} name="lock" />}
                        <span>{subject}</span>
                    </div>
                    {messages.map((message) => {
                        const look = forumMessageLook(message.state, newMessageIds.has(message.messageId), canModerate, isStaff);
                        const getNotice = (): string => {
                            if (look.state === MESSAGE_HIDDEN_BY_ADMIN)
                                return LocalizeText(
                                    'groupforum.view.message_hidden_by_admin',
                                    ['ADMIN_NAME', 'admin_name'],
                                    [message.adminName, message.adminName]
                                );
                            if (look.state === MESSAGE_DELETED_BY_STAFF)
                                return LocalizeText(
                                    'groupforum.view.message_hidden_by_staff',
                                    ['ADMIN_NAME', 'admin_name'],
                                    [message.adminName, message.adminName]
                                );

                            return '';
                        };
                        const notice = getNotice();
                        const { hideAction } = look;

                        return (
                            <article
                                key={message.messageId}
                                className="octane-handheld-forum__message"
                                data-forum-message=""
                                data-look={lookName(look.state)}
                                data-testid={`message-${message.messageId}`}
                            >
                                <header className="octane-handheld-forum__message-head">
                                    <BaseButton
                                        aria-label={message.authorName}
                                        className="octane-handheld-forum__avatar"
                                        onClick={() => onProfile(message.authorId)}
                                    >
                                        <LayoutAvatarImageView direction={2} figure={message.authorFigure} headOnly={true} />
                                    </BaseButton>
                                    <div className="octane-handheld-forum__message-who">
                                        <BaseButton className="octane-handheld-forum__author" onClick={() => onProfile(message.authorId)}>
                                            {message.authorName}
                                        </BaseButton>
                                        <div className="octane-handheld-forum__message-meta">
                                            <span>{forumAge(message.creationTime)}</span>
                                            <span>
                                                {LocalizeText(
                                                    'groupforum.view.thread_details1',
                                                    ['TOTAL_MESSAGES', 'total_messages'],
                                                    [String(message.authorPostCount), String(message.authorPostCount)]
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="octane-handheld-forum__message-number">{'#' + (message.messageIndex + 1)}</span>
                                </header>
                                {notice && <div className="octane-handheld-forum__notice">{notice}</div>}
                                {!look.isModerationMessage && !!message.messageText && (
                                    <div className="octane-handheld-forum__text">
                                        {/* What somebody typed stays browser text (a <pre> is never drawn as a label): any length, any character, its own line breaks. */}
                                        {forumMessageBlocks(message.messageText).map((block, index) => (
                                            <pre key={index} className={block.quote ? 'octane-handheld-forum__quote' : 'octane-handheld-forum__lines'}>
                                                {block.lines.join('\n')}
                                            </pre>
                                        ))}
                                    </div>
                                )}
                                <footer className="octane-handheld-forum__actions">
                                    <BaseButton
                                        className="octane-handheld-forum__chip"
                                        data-action="quote"
                                        disabled={!canReply}
                                        onClick={() => onQuote(message)}
                                    >
                                        <ForumIcon name="quote" />
                                        <span>{localizeWithFallback('octane.handheld.forum.quote', 'Quote')}</span>
                                    </BaseButton>
                                    {hideAction && (
                                        <BaseButton
                                            className="octane-handheld-forum__chip"
                                            data-action={hideAction}
                                            onClick={() => onModerate(message, hideAction)}
                                        >
                                            <ForumIcon name={hideAction === 'unhide' ? 'show' : 'hide'} />
                                            <span>
                                                {hideAction === 'unhide'
                                                    ? localizeWithFallback('octane.handheld.forum.unhide', 'Show again')
                                                    : localizeWithFallback('octane.handheld.forum.hide', 'Hide')}
                                            </span>
                                        </BaseButton>
                                    )}
                                    {canReport && (
                                        <BaseButton className="octane-handheld-forum__chip is-report" data-action="report" onClick={() => onReport(message)}>
                                            <ForumIcon name="report" />
                                            <span>{localizeWithFallback('octane.handheld.forum.report', 'Report')}</span>
                                        </BaseButton>
                                    )}
                                </footer>
                            </article>
                        );
                    })}
                    <HandheldForumPages pageCount={pageCount} pageIndex={pageIndex} onPage={onPage} />
                </div>
                {statusText && <div className="octane-handheld-forum__status">{statusText}</div>}
                <div className="octane-handheld-forum__bar">
                    <BaseButton className="octane-handheld-forum__button" data-testid="forum-back" onClick={onBack}>
                        <ForumIcon name="back" />
                        <span>{LocalizeText('groupforum.view.back')}</span>
                    </BaseButton>
                    <BaseButton className="octane-handheld-forum__button is-primary" data-testid="forum-reply" disabled={!canReply} onClick={onReply}>
                        {LocalizeText('groupforum.view.reply')}
                    </BaseButton>
                </div>
            </div>
        </NativeTextTree>
    );
};
