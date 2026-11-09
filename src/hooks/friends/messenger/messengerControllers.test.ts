/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { initialMessengerState, MessengerState, messengerReducer } from '../../../api';
import { createMessengerActionsController, createMessengerHistoryController } from '.';

describe('messenger controllers', () =>
{
    it('does not request the same history cursor twice while loading', () =>
    {
        let state: MessengerState = { ...initialMessengerState, historyByConversation: { 7: { loading: false, loaded: true, hasMore: true, error: false } } };
        const send = vi.fn();
        const dispatch = (action: any) => { state = messengerReducer(state, action); };
        const controller = createMessengerHistoryController(() => state, dispatch, send, (conversationId, beforeMessageId, limit) => ({ conversationId, beforeMessageId, limit }));

        controller.loadOlder(7);
        controller.loadOlder(7);

        expect(send).toHaveBeenCalledTimes(1);
    });

    it('does not request server history for a direct draft', () =>
    {
        const send = vi.fn();
        const controller = createMessengerHistoryController(() => initialMessengerState, vi.fn(), send, () => ({}));

        controller.loadInitial(-12);

        expect(send).not.toHaveBeenCalled();
    });

    it('retries a failed message with a new confirmation id', () =>
    {
        let state = initialMessengerState;
        const dispatch = (action: any) => { state = messengerReducer(state, action); };
        const send = vi.fn();
        const actions = createMessengerActionsController(() => state, dispatch, send, () => 1, 100, (conversationId, recipientId, confirmationId, type, text, metadata) => ({ conversationId, recipientId, confirmationId, type, text, metadata }));

        const first = actions.sendMessage(7, 0, 'hello');
        dispatch({ type: 'messageFailed', clientId: first.clientId, errorCode: 6 });
        const retried = actions.retryMessage(first.clientId);

        expect(retried.confirmationId).not.toBe(first.confirmationId);
        expect(send).toHaveBeenCalledTimes(2);
    });

    it('keeps the recipient when retrying a direct draft', () =>
    {
        let state = initialMessengerState;
        const dispatch = (action: any) => { state = messengerReducer(state, action); };
        const send = vi.fn();
        const actions = createMessengerActionsController(() => state, dispatch, send, () => 1, 1, (conversationId, recipientId) => ({ conversationId, recipientId }));
        actions.openDirectConversation(9, 'Frank');
        const first = actions.sendMessage(-9, 9, 'hello');
        dispatch({ type: 'messageFailed', clientId: first.clientId, errorCode: 7 });

        actions.retryMessage(first.clientId);

        expect(send).toHaveBeenLastCalledWith({ conversationId: -9, recipientId: 9 });
    });

    it('marks an unacknowledged message as failed after ten seconds', () =>
    {
        let state = initialMessengerState;
        const dispatch = (action: any) => { state = messengerReducer(state, action); };
        let timeout: () => void = () => undefined;
        const actions = createMessengerActionsController(() => state, dispatch, vi.fn(), () => 1, 1, () => ({}), undefined, callback => { timeout = callback; });

        const sent = actions.sendMessage(7, 0, 'hello');
        timeout();

        expect(state.messagesByKey[`client:${ sent.clientId }`]?.status).toBe('failed');
    });

    it('selects a persistent direct conversation from a friend-list click', () =>
    {
        let state = initialMessengerState;
        const dispatch = (action: any) => { state = messengerReducer(state, action); };
        const actions = createMessengerActionsController(() => state, dispatch, vi.fn(), () => 1);

        actions.openDirectConversation(12, 'Duckie');

        expect(state.selectedConversationId).toBe(-12);
        expect(state.conversationsById[-12]).toMatchObject({ participantId: 12, name: 'Duckie' });
    });
});
