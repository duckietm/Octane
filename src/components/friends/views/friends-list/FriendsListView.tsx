import { Collapsible } from '@base-ui/react/collapsible';
import {
    AddLinkEventTracker,
    HabboSearchResultData,
    HabboSearchResultEvent,
    ILinkEventTracker,
    RemoveFriendComposer,
    RemoveLinkEventTracker,
    SendRoomInviteComposer
} from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetConfigurationValue, GetUserProfile, LocalizeText, MessengerFriend, MessengerRequest, SendMessageComposer } from '../../../../api';
import { DraggableWindow, DraggableWindowPosition } from '../../../../common';
import { useFriends, useMessageEvent, useNotification } from '../../../../hooks';
import './FriendsListView.css';
import { FriendsRemoveConfirmationView } from './FriendsListRemoveConfirmationView';
import { FriendsRoomInviteView } from './FriendsListRoomInviteView';
import { FriendsSearchView } from './FriendsListSearchView';
import { FriendsListGroupView } from './friends-list-group/FriendsListGroupView';
import { clearAnsweredFriendRequestRows, FriendRequestRow, markFriendRequestRows, mergeFriendRequestRows } from './friends-list-request/friendRequestRows';
import { FriendsListRequestView } from './friends-list-request/FriendsListRequestView';
import { BaseButton } from '../../../../common/BaseButton';
import { Hint } from '../../../../common/Tooltip';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

/** AIR HabboFriendList: a room invite can be sent once a minute. */
const ROOM_INVITE_INTERVAL_MS = 60000;
/** AcceptFriendRequestEvent takes at most this many ids, see useFriends. */
const MAXIMUM_BULK_REQUEST_RESPONSES = 100;
/** AIR FriendsView: "select all" shows from this many friends. */
const SELECT_ALL_MINIMUM = 5;

export const FriendsListView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [selectedFriendsIds, setSelectedFriendsIds] = useState<number[]>([]);
    const [showRoomInvite, setShowRoomInvite] = useState<boolean>(false);
    const [showRemoveFriendsConfirmation, setShowRemoveFriendsConfirmation] = useState<boolean>(false);
    const [activePanel, setActivePanel] = useState<'friends' | 'requests' | 'search' | null>('friends');
    const [isFriendSearchOpen, setIsFriendSearchOpen] = useState(false);
    const [friendSearchValue, setFriendSearchValue] = useState('');
    const [isOnlineExpanded, setIsOnlineExpanded] = useState<boolean>(true);
    const [isOfflineExpanded, setIsOfflineExpanded] = useState<boolean>(false);
    const [requestRows, setRequestRows] = useState<FriendRequestRow[]>([]);
    const [searchFriendResults, setSearchFriendResults] = useState<HabboSearchResultData[]>(null);
    const [searchOtherResults, setSearchOtherResults] = useState<HabboSearchResultData[]>(null);
    const lastRoomInviteRef = useRef(-ROOM_INVITE_INTERVAL_MS);
    const offlineOpenStateSetRef = useRef(false);
    const {
        onlineFriends = [],
        offlineFriends = [],
        requests = [],
        requestFriend = null,
        requestResponse = null,
        requestResponseAll = null,
        isFriendListFull = null,
        showFriendListFullAlert = null
    } = useFriends();
    const { simpleAlert = null } = useNotification();

    const friendSearch = friendSearchValue.trim().toLocaleLowerCase();
    const matchesFriendSearch = (friend: MessengerFriend) => !friendSearch || friend.name.toLocaleLowerCase().includes(friendSearch);
    const filteredOnlineFriends = onlineFriends.filter(matchesFriendSearch);
    const filteredOfflineFriends = offlineFriends.filter(matchesFriendSearch);
    const showSelectAll =
        isOnlineExpanded && filteredOnlineFriends.length >= SELECT_ALL_MINIMUM && GetConfigurationValue<boolean>('friend_list.select_all.enabled', true) !== false;
    // AIR row order: the friends header (row 0), its friends when open, the offline header, its friends when open.
    const offlineHeaderRow = 1 + (isOnlineExpanded ? filteredOnlineFriends.length : 0);
    const searchResultCount = searchFriendResults ? searchFriendResults.length + (searchOtherResults?.length ?? 0) : 0;

    useMessageEvent<HabboSearchResultEvent>(HabboSearchResultEvent, (event) => {
        const parser = event.getParser();

        setSearchFriendResults(parser.friends);
        setSearchOtherResults(parser.others);
    });

    useEffect(() => setRequestRows((rows) => mergeFriendRequestRows(rows, requests)), [requests]);

    // AIR onFriendListFragment: once the list is in, the offline section opens only when nobody is online.
    useEffect(() => {
        if (offlineOpenStateSetRef.current || !(onlineFriends.length + offlineFriends.length)) return;

        offlineOpenStateSetRef.current = true;
        setIsOfflineExpanded(!onlineFriends.length);
    }, [onlineFriends.length, offlineFriends.length]);

    const removeFriendsText = useMemo(() => {
        if (!selectedFriendsIds || !selectedFriendsIds.length) return '';

        const userNames: string[] = [];

        for (const userId of selectedFriendsIds) {
            let existingFriend: MessengerFriend = onlineFriends.find((f) => f.id === userId);

            if (!existingFriend) existingFriend = offlineFriends.find((f) => f.id === userId);

            if (!existingFriend) continue;

            userNames.push(existingFriend.name);
        }

        return LocalizeText('friendlist.removefriendconfirm.userlist', ['user_names'], [userNames.join(', ')]);
    }, [offlineFriends, onlineFriends, selectedFriendsIds]);

    const selectFriend = useCallback(
        (userId: number) => {
            if (userId < 0) return;

            setSelectedFriendsIds((prevValue) => {
                const newValue = [...prevValue];

                const existingUserIdIndex: number = newValue.indexOf(userId);

                if (existingUserIdIndex > -1) {
                    newValue.splice(existingUserIdIndex, 1);
                } else {
                    newValue.push(userId);
                }

                return newValue;
            });
        },
        [setSelectedFriendsIds]
    );

    const toggleSelectFriends = useCallback((friendIds: number[]) => {
        if (!friendIds.length) return;

        setSelectedFriendsIds((prevValue) => {
            const allSelected = friendIds.every((friendId) => prevValue.indexOf(friendId) >= 0);

            if (allSelected) return prevValue.filter((friendId) => friendIds.indexOf(friendId) === -1);

            const nextValue = [...prevValue];

            for (const friendId of friendIds) {
                if (nextValue.indexOf(friendId) === -1) nextValue.push(friendId);
            }

            return nextValue;
        });
    }, []);

    const sendRoomInvite = (message: string) => {
        if (!selectedFriendsIds.length || !message || !message.length || message.length > 255) return;

        SendMessageComposer(new SendRoomInviteComposer(message, selectedFriendsIds));

        lastRoomInviteRef.current = Date.now();
        setShowRoomInvite(false);
    };

    // AIR FriendsView.onInviteButtonClick: one invite a minute.
    const openRoomInvite = () => {
        if (!selectedFriendsIds.length) return;

        if (Date.now() - lastRoomInviteRef.current < ROOM_INVITE_INTERVAL_MS) {
            simpleAlert?.(LocalizeText('friendlist.invite.frequentalert.text'), null, null, null, LocalizeText('friendlist.invite.frequentalert.title'));
            return;
        }

        setShowRoomInvite(true);
    };

    // AIR FriendsView.onHomeButtonClick: the home page of the one selected friend.
    const openSelectedFriendHome = () => {
        if (selectedFriendsIds.length !== 1) return;

        GetUserProfile(selectedFriendsIds[0]);
    };

    const closeFriendSearch = () => {
        setFriendSearchValue('');
        setIsFriendSearchOpen(false);
    };

    // AIR FriendRequestsView.acceptRequest / acceptAllRequests: refused when the friend list would be over its limit.
    const acceptRequest = (request: MessengerRequest) => {
        if (isFriendListFull?.()) {
            showFriendListFullAlert?.();
            return;
        }

        requestResponse(request.id, true);
        setRequestRows((rows) => markFriendRequestRows(rows, [request.id], 'accepted'));
    };

    const declineRequest = (request: MessengerRequest) => {
        requestResponse(request.id, false);
        setRequestRows((rows) => markFriendRequestRows(rows, [request.id], 'declined'));
    };

    const respondToAllRequests = (accept: boolean) => {
        if (accept && isFriendListFull?.(requests.length)) {
            showFriendListFullAlert?.();
            return;
        }

        const answered = (accept ? requests.slice(0, MAXIMUM_BULK_REQUEST_RESPONSES) : requests).map((request) => request.id);

        requestResponseAll(accept);
        setRequestRows((rows) => markFriendRequestRows(rows, answered, accept ? 'accepted' : 'declined'));
    };

    const toggleRequestsPanel = () => {
        setRequestRows(clearAnsweredFriendRequestRows);
        setActivePanel((value) => (value === 'requests' ? null : 'requests'));
    };

    const removeSelectedFriends = () => {
        if (selectedFriendsIds.length === 0) return;

        SendMessageComposer(new RemoveFriendComposer(...selectedFriendsIds));
        setSelectedFriendsIds([]);

        setShowRemoveFriendsConfirmation(false);
    };

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => !prevValue);
                        return;
                    case 'request':
                        if (parts.length < 4) return;

                        requestFriend(parseInt(parts[2]), parts[3]);
                }
            },
            eventUrlPrefix: 'friends/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [requestFriend]);

    if (!isVisible) return null;

    return (
        <NativeTextTree>
            <>
                <DraggableWindow
                    uniqueKey="octane-friends"
                    handleSelector=".hfl-titlebar"
                    windowPosition={DraggableWindowPosition.TOP_LEFT}
                    offsetLeft={110}
                    offsetTop={50}
                >
                    <div
                        className={`habbo-friend-list${requests.length || activePanel === 'requests' ? ' has-requests' : ''}${activePanel === 'search' ? ' search-mode' : ''}${activePanel === 'requests' ? ' requests-mode' : ''}${activePanel === null ? ' collapsed-mode' : ''}`}
                    >
                        <div className="hfl-titlebar drag-handler">
                            <span className="hfl-titlebar-grip" />
                            <span className="hfl-title">{LocalizeText('friendlist.friends')}</span>
                            <BaseButton type="button" className="hfl-close" onClick={() => setIsVisible(false)} />
                        </div>
                        <div className="hfl-category">
                            <BaseButton
                                type="button"
                                className="hfl-category-current"
                                aria-expanded={activePanel === 'friends'}
                                onClick={() => setActivePanel((value) => (value === 'friends' ? null : 'friends'))}
                            >
                                {`${LocalizeText('friendlist.friends')} (${onlineFriends.length})`}
                            </BaseButton>
                        </div>
                        {activePanel !== null && (
                            <div className="hfl-content">
                                {activePanel === 'search' && <FriendsSearchView friendResults={searchFriendResults} otherResults={searchOtherResults} />}
                                {activePanel === 'requests' && (
                                    <>
                                        <FriendsListRequestView rows={requestRows} onAccept={acceptRequest} onDecline={declineRequest} />
                                        <div className="hfl-request-footer" data-testid="requests-footer">
                                            <BaseButton type="button" data-action="accept-all" disabled={!requests.length} onClick={() => respondToAllRequests(true)}>
                                                <span className="hfl-request-footer-icon accept" />
                                                {LocalizeText('friendlist.requests.acceptall')}
                                            </BaseButton>
                                            <BaseButton type="button" data-action="dismiss-all" disabled={!requests.length} onClick={() => respondToAllRequests(false)}>
                                                <span className="hfl-request-footer-icon decline" />
                                                {LocalizeText('friendlist.requests.dismissall')}
                                            </BaseButton>
                                        </div>
                                    </>
                                )}
                                {activePanel === 'friends' && (
                                    <>
                                        <Collapsible.Root render={<section />} className="hfl-section" open={isOnlineExpanded} onOpenChange={setIsOnlineExpanded}>
                                            <Collapsible.Trigger className={`hfl-section-header${isOnlineExpanded ? '' : ' collapsed'}`}>
                                                <span>{LocalizeText('friendlist.friends') + ` (${filteredOnlineFriends.length})`}</span>
                                                {showSelectAll && (
                                                    <span
                                                        className="hfl-select-all"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            toggleSelectFriends(filteredOnlineFriends.map((friend) => friend.id));
                                                        }}
                                                    >
                                                        {filteredOnlineFriends.every((friend) => selectedFriendsIds.indexOf(friend.id) >= 0)
                                                            ? LocalizeText('friendlist.unselect_all')
                                                            : LocalizeText('friendlist.select_all')}
                                                    </span>
                                                )}
                                            </Collapsible.Trigger>
                                            <Collapsible.Panel className="hfl-list">
                                                <FriendsListGroupView
                                                    list={filteredOnlineFriends}
                                                    selectedFriendsIds={selectedFriendsIds}
                                                    selectFriend={selectFriend}
                                                    firstRowIndex={1}
                                                />
                                            </Collapsible.Panel>
                                        </Collapsible.Root>
                                        <Collapsible.Root render={<section />} className="hfl-section" open={isOfflineExpanded} onOpenChange={setIsOfflineExpanded}>
                                            <Collapsible.Trigger
                                                className={`hfl-section-header${offlineHeaderRow % 2 === 1 ? ' hfl-row-odd' : ''}${isOfflineExpanded ? '' : ' collapsed'}`}
                                            >
                                                <span>{LocalizeText('friendlist.friends.offlinecaption') + ` (${filteredOfflineFriends.length})`}</span>
                                            </Collapsible.Trigger>
                                            <Collapsible.Panel className="hfl-list">
                                                <FriendsListGroupView
                                                    list={filteredOfflineFriends}
                                                    selectedFriendsIds={selectedFriendsIds}
                                                    selectFriend={selectFriend}
                                                    firstRowIndex={offlineHeaderRow + 1}
                                                />
                                            </Collapsible.Panel>
                                        </Collapsible.Root>
                                    </>
                                )}
                            </div>
                        )}
                        {activePanel === 'friends' && (
                            <div className="hfl-footer" data-testid="friends-footer">
                                <div className="hfl-footer-border">
                                    <Hint content={LocalizeText('friendlist.tip.invite')}>
                                        <BaseButton aria-label={LocalizeText('friendlist.tip.invite')}
                                            type="button"
                                            className="hfl-footer-button invite"
                                            disabled={!selectedFriendsIds.length}
                                            onClick={openRoomInvite}
                                        />
                                    </Hint>
                                    <Hint content={LocalizeText('friendlist.tip.home')}>
                                        <BaseButton aria-label={LocalizeText('friendlist.tip.home')}
                                            type="button"
                                            className="hfl-footer-button home"
                                            disabled={selectedFriendsIds.length !== 1}
                                            onClick={openSelectedFriendHome}
                                        />
                                    </Hint>
                                    {isFriendSearchOpen ? (
                                        <div className="hfl-footer-search">
                                            <input
                                                autoFocus
                                                value={friendSearchValue}
                                                onChange={(event) => setFriendSearchValue(event.target.value)}
                                                onKeyDown={(event) => event.key === 'Escape' && closeFriendSearch()}
                                            />
                                            <Hint content={LocalizeText('generic.clear')}>
                                                <BaseButton aria-label={LocalizeText('generic.clear')} type="button" onClick={closeFriendSearch} />
                                            </Hint>
                                        </div>
                                    ) : (
                                        <Hint content={LocalizeText('friendlist.tip.search')}>
                                            <BaseButton aria-label={LocalizeText('friendlist.tip.search')}
                                                type="button"
                                                className="hfl-footer-button search"
                                                onClick={() => setIsFriendSearchOpen(true)}
                                            />
                                        </Hint>
                                    )}
                                    <Hint content={LocalizeText('friendlist.tip.remove')}><BaseButton aria-label={LocalizeText('friendlist.tip.remove')}
                                        type="button"
                                        className="hfl-footer-button delete"
                                        disabled={!selectedFriendsIds.length}
                                        onClick={() => selectedFriendsIds.length && setShowRemoveFriendsConfirmation(true)}
                                    /></Hint>
                                </div>
                            </div>
                        )}
                        {(!!requests.length || activePanel === 'requests') && (
                            <BaseButton type="button" className="hfl-request-strip" onClick={toggleRequestsPanel}>
                                {`${LocalizeText('friendlist.tab.friendrequests')} (${requests.length})`}
                            </BaseButton>
                        )}
                        <BaseButton type="button" className="hfl-search-strip" onClick={() => setActivePanel((value) => (value === 'search' ? null : 'search'))}>
                            {`${LocalizeText('generic.search')} (${searchResultCount})`}
                        </BaseButton>
                        <div className="hfl-bottom" />
                    </div>
                </DraggableWindow>
                {showRoomInvite && (
                    <FriendsRoomInviteView selectedFriendsIds={selectedFriendsIds} sendRoomInvite={sendRoomInvite} onCloseClick={() => setShowRoomInvite(false)} />
                )}
                {showRemoveFriendsConfirmation && (
                    <FriendsRemoveConfirmationView
                        removeFriendsText={removeFriendsText}
                        removeSelectedFriends={removeSelectedFriends}
                        selectedFriendsIds={selectedFriendsIds}
                        onCloseClick={() => setShowRemoveFriendsConfirmation(false)}
                    />
                )}
            </>
        </NativeTextTree>
    );
};
