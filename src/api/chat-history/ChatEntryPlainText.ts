import { ChatEntryType } from './ChatEntryType';
import { IChatEntry } from './IChatEntry';

/**
 * What a chat entry said, as plain text. Room chat is stored as the bubble's HTML - entities for every accented
 * letter, colour spans, line breaks - so a report built from it reached the moderators as markup. Entries from older
 * clients have only that HTML and are decoded here.
 */
export const ChatEntryPlainText = (entry: IChatEntry): string => {
    if (typeof entry?.text === 'string') return entry.text;

    const message = entry?.message ?? '';

    if (entry?.type !== ChatEntryType.TYPE_CHAT || typeof DOMParser === 'undefined') return message;

    const document = new DOMParser().parseFromString(message.replace(/<br\s*\/?>/gi, '\n'), 'text/html');

    return document.body.textContent ?? '';
};
