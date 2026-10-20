import { GetSessionDataManager, RoomDataParser } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { CreateLinkEvent, IRoomData, LocalizeText, RoomSettingsSaveErrorResult } from '../../../../api';
import { Button, Column, Flex, Text } from '../../../../common';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';
import { NavigatorRoomSettingsFieldErrorView } from './NavigatorRoomSettingsFieldErrorView';
import { NavigatorRoomSettingsSectionView } from './NavigatorRoomSettingsSectionView';

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
    errors?: RoomSettingsSaveErrorResult['errors'];
}

export const NavigatorRoomSettingsAccessTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, handleChange = null, errors = {} } = props;
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isTryingPassword, setIsTryingPassword] = useState(false);

    const saveRoomPassword = () => {
        if (!isTryingPassword || password.length <= 0 || confirmPassword.length <= 0 || password !== confirmPassword) return;

        handleChange('password', password);
    };

    useEffect(() => {
        setPassword('');
        setConfirmPassword('');
        setIsTryingPassword(false);
    }, [roomData]);

    // Habbo covers the door modes with the Builders Club notice while the room is locked; moderators still see them.
    const lockedByBuildersClub = !!roomData.hiddenByBc && !GetSessionDataManager().hasSecurity(4);

    return (
        <>
            <Column gap={1}>
                <Text bold>{LocalizeText('navigator.roomsettings.roomaccess.caption')}</Text>
                <Text small>{LocalizeText('navigator.roomsettings.roomaccess.info')}</Text>
            </Column>
            <Column gap={2}>
                {lockedByBuildersClub && (
                    <Column gap={1} className="rounded border p-2">
                        <Text bold>{LocalizeText('notification.builders_club.room_locked.title')}</Text>
                        <Text small>{LocalizeText('notification.builders_club.room_locked.message')}</Text>
                        <Button onClick={() => CreateLinkEvent('habbopages/builders-club/faq')}>
                            {LocalizeText('notification.builders_club.room_locked.linkTitle')}
                        </Button>
                    </Column>
                )}
                {!lockedByBuildersClub && (
                    <NavigatorRoomSettingsSectionView title={LocalizeText('navigator.roomsettings.doormode')} gap={1}>
                        <Flex alignItems="center" gap={1}>
                            <Radio
                                name="lockState"
                                checked={roomData.lockState === RoomDataParser.OPEN_STATE && !isTryingPassword}
                                onCheckedChange={() => handleChange('lock_state', RoomDataParser.OPEN_STATE)}
                            />
                            <Text>{LocalizeText('navigator.roomsettings.doormode.open')}</Text>
                        </Flex>
                        <Flex alignItems="center" gap={1}>
                            <Radio
                                name="lockState"
                                checked={roomData.lockState === RoomDataParser.DOORBELL_STATE && !isTryingPassword}
                                onCheckedChange={() => handleChange('lock_state', RoomDataParser.DOORBELL_STATE)}
                            />
                            <Text>{LocalizeText('navigator.roomsettings.doormode.doorbell')}</Text>
                        </Flex>
                        <Flex alignItems="center" gap={1}>
                            <Radio
                                name="lockState"
                                checked={roomData.lockState === RoomDataParser.INVISIBLE_STATE && !isTryingPassword}
                                onCheckedChange={() => handleChange('lock_state', RoomDataParser.INVISIBLE_STATE)}
                            />
                            <Text>{LocalizeText('navigator.roomsettings.doormode.invisible')}</Text>
                        </Flex>
                        <Flex fullWidth gap={1}>
                            <Radio
                                name="lockState"
                                checked={roomData.lockState === RoomDataParser.PASSWORD_STATE || isTryingPassword}
                                onCheckedChange={() => setIsTryingPassword(true)}
                            />
                            {!isTryingPassword && roomData.lockState !== RoomDataParser.PASSWORD_STATE && (
                                <Text>{LocalizeText('navigator.roomsettings.doormode.password')}</Text>
                            )}
                            {(isTryingPassword || roomData.lockState === RoomDataParser.PASSWORD_STATE) && (
                                <Column gap={1}>
                                    <Text>{LocalizeText('navigator.roomsettings.doormode.password')}</Text>
                                    <input
                                        type="password"
                                        className="form-control form-control-sm"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder={LocalizeText('navigator.roomsettings.password')}
                                        onFocus={(event) => setIsTryingPassword(true)}
                                    />
                                    <NavigatorRoomSettingsFieldErrorView error={errors.password} />
                                    {!errors.password && isTryingPassword && password.length <= 0 && (
                                        <Text bold small variant="danger">
                                            {LocalizeText('navigator.roomsettings.passwordismandatory')}
                                        </Text>
                                    )}
                                    <input
                                        type="password"
                                        className="form-control form-control-sm"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        onBlur={saveRoomPassword}
                                        placeholder={LocalizeText('navigator.roomsettings.passwordconfirm')}
                                    />
                                    {isTryingPassword && password.length > 0 && password !== confirmPassword && (
                                        <Text bold small variant="danger">
                                            {LocalizeText('navigator.roomsettings.invalidconfirm')}
                                        </Text>
                                    )}
                                </Column>
                            )}
                        </Flex>
                    </NavigatorRoomSettingsSectionView>
                )}
                <NavigatorRoomSettingsSectionView title={LocalizeText('navigator.roomsettings.pets')} gap={1}>
                    <Flex alignItems="center" gap={1}>
                        <Checkbox checked={roomData.muteAllPets} onCheckedChange={(nextChecked) => handleChange('mute_all_pets', nextChecked)} />
                        <Text>{LocalizeText('navigator.roomsettings.mute_all_pets')}</Text>
                    </Flex>
                    <Flex alignItems="center" gap={1}>
                        <Checkbox checked={roomData.allowPets} onCheckedChange={(nextChecked) => handleChange('allow_pets', nextChecked)} />
                        <Text>{LocalizeText('navigator.roomsettings.allowpets')}</Text>
                    </Flex>
                    <Flex alignItems="center" gap={1}>
                        <Checkbox checked={roomData.allowPetsEat} onCheckedChange={(nextChecked) => handleChange('allow_pets_eat', nextChecked)} />
                        <Text>{LocalizeText('navigator.roomsettings.allowfoodconsume')}</Text>
                    </Flex>
                </NavigatorRoomSettingsSectionView>
            </Column>
        </>
    );
};
