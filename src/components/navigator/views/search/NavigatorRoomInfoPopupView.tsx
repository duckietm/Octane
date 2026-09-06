import { GetSessionDataManager, RoomSettingsComposer, UpdateHomeRoomMessageComposer } from '@octane/renderer';
import { FC } from 'react';
import { FriendlyTime, GetConfigurationValue, GetGroupInformation, GetUserProfile, LocalizeText, ReportType, SendMessageComposer } from '../../../../api';
import { LayoutBadgeImageView, LayoutRoomThumbnailView, UserProfileIconView } from '../../../../common';
import { useHelp, useNavigatorData, useNavigatorFavourite, useNavigatorRoomInfoPopupStore, useNavigatorUiStore } from '../../../../hooks';
import { classNames } from '../../../../layout';

const getTradeModeText = (tradeMode: number) => {
    switch (tradeMode) {
        case 1:
            return LocalizeText('trading.mode.controller');
        case 2:
            return LocalizeText('trading.mode.free');
        default:
            return LocalizeText('trading.mode.not.allowed');
    }
};

export const NavigatorRoomInfoPopupView: FC<{}> = () => {
    const room = useNavigatorRoomInfoPopupStore((state) => state.room);
    const visible = useNavigatorRoomInfoPopupStore((state) => state.visible);
    const x = useNavigatorRoomInfoPopupStore((state) => state.x);
    const y = useNavigatorRoomInfoPopupStore((state) => state.y);
    const { navigatorData } = useNavigatorData();
    const { isFavourite, toggle: toggleFavourite } = useNavigatorFavourite(room?.roomId ?? 0);
    const { report = null } = useHelp();

    if (!visible || !room) return null;

    const hasGroup = room.groupBadgeCode?.length > 0;
    const showOwner = room.showOwner && room.ownerName?.length > 0;
    const hasActiveRoomAd = room.roomAdExpiresInMin > 0;
    const rankingEnabled = GetConfigurationValue<boolean>('room.ranking.enabled', false);
    const roomReportingEnabled = GetConfigurationValue<boolean>('room.report.enabled', true);
    const isOwner = GetSessionDataManager().userId === room.ownerId;

    const closePopup = () => useNavigatorRoomInfoPopupStore.getState().hide();

    const searchTag = (tag: string) => {
        useNavigatorUiStore.getState().setSearch('hotel_view', `tag:${tag}`);
        closePopup();
    };

    const bubbleStyle = { left: x, top: y, width: 374, transform: 'translateY(-50%)' };

    return (
        <div
            role="dialog"
            aria-label={LocalizeText('navigator.room.info.popup.title')}
            className="octane-navigator-air__room-bubble"
            style={bubbleStyle}
            onMouseEnter={() => useNavigatorRoomInfoPopupStore.getState().setHovered(true)}
            onMouseLeave={() => useNavigatorRoomInfoPopupStore.getState().setHovered(false)}
            onClick={(event) => event.stopPropagation()}
        >
            <div className="octane-navigator-air__room-bubble-content">
                <div className="octane-navigator-air__room-popover-header">
                    <LayoutRoomThumbnailView className="octane-navigator-air__room-popover-thumbnail" customUrl={room.officialRoomPicRef} roomId={room.roomId}>
                        {hasGroup && <LayoutBadgeImageView badgeCode={room.groupBadgeCode} className="octane-navigator-air__room-badge" isGroup={true} />}
                    </LayoutRoomThumbnailView>
                    <div className="octane-navigator-air__room-popover-copy">
                        <div className="octane-navigator-air__room-popover-title">{room.roomName}</div>
                        {room.description && <div className="octane-navigator-air__room-popover-description">{room.description}</div>}
                    </div>
                </div>
                {(showOwner || hasGroup) && (
                    <div className="octane-navigator-air__room-popover-owner-row">
                        {showOwner && (
                            <button
                                type="button"
                                className="octane-navigator-air__room-owner"
                                onClick={() => {
                                    GetUserProfile(room.ownerId);
                                    closePopup();
                                }}
                            >
                                <UserProfileIconView userId={room.ownerId} />
                                <span>{room.ownerName}</span>
                            </button>
                        )}
                        {hasGroup && (
                            <button
                                type="button"
                                className="octane-navigator-air__room-group"
                                onClick={() => {
                                    GetGroupInformation(room.habboGroupId);
                                    closePopup();
                                }}
                            >
                                <i className="octane-navigator-air__group" />
                                <span>{room.groupName}</span>
                            </button>
                        )}
                    </div>
                )}
                <div className="octane-navigator-air__room-popover-details">
                    <div className="octane-navigator-air__room-popover-properties">
                        <span className="is-label">{LocalizeText('navigator.roompopup.property.trading')}</span>
                        <span>{getTradeModeText(room.tradeMode)}</span>
                        {rankingEnabled && (
                            <>
                                <span className="is-label">{LocalizeText('navigator.roompopup.property.ranking')}</span>
                                <span>{room.ranking}</span>
                            </>
                        )}
                        <span className="is-label">{LocalizeText('navigator.roompopup.property.max_users')}</span>
                        <span>{room.maxUserCount}</span>
                    </div>
                    <div className="octane-navigator-air__room-popover-actions">
                        <button type="button" onClick={() => toggleFavourite()}>
                            <i className={classNames('icon icon-navigator-favorite-room', isFavourite ? 'active' : '')} />
                            <span>{LocalizeText('navigator.room.popup.room.info.favorite')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (navigatorData?.homeRoomId !== room.roomId) {
                                    SendMessageComposer(new UpdateHomeRoomMessageComposer(room.roomId));
                                }
                            }}
                        >
                            <i className={classNames('icon icon-navigator-my-room', navigatorData?.homeRoomId === room.roomId ? 'active' : '')} />
                            <span>{LocalizeText('navigator.room.popup.room.info.home')}</span>
                        </button>
                        {isOwner && (
                            <button
                                type="button"
                                onClick={() => {
                                    SendMessageComposer(new RoomSettingsComposer(room.roomId));
                                    closePopup();
                                }}
                            >
                                <i className="icon icon-navigator-room-settings" />
                                <span>{LocalizeText('navigator.room.popup.info.room.settings')}</span>
                            </button>
                        )}
                        {roomReportingEnabled && !isOwner && (
                            <button
                                type="button"
                                onClick={() => {
                                    report?.(ReportType.ROOM, { roomId: room.roomId, roomName: room.roomName });
                                    closePopup();
                                }}
                            >
                                <i className="icon icon-navigator-room-report" />
                                <span>{LocalizeText('navigator.room.popup.report.room')}</span>
                            </button>
                        )}
                    </div>
                </div>
                {room.tags && room.tags.length > 0 && (
                    <div className="octane-navigator-air__room-popover-tags">
                        {room.tags.map((tag) => (
                            <button key={tag} type="button" className="octane-navigator-air__tag" onClick={() => searchTag(tag)}>
                                #{tag}
                            </button>
                        ))}
                    </div>
                )}
                {hasActiveRoomAd && (
                    <div className="octane-navigator-air__room-popover-event">
                        <i className="octane-navigator-air__room-popover-event-icon" aria-hidden="true" />
                        <div className="octane-navigator-air__room-popover-event-copy">
                            <span className="octane-navigator-air__room-popover-event-name">
                                {LocalizeText('navigator.eventsettings.name')}: {room.roomAdName}
                            </span>
                            <span className="octane-navigator-air__room-popover-event-description">
                                {LocalizeText('navigator.eventsettings.desc')}: {room.roomAdDescription}
                                <br />
                                {LocalizeText('roomad.event.expiration_time')} {FriendlyTime.format(room.roomAdExpiresInMin * 60)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
