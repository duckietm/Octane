import { segmentMentionText } from '../../../../api/mentions/mentionSegments';
import { MENTION_ROOM_ALIASES } from '../../../../api/mentions/mentionTokens';

const TAG_CLASS = 'mention-tag';
const SELF_CLASS = 'mention-tag mention-tag--self';

const highlightTextChunk = (chunk: string, ownUsername: string, aliases: ReadonlyArray<string>): string => {
    if (chunk.indexOf('@') < 0) return chunk;

    return segmentMentionText(chunk, ownUsername, aliases)
        .map((segment) => (segment.kind ? `<span class="${segment.kind === 'self' ? SELF_CLASS : TAG_CLASS}">${segment.text}</span>` : segment.text))
        .join('');
};

/**
 * Wrap every @mention token in chat HTML with a `.mention-tag` span. Tokens
 * that target the viewer or a broadcast alias additionally get the
 * `.mention-tag--self` modifier so "I was mentioned" stands out. Walks around
 * formatter HTML (`<...>`) so tags inside markup are never touched.
 */
export const highlightMentions = (formattedHtml: string, ownUsername: string, aliases: ReadonlyArray<string> = MENTION_ROOM_ALIASES): string => {
    if (!formattedHtml || formattedHtml.indexOf('@') < 0) return formattedHtml;

    let result = '';
    let cursor = 0;

    while (cursor < formattedHtml.length) {
        const tagStart = formattedHtml.indexOf('<', cursor);

        if (tagStart < 0) {
            result += highlightTextChunk(formattedHtml.slice(cursor), ownUsername, aliases);
            break;
        }

        if (tagStart > cursor) {
            result += highlightTextChunk(formattedHtml.slice(cursor, tagStart), ownUsername, aliases);
        }

        const tagEnd = formattedHtml.indexOf('>', tagStart);

        if (tagEnd < 0) {
            result += formattedHtml.slice(tagStart);
            break;
        }

        result += formattedHtml.slice(tagStart, tagEnd + 1);
        cursor = tagEnd + 1;
    }

    return result;
};
