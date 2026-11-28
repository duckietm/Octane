import { Progress } from '@base-ui/react/progress';
import { FC, MouseEvent, ReactNode } from 'react';
import { LocalizeText, localizeWithFallback } from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { HandheldSheetFrame } from '../../common/handheld/HandheldSheetFrame';
import { ToggleButton } from '../../common/ToggleButton';
import { DisplaySoundboardSound } from '../../hooks/soundboard/soundboardPresentation';

export interface HandheldSoundboardChip {
    id: string;
    label: string;
}

interface HandheldSoundboardContentViewProps {
    query: string;
    onQuery: (value: string) => void;
    chips: HandheldSoundboardChip[];
    categoryId: string;
    onCategory: (id: string) => void;
    shelfLabel: string;
    shelfSounds: DisplaySoundboardSound[];
    sounds: DisplaySoundboardSound[];
    favoriteIds: Set<number>;
    playingSoundId: number | null;
    isCoolingDown: boolean;
    cooldownPercent: number;
    silencedCount: number;
    rightsOnly: boolean;
    onPlay: (sound: DisplaySoundboardSound) => void;
    onToggleFavorite?: (sound: DisplaySoundboardSound) => void;
    onRestoreSilenced?: () => void;
}

const Bars: FC = () => (
    <span aria-hidden="true" className="soundboard-bars">
        <i />
        <i />
        <i />
    </span>
);

/** A pad of the phone grid: the tile plays at once on a tap; the star in its corner keeps it on the shelf. */
const PadTile: FC<{
    sound: DisplaySoundboardSound;
    favorite: boolean;
    playing: boolean;
    disabled: boolean;
    onPlay: (sound: DisplaySoundboardSound) => void;
    onToggleFavorite?: (sound: DisplaySoundboardSound) => void;
}> = ({ sound, favorite, playing, disabled, onPlay, onToggleFavorite }) => {
    const toggleFavorite = (event: MouseEvent) => {
        if (!onToggleFavorite) return;

        event.preventDefault();
        onToggleFavorite(sound);
    };

    return (
        <div className="octane-handheld-rx-sb__pad" data-favorite={favorite || undefined} data-playing={playing || undefined} data-tone={sound.tone}>
            <BaseButton
                aria-disabled={disabled}
                aria-label={sound.name}
                className="octane-handheld-rx-sb__pad-play"
                onClick={() => !disabled && onPlay(sound)}
                onContextMenu={toggleFavorite}
            >
                <span aria-hidden="true" className="octane-handheld-rx-sb__pad-icon">
                    {playing ? <Bars /> : '♪'}
                </span>
                <span className="octane-handheld-rx-sb__pad-name">{sound.name}</span>
            </BaseButton>
            {onToggleFavorite && (
                <ToggleButton
                    aria-label={localizeWithFallback('octane.handheld.room_extras.soundboard.favourite', 'Favourite: %sound%', ['sound'], [sound.name])}
                    className="octane-handheld-rx-sb__star"
                    pressed={favorite}
                    onClick={() => onToggleFavorite(sound)}
                >
                    <svg aria-hidden="true" viewBox="0 0 16 16">
                        <path d="M8 1.6 L9.9 5.6 L14.3 6.1 L11 9.1 L11.9 13.5 L8 11.3 L4.1 13.5 L5 9.1 L1.7 6.1 L6.1 5.6 Z" />
                    </svg>
                </ToggleButton>
            )}
        </div>
    );
};

/**
 * The soundboard's content on a phone (SoundboardContentView keeps the search, the category and the shelf and hands
 * them here): a 16 px search pill, the shelf of favourites (or recent sounds) as a row of named pills, the categories
 * as chips that scroll sideways, and every sound of the choice as a finger-sized tile in a grid that scrolls; a tap
 * plays at once (no paging, no hotkeys on a phone), the star of a tile is the desktop's right click.
 */
export const HandheldSoundboardContentView: FC<HandheldSoundboardContentViewProps> = (props) => {
    const {
        query,
        onQuery,
        chips,
        categoryId,
        onCategory,
        shelfLabel,
        shelfSounds,
        sounds,
        favoriteIds,
        playingSoundId,
        isCoolingDown,
        cooldownPercent,
        silencedCount,
        rightsOnly,
        onPlay,
        onToggleFavorite,
        onRestoreSilenced
    } = props;

    return (
        <>
            <div className="octane-handheld-rx__toolbar">
                <span aria-hidden="true" className="octane-handheld-rx__search-icon" />
                <input
                    aria-label={LocalizeText('soundboard.search')}
                    className="octane-handheld-rx__input is-search"
                    enterKeyHint="search"
                    placeholder={LocalizeText('soundboard.search')}
                    type="search"
                    value={query}
                    onChange={(event) => onQuery(event.target.value)}
                />
            </div>
            <div aria-label={LocalizeText('soundboard.categories')} className="octane-handheld-rx__chips" role="group">
                {chips.map((chip) => (
                    <ToggleButton key={chip.id} className="octane-handheld-rx__chip" pressed={chip.id === categoryId} onClick={() => onCategory(chip.id)}>
                        {chip.label}
                    </ToggleButton>
                ))}
            </div>
            <Progress.Root
                aria-label={LocalizeText('soundboard.cooldown')}
                className="octane-handheld-rx-sb__cooldown"
                data-cooling={isCoolingDown || undefined}
                max={100}
                min={0}
                value={cooldownPercent}
            >
                <Progress.Track className="octane-handheld-rx-sb__cooldown-track">
                    <Progress.Indicator className="octane-handheld-rx-sb__cooldown-fill" />
                </Progress.Track>
            </Progress.Root>
            <div className="octane-handheld-rx__scroll octane-handheld-rx-sb__scroll">
                {!query.trim() && !!shelfSounds.length && (
                    <div className="octane-handheld-rx-sb__shelf" data-testid="soundboard-shelf">
                        <span className="octane-handheld-rx-sb__shelf-label">{shelfLabel}</span>
                        <div className="octane-handheld-rx-sb__shelf-row">
                            {shelfSounds.map((sound) => (
                                <BaseButton
                                    key={sound.id}
                                    aria-disabled={isCoolingDown}
                                    aria-label={sound.name}
                                    className="octane-handheld-rx-sb__shelf-pill"
                                    data-playing={sound.id === playingSoundId || undefined}
                                    data-tone={sound.tone}
                                    onClick={() => !isCoolingDown && onPlay(sound)}
                                >
                                    <span aria-hidden="true" className="octane-handheld-rx-sb__shelf-dot">
                                        {sound.id === playingSoundId ? <Bars /> : '♪'}
                                    </span>
                                    <span className="octane-handheld-rx-sb__shelf-name">{sound.name}</span>
                                </BaseButton>
                            ))}
                        </div>
                    </div>
                )}
                {!sounds.length ? (
                    <p className="octane-handheld-rx__empty">{LocalizeText('soundboard.empty')}</p>
                ) : (
                    <div className="octane-handheld-rx-sb__grid" data-testid="soundboard-grid">
                        {sounds.map((sound) => (
                            <PadTile
                                key={sound.id}
                                disabled={isCoolingDown}
                                favorite={favoriteIds.has(sound.id)}
                                playing={sound.id === playingSoundId}
                                sound={sound}
                                onPlay={onPlay}
                                onToggleFavorite={onToggleFavorite}
                            />
                        ))}
                    </div>
                )}
                {silencedCount > 0 && (
                    <div className="octane-handheld-rx-sb__note">
                        <span>{LocalizeText('soundboard.silenced.count', ['count'], [String(silencedCount)])}</span>
                        <BaseButton className="octane-handheld-rx__link" onClick={onRestoreSilenced}>
                            {LocalizeText('soundboard.silenced.restore')}
                        </BaseButton>
                    </div>
                )}
                {rightsOnly && <p className="octane-handheld-rx__hint is-centred">{LocalizeText('soundboard.room.mode.rights')}</p>}
                <p className="octane-handheld-rx__hint is-centred">
                    {localizeWithFallback('octane.handheld.room_extras.soundboard.hint', 'Tap a pad to play it. The star keeps it on your shelf.')}
                </p>
            </div>
        </>
    );
};

interface HandheldSoundboardViewProps {
    onClose: () => void;
    children?: ReactNode;
}

/**
 * The soundboard's frame on a phone: the sheet frame as a panel over the room (above the toolbar strip upright, at the
 * right edge on its side), so the room and who plays stay in view.
 */
export const HandheldSoundboardView: FC<HandheldSoundboardViewProps> = ({ onClose, children = null }) => (
    <div className="octane-handheld-rx-dock" data-testid="handheld-soundboard">
        <HandheldSheetFrame
            className="octane-handheld-rx octane-handheld-rx-sb"
            icon="icon-soundboard"
            title={LocalizeText('soundboard.title')}
            onClose={onClose}
        >
            {children}
        </HandheldSheetFrame>
    </div>
);
