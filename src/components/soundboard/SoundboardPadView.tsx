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
            className={`soundboard-pad relative flex h-14 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border-2 px-1 text-white shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${SOUNDBOARD_TONE_CLASSES[sound.tone]}`}
        >
            {hotkey && <span aria-hidden="true" className="absolute left-1 top-0.5 text-[9px] font-bold leading-none text-white/75">{hotkey}</span>}
            {favorite && <span aria-hidden="true" className="absolute right-1 top-0.5 text-[10px] leading-none text-[#ffe58a]">★</span>}
            <span aria-hidden="true" className="text-[15px] leading-none">♪</span>
            <span className="line-clamp-2 w-full break-words text-center text-[10px] font-bold leading-[1.1]">{sound.name}</span>
        </button>
    );
};
