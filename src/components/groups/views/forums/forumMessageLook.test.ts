import { describe, expect, it } from 'vitest';
import { forumMessageLook, newForumMessageIds } from './forumMessageLook';

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
