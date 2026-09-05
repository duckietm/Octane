import {
    CanCreateRoomEventEvent,
    CantConnectMessageParser,
    CategoriesWithVisitorCountEvent,
    CreateLinkEvent,
    FavouriteChangedEvent,
    FavouritesEvent,
    FlatCreatedEvent,
    FollowFriendMessageComposer,
    GenericErrorEvent,
    GetGuestRoomMessageComposer,
    GetGuestRoomResultEvent,
    GetRoomSessionManager,
    GetSessionDataManager,
    GetUserEventCatsMessageComposer,
    GetUserFlatCatsMessageComposer,
    HabboWebTools,
    LegacyExternalInterface,
    NavigatorCategoryDataParser,
    NavigatorEventCategoryDataParser,
    NavigatorHomeRoomEvent,
    NavigatorMetadataEvent,
    NavigatorOpenRoomCreatorEvent,
    NavigatorSavedSearch,
    NavigatorSearchesEvent,
    NavigatorTopLevelContext,
    OctaneEventType,
    RoomDataParser,
    RoomEnterErrorEvent,
    RoomEntryInfoMessageEvent,
    RoomForwardEvent,
    RoomScoreEvent,
    SecurityLevel,
    UserEventCatsEvent,
    UserFlatCatsEvent,
    UserInfoEvent,
    UserPermissionsEvent
} from '@octane/renderer';
import { useCallback, useState } from 'react';
import {
    CreateRoomSession,
    GenericErrorCode,
    GetConfigurationValue,
    INavigatorData,
    LocalizeText,
    NotificationAlertType,
    SendMessageComposer,
    TryVisitRoom,
    VisitDesktop
} from '../../api';
import { useMessageEvent, useOctaneEvent } from '../events';
import { useNotification } from '../notification';
import { useNavigatorFavouritesStore } from './navigatorFavouritesStore';
import { useNavigatorUiStore } from './navigatorUiStore';

export const useNavigatorStore = () => {
    const [categories, setCategories] = useState<NavigatorCategoryDataParser[]>(null);
    const [eventCategories, setEventCategories] = useState<NavigatorEventCategoryDataParser[]>(null);
    const [topLevelContext, setTopLevelContext] = useState<NavigatorTopLevelContext>(null);
    const [topLevelContexts, setTopLevelContexts] = useState<NavigatorTopLevelContext[]>(null);
    const [navigatorSearches, setNavigatorSearches] = useState<NavigatorSavedSearch[]>(null);
    const [categoryVisitorCounts, setCategoryVisitorCounts] = useState<Map<number, number>>(null);
    const [categoryMaxVisitorCounts, setCategoryMaxVisitorCounts] = useState<Map<number, number>>(null);
    const [navigatorData, setNavigatorData] = useState<INavigatorData>({
        settingsReceived: false,
        homeRoomId: 0,
        enteredGuestRoom: null,
        currentRoomOwner: false,
        currentRoomId: 0,
        currentRoomIsStaffPick: false,
        createdFlatId: 0,
        avatarId: 0,
        roomPicker: false,
        eventMod: false,
        currentRoomRating: 0,
        canRate: true
    });

    const { simpleAlert = null } = useNotification();

    useMessageEvent<FavouritesEvent>(
        FavouritesEvent,
        useCallback((event) => {
            const parser = event.getParser();
            useNavigatorFavouritesStore.getState().setAll(parser.favoriteRoomIds || []);
        }, [])
    );

    useMessageEvent<FavouriteChangedEvent>(
        FavouriteChangedEvent,
        useCallback((event) => {
            const parser = event.getParser();
            useNavigatorFavouritesStore.getState().apply(parser.flatId, !!parser.added);
        }, [])
    );

    useMessageEvent<CanCreateRoomEventEvent>(
        CanCreateRoomEventEvent,
        useCallback(
            (event) => {
                const parser = event.getParser();
                if (parser.canCreate) return;
                simpleAlert(
                    LocalizeText(`navigator.cannotcreateevent.error.${parser.errorCode}`),
                    null,
                    null,
                    null,
                    LocalizeText('navigator.cannotcreateevent.title')
                );
            },
            [simpleAlert]
        )
    );

    useMessageEvent<UserInfoEvent>(
        UserInfoEvent,
        useCallback((event) => {
            SendMessageComposer(new GetUserFlatCatsMessageComposer());
            SendMessageComposer(new GetUserEventCatsMessageComposer());
        }, [])
    );

    useMessageEvent<UserPermissionsEvent>(
        UserPermissionsEvent,
        useCallback((event) => {
            const parser = event.getParser();
            setNavigatorData((prev) => ({
                ...prev,
                eventMod: parser.securityLevel >= SecurityLevel.MODERATOR,
                roomPicker: parser.securityLevel >= SecurityLevel.COMMUNITY
            }));
        }, [])
    );

    useMessageEvent<RoomForwardEvent>(
        RoomForwardEvent,
        useCallback((event) => {
            const parser = event.getParser();
            TryVisitRoom(parser.roomId);
        }, [])
    );

    useMessageEvent<RoomEntryInfoMessageEvent>(
        RoomEntryInfoMessageEvent,
        useCallback((event) => {
            const parser = event.getParser();
            setNavigatorData((prev) => ({
                ...prev,
                enteredGuestRoom: null,
                currentRoomOwner: parser.isOwner,
                currentRoomId: parser.roomId
            }));
            SendMessageComposer(new GetGuestRoomMessageComposer(parser.roomId, true, false));
            if (LegacyExternalInterface.available) LegacyExternalInterface.call('legacyTrack', 'navigator', 'private', [parser.roomId]);
        }, [])
    );

    useMessageEvent<GetGuestRoomResultEvent>(
        GetGuestRoomResultEvent,
        useCallback((event) => {
            const parser = event.getParser();
            if (parser.roomEnter) {
                setNavigatorData((prev) => {
                    const next = { ...prev };
                    next.enteredGuestRoom = parser.data;
                    next.currentRoomIsStaffPick = parser.staffPick;
                    const isCreated = next.createdFlatId === parser.data.roomId;
                    if (!isCreated && parser.data.displayRoomEntryAd) {
                        if (GetConfigurationValue<boolean>('roomenterad.habblet.enabled', false)) HabboWebTools.openRoomEnterAd();
                    }
                    next.createdFlatId = 0;
                    return next;
                });
                return;
            }
            if (parser.roomForward) {
                // Door-mode branches (DOORBELL_STATE / PASSWORD_STATE) are handled by useDoorState — skip them here.
                const isOwner = parser.data.ownerName === GetSessionDataManager().userName;
                if (!isOwner && !parser.isGroupMember) {
                    if (parser.data.doorMode === RoomDataParser.DOORBELL_STATE) return;
                    if (parser.data.doorMode === RoomDataParser.PASSWORD_STATE) return;
                }
                if (
                    parser.data.doorMode === RoomDataParser.NOOB_STATE &&
                    !GetSessionDataManager().isAmbassador &&
                    !GetSessionDataManager().isRealNoob &&
                    !GetSessionDataManager().isModerator
                )
                    return;
                CreateRoomSession(parser.data.roomId);
                return;
            }
            setNavigatorData((prev) => ({
                ...prev,
                enteredGuestRoom: parser.data,
                currentRoomIsStaffPick: parser.staffPick
            }));
        }, [])
    );

    useMessageEvent<RoomScoreEvent>(
        RoomScoreEvent,
        useCallback((event) => {
            const parser = event.getParser();
            setNavigatorData((prev) => ({
                ...prev,
                currentRoomRating: parser.totalLikes,
                canRate: parser.canLike
            }));
        }, [])
    );

    useMessageEvent<GenericErrorEvent>(
        GenericErrorEvent,
        useCallback(
            (event) => {
                const parser = event.getParser();
                // -100002 (wrong password) is handled by useDoorState — skip it here.
                switch (parser.errorCode) {
                    case GenericErrorCode.VIP_REQUIRED:
                        simpleAlert(
                            LocalizeText('navigator.alert.need.to.be.vip'),
                            NotificationAlertType.DEFAULT,
                            null,
                            null,
                            LocalizeText('generic.alert.title')
                        );
                        return;
                    case GenericErrorCode.ROOM_NAME_UNACCEPTABLE:
                        simpleAlert(
                            LocalizeText('navigator.alert.invalid_room_name'),
                            NotificationAlertType.DEFAULT,
                            null,
                            null,
                            LocalizeText('generic.alert.title')
                        );
                        return;
                    case 4011:
                        simpleAlert(
                            LocalizeText('navigator.alert.cannot_perm_ban'),
                            NotificationAlertType.DEFAULT,
                            null,
                            null,
                            LocalizeText('generic.alert.title')
                        );
                        return;
                    case 4013:
                        simpleAlert(
                            LocalizeText('navigator.alert.room_in_maintenance'),
                            NotificationAlertType.DEFAULT,
                            null,
                            null,
                            LocalizeText('generic.alert.title')
                        );
                        return;
                }
            },
            [simpleAlert]
        )
    );

    useMessageEvent<NavigatorMetadataEvent>(
        NavigatorMetadataEvent,
        useCallback((event) => {
            const parser = event.getParser();
            setTopLevelContexts(parser.topLevelContexts);
            setTopLevelContext(parser.topLevelContexts.length ? parser.topLevelContexts[0] : null);
            // Seed the query's tab code so useNavigatorSearch activates immediately
            useNavigatorUiStore.getState().setTab(parser.topLevelContexts[0]?.code ?? '');
        }, [])
    );

    useMessageEvent<UserFlatCatsEvent>(
        UserFlatCatsEvent,
        useCallback((event) => {
            const parser = event.getParser();
            setCategories(parser.categories);
        }, [])
    );

    useMessageEvent<UserEventCatsEvent>(
        UserEventCatsEvent,
        useCallback((event) => {
            const parser = event.getParser();
            setEventCategories(parser.categories);
        }, [])
    );

    useMessageEvent<FlatCreatedEvent>(
        FlatCreatedEvent,
        useCallback((event) => {
            const parser = event.getParser();
            CreateRoomSession(parser.roomId);
        }, [])
    );

    useOctaneEvent(
        OctaneEventType.SOCKET_RECONNECTING,
        useCallback(() => {
            setNavigatorData((prev) => ({ ...prev, settingsReceived: false }));
        }, [])
    );

    useMessageEvent<NavigatorHomeRoomEvent>(
        NavigatorHomeRoomEvent,
        useCallback((event) => {
            const parser = event.getParser();
            let prevSettingsReceived = false;
            setNavigatorData((prev) => {
                prevSettingsReceived = prev.settingsReceived;
                return { ...prev, homeRoomId: parser.homeRoomId, settingsReceived: true };
            });
            if (prevSettingsReceived) return;
            if (GetRoomSessionManager().viewerSession) return;

            let forwardType = -1;
            let forwardId = -1;
            if (GetConfigurationValue<string>('friend.id') !== undefined && parseInt(GetConfigurationValue<string>('friend.id')) > 0) {
                forwardType = 0;
                SendMessageComposer(new FollowFriendMessageComposer(parseInt(GetConfigurationValue<string>('friend.id'))));
            }
            if (GetConfigurationValue<number>('forward.type') !== undefined && GetConfigurationValue<number>('forward.id') !== undefined) {
                forwardType = parseInt(GetConfigurationValue<string>('forward.type'));
                forwardId = parseInt(GetConfigurationValue<string>('forward.id'));
            }
            if (forwardType === 2) {
                TryVisitRoom(forwardId);
            } else if (forwardType === -1 && parser.roomIdToEnter > 0) {
                CreateLinkEvent('navigator/close');
                CreateRoomSession(parser.roomIdToEnter !== parser.homeRoomId ? parser.roomIdToEnter : parser.homeRoomId);
            }
        }, [])
    );

    useMessageEvent<RoomEnterErrorEvent>(
        RoomEnterErrorEvent,
        useCallback(
            (event) => {
                const parser = event.getParser();
                switch (parser.reason) {
                    case CantConnectMessageParser.REASON_FULL:
                        simpleAlert(
                            LocalizeText('navigator.guestroomfull.text'),
                            NotificationAlertType.DEFAULT,
                            null,
                            null,
                            LocalizeText('navigator.guestroomfull.title')
                        );
                        break;
                    case CantConnectMessageParser.REASON_QUEUE_ERROR:
                        simpleAlert(
                            LocalizeText(`room.queue.error.${parser.parameter}`),
                            NotificationAlertType.DEFAULT,
                            null,
                            null,
                            LocalizeText('room.queue.error.title')
                        );
                        break;
                    case CantConnectMessageParser.REASON_BANNED:
                        simpleAlert(LocalizeText('navigator.banned.text'), NotificationAlertType.DEFAULT, null, null, LocalizeText('navigator.banned.title'));
                        break;
                    default:
                        simpleAlert(LocalizeText('room.queue.error.title'), NotificationAlertType.DEFAULT, null, null, LocalizeText('room.queue.error.title'));
                        break;
                }
                if (GetRoomSessionManager().isReconnecting) return;
                VisitDesktop();
            },
            [simpleAlert]
        )
    );

    useMessageEvent<NavigatorOpenRoomCreatorEvent>(
        NavigatorOpenRoomCreatorEvent,
        useCallback((_event) => {
            CreateLinkEvent('navigator/show');
        }, [])
    );

    useMessageEvent<NavigatorSearchesEvent>(
        NavigatorSearchesEvent,
        useCallback((event) => {
            const parser = event.getParser();
            if (!parser) return;
            setNavigatorSearches(parser.searches);
        }, [])
    );

    useMessageEvent<CategoriesWithVisitorCountEvent>(
        CategoriesWithVisitorCountEvent,
        useCallback((event) => {
            const data = event.getParser()?.data;
            if (!data) return;

            setCategoryVisitorCounts(new Map(data.categoryToCurrentUserCountMap));
            setCategoryMaxVisitorCounts(new Map(data.categoryToMaxUserCountMap));
        }, [])
    );

    return {
        categories,
        eventCategories,
        topLevelContext,
        topLevelContexts,
        navigatorSearches,
        categoryVisitorCounts,
        categoryMaxVisitorCounts,
        navigatorData
    };
};
