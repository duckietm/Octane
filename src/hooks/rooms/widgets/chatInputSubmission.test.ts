import { describe, expect, it } from 'vitest';
import { ChatMessageTypeEnum } from '../../../api/room/widgets/ChatMessageTypeEnum';
import { applyComposerMode, parseChatSubmission } from './chatInputSubmission';

const KEYWORDS = { whisper: ':whisper', shout: ':shout', speak: ':speak' };

describe('parseChatSubmission (the desktop chat field)', () => {
    it('sends a plain line as speech, or as a shout with Shift held', () => {
        expect(parseChatSubmission('hello there', KEYWORDS)).toEqual({ text: 'hello there', chatType: ChatMessageTypeEnum.CHAT_DEFAULT, recipientName: '', append: '', keyword: false });
        expect(parseChatSubmission('hello', KEYWORDS, true).chatType).toBe(ChatMessageTypeEnum.CHAT_SHOUT);
    });

    it('reads the whisper keyword and its recipient, and refills the field with both', () => {
        expect(parseChatSubmission(':whisper Bob see you', KEYWORDS)).toEqual({
            text: 'see you',
            chatType: ChatMessageTypeEnum.CHAT_WHISPER,
            recipientName: 'Bob',
            append: ':whisper Bob ',
            keyword: true
        });
    });

    it('reads the shout and speak keywords', () => {
        expect(parseChatSubmission(':shout hey', KEYWORDS)).toMatchObject({ text: 'hey', chatType: ChatMessageTypeEnum.CHAT_SHOUT, append: '', keyword: true });
        expect(parseChatSubmission(':speak hey', KEYWORDS, true)).toMatchObject({ text: 'hey', chatType: ChatMessageTypeEnum.CHAT_DEFAULT, keyword: true });
    });
});

describe('applyComposerMode (the phone composer)', () => {
    const plain = parseChatSubmission('hello', KEYWORDS);

    it('leaves a line as speech in say mode', () => {
        expect(applyComposerMode(plain, 'say', 'Bob')).toMatchObject({ text: 'hello', chatType: ChatMessageTypeEnum.CHAT_DEFAULT, recipientName: '' });
    });

    it('shouts in shout mode', () => {
        expect(applyComposerMode(plain, 'shout', '')).toMatchObject({ text: 'hello', chatType: ChatMessageTypeEnum.CHAT_SHOUT, recipientName: '' });
    });

    it('whispers to the chosen recipient in whisper mode', () => {
        expect(applyComposerMode(plain, 'whisper', 'Bob')).toMatchObject({ text: 'hello', chatType: ChatMessageTypeEnum.CHAT_WHISPER, recipientName: 'Bob' });
    });

    it('holds a whisper back while nobody is chosen', () => {
        expect(applyComposerMode(plain, 'whisper', '')).toBeNull();
    });

    it('lets a keyword typed in the line win over the mode, and never refills the field', () => {
        const typed = parseChatSubmission(':whisper Carol hi', KEYWORDS);

        expect(applyComposerMode(typed, 'shout', 'Bob')).toEqual({ text: 'hi', chatType: ChatMessageTypeEnum.CHAT_WHISPER, recipientName: 'Carol', append: '', keyword: true });
        expect(applyComposerMode(parseChatSubmission(':shout hi', KEYWORDS), 'whisper', '')).toMatchObject({ chatType: ChatMessageTypeEnum.CHAT_SHOUT, append: '' });
    });
});
