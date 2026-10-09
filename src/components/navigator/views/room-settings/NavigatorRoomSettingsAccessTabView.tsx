import { RoomDataParser } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { IRoomData, LocalizeText } from '../../../../api';
import { NavigatorRoomSettingsSectionView } from './NavigatorRoomSettingsSectionView';

interface NavigatorRoomSettingsTabViewProps {
    roomData: IRoomData;
    handleChange: (field: string, value: string | number | boolean) => void;
}

export const NavigatorRoomSettingsAccessTabView: FC<NavigatorRoomSettingsTabViewProps> = (props) => {
    const { roomData = null, handleChange = null } = props;
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

    const passwordMode = roomData.lockState === RoomDataParser.PASSWORD_STATE || isTryingPassword;

    return (
        <>
            <div className="octane-room-settings-head">
                <span className="octane-room-settings-headline">{LocalizeText('navigator.roomsettings.roomaccess.caption')}</span>
                <span className="octane-room-settings-text">{LocalizeText('navigator.roomsettings.roomaccess.info')}</span>
            </div>
            <NavigatorRoomSettingsSectionView title={LocalizeText('navigator.roomsettings.doormode')} gap={1}>
                <label className="octane-room-settings-check">
                    <input
                        className="form-check-input"
                        type="radio"
                        name="lockState"
                        checked={roomData.lockState === RoomDataParser.OPEN_STATE && !isTryingPassword}
                        onChange={() => handleChange('lock_state', RoomDataParser.OPEN_STATE)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.doormode.open')}</span>
                </label>
                <label className="octane-room-settings-check">
                    <input
                        className="form-check-input"
                        type="radio"
                        name="lockState"
                        checked={roomData.lockState === RoomDataParser.DOORBELL_STATE && !isTryingPassword}
                        onChange={() => handleChange('lock_state', RoomDataParser.DOORBELL_STATE)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.doormode.doorbell')}</span>
                </label>
                <label className="octane-room-settings-check">
                    <input
                        className="form-check-input"
                        type="radio"
                        name="lockState"
                        checked={roomData.lockState === RoomDataParser.INVISIBLE_STATE && !isTryingPassword}
                        onChange={() => handleChange('lock_state', RoomDataParser.INVISIBLE_STATE)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.doormode.invisible')}</span>
                </label>
                <label className="octane-room-settings-check">
                    <input
                        className="form-check-input"
                        type="radio"
                        name="lockState"
                        checked={passwordMode}
                        onChange={(event) => setIsTryingPassword(event.target.checked)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.doormode.password')}</span>
                </label>
                {passwordMode && (
                    <div className="octane-room-settings-indent">
                        <span className="octane-room-settings-text">{LocalizeText('navigator.roomsettings.password')}</span>
                        <input
                            type="password"
                            className="form-control form-control-sm"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            onFocus={() => setIsTryingPassword(true)}
                        />
                        {isTryingPassword && password.length <= 0 && (
                            <span className="octane-room-settings-error">{LocalizeText('navigator.roomsettings.passwordismandatory')}</span>
                        )}
                        <span className="octane-room-settings-text">{LocalizeText('navigator.roomsettings.passwordconfirm')}</span>
                        <input
                            type="password"
                            className="form-control form-control-sm"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            onBlur={saveRoomPassword}
                        />
                        {isTryingPassword && password.length > 0 && password !== confirmPassword && (
                            <span className="octane-room-settings-error">{LocalizeText('navigator.roomsettings.invalidconfirm')}</span>
                        )}
                    </div>
                )}
            </NavigatorRoomSettingsSectionView>
            <NavigatorRoomSettingsSectionView title={LocalizeText('navigator.roomsettings.pets')} gap={1}>
                <label className="octane-room-settings-check">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        checked={roomData.allowPets}
                        onChange={(event) => handleChange('allow_pets', event.target.checked)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.allowpets')}</span>
                </label>
                <label className="octane-room-settings-check">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        checked={roomData.allowPetsEat}
                        onChange={(event) => handleChange('allow_pets_eat', event.target.checked)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.allowfoodconsume')}</span>
                </label>
                <label className="octane-room-settings-check">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        checked={roomData.muteAllPets}
                        onChange={(event) => handleChange('mute_all_pets', event.target.checked)}
                    />
                    <span>{LocalizeText('navigator.roomsettings.mute_all_pets')}</span>
                </label>
            </NavigatorRoomSettingsSectionView>
        </>
    );
};
