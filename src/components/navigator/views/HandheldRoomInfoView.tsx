import { FC } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../api';
import weblinkIcon from '../../../assets/images/navigator/air/icon-weblink.png';
import removeRightsIcon from '../../../assets/images/navigator/air/remove-rights.png';
import { LayoutBadgeImageView, LayoutRoomThumbnailView } from '../../../common';
import { BaseButton } from '../../../common/BaseButton';
import { DraggableWindow } from '../../../common/draggable-window';
import { HandheldSheetFrame } from '../../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { ToggleButton } from '../../../common/ToggleButton';
import { HandheldRsChevron } from './room-settings/HandheldRoomSettingsParts';

/** What the room info shows of the room the player is in (the navigator's entered guest room). */
export interface HandheldRoomInfoRoom {
    roomId: number;
    roomName: string;
    ownerId: number;
    ownerName: string;
    showOwner: boolean;
    description: string;
    officialRoomPicRef: string;
    habboGroupId: number;
    groupBadgeCode: string;
    groupName: string;
}

/** Which of the desktop's buttons this player gets, worked out by NavigatorRoomInfoView exactly as for its own window. */
export interface HandheldRoomInfoAccess {
    settings: boolean;
    camera: boolean;
    favourite: boolean;
    removeRights: boolean;
    raidProtection: boolean;
    floorPlan: boolean;
    staffPick: boolean;
    housekeeping: boolean;
}

interface HandheldRoomInfoViewProps {
    room: HandheldRoomInfoRoom;
    rating: number;
    isHome: boolean;
    isFavourite: boolean;
    isPicked: boolean;
    isMuted: boolean;
    access: HandheldRoomInfoAccess;
    /** The desktop's processAction: the same actions by the same names. */
    onAction: (action: string) => void;
    onHousekeeping: () => void;
}

/**
 * The room info on a phone: one sheet in the Octane handheld look. The room as a card (picture with the thumbnail
 * camera, name, home toggle, owner, rating, description), the quick links (room link, group, favourite, giving up own
 * rights) as chips, the owner's and staff tools as a list of rows, and reporting the room as the red action at the end.
 * Every button calls the desktop view's own action.
 */
export const HandheldRoomInfoView: FC<HandheldRoomInfoViewProps> = (props) => {
    const { room, rating, isHome, isFavourite, isPicked, isMuted, access, onAction, onHousekeeping } = props;
    const tools: { id: string; label: string; onClick: () => void }[] = [];
    const homeLabel = LocalizeText('navigator.room.popup.room.info.home');

    if (access.settings) tools.push({ id: 'open_room_settings', label: LocalizeText('navigator.roomsettings'), onClick: () => onAction('open_room_settings') });
    if (access.raidProtection)
        tools.push({
            id: 'raid_protection',
            label: localizeWithFallback('raid.protection.settings.button', 'Raid protection'),
            onClick: () => onAction('raid_protection')
        });
    if (access.settings) tools.push({ id: 'room_filter', label: LocalizeText('navigator.roomsettings.roomfilter'), onClick: () => onAction('room_filter') });
    if (access.floorPlan)
        tools.push({ id: 'open_floorplan_editor', label: LocalizeText('open.floor.plan.editor'), onClick: () => onAction('open_floorplan_editor') });
    if (access.staffPick)
        tools.push({
            id: 'toggle_pick',
            label: LocalizeText(isPicked ? 'navigator.staffpicks.unpick' : 'navigator.staffpicks.pick'),
            onClick: () => onAction('toggle_pick')
        });
    if (access.settings)
        tools.push({
            id: 'toggle_mute',
            label: LocalizeText(isMuted ? 'navigator.muteall_on' : 'navigator.muteall_off'),
            onClick: () => onAction('toggle_mute')
        });
    if (access.housekeeping) tools.push({ id: 'housekeeping', label: LocalizeText('housekeeping.menu.open_room'), onClick: onHousekeeping });

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="navigator-room-info">
                <HandheldSheetFrame
                    className="octane-handheld-rs is-info"
                    icon="icon-rooms"
                    title={LocalizeText('navigator.roomsettings.roominfo')}
                    onClose={() => onAction('close')}
                >
                    <div className="octane-handheld-rs__page octane-handheld-rs__info" data-testid="room-info">
                        <div className="octane-handheld-rs__info-hero">
                            <div className="octane-handheld-rs__info-picture">
                                <LayoutRoomThumbnailView
                                    className="octane-handheld-rs__info-thumbnail"
                                    customUrl={room.officialRoomPicRef}
                                    roomId={room.roomId}
                                />
                                {access.camera && (
                                    <BaseButton
                                        aria-label={LocalizeText('navigator.thumbnail.camera.title')}
                                        className="octane-handheld-rs__info-camera"
                                        onClick={() => onAction('open_room_thumbnail_camera')}
                                    >
                                        <span aria-hidden="true" className="octane-icon icon-camera-small" />
                                    </BaseButton>
                                )}
                            </div>
                            <div className="octane-handheld-rs__info-text">
                                <div className="octane-handheld-rs__info-head">
                                    <h3 className="octane-handheld-rs__info-name">{room.roomName}</h3>
                                    <ToggleButton
                                        aria-label={homeLabel}
                                        className="octane-handheld-rs__info-home"
                                        pressed={isHome}
                                        onClick={() => onAction('set_home_room')}
                                    >
                                        <span aria-hidden="true" className="octane-icon icon-house-small" />
                                    </ToggleButton>
                                </div>
                                <dl className="octane-handheld-rs__info-facts">
                                    {room.showOwner && (
                                        <div>
                                            <dt>{LocalizeText('navigator.roomownercaption')}</dt>
                                            <dd>{room.ownerName}</dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt>{LocalizeText('navigator.roomrating')}</dt>
                                        <dd>{rating}</dd>
                                    </div>
                                </dl>
                                {!!room.description && <p className="octane-handheld-rs__info-description">{room.description}</p>}
                            </div>
                        </div>
                        <div className="octane-handheld-rs__info-side">
                            <div className="octane-handheld-rs__chips">
                                <BaseButton className="octane-handheld-rs__chip" onClick={() => onAction('toggle_room_link')}>
                                    <img alt="" src={weblinkIcon} />
                                    {LocalizeText('navigator.embed.caption')}
                                </BaseButton>
                                {access.favourite && (
                                    <ToggleButton className="octane-handheld-rs__chip" pressed={isFavourite} onClick={() => onAction('room_favourite')}>
                                        <span aria-hidden="true" className={`octane-icon ${isFavourite ? 'icon-group-favorite' : 'icon-group-not-favorite'}`} />
                                        {LocalizeText('navigator.room.popup.room.info.favorite')}
                                    </ToggleButton>
                                )}
                                {access.removeRights && (
                                    <BaseButton className="octane-handheld-rs__chip" onClick={() => onAction('remove_rights')}>
                                        <img alt="" height={22} src={removeRightsIcon} width={17} />
                                        {LocalizeText('navigator.roominfo.removerights.tooltip')}
                                    </BaseButton>
                                )}
                            </div>
                            {room.habboGroupId > 0 && (
                                <BaseButton className="octane-handheld-rs__info-group" onClick={() => onAction('open_group_info')}>
                                    <span className="octane-handheld-rs__info-badge">
                                        <LayoutBadgeImageView badgeCode={room.groupBadgeCode} isGroup={true} />
                                    </span>
                                    <span className="octane-handheld-rs__info-group-name">
                                        {LocalizeText('navigator.guildbase', ['groupName'], [room.groupName])}
                                    </span>
                                    <HandheldRsChevron />
                                </BaseButton>
                            )}
                            {tools.length > 0 && (
                                <div className="octane-handheld-rs__card octane-handheld-rs__tools" role="group">
                                    {tools.map((tool) => (
                                        <BaseButton key={tool.id} className="octane-handheld-rs__tool" data-action={tool.id} onClick={tool.onClick}>
                                            <span className="octane-handheld-rs__tool-label">{tool.label}</span>
                                            <HandheldRsChevron />
                                        </BaseButton>
                                    ))}
                                </div>
                            )}
                            <BaseButton className="octane-handheld-rs__report" onClick={() => onAction('report_room')}>
                                {LocalizeText('help.emergency.main.report.room')}
                            </BaseButton>
                        </div>
                    </div>
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
