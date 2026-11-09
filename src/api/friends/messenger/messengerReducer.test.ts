import { describe, expect, it } from 'vitest';
import { MessengerIconState } from '../MessengerIconState';
import { initialMessengerState, messengerReducer, selectMessageByClientId, selectMessages, selectMessengerIconState } from '.';

describe('messengerReducer', () =>
{
    it('deduplicates a realtime message already present in history', () =>
    {
        const message = { id: 41, clientId: null, conversationId: 7, senderId: 9, type: 0, message: 'hi', metadata: '', createdAt: 100, status: 'sent' as const };
        const once = messengerReducer(initialMessengerState, { type: 'historyLoaded', conversationId: 7, messages: [ message ], hasMore: false });
        const twice = messengerReducer(once, { type: 'messageReceived', message });

        expect(selectMessages(twice, 7).map(item => item.id)).toEqual([ 41 ]);
    });

    it('replaces optimistic identity on acknowledgement', () =>
    {
        const optimistic = { id: 0, clientId: 'c-9', conversationId: 7, senderId: 1, type: 0, message: 'hello', metadata: '', createdAt: 100, status: 'sending' as const };
        const pending = messengerReducer(initialMessengerState, { type: 'messageOptimistic', message: optimistic });
        const acknowledged = messengerReducer(pending, { type: 'messageAcknowledged', clientId: 'c-9', messageId: 88, conversationId: 7, createdAt: 123456 });

        expect(selectMessageByClientId(acknowledged, 'c-9')).toMatchObject({ id: 88, status: 'sent', createdAt: 123456 });
        expect(selectMessages(acknowledged, 7)).toHaveLength(1);
    });

    it('keeps a failed optimistic message available for retry', () =>
    {
        const optimistic = { id: 0, clientId: 'c-10', conversationId: 7, senderId: 1, type: 0, message: 'hello', metadata: '', createdAt: 100, status: 'sending' as const };
        const pending = messengerReducer(initialMessengerState, { type: 'messageOptimistic', message: optimistic });
        const failed = messengerReducer(pending, { type: 'messageFailed', clientId: 'c-10', errorCode: 6 });

        expect(selectMessageByClientId(failed, 'c-10')).toMatchObject({ status: 'failed', errorCode: 6 });
    });

    it('opens a direct draft and migrates it to the server conversation on acknowledgement', () =>
    {
        const opened = messengerReducer(initialMessengerState, { type: 'directConversationOpened', participantId: 9, name: 'Frank' });
        const draftId = -9;
        const optimistic = { id: 0, clientId: 'c-11', conversationId: draftId, senderId: 1, type: 0, message: 'hello', metadata: '', createdAt: 100, status: 'sending' as const };
        const pending = messengerReducer(opened, { type: 'messageOptimistic', message: optimistic });
        const acknowledged = messengerReducer(pending, { type: 'messageAcknowledged', clientId: 'c-11', messageId: 89, conversationId: 77, createdAt: 101 });

        expect(acknowledged.selectedConversationId).toBe(77);
        expect(acknowledged.conversationIds).toContain(77);
        expect(acknowledged.conversationsById[77]).toMatchObject({ participantId: 9, name: 'Frank' });
        expect(selectMessages(acknowledged, 77)).toHaveLength(1);
        expect(selectMessages(acknowledged, draftId)).toHaveLength(0);
    });

    it('marks the toolbar unread when a realtime message arrives and clears it when read', () =>
    {
        const conversation = { id: 7, type: 0, participantId: 9, name: 'Frank', lastMessageId: 0, unreadCount: 0, updatedAt: 100 };
        const loaded = messengerReducer(initialMessengerState, { type: 'summariesLoaded', conversations: [ conversation ] });
        const message = { id: 41, clientId: null, conversationId: 7, senderId: 9, type: 0, message: 'hi', metadata: '', createdAt: 101, status: 'sent' as const };
        const unread = messengerReducer(loaded, { type: 'messageReceived', message });

        expect(unread.conversationsById[7].unreadCount).toBe(1);
        expect(selectMessengerIconState(unread, false, false)).toBe(MessengerIconState.UNREAD);

        const read = messengerReducer(unread, { type: 'readCursorAdvanced', conversationId: 7, readerId: 1, messageId: 41, ownUserId: 1 });
        expect(read.conversationsById[7].unreadCount).toBe(0);
        expect(selectMessengerIconState(read, false, false)).toBe(MessengerIconState.SHOW);
    });

    it('preserves a loaded conversation and its history when a later summary refresh omits it', () =>
    {
        const conversation = { id: 7, type: 0, participantId: 9, name: 'Frank', lastMessageId: 41, unreadCount: 0, updatedAt: 100 };
        const message = { id: 41, clientId: null, conversationId: 7, senderId: 9, type: 0, message: 'history', metadata: '', createdAt: 100, status: 'sent' as const };
        const loaded = messengerReducer(initialMessengerState, { type: 'summariesLoaded', conversations: [ conversation ] });
        const withHistory = messengerReducer(loaded, { type: 'historyLoaded', conversationId: 7, messages: [ message ], hasMore: false });
        const refreshed = messengerReducer(withHistory, { type: 'summariesLoaded', conversations: [] });

        expect(refreshed.conversationIds).toEqual([ 7 ]);
        expect(refreshed.conversationsById[7]).toEqual(conversation);
        expect(selectMessages(refreshed, 7)).toEqual([ message ]);
        expect(refreshed.historyByConversation[7]).toMatchObject({ loaded: true, hasMore: false });
    });

    it('keeps only the newest Staff Chat summary when the server returns duplicate conversation ids', () =>
    {
        const older = { id: 20, type: 1, participantId: 0, name: 'Staff Chat', lastMessageId: 40, unreadCount: 0, updatedAt: 100 };
        const newer = { id: 21, type: 1, participantId: 0, name: ' staff chat ', lastMessageId: 41, unreadCount: 1, updatedAt: 110 };
        const refreshed = messengerReducer(initialMessengerState, { type: 'summariesLoaded', conversations: [ older, newer ] });

        expect(refreshed.conversationIds).toEqual([ 21 ]);
        expect(refreshed.conversationsById[21]).toEqual(newer);
    });

    it('selects the server Staff Chat instead of creating a direct draft', () =>
    {
        const staffChat = { id: 21, type: 1, participantId: 0, name: 'Staff Chat', lastMessageId: 41, unreadCount: 0, updatedAt: 110 };
        const loaded = messengerReducer(initialMessengerState, { type: 'summariesLoaded', conversations: [ staffChat ] });
        const opened = messengerReducer(loaded, { type: 'directConversationOpened', participantId: -1, name: 'Staff Chat' });

        expect(opened.selectedConversationId).toBe(21);
        expect(opened.conversationIds).toEqual([ 21 ]);
        expect(Object.values(opened.conversationsById)).toEqual([ staffChat ]);
    });
});
