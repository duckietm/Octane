import { ExtendedForumData, GuildForumThread, PostMessageMessageComposer, PostMessageMessageEvent, PostThreadMessageEvent } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { CreateLinkEvent, FriendlyTime, LocalizeText, SendMessageComposer } from '../../../../api';
import { LayoutBadgeImageView } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';
import { flatText, GroupInput, GroupText } from '../GroupNativeLayout';
import { FORUM_HEADER, FORUM_SURFACE, ForumButton, ForumFrame, stripTags } from './GroupForumLayout';
import { forumPermissionText } from './GroupForumThreadListView';
import { BaseButton } from '../../../../common/BaseButton';

// ComposeMessageView.validateInputs: a subject or a message of 10 characters or fewer is refused, and a post follows the last one by at least 30 seconds.
const MIN_LENGTH = 10;
const POST_COOLDOWN = 30000;

// GroupForumController.lastPostTime: shared by every composer of the session; it starts 30 seconds in the past.
let lastPostTime = -POST_COOLDOWN;

interface GroupForumComposeViewProps {
    compose: { kind: 'thread' } | { kind: 'reply'; threadId: number; subject: string; quote?: string; quoteSeq: number };
    forumData: ExtendedForumData;
    /** The newest forum data of the group, read when Post is pressed (the committed props can be one update behind). */
    readForumData: () => ExtendedForumData | null;
    groupId: number;
    initialPosition: { x: number; y: number };
    onClose: () => void;
    onThreadCreated: (thread: GuildForumThread) => void;
}

/** groupforum_compose_message: a new thread (subject and message) or a reply (the thread subject shown read-only). */
export const GroupForumComposeView: FC<GroupForumComposeViewProps> = ({ compose, forumData, readForumData, groupId, initialPosition, onClose, onThreadCreated }) =>
{
    const isReply = compose.kind === 'reply';
    const [subject, setSubject] = useState<string>('');
    const [message, setMessage] = useState<string>(isReply && compose.quote ? compose.quote : '');
    const [isPosting, setIsPosting] = useState<boolean>(false);
    // Pressing Post twice before the window re-renders must still send once.
    const postSent = useRef<boolean>(false);
    const [now, setNow] = useState<number>(() => performance.now());
    const [isHintShown, setIsHintShown] = useState<boolean>(true);
    // Replying to another message while the composer is open adds its quote under the text so far.
    const quote = isReply ? compose.quote : undefined;
    const quoteSeq = isReply ? compose.quoteSeq : 0;

    // ComposeMessageView.focus: a quote added while the window is open goes under the text so far, unless a post is on its way.
    useEffect(() =>
    {
        if (quote && quoteSeq > 0 && !postSent.current) setMessage((previous) => (previous ? previous + '\n\n' + quote : quote));
    }, [quote, quoteSeq]);

    // The window validates once a second, so the cooldown counts down and the first check clears the reply hint.
    useEffect(() =>
    {
        const timer = setInterval(() =>
        {
            setNow(performance.now());
            setIsHintShown(false);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // The server trims both fields and drops a post whose trimmed text is too short without a reply, so the length rule is applied to the trimmed text
    // (the v75 window counts the raw text); what is sent stays exactly what was typed.
    const subjectOk = isReply || subject.trim().length > MIN_LENGTH;
    const messageOk = message.trim().length > MIN_LENGTH;
    const cooldown = Math.max(0, POST_COOLDOWN - (now - lastPostTime));
    const permissionError = isReply ? forumData.postMessagePermissionError : forumData.postThreadPermissionError;
    const canPostHere = permissionError.length === 0;

    // The server answers a post with the new thread (a new thread) or the new message (a reply); either one closes the composer.
    useMessageEvent<PostThreadMessageEvent>(PostThreadMessageEvent, (event) =>
    {
        const parser = event.getParser();

        if (isReply || parser.groupId !== groupId || !isPosting) return;

        onThreadCreated(parser.thread);
    });

    useMessageEvent<PostMessageMessageEvent>(PostMessageMessageEvent, (event) =>
    {
        const parser = event.getParser();

        if (!isReply || parser.groupId !== groupId || parser.threadId !== compose.threadId || !isPosting) return;

        onClose();
    });

    const post = () =>
    {
        // Checked again at the moment of sending: the posting permission can be gone by now, the cooldown of an earlier post still runs.
        const live = readForumData();
        const allowed = !!live && live.groupId === groupId && (isReply ? live.canPostMessage : live.canPostThread);
        const remaining = POST_COOLDOWN - (performance.now() - lastPostTime);

        if (postSent.current || isPosting || !subjectOk || !messageOk || !allowed || remaining > 0)
        {
            setNow(performance.now());

            return;
        }

        postSent.current = true;
        lastPostTime = performance.now();
        setIsPosting(true);
        // The v75 text fields separate lines with a carriage return, and so do the messages the other clients show.
        SendMessageComposer(new PostMessageMessageComposer(groupId, isReply ? compose.threadId : 0, isReply ? '' : subject, message.replace(/\r\n|\n/g, '\r')));
    };

    const getStatus = (): string =>
    {
        if (isPosting) return LocalizeText('groupforum.compose.posting');
        if (!subjectOk) return LocalizeText('groupforum.compose.subject_too_short');
        if (!messageOk) return LocalizeText('groupforum.compose.message_too_short');
        if (!canPostHere) return forumPermissionText(permissionError, isReply ? 'operation_post_message' : 'operation_post_thread');

        if (cooldown > 0)
        {
            const remaining = FriendlyTime.format(cooldown / 1000 + 1, '', 1);

            return LocalizeText('groupforum.compose.post_cooldown', ['time_remaining', 'TIME_REMAINING'], [remaining, remaining]);
        }

        return isHintShown ? LocalizeText('groupforum.compose.reply_hint') : '';
    };
    const status = getStatus();

    return (
        <ForumFrame
            className="octane-group-forum-compose"
            height={470}
            initialPosition={initialPosition}
            title={LocalizeText('groupforum.compose.window_title')}
            uniqueKey="group-forum-compose"
            width={455}
            onClose={onClose}
            onHelp={() => CreateLinkEvent('habbopages/forums')}
        >
            <div className="octane-forum__header" style={{ width: 453 }}>
                <div className="octane-forum__header-icon">
                    <div className="octane-forum__header-badge">
                        <LayoutBadgeImageView badgeCode={forumData.icon} isGroup={true} />
                    </div>
                </div>
                <GroupText background={FORUM_HEADER} height={30} overrides={{ size: 24, color: 0xffffff }} text={forumData.name} textStyle="u_headline_big" width={360} x={90} y={10} />
                <GroupText background={FORUM_HEADER} height={40} overrides={flatText(12, { color: 0xffffff })} text={forumData.description} width={359} wrap x={90} y={40} />
            </div>
            <div className="octane-forum__compose-bar" style={{ top: 96 }}>
                <GroupText background={0x227aad} overrides={flatText(12, { color: 0xeeeeee })} text={LocalizeText(isReply ? 'groupforum.compose.subject_replying_to' : 'groupforum.compose.subject')} x={1} y={1} />
            </div>
            {(isReply || subject.length > 0) && <div className="octane-forum__compose-field" style={{ left: 0, top: 117, width: 444, height: 22 }} />}
            {isReply ? (
                <GroupText background={0xffffff} overrides={flatText(16)} text={compose.subject} x={0} y={117} />
            ) : (
                <GroupInput fontSize={16} height={22} inset={2} label={LocalizeText('groupforum.compose.subject')} maxLength={120} plain value={subject} width={444} x={0} y={117} onChange={(value) =>
                {
                    setSubject(value); setIsHintShown(false);
                }} />
            )}
            <div className="octane-forum__compose-bar" style={{ top: 145 }}>
                <GroupText background={0x227aad} overrides={flatText(12, { color: 0xeeeeee })} text={LocalizeText('groupforum.compose.message')} x={1} y={1} />
                <BaseButton className="octane-forum__help-link" type="button" onClick={() => CreateLinkEvent('habbopages/forums/formatting')}>
                    <GroupText background={0x227aad} className="is-static" overrides={flatText(12, { color: 0xffffff, underline: true })} text={stripTags(LocalizeText('groupforum.compose.formatting_help'))} x={0} y={0} />
                </BaseButton>
            </div>
            <GroupInput fontSize={12} height={200} inset={4} label={LocalizeText('groupforum.compose.message')} maxLength={4000} multiline plain value={message} width={444} x={0} y={165} onChange={(value) =>
            {
                setMessage(value); setIsHintShown(false);
            }} />
            <ForumButton label={LocalizeText('groupforum.compose.cancel')} width={120} x={25} y={378} onClick={onClose} />
            <ForumButton disabled={isPosting || !subjectOk || !messageOk || !canPostHere || cooldown > 0} label={LocalizeText('groupforum.compose.post')} tint="blue" width={120} x={295} y={378} onClick={post} />
            {status && <GroupText background={FORUM_SURFACE} overrides={flatText(11)} text={status} width={424} wrap x={10} y={425} />}
        </ForumFrame>
    );
};
