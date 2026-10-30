import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { AirSettingsVolumeRow } from './AirSettingsVolumeRow';

interface SoundboardVolumeControlProps {
    value: number;
    onChange: (value: number) => void;
    onCommit: (value: number) => void;
}

export const SoundboardVolumeControl: FC<SoundboardVolumeControlProps> = ({ value, onChange, onCommit }) => {
    const label = localizeWithFallback('widget.memenu.settings.volume.soundboard', 'Soundboard');

    return (
        <NativeTextTree>
            <AirSettingsVolumeRow
                id="volumeSoundboard"
                label={label}
                maximumLabel={localizeWithFallback('widget.memenu.settings.volume.maximum', 'Maximum volume')}
                muteLabel={localizeWithFallback('widget.memenu.settings.volume.mute', 'Mute')}
                value={value}
                onChange={onChange}
                onCommit={onCommit}
            />
        </NativeTextTree>
    );
};
