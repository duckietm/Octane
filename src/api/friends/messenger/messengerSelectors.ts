import { MessengerIconState } from '../MessengerIconState';
import { MessengerState } from './messengerReducer';

export const selectMessages = (state: MessengerState, conversationId: number) =>
    (state.messageKeysByConversation[conversationId] || []).map(key => state.messagesByKey[key]).filter(Boolean);

export const selectMessageByClientId = (state: MessengerState, clientId: string) =>
    Object.values(state.messagesByKey).find(message => message.clientId === clientId) || null;

export const selectConversations = (state: MessengerState) => state.conversationIds.map(id => state.conversationsById[id]).filter(Boolean);

export const selectMessengerIconState = (state: MessengerState, hasLegacyThreads: boolean, hasLegacyUnread: boolean) =>
{
    const conversations = selectConversations(state);
    if(hasLegacyUnread || conversations.some(conversation => conversation.unreadCount > 0)) return MessengerIconState.UNREAD;
    if(hasLegacyThreads || conversations.length > 0) return MessengerIconState.SHOW;
    return MessengerIconState.HIDDEN;
};
