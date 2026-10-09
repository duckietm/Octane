import { FC, MouseEvent } from 'react';
import { DisplaySoundboardSound, SoundboardTone } from '../../hooks/soundboard/soundboardPresentation';

interface SoundboardPadViewProps {
    sound: DisplaySoundboardSound;
    disabled: boolean;
    onPlay: (sound: DisplaySoundboardSound) => void;
    hotkey?: string;
    favorite?: boolean;
    playing?: boolean;
    onToggleFavorite?: (sound: DisplaySoundboardSound) => void;
}

export const SOUNDBOARD_TONE_CLASSES: Record<SoundboardTone, string> = {
    blue: 'border-[#286889] bg-[#3d8fba] hover:bg-[#347da3]',
    green: 'border-[#327143] bg-[#4da462] hover:bg-[#438e56]',
    gold: 'border-[#8b681f] bg-[#d4a43b] hover:bg-[#bc9033]',
    purple: 'border-[#62438a] bg-[#8d65ba] hover:bg-[#7b58a4]'
};

/** The tone icon of a pad: a note, or the bars of a sound that is playing right now. */
export const SoundboardPadIcon: FC<{ tone: SoundboardTone; playing?: boolean; className?: string }> = ({ tone, playing = false, className = '' }) => (
    <span aria-hidden="true" className={`soundboard-pad__icon ${SOUNDBOARD_TONE_CLASSES[tone]} ${className}`}>
        {playing ? (
            <span className="soundboard-bars">
                <i />
                <i />
                <i />
            </span>
        ) : (
            '♪'
        )}
    </span>
);

export const SoundboardPadView: FC<SoundboardPadViewProps> = ({ sound, disabled, onPlay, hotkey, favorite = false, playing = false, onToggleFavorite }) => {
    const toggleFavorite = (event: MouseEvent) => {
        if (!onToggleFavorite) return;

        event.preventDefault();
        onToggleFavorite(sound);
    };

    return (
        <button
            type="button"
            aria-label={sound.name}
            aria-disabled={disabled}
            data-tone={sound.tone}
            data-favorite={favorite || undefined}
            data-playing={playing || undefined}
            title={sound.name}
            onClick={() => !disabled && onPlay(sound)}
            onContextMenu={toggleFavorite}
            className="soundboard-pad"
        >
            <SoundboardPadIcon tone={sound.tone} playing={playing} />
            <span className="soundboard-pad__name">{sound.name}</span>
            {favorite && <span aria-hidden="true" className="soundboard-pad__star">★</span>}
            {hotkey && <span aria-hidden="true" className="soundboard-pad__key">{hotkey}</span>}
        </button>
    );
};
