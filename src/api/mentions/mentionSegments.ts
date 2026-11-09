import { classifyMentionToken, MENTION_ROOM_ALIASES, MentionKind } from './mentionTokens';

export interface MentionSegment {
    text: string;
    /** '' for plain text, otherwise how the @token reads for the viewer. */
    kind: MentionKind;
}

const TRAILING_PUNCTUATION = /[.,!?;:)\]}"']+$/;

/**
 * Splits a line into plain text and @mention tokens. A token stops before the punctuation that
 * follows it, so "@bob," tags @bob and leaves the comma alone. The only tokenizer: the chat
 * highlighter and the panel both read their segments from here, so they cannot disagree.
 */
export const segmentMentionText = (text: string, ownUsername: string, aliases: ReadonlyArray<string> = MENTION_ROOM_ALIASES): MentionSegment[] => {
    const segments: MentionSegment[] = [];

    const push = (value: string, kind: MentionKind) => {
        if (!value) return;

        const last = segments[segments.length - 1];

        if (last && last.kind === '' && kind === '') last.text += value;
        else segments.push({ text: value, kind });
    };

    for (const part of text.split(/(\s+)/)) {
        if (!part) continue;

        if (/^\s+$/.test(part) || part.charAt(0) !== '@') {
            push(part, '');
            continue;
        }

        const tail = TRAILING_PUNCTUATION.exec(part)?.[0] ?? '';
        const core = part.slice(0, part.length - tail.length);
        const kind = core.length > 1 ? classifyMentionToken(core, ownUsername, aliases) : '';

        if (kind) {
            push(core, kind);
            push(tail, '');
        } else {
            push(part, '');
        }
    }

    return segments;
};
