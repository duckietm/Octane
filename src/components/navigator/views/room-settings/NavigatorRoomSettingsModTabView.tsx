import {
    BannedUserData,
    BannedUsersFromRoomEvent,
    RoomBannedUsersComposer,
    RoomModerationSettings,
    RoomUnbanUserComposer,
    UserUnbannedFromRoomEvent
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { IRoomData, LocalizeText, SendMessageComposer } from '../../../../api';
import { BaseButton, Button, Column, Flex, Grid, Text, UserProfileIconView } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';
import { NavigatorRoomSettingsSectionView } from './NavigatorRoomSettingsSectionView';
import { Select } from '../../../../common/Select';

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

    // AIR's RoomSettingsCtrl drops an unbanned user from the list as the server confirms it,
    // including an unban made by someone else with rights while the window is open.
    useMessageEvent<UserUnbannedFromRoomEvent>(UserUnbannedFromRoomEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !roomData || roomData.roomId !== parser.roomId) return;

        setBannedUsers((prevValue) => prevValue.filter((user) => user.userId !== parser.userId));
        setSelectedUserId((prevValue) => (prevValue === parser.userId ? -1 : prevValue));
    });

    useEffect(() => {
        SendMessageComposer(new RoomBannedUsersComposer(roomData.roomId));
    }, [roomData.roomId]);

    return (
        <Grid>
            <Column size={6}>
                <NavigatorRoomSettingsSectionView
                    title={`${LocalizeText('navigator.roomsettings.moderation.banned.users')} (${bannedUsers.length})`}
                    gap={1}
                    className="h-full"
                >
                    <Flex overflow="hidden" className="octane-card-panel list-container p-2">
                        <Column fullWidth overflow="auto" gap={1}>
                            {bannedUsers &&
                                bannedUsers.length > 0 &&
                                bannedUsers.map((user, index) => {
                                    return (
                                        <Flex key={index} shrink alignItems="center" gap={1} overflow="hidden">
                                            <UserProfileIconView userId={user.userId} />
                                            <Text
                                                pointer
                                                grow
                                                className="border-0 bg-transparent p-0 text-left"
                                                component={BaseButton}
                                                onClick={(event) => setSelectedUserId(user.userId)}
                                            >
                                                {' '}
                                                {user.userName}
                                            </Text>
                                        </Flex>
                                    );
                                })}
                        </Column>
                    </Flex>
                    <Button disabled={selectedUserId <= 0} onClick={(event) => unBanUser(selectedUserId)}>
                        {LocalizeText('navigator.roomsettings.moderation.unban')}{' '}
                        {selectedUserId > 0 && bannedUsers.find((user) => user.userId === selectedUserId)?.userName}
                    </Button>
                </NavigatorRoomSettingsSectionView>
            </Column>
            <Column size={6}>
                <NavigatorRoomSettingsSectionView title={LocalizeText('navigator.roomsettings.moderation')} gap={2} className="h-full">
                    <Column gap={1}>
                        <Text bold small>
                            {LocalizeText('navigator.roomsettings.moderation.mute.header')}
                        </Text>
                        <Select
                            className="form-select form-select-sm"
                            value={roomData.moderationSettings.allowMute}
                            onChange={(event) => handleChange('moderation_mute', event.target.value)}
                        >
                            <option value={RoomModerationSettings.MODERATION_LEVEL_NONE}>{LocalizeText('navigator.roomsettings.moderation.none')}</option>
                            <option value={RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS}>
                                {LocalizeText('navigator.roomsettings.moderation.rights')}
                            </option>
                        </Select>
                    </Column>
                    <Column gap={1}>
                        <Text bold small>
                            {LocalizeText('navigator.roomsettings.moderation.kick.header')}
                        </Text>
                        <Select
                            className="form-select form-select-sm"
                            value={roomData.moderationSettings.allowKick}
                            onChange={(event) => handleChange('moderation_kick', event.target.value)}
                        >
                            <option value={RoomModerationSettings.MODERATION_LEVEL_NONE}>{LocalizeText('navigator.roomsettings.moderation.none')}</option>
                            <option value={RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS}>
                                {LocalizeText('navigator.roomsettings.moderation.rights')}
                            </option>
                            <option value={RoomModerationSettings.MODERATION_LEVEL_ALL}>{LocalizeText('navigator.roomsettings.moderation.all')}</option>
                        </Select>
                    </Column>
                    <Column gap={1}>
                        <Text bold small>
                            {LocalizeText('navigator.roomsettings.moderation.ban.header')}
                        </Text>
                        <Select
                            className="form-select form-select-sm"
                            value={roomData.moderationSettings.allowBan}
                            onChange={(event) => handleChange('moderation_ban', event.target.value)}
                        >
                            <option value={RoomModerationSettings.MODERATION_LEVEL_NONE}>{LocalizeText('navigator.roomsettings.moderation.none')}</option>
                            <option value={RoomModerationSettings.MODERATION_LEVEL_USER_WITH_RIGHTS}>
                                {LocalizeText('navigator.roomsettings.moderation.rights')}
                            </option>
                        </Select>
                    </Column>
                </NavigatorRoomSettingsSectionView>
            </Column>
        </Grid>
    );
};
