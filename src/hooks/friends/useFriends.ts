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
    OctaneEventType,
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
    getFollowErrorTextKey,
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
import { useMessageEvent, useOctaneEvent } from '../events';
import { useNotification } from '../notification';

/** AcceptFriendRequestEvent refuses a count above this. */
const MAXIMUM_BULK_REQUEST_RESPONSES = 100;

/**
 * The request ids to accept in one packet.
 *
 * AcceptFriendRequestEvent reads a count and then the ids, and it is rate limited to one
 * packet every 500 ms: sending one per request in a loop had the server accept the first
 * and silently drop the rest, while the client removed them all from the list.
 */
export const bulkAcceptRequestIds = (requests: MessengerRequest[]): number[] =>
    requests.slice(0, MAXIMUM_BULK_REQUEST_RESPONSES).map((request) => request.id);

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

    /** AIR HabboFriendList: accepting stops once the list holds `userFriendLimit` friends. */
    const isFriendListFull = (adding: number = 1) => !!settings?.userFriendLimit && friends.length + adding > settings.userFriendLimit;

    /** AIR showLimitReachedAlert. */
    const showFriendListFullAlert = () =>
        simpleAlert(
            LocalizeText('friendlist.listfull.text', ['mylimit', 'clublimit'], [`${settings?.userFriendLimit ?? 0}`, `${settings?.extendedFriendLimit ?? 0}`]),
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText('friendlist.listfull.title')
        );

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

        lastRequestedFriendIdRef.current = userId;

        setSentRequests((prevValue) => {
            const newSentRequests = [...prevValue];

            newSentRequests.push(userId);

            return newSentRequests;
        });

        SendMessageComposer(new RequestFriendComposer(userName));

        return true;
    };

    /** Answers every pending request in one packet. */
    const requestResponseAll = (flag: boolean) => {
        if (!flag) {
            // The server's own "decline all".
            SendMessageComposer(new DeclineFriendMessageComposer(true));

            setRequests([]);

            return;
        }

        const pending = bulkAcceptRequestIds(requests);

        if (!pending.length) return;

        SendMessageComposer(new AcceptFriendMessageComposer(...pending));

        const answered = new Set(pending);

        setRequests((prevValue) => prevValue.filter((request) => !answered.has(request.id)));
    };

    const requestResponse = (requestId: number, flag: boolean) => {
        if (requestId === -1 && !flag) {
            SendMessageComposer(new DeclineFriendMessageComposer(true));

            setRequests([]);
        } else {
            // Send first, then a pure update: React may run a state updater twice, which sent the packet twice.
            if (!requests.some((request) => request.id === requestId)) return;

            if (flag) SendMessageComposer(new AcceptFriendMessageComposer(requestId));
            else SendMessageComposer(new DeclineFriendMessageComposer(false, requestId));

            setRequests((prevValue) => prevValue.filter((request) => request.id !== requestId));
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

        for (const friend of parser.updatedFriends) {
            const previousFriend = previousFriends.get(friend.id);
            const newFriend = new MessengerFriend();
            newFriend.populate(friend);

            if (previousFriend && !previousFriend.online && newFriend.online) onlineNotifications.push(newFriend);
        }

        setSettings((previous) => withUpdatedFriendCategories(previous, parser.categories));

        // A request is settled once its user joins or leaves the list: keeping the id hid "Add friend" for that user
        // for the rest of the session, even after the friendship ended.
        const settledIds = new Set<number>([...parser.addedFriends.map((friend) => friend.id), ...parser.removedFriendIds]);

        if (settledIds.size) setSentRequests((prevValue) => prevValue.filter((userId) => !settledIds.has(userId)));

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
            const text = localizeWithFallback('notifications.friend_online', `${friend.name} is online`, ['name'], [friend.name]);

            showSingleBubble?.(text, NotificationBubbleType.FRIENDONLINE, friend.figure, `friends-messenger/${friend.id}`);
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

    useMessageEvent<FollowFriendFailedEvent>(FollowFriendFailedEvent, (event) => {
        const textKey = getFollowErrorTextKey(event.getParser().errorCode);

        simpleAlert(LocalizeText(textKey), NotificationAlertType.DEFAULT, null, null, LocalizeText('friendlist.alert.title'));
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

    // After an automatic reconnection nothing asked the server again: private messages that arrived meanwhile were
    // stored as offline messages and shown only at the next full login, and friends removed meanwhile stayed listed.
    // Start the messenger over, as at login: the init brings the requests, the friend list and then the offline
    // messages.
    useOctaneEvent(OctaneEventType.SOCKET_REAUTHENTICATED, () => {
        friendsRef.current = [];
        setFriends([]);
        setRequests([]);
        setSentRequests([]);
        setOfflineMessagesReady(false);
        SendMessageComposer(new MessengerInitComposer());
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
        isFriendListFull,
        showFriendListFullAlert,
        requestFriend,
        requestResponse,
        requestResponseAll,
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
        canRequestFriend,
        isFriendListFull
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
        canRequestFriend,
        isFriendListFull
    };
};

/**
 * Imperative slice of the friends store: request a new friendship,
 * respond to an incoming request, follow a friend, update an existing
 * relationship.
 */
export const useFriendsActions = () => {
    const {
        showFriendListFullAlert,
        requestFriend,
        requestResponse,
        requestResponseAll,
        followFriend,
        updateRelationship,
        addCategory,
        renameCategory,
        removeCategory,
        moveFriendToCategory
    } = useSharedHook(useFriendsStore);

    return {
        showFriendListFullAlert,
        requestFriend,
        requestResponse,
        requestResponseAll,
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
