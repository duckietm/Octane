import { RoomChatSettings } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetClubMemberLevel, IRoomData, LocalizeText } from '../../../../api';
import { OctaneInput } from '../../../../layout';
import { NavigatorRoomSettingsSectionView } from './NavigatorRoomSettingsSectionView';

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
}

export const NavigatorRoomSettingsVipChatTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, handleChange = null } = props;
    const [chatDistance, setChatDistance] = useState<number>(0);
    const [idleSleepTimeoutSeconds, setIdleSleepTimeoutSeconds] = useState<string>('');
    const [idleAutokickTimeoutSeconds, setIdleAutokickTimeoutSeconds] = useState<string>('');
    const isHC = GetClubMemberLevel() > 0;
    const minimumAutokickTimeoutSeconds = Math.max(60, (Number(idleSleepTimeoutSeconds) || 30) + 30);

    useEffect(() => {
        setChatDistance(roomData.chatSettings.distance);
        setIdleSleepTimeoutSeconds(roomData.idleSleepTimeoutSeconds ? roomData.idleSleepTimeoutSeconds.toString() : '');
        setIdleAutokickTimeoutSeconds(roomData.idleAutokickTimeoutSeconds ? roomData.idleAutokickTimeoutSeconds.toString() : '');
    }, [roomData.chatSettings, roomData.idleSleepTimeoutSeconds, roomData.idleAutokickTimeoutSeconds]);

    return (
        <>
            <div className="octane-room-settings-head">
                <span className="octane-room-settings-headline">{LocalizeText('navigator.roomsettings.vip.caption')}</span>
                <span className="octane-room-settings-text">{LocalizeText('navigator.roomsettings.vip.info')}</span>
            </div>
            <NavigatorRoomSettingsSectionView title={LocalizeText('navigator.roomsettings.vip_settings')} gap={1}>
                <label className="octane-room-settings-check">
                    <input
                        checked={roomData.hideWalls}
                        className="form-check-input"
                        disabled={!isHC}
                        type="checkbox"
                        onChange={(event) => handleChange('hide_walls', event.target.checked)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.hide_walls')}</span>
                </label>
                <select
                    className="form-select form-select-sm"
                    disabled={!isHC}
                    value={roomData.wallThickness}
                    onChange={(event) => handleChange('wall_thickness', event.target.value)}
                >
                    <option value="0">{LocalizeText('navigator.roomsettings.wall_thickness.normal')}</option>
                    <option value="1">{LocalizeText('navigator.roomsettings.wall_thickness.thick')}</option>
                    <option value="-1">{LocalizeText('navigator.roomsettings.wall_thickness.thin')}</option>
                    <option value="-2">{LocalizeText('navigator.roomsettings.wall_thickness.thinnest')}</option>
                </select>
                <select
                    className="form-select form-select-sm"
                    disabled={!isHC}
                    value={roomData.floorThickness}
                    onChange={(event) => handleChange('floor_thickness', event.target.value)}
                >
                    <option value="0">{LocalizeText('navigator.roomsettings.floor_thickness.normal')}</option>
                    <option value="1">{LocalizeText('navigator.roomsettings.floor_thickness.thick')}</option>
                    <option value="-1">{LocalizeText('navigator.roomsettings.floor_thickness.thin')}</option>
                    <option value="-2">{LocalizeText('navigator.roomsettings.floor_thickness.thinnest')}</option>
                </select>
            </NavigatorRoomSettingsSectionView>
            <NavigatorRoomSettingsSectionView title={LocalizeText('navigator.roomsettings.room_behavior')} gap={1}>
                <label className="octane-room-settings-check">
                    <input
                        checked={!roomData.leaveOnDoorTileEnabled}
                        className="form-check-input"
                        type="checkbox"
                        onChange={(event) => handleChange('leave_on_door_tile_enabled', !event.target.checked)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.do_not_leave_on_door_tile')}</span>
                </label>
                <label className="octane-room-settings-check">
                    <input
                        checked={roomData.idleSleepEnabled}
                        className="form-check-input"
                        type="checkbox"
                        onChange={(event) => handleChange('idle_sleep_enabled', event.target.checked)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.idle_sleep')}</span>
                </label>
                <div className="octane-room-settings-timeout">
                    <OctaneInput
                        className="form-control-sm"
                        disabled={!roomData.idleSleepEnabled}
                        min="30"
                        max="3600"
                        type="number"
                        value={idleSleepTimeoutSeconds}
                        onBlur={(event) => {
                            const value = Math.max(30, Math.min(3600, Number(event.currentTarget.value) || 30));
                            const requiredAutokickTimeout = Math.max(60, value + 30);
                            setIdleSleepTimeoutSeconds(value.toString());

                            if (roomData.idleAutokickEnabled && (Number(idleAutokickTimeoutSeconds) || 0) < requiredAutokickTimeout) {
                                setIdleAutokickTimeoutSeconds(requiredAutokickTimeout.toString());
                                handleChange('idle_autokick_timeout_seconds', requiredAutokickTimeout);
                            }

                            handleChange('idle_sleep_timeout_seconds', value);
                        }}
                        onChange={(event) => setIdleSleepTimeoutSeconds(event.target.value)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.timeout.seconds')}</span>
                </div>
                <label className="octane-room-settings-check">
                    <input
                        checked={roomData.idleAutokickEnabled}
                        className="form-check-input"
                        type="checkbox"
                        onChange={(event) => handleChange('idle_autokick_enabled', event.target.checked)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.idle_autokick')}</span>
                </label>
                <div className="octane-room-settings-timeout">
                    <OctaneInput
                        className="form-control-sm"
                        disabled={!roomData.idleAutokickEnabled}
                        min={minimumAutokickTimeoutSeconds}
                        max="36000"
                        type="number"
                        value={idleAutokickTimeoutSeconds}
                        onBlur={(event) => {
                            const value = Math.max(
                                minimumAutokickTimeoutSeconds,
                                Math.min(36000, Number(event.currentTarget.value) || minimumAutokickTimeoutSeconds)
                            );
                            setIdleAutokickTimeoutSeconds(value.toString());
                            handleChange('idle_autokick_timeout_seconds', value);
                        }}
                        onChange={(event) => setIdleAutokickTimeoutSeconds(event.target.value)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.timeout.seconds')}</span>
                </div>
            </NavigatorRoomSettingsSectionView>
            <NavigatorRoomSettingsSectionView title={LocalizeText('navigator.roomsettings.chat_settings')} gap={1}>
                <span className="octane-room-settings-text">{LocalizeText('navigator.roomsettings.chat_settings.info')}</span>
                <select
                    className="form-select form-select-sm"
                    disabled={!isHC}
                    value={roomData.chatSettings.mode}
                    onChange={(event) => handleChange('bubble_mode', event.target.value)}
                >
                    <option value={RoomChatSettings.CHAT_MODE_FREE_FLOW}>{LocalizeText('navigator.roomsettings.chat.mode.free.flow')}</option>
                    <option value={RoomChatSettings.CHAT_MODE_LINE_BY_LINE}>{LocalizeText('navigator.roomsettings.chat.mode.line.by.line')}</option>
                </select>
                <select
                    className="form-select form-select-sm"
                    disabled={!isHC}
                    value={roomData.chatSettings.weight}
                    onChange={(event) => handleChange('chat_weight', event.target.value)}
                >
                    <option value={RoomChatSettings.CHAT_BUBBLE_WIDTH_NORMAL}>{LocalizeText('navigator.roomsettings.chat.bubbles.width.normal')}</option>
                    <option value={RoomChatSettings.CHAT_BUBBLE_WIDTH_THIN}>{LocalizeText('navigator.roomsettings.chat.bubbles.width.thin')}</option>
                    <option value={RoomChatSettings.CHAT_BUBBLE_WIDTH_WIDE}>{LocalizeText('navigator.roomsettings.chat.bubbles.width.wide')}</option>
                </select>
                <select
                    className="form-select form-select-sm"
                    disabled={!isHC}
                    value={roomData.chatSettings.speed}
                    onChange={(event) => handleChange('bubble_speed', event.target.value)}
                >
                    <option value={RoomChatSettings.CHAT_SCROLL_SPEED_FAST}>{LocalizeText('navigator.roomsettings.chat.speed.fast')}</option>
                    <option value={RoomChatSettings.CHAT_SCROLL_SPEED_NORMAL}>{LocalizeText('navigator.roomsettings.chat.speed.normal')}</option>
                    <option value={RoomChatSettings.CHAT_SCROLL_SPEED_SLOW}>{LocalizeText('navigator.roomsettings.chat.speed.slow')}</option>
                </select>
                <select
                    className="form-select form-select-sm"
                    disabled={!isHC}
                    value={roomData.chatSettings.protection}
                    onChange={(event) => handleChange('flood_protection', event.target.value)}
                >
                    <option value={RoomChatSettings.FLOOD_FILTER_LOOSE}>{LocalizeText('navigator.roomsettings.chat.flood.loose')}</option>
                    <option value={RoomChatSettings.FLOOD_FILTER_NORMAL}>{LocalizeText('navigator.roomsettings.chat.flood.normal')}</option>
                    <option value={RoomChatSettings.FLOOD_FILTER_STRICT}>{LocalizeText('navigator.roomsettings.chat.flood.strict')}</option>
                </select>
                <span className="octane-room-settings-text">{LocalizeText('navigator.roomsettings.chat_settings.hearing.distance')}</span>
                <OctaneInput
                    className="form-control-sm"
                    disabled={!isHC}
                    min="0"
                    type="number"
                    value={chatDistance}
                    onBlur={() => handleChange('chat_distance', chatDistance)}
                    onChange={(event) => setChatDistance(event.target.valueAsNumber)}
                />
            </NavigatorRoomSettingsSectionView>
        </>
    );
};
