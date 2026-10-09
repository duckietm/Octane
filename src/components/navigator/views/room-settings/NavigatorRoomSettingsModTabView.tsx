import { BannedUserData, BannedUsersFromRoomEvent, RoomBannedUsersComposer, RoomModerationSettings, RoomUnbanUserComposer } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { IRoomData, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../api';
import { Button, Flex, Text, UserProfileIconView } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';
import { NavigatorRoomSettingsSectionView } from './NavigatorRoomSettingsSectionView';

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
}

export const NavigatorRoomSettingsModTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, handleChange = null } = props;
    const [selectedUserId, setSelectedUserId] = useState<number>(-1);
    const [bannedUsers, setBannedUsers] = useState<BannedUserData[]>([]);

    const unBanUser = (userId: number) => {
        setBannedUsers((prevValue) => {
            const newValue = [...prevValue];

            const index = newValue.findIndex((value) => value.userId === userId);

            if (index >= 0) newValue.splice(index, 1);

            return newValue;
        });

        SendMessageComposer(new RoomUnbanUserComposer(userId, roomData.roomId));

        setSelectedUserId(-1);
    };

    useMessageEvent<BannedUsersFromRoomEvent>(BannedUsersFromRoomEvent, (event) => {
        const parser = event.getParser();

        if (!roomData || roomData.roomId !== parser.roomId) return;

        setBannedUsers(parser.bannedUsers);
    });

    useEffect(() => {
        SendMessageComposer(new RoomBannedUsersComposer(roomData.roomId));
    }, [roomData.roomId]);

    return (
        <>
            <span className="octane-room-settings-text">
                {localizeWithFallback('navigator.roomsettings.moderation.header', LocalizeText('navigator.roomsettings.moderation'))}
            </span>
            <NavigatorRoomSettingsSectionView title={LocalizeText('navigator.roomsettings.moderation.mute.header')} gap={1}>
                <select
                    className="form-select form-select-sm"
                    value={roomData.moderationSettings.allowMute}
                    onChange={(event) => handleChange('moderation_mute', event.target.value)}
                >
                    <option value={RoomModerationSettings.MODERATION_LEVEL_NONE}>{LocalizeText('navigator.roomsettings.moderation.none')}</option>
                    <option value={RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS}>{LocalizeText('navigator.roomsettings.moderation.rights')}</option>
                </select>
            </NavigatorRoomSettingsSectionView>
            <NavigatorRoomSettingsSectionView title={LocalizeText('navigator.roomsettings.moderation.kick.header')} gap={1}>
                <select
                    className="form-select form-select-sm"
                    value={roomData.moderationSettings.allowKick}
                    onChange={(event) => handleChange('moderation_kick', event.target.value)}
                >
                    <option value={RoomModerationSettings.MODERATION_LEVEL_NONE}>{LocalizeText('navigator.roomsettings.moderation.none')}</option>
                    <option value={RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS}>{LocalizeText('navigator.roomsettings.moderation.rights')}</option>
                    <option value={RoomModerationSettings.MODERATION_LEVEL_ALL}>{LocalizeText('navigator.roomsettings.moderation.all')}</option>
                </select>
            </NavigatorRoomSettingsSectionView>
            <NavigatorRoomSettingsSectionView title={LocalizeText('navigator.roomsettings.moderation.ban.header')} gap={1}>
                <select
                    className="form-select form-select-sm"
                    value={roomData.moderationSettings.allowBan}
                    onChange={(event) => handleChange('moderation_ban', event.target.value)}
                >
                    <option value={RoomModerationSettings.MODERATION_LEVEL_NONE}>{LocalizeText('navigator.roomsettings.moderation.none')}</option>
                    <option value={RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS}>{LocalizeText('navigator.roomsettings.moderation.rights')}</option>
                </select>
            </NavigatorRoomSettingsSectionView>
            <div className="octane-room-settings-banned">
                <div className="octane-room-settings-box octane-room-settings-banned__list list-container">
                    {bannedUsers.map((user, index) => (
                        <Flex
                            key={`${user.userId}-${index}`}
                            alignItems="center"
                            gap={1}
                            overflow="hidden"
                            className={selectedUserId === user.userId ? 'octane-room-settings-banned__row is-selected' : 'octane-room-settings-banned__row'}
                        >
                            <UserProfileIconView userId={user.userId} />
                            <Text pointer grow onClick={() => setSelectedUserId(user.userId)}>
                                {user.userName}
                            </Text>
                        </Flex>
                    ))}
                </div>
                <div className="octane-room-settings-banned__side">
                    <span className="octane-room-settings-text">{`${LocalizeText('navigator.roomsettings.moderation.banned.users')} (${bannedUsers.length})`}</span>
                    <Button disabled={selectedUserId <= 0} onClick={() => unBanUser(selectedUserId)}>
                        {LocalizeText('navigator.roomsettings.moderation.unban')}{' '}
                        {selectedUserId > 0 && bannedUsers.find((user) => user.userId === selectedUserId)?.userName}
                    </Button>
                </div>
            </div>
        </>
    );
};
