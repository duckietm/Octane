import {
    CreateLinkEvent,
    GetCustomRoomFilterMessageComposer,
    GetGuestRoomMessageComposer,
    GetSessionDataManager,
    NavigatorSearchComposer,
    RemoveOwnRoomRightsRoomMessageComposer,
    RoomControllerLevel,
    RoomMuteComposer,
    RoomSettingsComposer,
    ToggleStaffPickMessageComposer,
    UpdateHomeRoomMessageComposer
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { DispatchUiEvent, GetGroupInformation, LocalizeText, ReportType, SendMessageComposer } from '../../../api';
import weblinkIcon from '../../../assets/images/navigator/air/icon-weblink.png';
import removeRightsIcon from '../../../assets/images/navigator/air/remove-rights.png';
import {
    Flex,
    LayoutBadgeImageView,
    LayoutRoomThumbnailView,
    OctaneCardContentView,
    OctaneCardHeaderView,
    OctaneCardView,
    Text,
    UserProfileIconView
} from '../../../common';
import { RoomWidgetThumbnailEvent } from '../../../events';
import { useHasPermission, useHelp, useNavigatorData, useNavigatorFavourite, useRoom } from '../../../hooks';
import { classNames } from '../../../layout';

export interface NavigatorRoomInfoViewProps {
    onCloseClick: () => void;
}

export const NavigatorRoomInfoView: FC<NavigatorRoomInfoViewProps> = (props) => {
    const { onCloseClick = null } = props;
    const [isRoomPicked, setIsRoomPicked] = useState(false);
    const [isRoomMuted, setIsRoomMuted] = useState(false);
    const { report = null } = useHelp();
    const { navigatorData } = useNavigatorData();
    const { roomSession = null } = useRoom();
    const canManageAnyRoom = useHasPermission('acc_anyroomowner');
    const canUseRoomThumbnailCamera = useHasPermission('acc_camera');
    const canStaffPick = useHasPermission('acc_staff_pick');

    const enteredRoomId = navigatorData?.enteredGuestRoom?.roomId ?? 0;
    const { isFavourite: isRoomInFavouritesList, toggle: toggleFavourite } = useNavigatorFavourite(enteredRoomId);

    useEffect(() => {
        if (!enteredRoomId) return;
        SendMessageComposer(new GetGuestRoomMessageComposer(enteredRoomId, false, false));
    }, [enteredRoomId]);

    const hasPermission = (permission: string) => {
        if (!navigatorData?.enteredGuestRoom) return false;

        switch (permission) {
            case 'settings':
                return GetSessionDataManager().userId === navigatorData.enteredGuestRoom.ownerId || canManageAnyRoom;
            case 'staff_pick':
                return canStaffPick;
            case 'floor':
                return roomSession?.controllerLevel >= RoomControllerLevel.GUEST;
            case 'guest':
                return roomSession?.controllerLevel === RoomControllerLevel.GUEST;
            default:
                return false;
        }
    };

    const processAction = (action: string, value?: string) => {
        if (!navigatorData?.enteredGuestRoom) return;

        const roomId = navigatorData.enteredGuestRoom.roomId;

        switch (action) {
            case 'set_home_room': {
                let newRoomId = -1;
                if (navigatorData.homeRoomId !== roomId) newRoomId = roomId;
                if (newRoomId > 0) SendMessageComposer(new UpdateHomeRoomMessageComposer(newRoomId));
                return;
            }
            case 'navigator_search_tag':
                CreateLinkEvent(`navigator/search/${value}`);
                SendMessageComposer(new NavigatorSearchComposer('hotel_view', `tag:${value}`));
                return;
            case 'open_room_thumbnail_camera':
                DispatchUiEvent(new RoomWidgetThumbnailEvent(RoomWidgetThumbnailEvent.TOGGLE_THUMBNAIL));
                return;
            case 'open_group_info':
                GetGroupInformation(navigatorData.enteredGuestRoom.habboGroupId);
                return;
            case 'toggle_room_link':
                CreateLinkEvent('navigator/toggle-room-link');
                return;
            case 'open_room_settings':
                SendMessageComposer(new RoomSettingsComposer(roomId));
                return;
            case 'toggle_pick':
                setIsRoomPicked((prev) => !prev);
                SendMessageComposer(new ToggleStaffPickMessageComposer(roomId));
                SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, false));
                return;
            case 'toggle_mute':
                setIsRoomMuted((prev) => !prev);
                SendMessageComposer(new RoomMuteComposer());
                SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, false));
                return;
            case 'room_filter':
                SendMessageComposer(new GetCustomRoomFilterMessageComposer(roomId));
                return;
            case 'open_floorplan_editor':
                CreateLinkEvent('floor-editor/toggle');
                return;
            case 'report_room':
                report(ReportType.ROOM, { roomId, roomName: navigatorData.enteredGuestRoom.roomName });
                return;
            case 'room_favourite':
                toggleFavourite();
                SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, false));
                return;
            case 'remove_rights':
                SendMessageComposer(new RemoveOwnRoomRightsRoomMessageComposer(roomId));
                return;
            case 'close':
                onCloseClick();
                return;
        }
    };

    useEffect(() => {
        if (!navigatorData) return;
        setIsRoomPicked(navigatorData.currentRoomIsStaffPick);
        if (navigatorData.enteredGuestRoom) setIsRoomMuted(navigatorData.enteredGuestRoom.allInRoomMuted);
    }, [navigatorData]);

    if (!navigatorData?.enteredGuestRoom) return null;

    return (
        <OctaneCardView
            className="octane-room-info min-w-0 w-[min(236px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            isResizable={false}
        >
            <OctaneCardHeaderView headerText={LocalizeText('navigator.roomsettings.roominfo')} onCloseClick={() => processAction('close')} />
            <OctaneCardContentView className="octane-room-info__content text-black max-h-[calc(100vh-72px)]" overflow="auto">
                <div className="octane-room-info__heading">
                    <Text bold>{navigatorData.enteredGuestRoom.roomName}</Text>
                    <button
                        type="button"
                        className={classNames(
                            'octane-room-info__home shrink-0',
                            navigatorData.homeRoomId === navigatorData.enteredGuestRoom.roomId && 'is-home'
                        )}
                        title={LocalizeText('navigator.room.popup.room.info.home')}
                        onClick={() => processAction('set_home_room')}
                    />
                </div>
                {navigatorData.enteredGuestRoom.showOwner && (
                    <Flex alignItems="center" gap={1} className="octane-room-info__meta">
                        <Text small bold variant="muted">{LocalizeText('navigator.roomownercaption')}</Text>
                        <UserProfileIconView userId={navigatorData.enteredGuestRoom.ownerId} />
                        <Text small>{navigatorData.enteredGuestRoom.ownerName}</Text>
                    </Flex>
                )}
                <Flex alignItems="center" gap={1} className="octane-room-info__meta">
                    <Text small bold variant="muted">{LocalizeText('navigator.roomrating')}</Text>
                    <Text small>{navigatorData.currentRoomRating}</Text>
                </Flex>
                <Text className="octane-room-info__description">{navigatorData.enteredGuestRoom.description}</Text>
                <LayoutRoomThumbnailView
                    className="octane-room-info__thumbnail"
                    customUrl={navigatorData.enteredGuestRoom.officialRoomPicRef}
                    roomId={navigatorData.enteredGuestRoom.roomId}
                >
                    {hasPermission('settings') && canUseRoomThumbnailCamera && (
                        <button
                            type="button"
                            className="octane-room-info__camera octane-icon icon-camera-small absolute bottom-0 right-0 m-1"
                            aria-label={LocalizeText('navigator.thumbnail.camera.title')}
                            title={LocalizeText('navigator.thumbnail.camera.title')}
                            onClick={() => processAction('open_room_thumbnail_camera')}
                        />
                    )}
                </LayoutRoomThumbnailView>
                <Flex className="octane-room-info__quick-actions" gap={1} justifyContent="center">
                    {GetSessionDataManager().userId !== navigatorData.enteredGuestRoom.ownerId && (
                        <i
                            className={classNames('octane-icon cursor-pointer', isRoomInFavouritesList ? 'icon-group-favorite' : 'icon-group-not-favorite')}
                            title={LocalizeText('navigator.room.popup.room.info.favorite')}
                            onClick={() => processAction('room_favourite')}
                        />
                    )}
                    {hasPermission('guest') && (
                        <button
                            type="button"
                            className="border-0 bg-transparent p-0 cursor-pointer"
                            title={LocalizeText('navigator.roominfo.removerights.tooltip')}
                            onClick={() => processAction('remove_rights')}
                        >
                            <img src={removeRightsIcon} alt="" width={17} height={22} />
                        </button>
                    )}
                </Flex>
                <Flex pointer alignItems="center" gap={1} className="octane-room-info__room-link" onClick={() => processAction('toggle_room_link')}>
                    <img src={weblinkIcon} alt="" />
                    <Text small underline>{LocalizeText('navigator.embed.caption')}</Text>
                </Flex>
                {navigatorData.enteredGuestRoom.habboGroupId > 0 && (
                    <Flex pointer alignItems="center" gap={1} className="octane-room-info__group" onClick={() => processAction('open_group_info')}>
                        <LayoutBadgeImageView badgeCode={navigatorData.enteredGuestRoom.groupBadgeCode} className="flex-none" isGroup={true} />
                        <Text small underline>{LocalizeText('navigator.guildbase', ['groupName'], [navigatorData.enteredGuestRoom.groupName])}</Text>
                    </Flex>
                )}
                <div className="octane-room-info__actions">
                    {hasPermission('settings') && (
                        <button type="button" className="octane-room-info__action habbo-btn-primary" onClick={() => processAction('open_room_settings')}>
                            {LocalizeText('navigator.roomsettings')}
                        </button>
                    )}
                    {hasPermission('settings') && (
                        <button type="button" className="octane-room-info__action habbo-btn-primary" onClick={() => processAction('room_filter')}>
                            {LocalizeText('navigator.roomsettings.roomfilter')}
                        </button>
                    )}
                    {(hasPermission('settings') || hasPermission('floor')) && (
                        <button type="button" className="octane-room-info__action habbo-btn-primary" onClick={() => processAction('open_floorplan_editor')}>
                            {LocalizeText('open.floor.plan.editor')}
                        </button>
                    )}
                    {hasPermission('staff_pick') && (
                        <button type="button" className="octane-room-info__action habbo-btn-primary" onClick={() => processAction('toggle_pick')}>
                            {LocalizeText(isRoomPicked ? 'navigator.staffpicks.unpick' : 'navigator.staffpicks.pick')}
                        </button>
                    )}
                    <button type="button" className="octane-room-info__action habbo-btn-danger" onClick={() => processAction('report_room')}>
                        {LocalizeText('help.emergency.main.report.room')}
                    </button>
                    {hasPermission('settings') && (
                        <button type="button" className="octane-room-info__action habbo-btn-primary" onClick={() => processAction('toggle_mute')}>
                            {LocalizeText(isRoomMuted ? 'navigator.muteall_on' : 'navigator.muteall_off')}
                        </button>
                    )}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
