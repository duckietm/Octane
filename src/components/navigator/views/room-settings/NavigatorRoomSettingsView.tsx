import { RoomBannedUsersComposer, RoomDataParser, RoomSettingsDataEvent, SaveRoomSettingsComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { CreateLinkEvent, IRoomData, LocalizeText, SendMessageComposer } from '../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';
import { NavigatorRoomSettingsAccessTabView } from './NavigatorRoomSettingsAccessTabView';
import { NavigatorRoomSettingsBasicTabView } from './NavigatorRoomSettingsBasicTabView';
import { NavigatorRoomSettingsModTabView } from './NavigatorRoomSettingsModTabView';
import { NavigatorRoomSettingsRightsTabView } from './NavigatorRoomSettingsRightsTabView';
import { NavigatorRoomSettingsVipChatTabView } from './NavigatorRoomSettingsVipChatTabView';

const TABS: string[] = [
    'navigator.roomsettings.tab.1',
    'navigator.roomsettings.tab.2',
    'navigator.roomsettings.tab.3',
    'navigator.roomsettings.tab.4',
    'navigator.roomsettings.tab.5'
];

export const NavigatorRoomSettingsView: FC<{}> = (props) => {
    const [roomData, setRoomData] = useState<IRoomData>(null);
    const [currentTab, setCurrentTab] = useState(TABS[0]);

    useMessageEvent<RoomSettingsDataEvent>(RoomSettingsDataEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const data = parser.data;

        setRoomData({
            roomId: data.roomId,
            roomName: data.name,
            roomDescription: data.description,
            categoryId: data.categoryId,
            userCount: data.maximumVisitorsLimit,
            tags: data.tags,
            tradeState: data.tradeMode,
            allowWalkthrough: data.allowWalkThrough,
            allowUnderpass: data.allowUnderpass,
            muteAllPets: data.muteAllPets,
            leaveOnDoorTileEnabled: data.leaveOnDoorTileEnabled,
            idleSleepEnabled: data.idleSleepEnabled,
            idleSleepTimeoutSeconds: data.idleSleepTimeoutSeconds,
            idleAutokickEnabled: data.idleAutokickEnabled,
            idleAutokickTimeoutSeconds: data.idleAutokickTimeoutSeconds,
            lockState: data.doorMode,
            password: null,
            allowPets: data.allowPets,
            allowPetsEat: data.allowFoodConsume,
            hideWalls: data.hideWalls,
            wallThickness: data.wallThickness,
            floorThickness: data.floorThickness,
            chatSettings: {
                mode: data.chatSettings.mode,
                weight: data.chatSettings.weight,
                speed: data.chatSettings.speed,
                distance: data.chatSettings.distance,
                protection: data.chatSettings.protection
            },
            moderationSettings: {
                allowMute: data.roomModerationSettings.allowMute,
                allowKick: data.roomModerationSettings.allowKick,
                allowBan: data.roomModerationSettings.allowBan
            }
        });

        SendMessageComposer(new RoomBannedUsersComposer(data.roomId));
    });

    const onClose = () => {
        setRoomData(null);
        setCurrentTab(TABS[0]);
    };

    const handleChange = (field: string, value: string | number | boolean | string[]) => {
        setRoomData((prevValue) => {
            const newValue = { ...prevValue };

            switch (field) {
                case 'name':
                    newValue.roomName = String(value);
                    break;
                case 'description':
                    newValue.roomDescription = String(value);
                    break;
                case 'category':
                    newValue.categoryId = Number(value);
                    break;
                case 'max_visitors':
                    newValue.userCount = Number(value);
                    break;
                case 'trade_state':
                    newValue.tradeState = Number(value);
                    break;
                case 'tags':
                    newValue.tags = value as Array<string>;
                    break;
                case 'allow_walkthrough':
                    newValue.allowWalkthrough = Boolean(value);
                    break;
                case 'allow_underpass':
                    newValue.allowUnderpass = Boolean(value);
                    break;
                case 'mute_all_pets':
                    newValue.muteAllPets = Boolean(value);
                    break;
                case 'leave_on_door_tile_enabled':
                    newValue.leaveOnDoorTileEnabled = Boolean(value);
                    break;
                case 'idle_sleep_enabled':
                    newValue.idleSleepEnabled = Boolean(value);
                    break;
                case 'idle_sleep_timeout_seconds':
                    newValue.idleSleepTimeoutSeconds = Number(value);
                    break;
                case 'idle_autokick_enabled':
                    newValue.idleAutokickEnabled = Boolean(value);
                    break;
                case 'idle_autokick_timeout_seconds':
                    newValue.idleAutokickTimeoutSeconds = Number(value);
                    break;
                case 'allow_pets':
                    newValue.allowPets = Boolean(value);
                    break;
                case 'allow_pets_eat':
                    newValue.allowPetsEat = Boolean(value);
                    break;
                case 'hide_walls':
                    newValue.hideWalls = Boolean(value);
                    break;
                case 'wall_thickness':
                    newValue.wallThickness = Number(value);
                    break;
                case 'floor_thickness':
                    newValue.floorThickness = Number(value);
                    break;
                case 'lock_state':
                    newValue.lockState = Number(value);
                    break;
                case 'password':
                    newValue.lockState = RoomDataParser.PASSWORD_STATE;
                    newValue.password = String(value);
                    break;
                case 'moderation_mute':
                    newValue.moderationSettings.allowMute = Number(value);
                    break;
                case 'moderation_kick':
                    newValue.moderationSettings.allowKick = Number(value);
                    break;
                case 'moderation_ban':
                    newValue.moderationSettings.allowBan = Number(value);
                    break;
                case 'bubble_mode':
                    newValue.chatSettings.mode = Number(value);
                    break;
                case 'chat_weight':
                    newValue.chatSettings.weight = Number(value);
                    break;
                case 'bubble_speed':
                    newValue.chatSettings.speed = Number(value);
                    break;
                case 'flood_protection':
                    newValue.chatSettings.protection = Number(value);
                    break;
                case 'chat_distance':
                    newValue.chatSettings.distance = Number(value);
                    break;
            }

            SendMessageComposer(
                new SaveRoomSettingsComposer(
                    newValue.roomId,
                    newValue.roomName,
                    newValue.roomDescription,
                    newValue.lockState,
                    newValue.password,
                    Math.max(1, Math.min(200, Number(newValue.userCount) || 1)),
                    newValue.categoryId,
                    newValue.tags.length,
                    newValue.tags,
                    newValue.tradeState,
                    newValue.allowPets,
                    newValue.allowPetsEat,
                    newValue.allowWalkthrough,
                    newValue.hideWalls,
                    newValue.wallThickness,
                    newValue.floorThickness,
                    newValue.moderationSettings.allowMute,
                    newValue.moderationSettings.allowKick,
                    newValue.moderationSettings.allowBan,
                    newValue.chatSettings.mode,
                    newValue.chatSettings.weight,
                    newValue.chatSettings.speed,
                    Math.max(1, Math.min(99, Number(newValue.chatSettings.distance) || 1)),
                    newValue.chatSettings.protection,
                    newValue.allowUnderpass,
                    newValue.muteAllPets,
                    newValue.leaveOnDoorTileEnabled,
                    newValue.idleSleepEnabled,
                    newValue.idleSleepEnabled ? Math.max(30, Math.min(3600, Number(newValue.idleSleepTimeoutSeconds) || 30)) : 0,
                    newValue.idleAutokickEnabled,
                    newValue.idleAutokickEnabled
                        ? Math.max(
                              newValue.idleSleepEnabled ? (Number(newValue.idleSleepTimeoutSeconds) || 30) + 30 : 60,
                              Math.min(36000, Number(newValue.idleAutokickTimeoutSeconds) || 60)
                          )
                        : 0
                )
            );

            return newValue;
        });
    };

    if (!roomData) return null;

    return (
        <OctaneCardView
            className="octane-room-settings min-w-0 w-[min(341px,calc(100vw-16px))] h-[min(520px,calc(100vh-16px))] max-w-[calc(100vw-16px)]"
            isResizable={false}
            uniqueKey="octane-room-settings"
        >
            <OctaneCardHeaderView
                headerText={LocalizeText('navigator.roomsettings')}
                isInfoToHabboPages={currentTab === TABS[3]}
                onClickInfoHabboPages={() => {
                    if (currentTab === TABS[3]) CreateLinkEvent('habbopages/chat/options');
                }}
                onCloseClick={onClose}
            />
            <OctaneCardTabsView>
                {TABS.map((tab) => {
                    return (
                        <OctaneCardTabsItemView key={tab} isActive={currentTab === tab} onClick={(event) => setCurrentTab(tab)}>
                            {LocalizeText(tab)}
                        </OctaneCardTabsItemView>
                    );
                })}
            </OctaneCardTabsView>
            <OctaneCardContentView overflow="auto">
                {currentTab === TABS[0] && <NavigatorRoomSettingsBasicTabView handleChange={handleChange} roomData={roomData} onClose={onClose} />}
                {currentTab === TABS[1] && <NavigatorRoomSettingsAccessTabView handleChange={handleChange} roomData={roomData} />}
                {currentTab === TABS[2] && <NavigatorRoomSettingsRightsTabView handleChange={handleChange} roomData={roomData} />}
                {currentTab === TABS[3] && <NavigatorRoomSettingsVipChatTabView handleChange={handleChange} roomData={roomData} />}
                {currentTab === TABS[4] && <NavigatorRoomSettingsModTabView handleChange={handleChange} roomData={roomData} />}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
