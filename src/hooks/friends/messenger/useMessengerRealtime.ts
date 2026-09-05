import {
    GetSessionDataManager,
    MessengerConversationsEvent,
    MessengerHistoryEvent,
    MessengerMessageAckEvent,
    MessengerMessageEvent,
    MessengerMessageFailedEvent,
    MessengerReadCursorEvent,
    RequestMessengerConversationsComposer
} from '@octane/renderer';
import { useEffect } from 'react';
import { MessengerMessage, SendMessageComposer as SendPacket } from '../../../api';
import { useMessageEvent } from '../../events';
import { useMessengerStore } from './useMessengerStore';

export const useMessengerRealtime = () => {
    const { state, dispatch } = useMessengerStore();

    useEffect(() => {
        SendPacket(new RequestMessengerConversationsComposer());
    }, []);
    useMessageEvent<MessengerConversationsEvent>(MessengerConversationsEvent, (event) =>
        dispatch({ type: 'summariesLoaded', conversations: event.getParser().conversations })
    );
    useMessageEvent<MessengerHistoryEvent>(MessengerHistoryEvent, (event) => {
        const parser = event.getParser();
        const messages = parser.messages.map((message) => ({ ...message, clientId: null, status: 'sent' as const }) satisfies MessengerMessage);
        dispatch({ type: 'historyLoaded', conversationId: parser.conversationId, messages, hasMore: parser.hasMore });
    });
    useMessageEvent<MessengerMessageAckEvent>(MessengerMessageAckEvent, (event) => {
        const parser = event.getParser();
        dispatch({
            type: 'messageAcknowledged',
            clientId: `c-${parser.confirmationId}`,
            messageId: parser.messageId,
            conversationId: parser.conversationId,
            createdAt: parser.createdAt
        });
    });
    useMessageEvent<MessengerMessageFailedEvent>(MessengerMessageFailedEvent, (event) => {
        const parser = event.getParser();
        dispatch({ type: 'messageFailed', clientId: `c-${parser.confirmationId}`, errorCode: parser.errorCode });
    });
    useMessageEvent<MessengerMessageEvent>(MessengerMessageEvent, (event) => {
        dispatch({ type: 'messageReceived', message: { ...event.getParser().message, clientId: null, status: 'sent' } });
        SendPacket(new RequestMessengerConversationsComposer());
    });
    useMessageEvent<MessengerReadCursorEvent>(MessengerReadCursorEvent, (event) => {
        const parser = event.getParser();
        dispatch({
            type: 'readCursorAdvanced',
            conversationId: parser.conversationId,
            readerId: parser.readerId,
            messageId: parser.messageId,
            ownUserId: GetSessionDataManager().userId
        });
    });

    return state;
};
