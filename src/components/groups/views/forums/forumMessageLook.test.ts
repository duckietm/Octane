import { describe, expect, it } from 'vitest';
import { forumMessageBlocks, forumMessageLook, newForumMessageIds } from './forumMessageLook';

describe('forumMessageLook', () => {
    it('draws a read visible message white', () => {
        expect(forumMessageLook(1, false, true, false)).toMatchObject({
            textColor: 0xffffff,
            panelColor: 0xc6eff9,
            isModerationMessage: false,
            hideAction: 'hide'
        });
    });

    it('draws a hidden message grey with the notice for readers', () => {
        expect(forumMessageLook(10, false, false, false)).toMatchObject({
            textColor: 0xe9e9e0,
            panelColor: 0xd7d7cf,
            isModerationMessage: true,
            hideAction: null
        });
        expect(forumMessageLook(10, false, true, false)).toMatchObject({ isModerationMessage: false, hideAction: 'unhide' });
    });

    it('keeps a staff-deleted message closed for moderators who are not staff', () => {
        expect(forumMessageLook(20, false, true, false)).toMatchObject({ isModerationMessage: true, hideAction: null });
        expect(forumMessageLook(20, false, true, true)).toMatchObject({ isModerationMessage: false, hideAction: 'unhide' });
    });

    it('draws a new message cream with its own text and the hide button, whatever its state', () => {
        for (const state of [0, 1, 10, 20])
            expect(forumMessageLook(state, true, true, false)).toMatchObject({
                state: -1,
                textColor: 0xfff9d9,
                panelColor: 0xc6eff9,
                isModerationMessage: false,
                hideAction: 'hide'
            });

        expect(forumMessageLook(10, true, false, false)).toMatchObject({ isModerationMessage: false, hideAction: null });
    });
});

describe('newForumMessageIds', () => {
    it('takes the messages after the last one read', () => {
        const messages = [
            { messageId: 7, messageIndex: 20 },
            { messageId: 8, messageIndex: 21 },
            { messageId: 9, messageIndex: 22 }
        ];

        expect([...newForumMessageIds(messages, 20)]).toEqual([8, 9]);
        expect([...newForumMessageIds(messages, 22)]).toEqual([]);
        expect([...newForumMessageIds(messages, -1)]).toEqual([7, 8, 9]);
    });
});

describe('forumMessageBlocks', () => {
    it('keeps the lines in their order and sets runs of quoted lines apart, without their marker or the blank lines around them', () => {
        expect(forumMessageBlocks('2 hours ago Alba wrote:\r> first\r>\r>second\r>\r\rMy answer\rsecond line\r')).toEqual([
            { quote: false, lines: ['2 hours ago Alba wrote:'] },
            { quote: true, lines: ['first', '', 'second'] },
            { quote: false, lines: ['My answer', 'second line'] }
        ]);
    });

    it('reads every kind of line break and treats nothing else as markup', () => {
        expect(forumMessageBlocks('a\nb\r\nc <b>bold</b> 1 > 0')).toEqual([{ quote: false, lines: ['a', 'b', 'c <b>bold</b> 1 > 0'] }]);
        expect(forumMessageBlocks('')).toEqual([]);
        expect(forumMessageBlocks('\n \n')).toEqual([]);
    });
});
