import { FollowFriendMessageComposer, GetSessionDataManager } from '@octane/renderer';
import { FC, KeyboardEvent, UIEvent, useEffect, useMemo, useRef, useState } from 'react';
import { FaArrowLeft, FaCopy, FaExclamationTriangle, FaSearch, FaTimes, FaUsers } from 'react-icons/fa';
import { CopyToClipboard, GetUserProfile, LocalizeText, MessengerConversation, MessengerMessage, MessengerThread, ReportType, SendMessageComposer, selectConversations, selectMessages } from '../../../../api';
import { DraggableWindowPosition, LayoutAvatarImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useFriends, useHelp } from '../../../../hooks';
import { STAFF_CHAT_FIGURE } from '../../staffChatIdentity';
import { resolveAvatarFigure } from '../friends-list/resolveAvatarFigure';
import { MessengerMessageStatusView } from './MessengerMessageStatusView';
import { FriendsMessengerThreadView } from './messenger-thread/FriendsMessengerThreadView';
import { canFollowMessengerConversation, filterMessengerConversations, resolveConversationAfterClose, restoreConversationsWithNewMessages } from './persistentMessenger.helpers';

interface PersistentMessengerApi
{
    state: any;
    history: { loadInitial: (conversationId: number) => void; loadOlder: (conversationId: number) => void };
    actions: { openDirectConversation: (participantId: number, name: string) => void; sendMessage: (conversationId: number, recipientId: number, text: string) => any; retryMessage: (clientId: string) => any; markRead: (conversationId: number, messageId: number) => void };
}

interface FriendsPersistentMessengerViewProps
{
    messenger: PersistentMessengerApi;
    legacyStaffThread?: MessengerThread;
    onClose: () => void;
    onCloseStaff: () => void;
    onSendStaff: (text: string) => void;
}

export const FriendsPersistentMessengerView: FC<FriendsPersistentMessengerViewProps> = ({ messenger, legacyStaffThread = null, onClose, onCloseStaff, onSendStaff }) =>
{
    const conversations = useMemo(() => selectConversations(messenger.state), [ messenger.state.conversationIds, messenger.state.conversationsById ]);
    const [ activeId, setActiveId ] = useState(conversations[0]?.id || 0);
    const [ mode, setMode ] = useState<'conversation' | 'inbox'>('conversation');
    const [ query, setQuery ] = useState('');
    const [ text, setText ] = useState('');
    const [ staffActive, setStaffActive ] = useState(false);
    const [ hiddenConversationIds, setHiddenConversationIds ] = useState<number[]>([]);
    const previousConversationsRef = useRef(conversations);
    const { getFriend } = useFriends();
    const { report } = useHelp();
    const active = conversations.find(item => item.id === activeId) || conversations[0] || null;
    const messages = active ? selectMessages(messenger.state, active.id) : [];
    const filtered = useMemo(() => filterMessengerConversations(conversations, query), [ conversations, query ]);
    const visibleConversations = useMemo(() => conversations.filter(conversation => hiddenConversationIds.indexOf(conversation.id) === -1), [ conversations, hiddenConversationIds ]);

    useEffect(() => { if(active) messenger.history.loadInitial(active.id); }, [ active?.id ]);
    useEffect(() => setStaffActive(!!legacyStaffThread), [ legacyStaffThread ]);
    useEffect(() =>
    {
        if(!messenger.state.selectedConversationId) return;
        setHiddenConversationIds(current => current.filter(id => id !== messenger.state.selectedConversationId));
        setStaffActive(false);
        setActiveId(messenger.state.selectedConversationId);
        setMode('conversation');
    }, [ messenger.state.selectedConversationId ]);
    useEffect(() =>
    {
        setHiddenConversationIds(current => restoreConversationsWithNewMessages(current, previousConversationsRef.current, conversations));
        previousConversationsRef.current = conversations;
    }, [ conversations ]);
    useEffect(() =>
    {
        const last = messages.filter(message => message.id > 0).at(-1);
        if(active && last) messenger.actions.markRead(active.id, last.id);
    }, [ active?.id, messages.length ]);

    const selectConversation = (conversation: MessengerConversation) =>
    {
        setStaffActive(false);
        setHiddenConversationIds(current => current.filter(id => id !== conversation.id));
        setActiveId(conversation.id);
        setMode('conversation');
    };
    const closeConversation = () =>
    {
        if(!active) return;
        const nextHiddenIds = hiddenConversationIds.indexOf(active.id) === -1 ? [ ...hiddenConversationIds, active.id ] : hiddenConversationIds;
        const nextId = resolveConversationAfterClose(conversations, nextHiddenIds, active.id);
        setHiddenConversationIds(nextHiddenIds);
        setActiveId(nextId);
        setMode(nextId ? 'conversation' : 'inbox');
    };
    const send = () =>
    {
        const value = text.trim();
        if(staffActive)
        {
            if(!legacyStaffThread || !value) return;
            onSendStaff(value);
            setText('');
            return;
        }
        if(!active || !value) return;
        messenger.actions.sendMessage(active.id, active.participantId, value);
        setText('');
    };
    const keyDown = (event: KeyboardEvent<HTMLInputElement>) => { if(event.key === 'Enter') send(); };
    const scroll = (event: UIEvent<HTMLDivElement>) => { if(active && event.currentTarget.scrollTop < 48) messenger.history.loadOlder(active.id); };

    const avatar = (conversation: MessengerConversation, size: number, padding: number = 1) =>
    {
        if(conversation.type === 1) return <LayoutAvatarImageView figure={STAFF_CHAT_FIGURE} headOnly compactHead compactHeadSize={size} compactHeadPadding={padding} direction={3} />;
        const friend = conversation.participantId > 0 ? getFriend(conversation.participantId) : null;
        if(!friend) return null;
        return <LayoutAvatarImageView figure={resolveAvatarFigure(friend.figure, friend.gender)} headOnly compactHead compactHeadSize={size} compactHeadPadding={padding} direction={2} />;
    };

    return (
        <OctaneCardView className="messenger-card messenger-persistent" theme="primary-slim" uniqueKey="persistent-messenger" windowPosition={DraggableWindowPosition.TOP_CENTER} offsetTop={8} isResizable={false}>
            <OctaneCardHeaderView headerText={LocalizeText('messenger.window.title', [ 'OPEN_CHAT_COUNT' ], [ (conversations.length + (legacyStaffThread ? 1 : 0)).toString() ])} onCloseClick={onClose} />
            <OctaneCardContentView className="p-0" gap={0} overflow="hidden">
                <div className="messenger-card-body">
                    <div className="messenger-avatar-bar">
                        {legacyStaffThread && <button className={`messenger-avatar-tab ${ staffActive ? 'active' : '' } ${ legacyStaffThread.unread ? 'unread' : '' }`} onClick={() => { setStaffActive(true); setMode('conversation'); }} aria-label={legacyStaffThread.participant.name} aria-selected={staffActive}><LayoutAvatarImageView figure={STAFF_CHAT_FIGURE} headOnly compactHead compactHeadSize={36} compactHeadPadding={0} direction={3} /></button>}
                        {visibleConversations.slice(0, 7).map(conversation => (
                            <button key={conversation.id} className={`messenger-avatar-tab ${ active?.id === conversation.id ? 'active' : '' } ${ conversation.unreadCount ? 'unread' : '' }`} onClick={() => selectConversation(conversation)} aria-label={conversation.name} aria-selected={active?.id === conversation.id}>
                                {avatar(conversation, 36, 0)}
                                {conversation.unreadCount > 0 && <span className="messenger-unread-badge">{conversation.unreadCount}</span>}
                            </button>
                        ))}
                        <button className="messenger-all-button" onClick={() => { setStaffActive(false); setMode('inbox'); }}>{LocalizeText('generic.all')} {conversations.length + (legacyStaffThread ? 1 : 0)}</button>
                    </div>

                    {mode === 'inbox' && (
                        <div className="messenger-inbox" data-testid="messenger-inbox">
                            <label className="messenger-search"><FaSearch /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={LocalizeText('generic.search')} /></label>
                            <div className="messenger-inbox-list">
                                {filtered.map(conversation => <button key={conversation.id} className="messenger-inbox-row" onClick={() => selectConversation(conversation)}><span className="messenger-inbox-avatar">{avatar(conversation, 24) || <FaUsers />}</span><span><b>{conversation.name}</b><small>{conversation.unreadCount ? `${ conversation.unreadCount } ${ LocalizeText('notifications.messages') }` : LocalizeText('messenger.window.input.default', [ 'FRIEND_NAME' ], [ conversation.name ])}</small></span></button>)}
                            </div>
                        </div>
                    )}

                    {mode === 'conversation' && staffActive && legacyStaffThread && (
                        <div className="messenger-conversation" data-testid="messenger-staff-conversation">
                            <div className="messenger-thread-header"><span className="messenger-thread-name">{legacyStaffThread.participant.name}</span><div className="messenger-actions"><button className="messenger-btn close-conversation" onClick={onCloseStaff} title={LocalizeText('generic.close')} aria-label={LocalizeText('generic.close')}><FaTimes /></button></div></div>
                            <div className="chat-messages"><FriendsMessengerThreadView thread={legacyStaffThread} /></div>
                            <div className="messenger-input-row"><input maxLength={255} value={text} onChange={event => setText(event.target.value)} onKeyDown={keyDown} placeholder={LocalizeText('messenger.window.input.default', [ 'FRIEND_NAME' ], [ legacyStaffThread.participant.name ])} /><button className="messenger-btn send" onClick={send}>{LocalizeText('widgets.chatinput.say')}</button></div>
                        </div>
                    )}

                    {mode === 'conversation' && !staffActive && active && (
                        <div className="messenger-conversation" data-testid="messenger-conversation">
                            <div className="messenger-thread-header">
                                <button className="messenger-mobile-back" onClick={() => setMode('inbox')}><FaArrowLeft /></button>
                                <span className="messenger-thread-name">{active.name}</span>
                                <div className="messenger-actions">
                                    {canFollowMessengerConversation(active) && <button className="messenger-btn" onClick={() => SendMessageComposer(new FollowFriendMessageComposer(active.participantId))}>{LocalizeText('friendlist.follow')}</button>}
                                    {active.participantId > 0 && <button className="messenger-btn" onClick={() => GetUserProfile(active.participantId)}>{LocalizeText('extendedprofile.caption')}</button>}
                                    {active.participantId > 0 && <button className="messenger-btn danger" onClick={() => report(ReportType.IM, { reportedUserId: active.participantId })}><FaExclamationTriangle /></button>}
                                    <button className="messenger-btn close-conversation" onClick={closeConversation} title={LocalizeText('generic.close')} aria-label={LocalizeText('generic.close')}><FaTimes /></button>
                                </div>
                            </div>
                            <div className="chat-messages persistent-message-list" onScroll={scroll}>
                                {messenger.state.historyByConversation[active.id]?.loading && <div className="messenger-history-state">{LocalizeText('generic.loading')}</div>}
                                {messages.map((message: MessengerMessage) => {
                                    const own = message.senderId === GetSessionDataManager().userId;
                                    return <div key={message.id || message.clientId} className={`persistent-message ${ own ? 'own' : 'incoming' }`}><div className="persistent-message-bubble"><span>{message.message}</span><button title="Copy" onClick={() => void CopyToClipboard(message.message)}><FaCopy /></button></div><small className="persistent-message-meta"><span>{new Date(message.createdAt * 1000).toLocaleTimeString()}</span>{own && message.status !== 'failed' && message.status !== 'sending' && <MessengerMessageStatusView isRead={message.status === 'read'} />}{own && message.status === 'failed' && <span className="messenger-message-failed">!</span>}{own && message.status === 'sending' && <span className="messenger-message-sending">…</span>}</small>{message.status === 'failed' && message.clientId && <button className="messenger-retry" onClick={() => messenger.actions.retryMessage(message.clientId)}>Retry</button>}</div>;
                                })}
                            </div>
                            <div className="messenger-input-row"><input maxLength={255} value={text} onChange={event => setText(event.target.value)} onKeyDown={keyDown} placeholder={LocalizeText('messenger.window.input.default', [ 'FRIEND_NAME' ], [ active.name ])} /><button className="messenger-btn send" onClick={send}>{LocalizeText('widgets.chatinput.say')}</button></div>
                        </div>
                    )}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
