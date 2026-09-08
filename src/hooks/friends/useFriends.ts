import {
    AcceptFriendMessageComposer,
    AddFriendCategoryComposer,
    DeclineFriendMessageComposer,
    FollowFriendFailedEvent,
    FollowFriendMessageComposer,
    FriendListFragmentEvent,
    FriendListUpdateComposer,
    FriendListUpdateEvent,
    FriendParser,
    FriendRequestsEvent,
    GetFriendRequestsComposer,
    GetSessionDataManager,
    MessageErrorEvent,
    MessengerInitComposer,
    MessengerInitEvent,
    MoveFriendToCategoryComposer,
    NewFriendRequestEvent,
    RemoveFriendCategoryComposer,
    RenameFriendCategoryComposer,
    RequestFriendComposer,
    RequestOfflineMessagesComposer,
    SetRelationshipStatusComposer
} from '@octane/renderer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    CloneObject,
    LocalizeText,
    localizeWithFallback,
    MessengerFriend,
    MessengerRequest,
    MessengerSettings,
    NotificationAlertType,
    NotificationBubbleType,
    SendMessageComposer,
    withUpdatedFriendCategories
} from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';
import { shouldNotifyFriendOnline, useFriendOnlineNotificationPreference } from './useFriendOnlineNotificationPreference';

/**
 * Internal singleton store for friend-list state + actions. Public
 * consumers should use useFriendsState (read-only — friends arrays,
 * settings, derived online/offline split) or useFriendsActions
 * (imperative — request / response / follow / update). useFriends is
 * the legacy shim that composes both.
 */
const useFriendsStore = () => {
    const [friends, setFriends] = useState<MessengerFriend[]>([]);
    const [requests, setRequests] = useState<MessengerRequest[]>([]);
    const [sentRequests, setSentRequests] = useState<number[]>([]);
    const [dismissedRequestIds, setDismissedRequestIds] = useState<number[]>([]);
    const [settings, setSettings] = useState<MessengerSettings>(null);
    const [offlineMessagesReady, setOfflineMessagesReady] = useState(false);
    const friendsRef = useRef<MessengerFriend[]>([]);
    const lastRequestedFriendIdRef = useRef<number>(-1);
    const { simpleAlert = null, showSingleBubble = null } = useNotification();
    const [friendOnlineNotificationPreference] = useFriendOnlineNotificationPreference();

    const onlineFriends = useMemo(() => {
        const onlineFriends = friends.filter((friend) => friend.online);

        onlineFriends.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

        return onlineFriends;
    }, [friends]);

    const offlineFriends = useMemo(() => {
        const offlineFriends = friends.filter((friend) => !friend.online);

        offlineFriends.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

        return offlineFriends;
    }, [friends]);

    const followFriend = (friend: MessengerFriend) => SendMessageComposer(new FollowFriendMessageComposer(friend.id));

    const updateRelationship = (friend: MessengerFriend, type: number) =>
        type !== friend.relationshipStatus && SendMessageComposer(new SetRelationshipStatusComposer(friend.id, type));

    const addCategory = (name: string) => {
        const trimmed = (name ?? '').trim();

        if (!trimmed.length || trimmed.length > 25) return;

        SendMessageComposer(new AddFriendCategoryComposer(trimmed));
    };

    const renameCategory = (categoryId: number, name: string) => {
        const trimmed = (name ?? '').trim();

        if (!categoryId || !trimmed.length || trimmed.length > 25) return;

        SendMessageComposer(new RenameFriendCategoryComposer(categoryId, trimmed));
    };

    const removeCategory = (categoryId: number) => {
        if (!categoryId) return;

        SendMessageComposer(new RemoveFriendCategoryComposer(categoryId));
    };

    const moveFriendToCategory = (friendId: number, categoryId: number) => {
        if (!friendId) return;

        SendMessageComposer(new MoveFriendToCategoryComposer(friendId, categoryId));
    };

    const getFriend = (userId: number) => {
        for (const friend of friends) {
            if (friend.id === userId) return friend;
        }

        return null;
    };

    const canRequestFriend = (userId: number) => {
        if (userId === GetSessionDataManager().userId) return false;

        if (getFriend(userId)) return false;

        if (requests.find((request) => request.requesterUserId === userId)) return false;

        if (sentRequests.indexOf(userId) >= 0) return false;

        return true;
    };

    const requestFriend = (userId: number, userName: string) => {
        if (!canRequestFriend(userId)) return false;

        // The official friend list refuses the request with an alert once the list is full; the club limit is the larger one.
        if (settings && settings.userFriendLimit > 0 && friends.length >= settings.userFriendLimit) {
            simpleAlert?.(
                localizeWithFallback(
                    'friendlist.listfull.text',
                    `You have ${settings.userFriendLimit} friends which means that you've reached your limit for Habbo friends!`,
                    ['mylimit', 'clublimit'],
                    [`${settings.userFriendLimit}`, `${settings.extendedFriendLimit}`]
                ),
                NotificationAlertType.DEFAULT,
                null,
                null,
                localizeWithFallback('friendlist.listfull.title', 'Notice!')
            );

            return false;
        }

        lastRequestedFriendIdRef.current = userId;

        setSentRequests((prevValue) => {
            const newSentRequests = [...prevValue];

            newSentRequests.push(userId);

            return newSentRequests;
        });

        SendMessageComposer(new RequestFriendComposer(userName));

        simpleAlert?.(
            localizeWithFallback(
                'friendlist.friendrequestsent.text',
                `${userName} has been sent your friend request. They will be added to your Friends List if they accept it.`,
                ['user_name'],
                [userName]
            ),
            NotificationAlertType.DEFAULT,
            null,
            null,
            localizeWithFallback('friendlist.friendrequestsent.title', 'Notice!')
        );
    };

    const requestResponse = (requestId: number, flag: boolean) => {
        if (requestId === -1 && !flag) {
            SendMessageComposer(new DeclineFriendMessageComposer(true));

            setRequests([]);
        } else {
            setRequests((prevValue) => {
                const newRequests = [...prevValue];
                const index = newRequests.findIndex((request) => request.id === requestId);

                if (index === -1) return prevValue;

                if (flag) {
                    SendMessageComposer(new AcceptFriendMessageComposer(newRequests[index].id));
                } else {
                    SendMessageComposer(new DeclineFriendMessageComposer(false, newRequests[index].id));
                }

                newRequests.splice(index, 1);

                return newRequests;
            });
        }
    };

    useMessageEvent<MessengerInitEvent>(MessengerInitEvent, (event) => {
        const parser = event.getParser();

        setSettings(new MessengerSettings(parser.userFriendLimit, parser.normalFriendLimit, parser.extendedFriendLimit, parser.categories));

        SendMessageComposer(new GetFriendRequestsComposer());
        SendMessageComposer(new FriendListUpdateComposer());
    });

    useMessageEvent<FriendListFragmentEvent>(FriendListFragmentEvent, (event) => {
        const parser = event.getParser();

        setFriends((prevValue) => {
            const newValue = [...prevValue];

            for (const friend of parser.fragment) {
                const index = newValue.findIndex((existingFriend) => existingFriend.id === friend.id);
                const newFriend = new MessengerFriend();
                newFriend.populate(friend);

                if (index > -1) newValue[index] = newFriend;
                else newValue.push(newFriend);
            }

            friendsRef.current = newValue;

            return newValue;
        });

        if (parser.totalFragments === 0 || parser.fragmentNumber >= parser.totalFragments - 1) setOfflineMessagesReady(true);
    });

    useMessageEvent<FriendListUpdateEvent>(FriendListUpdateEvent, (event) => {
        const parser = event.getParser();
        const previousFriends = new Map(friendsRef.current.map((friend) => [friend.id, friend]));
        const onlineNotifications: MessengerFriend[] = [];
        const offlineNotifications: MessengerFriend[] = [];

        for (const friend of parser.updatedFriends) {
            const previousFriend = previousFriends.get(friend.id);
            const newFriend = new MessengerFriend();
            newFriend.populate(friend);

            if (previousFriend && !previousFriend.online && newFriend.online) onlineNotifications.push(newFriend);

            if (previousFriend && previousFriend.online && !newFriend.online) offlineNotifications.push(newFriend);
        }

        setSettings((previous) => withUpdatedFriendCategories(previous, parser.categories));

        setFriends((prevValue) => {
            const newValue = [...prevValue];

            const processUpdate = (friend: FriendParser) => {
                const index = newValue.findIndex((existingFriend) => existingFriend.id === friend.id);
                const newFriend = new MessengerFriend();
                newFriend.populate(friend);

                if (index === -1) {
                    newValue.unshift(newFriend);
                } else {
                    newValue[index] = newFriend;
                }
            };

            for (const friend of parser.addedFriends) processUpdate(friend);

            for (const friend of parser.updatedFriends) processUpdate(friend);

            for (const removedFriendId of parser.removedFriendIds) {
                const index = newValue.findIndex((existingFriend) => existingFriend.id === removedFriendId);

                if (index > -1) newValue.splice(index, 1);
            }

            friendsRef.current = newValue;

            return newValue;
        });

        for (const friend of onlineNotifications) {
            // Settings > Other lets the user limit the bubble to relationships or switch it off.
            if (!shouldNotifyFriendOnline(friendOnlineNotificationPreference, friend.relationshipStatus)) continue;

            const text = localizeWithFallback('notifications.friend_online', `${friend.name} is online`, ['name'], [friend.name]);

            showSingleBubble?.(text, NotificationBubbleType.FRIENDONLINE, friend.figure, `friends-messenger/${friend.id}`);
        }

        // The `friendoffline` style of the official notification config, under the same
        // preference as the online bubble; it carries no messenger shortcut.
        for (const friend of offlineNotifications) {
            if (!shouldNotifyFriendOnline(friendOnlineNotificationPreference, friend.relationshipStatus)) continue;

            const text = localizeWithFallback('notifications.friend_offline', `${friend.name} is offline`, ['name'], [friend.name]);

            showSingleBubble?.(text, NotificationBubbleType.FRIENDOFFLINE, friend.figure);
        }
    });

    useMessageEvent<FriendRequestsEvent>(FriendRequestsEvent, (event) => {
        const parser = event.getParser();

        setRequests((prevValue) => {
            const newValue = [...prevValue];

            for (const request of parser.requests) {
                const index = newValue.findIndex((existing) => existing.requesterUserId === request.requesterUserId);

                if (index !== -1) {
                    newValue[index] = CloneObject(newValue[index]);
                    newValue[index].populate(request);
                } else {
                    const newRequest = new MessengerRequest();
                    newRequest.populate(request);

                    newValue.push(newRequest);
                }
            }

            return newValue;
        });
    });

    useMessageEvent<FollowFriendFailedEvent>(FollowFriendFailedEvent, () => {
        simpleAlert(LocalizeText('friendlist.followerror.hotelview'), NotificationAlertType.DEFAULT, null, null, LocalizeText('friendlist.alert.title'));
    });

    useMessageEvent<MessageErrorEvent>(MessageErrorEvent, (event) => {
        const errorCode = event.getParser().errorCode;
        const localizeKeys: Record<number, string> = {
            1: 'friendlist.error.friendlistownlimit',
            2: 'friendlist.error.friendlistlimitofrequester',
            3: 'friendlist.error.friend_requests_disabled',
            4: 'friendlist.error.requestnotfound'
        };
        const localizeKey = localizeKeys[errorCode];

        if (!localizeKey) return;

        const requestedFriendId = lastRequestedFriendIdRef.current;

        if (requestedFriendId > 0) setSentRequests((prevValue) => prevValue.filter((userId) => userId !== requestedFriendId));

        lastRequestedFriendIdRef.current = -1;
        simpleAlert(LocalizeText(localizeKey), NotificationAlertType.DEFAULT, null, null, LocalizeText('friendlist.alert.title'));
    });

    useMessageEvent<NewFriendRequestEvent>(NewFriendRequestEvent, (event) => {
        const parser = event.getParser();
        const request = parser.request;

        setRequests((prevValue) => {
            const newRequests = [...prevValue];

            const index = newRequests.findIndex((existing) => existing.requesterUserId === request.requesterUserId);

            if (index === -1) {
                const newRequest = new MessengerRequest();
                newRequest.populate(request);

                newRequests.push(newRequest);
            }

            return newRequests;
        });
    });

    useEffect(() => {
        if (!offlineMessagesReady) return;

        SendMessageComposer(new RequestOfflineMessagesComposer());
        setOfflineMessagesReady(false);
    }, [offlineMessagesReady]);

    useEffect(() => {
        SendMessageComposer(new MessengerInitComposer());
        SendMessageComposer(new FriendListUpdateComposer());

        const interval = setInterval(() => SendMessageComposer(new FriendListUpdateComposer()), 120000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    return {
        friends,
        requests,
        sentRequests,
        dismissedRequestIds,
        setDismissedRequestIds,
        settings,
        onlineFriends,
        offlineFriends,
        getFriend,
        canRequestFriend,
        requestFriend,
        requestResponse,
        followFriend,
        updateRelationship,
        addCategory,
        renameCategory,
        removeCategory,
        moveFriendToCategory
    };
};

/**
 * Read-only slice of the friends store: the friend list itself
 * (friends, requests, sentRequests, dismissedRequestIds, settings)
 * plus the derived online/offline splits and the lookup helpers
 * (getFriend, canRequestFriend) that don't mutate state.
 *
 * setDismissedRequestIds is exposed here because most consumers that
 * read dismissedRequestIds also need to mutate it (it's UI-local
 * "I've already hidden this banner" state, not server-driven).
 */
export const useFriendsState = () => {
    const {
        friends,
        requests,
        sentRequests,
        dismissedRequestIds,
        setDismissedRequestIds,
        settings,
        onlineFriends,
        offlineFriends,
        getFriend,
        canRequestFriend
    } = useSharedHook(useFriendsStore);

    return {
        friends,
        requests,
        sentRequests,
        dismissedRequestIds,
        setDismissedRequestIds,
        settings,
        onlineFriends,
        offlineFriends,
        getFriend,
        canRequestFriend
    };
};

/**
 * Imperative slice of the friends store: request a new friendship,
 * respond to an incoming request, follow a friend, update an existing
 * relationship.
 */
export const useFriendsActions = () => {
    const { requestFriend, requestResponse, followFriend, updateRelationship, addCategory, renameCategory, removeCategory, moveFriendToCategory } =
        useSharedHook(useFriendsStore);

    return {
        requestFriend,
        requestResponse,
        followFriend,
        updateRelationship,
        addCategory,
        renameCategory,
        removeCategory,
        moveFriendToCategory
    };
};

/**
 * @deprecated Prefer `useFriendsState` (read-only friends list) and
 * `useFriendsActions` (request / follow / update) directly. This shim
 * composes both into the historical `useFriends()` shape so the 16
 * existing consumers keep working unchanged.
 */
export const useFriends = () => useSharedHook(useFriendsStore);

registerSharedHook(useFriendsStore);
