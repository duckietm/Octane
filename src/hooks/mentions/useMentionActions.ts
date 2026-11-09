import { CreateLinkEvent } from '@octane/renderer';
import { useMemo } from 'react';
import { IMentionEntry } from '../../api';
import { deleteMention, markAllMentionsRead, markMentionRead } from './mentionsRequests';

export interface MentionActions {
    /** Row click: mark the mention as read (no navigation). */
    open: (mention: IMentionEntry) => void;
    /** Explicit "go to room" action: mark read, then jump to the origin room. */
    goto: (mention: IMentionEntry) => void;
    /** Permanently delete the mention server-side and drop it from the local list. */
    remove: (mention: IMentionEntry) => void;
    /** Mark everything read, here and on the server. */
    markAll: () => void;
}

// One set of handlers for the panel and the toast, so what a click means cannot diverge.
export const useMentionActions = (): MentionActions =>
    useMemo(
        () => ({
            open: (mention) => markMentionRead(mention),
            goto: (mention) => {
                markMentionRead(mention);

                if (mention.roomId > 0) CreateLinkEvent(`navigator/goto/${mention.roomId}`);
            },
            remove: (mention) => deleteMention(mention),
            markAll: () => markAllMentionsRead()
        }),
        []
    );
