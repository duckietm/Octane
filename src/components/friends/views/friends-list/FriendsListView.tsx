import { Collapsible } from '@base-ui/react/collapsible';
import { AddLinkEventTracker, ILinkEventTracker, RemoveFriendComposer, RemoveLinkEventTracker, SendRoomInviteComposer } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { CreateLinkEvent, filterFriendsByCategory, LocalizeText, MessengerFriend, SendMessageComposer } from '../../../../api';
import { DraggableWindow, DraggableWindowPosition } from '../../../../common';
import { useFriends } from '../../../../hooks';
import './FriendsListView.css';
import { FriendsRemoveConfirmationView } from './FriendsListRemoveConfirmationView';
import { FriendsRoomInviteView } from './FriendsListRoomInviteView';
import { FriendsSearchView } from './FriendsListSearchView';
import { FriendsListGroupView } from './friends-list-group/FriendsListGroupView';
import { FriendsListRequestView } from './friends-list-request/FriendsListRequestView';
import { BaseButton } from '../../../../common/BaseButton';
import { Hint } from '../../../../common/Tooltip';

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
    const { onlineFriends = [], offlineFriends = [], requests = [], requestFriend = null, requestResponse = null } = useFriends();

    const friendSearch = friendSearchValue.trim().toLocaleLowerCase();
    const filteredOnlineFriends = filterFriendsByCategory(onlineFriends, 0).filter(
        (friend) => !friendSearch || friend.name.toLocaleLowerCase().includes(friendSearch)
    );
    const filteredOfflineFriends = filterFriendsByCategory(offlineFriends, 0).filter(
        (friend) => !friendSearch || friend.name.toLocaleLowerCase().includes(friendSearch)
    );

    const removeFriendsText = useMemo(() => {
        if (!selectedFriendsIds || !selectedFriendsIds.length) return '';

        const userNames: string[] = [];

        for (const userId of selectedFriendsIds) {
            let existingFriend: MessengerFriend = onlineFriends.find((f) => f.id === userId);

            if (!existingFriend) existingFriend = offlineFriends.find((f) => f.id === userId);

            if (!existingFriend) continue;

            userNames.push(existingFriend.name);
        }

        return LocalizeText('friendlist.removefriendconfirm.userlist', ['user_names'], [userNames.join('\n')]);
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

        setShowRoomInvite(false);
    };

    const removeSelectedFriends = () => {
        if (selectedFriendsIds.length === 0) return;

        setSelectedFriendsIds((prevValue) => {
            SendMessageComposer(new RemoveFriendComposer(...prevValue));

            return [];
        });

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

    useEffect(() => {
        if (activePanel === 'requests' && !requests.length) setActivePanel('friends');
    }, [activePanel, requests.length]);

    if (!isVisible) return null;

    const respondToAllRequests = (accept: boolean) => {
        for (const request of requests) requestResponse(request.id, accept);
    };

    return (
        <>
            <DraggableWindow
                uniqueKey="octane-friends"
                handleSelector=".hfl-titlebar"
                windowPosition={DraggableWindowPosition.TOP_LEFT}
                offsetLeft={110}
                offsetTop={50}
            >
                <div
                    className={`habbo-friend-list${requests.length ? ' has-requests' : ''}${activePanel === 'search' ? ' search-mode' : ''}${activePanel === 'requests' ? ' requests-mode' : ''}${activePanel === null ? ' collapsed-mode' : ''}`}
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
                            {LocalizeText('friendlist.friends')}
                        </BaseButton>
                    </div>
                    {activePanel !== null && (
                        <div className="hfl-content">
                            {activePanel === 'search' && <FriendsSearchView />}
                            {activePanel === 'requests' && (
                                <>
                                    <FriendsListRequestView />
                                    <div className="hfl-request-footer" data-testid="requests-footer">
                                        <BaseButton type="button" data-action="accept-all" disabled={!requests.length} onClick={() => respondToAllRequests(true)}>
                                            {LocalizeText('friendlist.requests.acceptall')}
                                        </BaseButton>
                                        <BaseButton type="button" data-action="dismiss-all" disabled={!requests.length} onClick={() => respondToAllRequests(false)}>
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
                                            <span
                                                className="hfl-select-all"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    toggleSelectFriends(filteredOnlineFriends.map((friend) => friend.id));
                                                }}
                                            >
                                                {filteredOnlineFriends.length &&
                                                filteredOnlineFriends.every((friend) => selectedFriendsIds.indexOf(friend.id) >= 0)
                                                    ? LocalizeText('friendlist.unselect_all')
                                                    : LocalizeText('friendlist.select_all')}
                                            </span>
                                        </Collapsible.Trigger>
                                        <Collapsible.Panel className="hfl-list">
                                            <FriendsListGroupView
                                                list={filteredOnlineFriends}
                                                selectedFriendsIds={selectedFriendsIds}
                                                selectFriend={selectFriend}
                                            />
                                        </Collapsible.Panel>
                                    </Collapsible.Root>
                                    <Collapsible.Root render={<section />} className="hfl-section" open={isOfflineExpanded} onOpenChange={setIsOfflineExpanded}>
                                        <Collapsible.Trigger className={`hfl-section-header${isOfflineExpanded ? '' : ' collapsed'}`}>
                                            <span>{LocalizeText('friendlist.friends.offlinecaption') + ` (${filteredOfflineFriends.length})`}</span>
                                        </Collapsible.Trigger>
                                        <Collapsible.Panel className="hfl-list">
                                            <FriendsListGroupView
                                                list={filteredOfflineFriends}
                                                selectedFriendsIds={selectedFriendsIds}
                                                selectFriend={selectFriend}
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
                                        onClick={() => setShowRoomInvite(true)}
                                    />
                                </Hint>
                                <Hint content={LocalizeText('friendlist.tip.home')}>
                                    <BaseButton aria-label={LocalizeText('friendlist.tip.home')}
                                        type="button"
                                        className="hfl-footer-button home"
                                        onClick={() => CreateLinkEvent('navigator/goto/home')}
                                    />
                                </Hint>
                                {isFriendSearchOpen ? (
                                    <div className="hfl-footer-search">
                                        <input autoFocus value={friendSearchValue} onChange={(event) => setFriendSearchValue(event.target.value)} />
                                        <Hint content={LocalizeText('generic.clear')}>
                                            <BaseButton aria-label={LocalizeText('generic.clear')}
                                                type="button"
                                                onClick={() => {
                                                    if (friendSearchValue.length) setFriendSearchValue('');
                                                    else setIsFriendSearchOpen(false);
                                                }}
                                            />
                                        </Hint>
                                    </div>
                                ) : (
                                    <Hint content={LocalizeText('people.search.title')}>
                                        <BaseButton aria-label={LocalizeText('people.search.title')}
                                            type="button"
                                            className="hfl-footer-button search"
                                            onClick={() => setIsFriendSearchOpen(true)}
                                        />
                                    </Hint>
                                )}
                                <BaseButton
                                    type="button"
                                    className="hfl-footer-button delete"
                                    disabled={!selectedFriendsIds.length}
                                    title={LocalizeText('generic.delete')}
                                    onClick={() => selectedFriendsIds.length && setShowRemoveFriendsConfirmation(true)}
                                />
                            </div>
                        </div>
                    )}
                    {!!requests.length && (
                        <BaseButton
                            type="button"
                            className="hfl-request-strip"
                            onClick={() => setActivePanel((value) => (value === 'requests' ? null : 'requests'))}
                        >
                            {LocalizeText('friendlist.tab.friendrequests')}
                        </BaseButton>
                    )}
                    <BaseButton type="button" className="hfl-search-strip" onClick={() => setActivePanel((value) => (value === 'search' ? null : 'search'))}>
                        {LocalizeText('generic.search')}
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
    );
};
