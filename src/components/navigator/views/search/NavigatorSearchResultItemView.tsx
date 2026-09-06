import { GetSessionDataManager, RoomDataParser } from '@octane/renderer';
import { FC, KeyboardEvent, MouseEvent } from 'react';
import { CreateRoomSession, DoorStateType, TryVisitRoom } from '../../../../api';
import { LayoutBadgeImageView, LayoutRoomThumbnailView } from '../../../../common';
import { useDoorState, useNavigatorRoomInfoPopupStore } from '../../../../hooks';
import { NavigatorSearchResultItemInfoView } from './NavigatorSearchResultItemInfoView';
import { NavigatorUserCountView } from './NavigatorUserCountView';

export interface NavigatorSearchResultItemViewProps {
    roomData: RoomDataParser;
    thumbnail?: boolean;
    eventTitle?: boolean;
    stripe?: boolean;
}

export const NavigatorSearchResultItemView: FC<NavigatorSearchResultItemViewProps> = (props) => {
    const { roomData = null, thumbnail = false, eventTitle = false, stripe = false } = props;
    const { setSnapshot: setDoorData } = useDoorState();
    const title = eventTitle && roomData.roomAdName ? roomData.roomAdName : roomData.roomName;

    const doorClass = () => {
        if (roomData.doorMode === RoomDataParser.DOORBELL_STATE) return 'octane-navigator-air__door octane-navigator-air__door--doorbell';
        if (roomData.doorMode === RoomDataParser.PASSWORD_STATE) return 'octane-navigator-air__door octane-navigator-air__door--password';
        if (roomData.doorMode === RoomDataParser.INVISIBLE_STATE) return 'octane-navigator-air__door octane-navigator-air__door--invisible';

        return '';
    };

    const visitRoom = (event: MouseEvent) => {
        event.stopPropagation();
        if (roomData.ownerId !== GetSessionDataManager().userId) {
            if (roomData.habboGroupId !== 0) {
                TryVisitRoom(roomData.roomId);
                return;
            }

            switch (roomData.doorMode) {
                case RoomDataParser.DOORBELL_STATE:
                    setDoorData((prevValue) => {
                        const newValue = { ...prevValue };
                        newValue.roomInfo = roomData;
                        newValue.state = DoorStateType.START_DOORBELL;
                        return newValue;
                    });
                    return;
                case RoomDataParser.PASSWORD_STATE:
                    setDoorData((prevValue) => {
                        const newValue = { ...prevValue };
                        newValue.roomInfo = roomData;
                        newValue.state = DoorStateType.START_PASSWORD;
                        return newValue;
                    });
                    return;
            }
        }

        CreateRoomSession(roomData.roomId);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        visitRoom(event as unknown as MouseEvent);
    };

    const retargetPopup = (event: MouseEvent<HTMLElement>) => {
        useNavigatorRoomInfoPopupStore.getState().retargetIfVisible(roomData, thumbnail ? 'tile' : 'row', event.currentTarget.getBoundingClientRect());
    };

    if (thumbnail)
        return (
            <div
                role="button"
                tabIndex={0}
                aria-label={title}
                className={`octane-navigator-air__tile${stripe ? ' is-stripe' : ''}`}
                onClick={visitRoom}
                onKeyDown={handleKeyDown}
                onMouseEnter={retargetPopup}
            >
                <LayoutRoomThumbnailView className="octane-navigator-air__tile-thumb" customUrl={roomData.officialRoomPicRef} roomId={roomData.roomId}>
                    {roomData.habboGroupId > 0 && (
                        <LayoutBadgeImageView badgeCode={roomData.groupBadgeCode} className="octane-navigator-air__tile-badge" isGroup={true} />
                    )}
                    <NavigatorUserCountView userCount={roomData.userCount} maxUserCount={roomData.maxUserCount} />
                    {roomData.doorMode !== RoomDataParser.OPEN_STATE && <i className={`octane-navigator-air__tile-door ${doorClass()}`} />}
                </LayoutRoomThumbnailView>
                <div className="octane-navigator-air__tile-name">
                    <span>{title}</span>
                    <NavigatorSearchResultItemInfoView roomData={roomData} thumbnail={true} />
                </div>
            </div>
        );

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={title}
            className={`octane-navigator-air__row${stripe ? ' is-stripe' : ''}`}
            onClick={visitRoom}
            onKeyDown={handleKeyDown}
            onMouseEnter={retargetPopup}
        >
            <NavigatorUserCountView userCount={roomData.userCount} maxUserCount={roomData.maxUserCount} />
            <span className="octane-navigator-air__row-name">{title}</span>
            {roomData.doorMode !== RoomDataParser.OPEN_STATE && <i className={`octane-navigator-air__row-door ${doorClass()}`} />}
            {roomData.habboGroupId > 0 && <i className="octane-navigator-air__row-group octane-navigator-air__group" />}
            <NavigatorSearchResultItemInfoView roomData={roomData} />
        </div>
    );
};
