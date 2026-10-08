import { FC } from 'react';
import { DisplaySoundboardSound } from '../../hooks/soundboard/soundboardPresentation';
import { SOUNDBOARD_TONE_CLASSES } from './SoundboardPadView';

interface SoundboardShelfViewProps {
    label: string;
    sounds: DisplaySoundboardSound[];
    disabled: boolean;
    playingSoundId?: number | null;
    onPlay: (sound: DisplaySoundboardSound) => void;
}

/** A short row of round buttons above the list: the pads a player reaches for most. */
export const SoundboardShelfView: FC<SoundboardShelfViewProps> = ({ label, sounds, disabled, playingSoundId = null, onPlay }) => (
    <div className="soundboard-shelf" data-testid="soundboard-shelf">
        <span className="soundboard-shelf__label">{label}</span>
        <div className="soundboard-shelf__row">
            {sounds.map((sound) => (
                <button
                    key={sound.id}
                    type="button"
                    aria-label={sound.name}
                    aria-disabled={disabled}
                    data-playing={sound.id === playingSoundId || undefined}
                    title={sound.name}
                    onClick={() => !disabled && onPlay(sound)}
                    className={`soundboard-shelf__button ${SOUNDBOARD_TONE_CLASSES[sound.tone]}`}
                >
                    ♪
                </button>
            ))}
        </div>
    </div>
);
