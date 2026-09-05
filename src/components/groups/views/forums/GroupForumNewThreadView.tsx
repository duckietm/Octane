import { ExtendedForumData, PostMessageMessageComposer, PostThreadMessageEvent } from '@octane/renderer';
import { FC, useCallback, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { useMessageEvent, useNotification } from '../../../../hooks';

interface GroupForumNewThreadViewProps {
    groupId: number;
    forumData: ExtendedForumData;
    onBack: () => void;
    onThreadCreated: (threadId: number) => void;
}

export const GroupForumNewThreadView: FC<GroupForumNewThreadViewProps> = (props) => {
    const { groupId = 0, forumData = null, onBack = null, onThreadCreated = null } = props;
    const effectiveGroupId = forumData?.groupId || groupId;
    const [subject, setSubject] = useState<string>('');
    const [message, setMessage] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const { simpleAlert = null } = useNotification();

    useMessageEvent<PostThreadMessageEvent>(PostThreadMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.groupId !== effectiveGroupId) return;

        setIsSubmitting(false);
        setSubject('');
        setMessage('');

        if (onThreadCreated) onThreadCreated(parser.thread.threadId);
    });

    const submitThread = useCallback(() => {
        if (subject.trim().length < 10) {
            simpleAlert(LocalizeText('groupforum.compose.subject_too_short'));
            return;
        }

        if (message.trim().length < 10) {
            simpleAlert(LocalizeText('groupforum.compose.message_too_short'));
            return;
        }

        setIsSubmitting(true);
        // PostMessageMessageComposer with threadId=0 creates a new thread
        // params: groupId, threadId (0 for new), subject, message
        SendMessageComposer(new PostMessageMessageComposer(effectiveGroupId, 0, subject.trim(), message.trim()));
    }, [effectiveGroupId, subject, message, simpleAlert]);

    return (
        <Column className="h-full p-3" gap={2}>
            <Flex gap={2} alignItems="center">
                <Text pointer bold onClick={onBack}>
                    <span className="inline-block w-[7px] h-[7px] border-l-2 border-b-2 border-current rotate-45 mr-1 align-middle" />{' '}
                    {LocalizeText('groupforum.view.back')}
                </Text>
            </Flex>
            <Column gap={1}>
                <Text bold>{LocalizeText('messageboard.message.thread.subject')}</Text>
                <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={LocalizeText('messageboard.message.thread.subject')}
                    maxLength={120}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                />
            </Column>
            <Column className="flex-1" gap={1}>
                <Text bold>{LocalizeText('messageboard.forum.compose.message.header')}</Text>
                <textarea
                    className="form-control form-control-sm flex-1"
                    placeholder={LocalizeText('messageboard.forum.compose.message.header')}
                    maxLength={4000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
            </Column>
            <Flex gap={2} justifyContent="end">
                <Button variant="secondary" className="btn-sm" onClick={onBack}>
                    {LocalizeText('generic.cancel')}
                </Button>
                <Button
                    variant="primary"
                    className="btn-sm"
                    onClick={submitThread}
                    disabled={isSubmitting || subject.trim().length < 10 || message.trim().length < 10}
                >
                    {isSubmitting ? '...' : LocalizeText('messageboard.new.thread.button')}
                </Button>
            </Flex>
        </Column>
    );
};
