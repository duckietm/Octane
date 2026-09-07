import { CreateLinkEvent, DeleteMentionComposer, MarkMentionsReadComposer } from '@octane/renderer';
import { useMemo } from 'react';
import { IMentionEntry, SendMessageComposer } from '../../api';
import { markRead, removeMention } from './mentionsStore';

export interface MentionActions {
    /** Row click: mark the mention as read (no navigation). */
    open: (mention: IMentionEntry) => void;
    /** Explicit "go to room" action: mark read, then jump to the origin room. */
    goto: (mention: IMentionEntry) => void;
    /** Permanently delete the mention server-side (DeleteMentionComposer) and
     *  drop it from the local list, so it does not reappear after a relog. */
    remove: (mention: IMentionEntry) => void;
}

const markReadOnServer = (mention: IMentionEntry): void => {
    if (mention.read) return;
    markRead(mention.mentionId);
    SendMessageComposer(new MarkMentionsReadComposer(1, mention.mentionId));
};

// Shared action handlers used by both MentionsView and the chat-history
// "Menzioni" tab so behaviour can't diverge.
export const useMentionActions = (): MentionActions =>
    useMemo(
        () => ({
            open: (mention) => markReadOnServer(mention),
            goto: (mention) => {
                markReadOnServer(mention);
                if (mention.roomId > 0) CreateLinkEvent(`navigator/goto/${mention.roomId}`);
            },
            remove: (mention) => {
                // Permanent server-side delete, then drop it from the local list.
                SendMessageComposer(new DeleteMentionComposer(mention.mentionId));
                removeMention(mention.mentionId);
            }
        }),
        []
    );
