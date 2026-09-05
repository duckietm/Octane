import { MarkMessengerReadComposer, RequestMessengerHistoryComposer, SendMessengerMessageComposer } from '@octane/renderer';
import { MessengerMessage, MessengerState, selectMessageByClientId, selectMessages } from '../../../api';
import { MessengerAction } from '../../../api/friends/messenger/messengerReducer';

type Dispatch = (action: MessengerAction) => void;
type Send = (composer: object) => void;

export const createMessengerHistoryController = (
    getState: () => MessengerState,
    dispatch: Dispatch,
    send: Send,
    makeRequest: (conversationId: number, beforeMessageId: number, limit: number) => object = (conversationId, beforeMessageId, limit) => new RequestMessengerHistoryComposer(conversationId, beforeMessageId, limit)
) => ({
    loadInitial(conversationId: number)
    {
        if(conversationId <= 0) return;
        const history = getState().historyByConversation[conversationId];
        if(history?.loading || history?.loaded) return;
        dispatch({ type: 'historyLoading', conversationId });
        send(makeRequest(conversationId, 0, 500));
    },
    loadOlder(conversationId: number)
    {
        const state = getState();
        const history = state.historyByConversation[conversationId];
        if(history?.loading || history?.hasMore === false) return;
        const beforeMessageId = selectMessages(state, conversationId).find(message => message.id > 0)?.id || 0;
        dispatch({ type: 'historyLoading', conversationId });
        send(makeRequest(conversationId, beforeMessageId, 30));
    }
});

export const createMessengerActionsController = (
    getState: () => MessengerState,
    dispatch: Dispatch,
    send: Send,
    getOwnUserId: () => number,
    initialConfirmationId: number = 1,
    makeSend: (conversationId: number, recipientId: number, confirmationId: number, type: number, text: string, metadata: string) => object = (conversationId, recipientId, confirmationId, type, text, metadata) => new SendMessengerMessageComposer(conversationId, recipientId, confirmationId, type, text, metadata),
    makeRead: (conversationId: number, messageId: number) => object = (conversationId, messageId) => new MarkMessengerReadComposer(conversationId, messageId),
    scheduleTimeout: (callback: () => void, delay: number) => unknown = (callback, delay) => globalThis.setTimeout(callback, delay)
) =>
{
    let nextConfirmationId = initialConfirmationId;

    const sendMessage = (conversationId: number, recipientId: number, text: string, type: number = 0, metadata: string = '') =>
    {
        const confirmationId = nextConfirmationId++;
        const clientId = `c-${ confirmationId }`;
        const message: MessengerMessage = { id: 0, clientId, conversationId, senderId: getOwnUserId(), type, message: text, metadata, createdAt: Math.floor(Date.now() / 1000), status: 'sending' };
        dispatch({ type: 'messageOptimistic', message });
        send(makeSend(conversationId, recipientId, confirmationId, type, text, metadata));
        scheduleTimeout(() =>
        {
            if(selectMessageByClientId(getState(), clientId)?.status === 'sending') dispatch({ type: 'messageFailed', clientId, errorCode: 7 });
        }, 10_000);
        return { clientId, confirmationId };
    };

    return {
        openDirectConversation(participantId: number, name: string)
        {
            dispatch({ type: 'directConversationOpened', participantId, name });
        },
        sendMessage,
        retryMessage(clientId: string)
        {
            const failed = selectMessageByClientId(getState(), clientId);
            if(!failed || failed.status !== 'failed') return null;
            const recipientId = getState().conversationsById[failed.conversationId]?.participantId || 0;
            return sendMessage(failed.conversationId, recipientId, failed.message, failed.type, failed.metadata);
        },
        markRead(conversationId: number, messageId: number)
        {
            send(makeRead(conversationId, messageId));
        }
    };
};
