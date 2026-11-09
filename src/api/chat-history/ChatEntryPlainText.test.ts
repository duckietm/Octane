/* @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RoomChatFormatter } from '../utils/RoomChatFormatter';
import { ChatEntryPlainText } from './ChatEntryPlainText';
import { ChatEntryType } from './ChatEntryType';
import { IChatEntry } from './IChatEntry';

const entry = (partial: Partial<IChatEntry>): IChatEntry => ({
    id: 1,
    webId: 2,
    entityId: 3,
    name: 'alice',
    roomId: 4,
    timestamp: '',
    type: ChatEntryType.TYPE_CHAT,
    ...partial
});

describe('ChatEntryPlainText', () => {
    it('reports what was said, not the HTML of the bubble', () => {
        expect(ChatEntryPlainText(entry({ message: RoomChatFormatter('perché'), text: 'perché' }))).toBe('perché');
    });

    it('decodes the HTML of an entry an older client saved without its text', () => {
        expect(ChatEntryPlainText(entry({ message: 'perch&#233; <span style="color:#f00">no</span>' }))).toBe('perché no');
    });

    it('leaves a messenger entry, already plain text, as it is', () => {
        expect(ChatEntryPlainText(entry({ type: ChatEntryType.TYPE_IM, message: 'a < b' }))).toBe('a < b');
    });

    it('is what the reports send and show', () => {
        expect(readFileSync('src/components/help/views/ReportSummaryView.tsx', 'utf8')).not.toContain('chats.push(entry.webId, entry.message)');
        expect(readFileSync('src/components/help/views/SelectReportedChatsView.tsx', 'utf8')).toContain('ChatEntryPlainText(chat)');
        expect(readFileSync('src/hooks/rooms/widgets/useChatWidget.ts', 'utf8')).toContain('text: originalText,');
    });
});
