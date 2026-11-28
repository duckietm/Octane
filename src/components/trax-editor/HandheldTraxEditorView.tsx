import { ITraxEditorSong } from '@octane/renderer';
import { CSSProperties, FC, MouseEvent, PointerEventHandler, ReactNode, RefObject, useEffect, useState } from 'react';
import { GetDiskColor, localizeWithFallback } from '../../api';
import { GetTraxCartridgeUrl } from '../../assets/images/trax';
import { LayoutCurrencyIcon } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { DraggableWindow } from '../../common/draggable-window';
import { HandheldSheetFrame } from '../../common/handheld/HandheldSheetFrame';
import { ToggleButton } from '../../common/ToggleButton';
import { useHandheldLayout } from '../../hooks/handheld/useHandheldLayout';
import { ITraxPlacement, TRAX_CHANNEL_COUNT, TRAX_MAX_UNITS, TRAX_MIN_UNITS, TraxChannels } from './TraxSongData';
import { GetTraxSoundSetForSample, ITraxSoundSet, TraxSoundSets } from './TraxSoundSets';

/** One unit (two seconds) of the phone timeline: wide enough to tap. */
export const HANDHELD_TRAX_CELL_WIDTH = 36;

/** The colours of the four tracks; the same as the desktop machine's. */
const TRACK_COLORS = ['#e0433c', '#3f8fe0', '#43c243', '#e0c23c'];

const stamp = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

type TraxPage = 'songs' | 'editor' | 'sets';

export interface HandheldTraxScrubHandlers {
    onPointerDown: PointerEventHandler<HTMLDivElement>;
    onPointerMove: PointerEventHandler<HTMLDivElement>;
    onPointerUp: PointerEventHandler<HTMLDivElement>;
    onPointerCancel: PointerEventHandler<HTMLDivElement>;
}

export interface HandheldTraxEditorViewProps {
    songs: ITraxEditorSong[];
    loaded: boolean;
    emptySlots: number;
    editingSongId: number;
    canBuy: boolean;
    costAmount: number;
    costCurrency: number;
    errorText: string;
    songName: string;
    isDirty: boolean;
    slotSets: number[];
    slotSamples: number[];
    activeSlot: number;
    channels: TraxChannels;
    songLength: number;
    isPlaying: boolean;
    playheadUnit: number;
    playheadRef: RefObject<HTMLDivElement | null>;
    scrub: HandheldTraxScrubHandlers;
    onOpenSong: (song: ITraxEditorSong) => void;
    onBuy: () => void;
    onRename: (name: string) => void;
    onSave: () => void;
    onDelete: () => void;
    onActiveSlot: (slot: number) => void;
    onSelectSample: (slot: number, sampleIndex: number) => void;
    onLoadCartridge: (cd: number) => void;
    onChannelClick: (event: MouseEvent<HTMLDivElement>, channel: number) => void;
    onRemovePlacement: (channel: number, placement: ITraxPlacement) => void;
    onTogglePlay: () => void;
    onStop: () => void;
    onRewind: () => void;
    onShift: (delta: number) => void;
    onClear: () => void;
    onShorten: () => void;
    onLengthen: () => void;
    onClose: () => void;
}

const Icon: FC<{ d: string; fill?: boolean }> = ({ d, fill = false }) => (
    <svg aria-hidden="true" className={`octane-handheld-rx-trax__glyph${fill ? ' is-filled' : ''}`} viewBox="0 0 16 16">
        <path d={d} />
    </svg>
);

const GLYPHS = {
    play: 'M5 3 L13 8 L5 13 Z',
    pause: 'M4.5 3 H7 V13 H4.5 Z M9 3 H11.5 V13 H9 Z',
    stop: 'M4 4 H12 V12 H4 Z',
    rewind: 'M4 3 V13 M13 3 L6 8 L13 13 Z',
    left: 'M3 3 V13 M13 8 H6 M9 5 L6 8 L9 11',
    right: 'M13 3 V13 M3 8 H10 M7 5 L10 8 L7 11',
    erase: 'M6 13 H14 M3 10 L8 5 L11 8 L7.5 11.5 Q7 12 6.3 12 H5 Z',
    bin: 'M3 4.5 H13 M6 4.5 V3 H10 V4.5 M4.5 4.5 L5.3 13 H10.7 L11.5 4.5',
    clear: 'M2.5 4 H13.5 V12 H2.5 Z M6 6 L10 10 M10 6 L6 10',
    save: 'M3 3 H11 L13 5 V13 H3 Z M5.5 3 V6 H10 V3 M5.5 13 V9.5 H10.5 V13',
    minus: 'M4 8 H12',
    plus: 'M4 8 H12 M8 4 V12',
    back: 'M10 3 L5 8 L10 13',
    next: 'M6 3 L11 8 L6 13'
};

/** The picture of a sound set: its cartridge, or a block in its colour. */
const Cartridge: FC<{ set: ITraxSoundSet | undefined; className?: string }> = ({ set, className = '' }) => {
    const url = set ? GetTraxCartridgeUrl(set.cd) : '';

    return url ? (
        <img alt="" className={`octane-handheld-rx-trax__cartridge ${className}`.trim()} draggable={false} src={url} />
    ) : (
        <span
            className={`octane-handheld-rx-trax__cartridge is-block ${className}`.trim()}
            style={{ '--trax-set': set?.color ?? '#cacaca' } as CSSProperties}
        />
    );
};

const BackButton: FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
    <BaseButton className="octane-handheld-rx__back" onClick={onClick}>
        <svg aria-hidden="true" className="octane-handheld-rx__chevron" viewBox="0 0 16 16">
            <path d={GLYPHS.back} />
        </svg>
        {label}
    </BaseButton>
);

/**
 * The trax machine on a phone: a sheet in three pages. Songs: the owned songs as rows (disk colour, name, length), the
 * new-song button with its price and the empty slots. Editor: the name (16 px) with save and delete, the four tracks as
 * chips, the sound set of the chosen track (its own page of cartridge tiles) and its nine sounds as pads, the timeline as
 * a grid of 36 px cells that scrolls sideways inside its box (a tap places the chosen sound, Erase makes a tap take a
 * block away), the shift / clear tools and a bar with play, stop, back to start, erase and the length. On its side the
 * sounds stand at the left of the timeline. TraxEditorView keeps the song, the preview and every packet.
 */
export const HandheldTraxEditorView: FC<HandheldTraxEditorViewProps> = (props) => {
    const {
        songs,
        loaded,
        emptySlots,
        editingSongId,
        canBuy,
        costAmount,
        costCurrency,
        errorText,
        songName,
        isDirty,
        slotSets,
        slotSamples,
        activeSlot,
        channels,
        songLength,
        isPlaying,
        playheadUnit,
        playheadRef,
        scrub,
        onOpenSong,
        onBuy,
        onRename,
        onSave,
        onDelete,
        onActiveSlot,
        onSelectSample,
        onLoadCartridge,
        onChannelClick,
        onRemovePlacement,
        onTogglePlay,
        onStop,
        onRewind,
        onShift,
        onClear,
        onShorten,
        onLengthen,
        onClose
    } = props;
    const { orientation } = useHandheldLayout();
    const [page, setPage] = useState<TraxPage>(editingSongId >= 0 ? 'editor' : 'songs');
    const [erasing, setErasing] = useState(false);
    const text = (key: string, fallback: string, keys?: string[], values?: string[]) => localizeWithFallback(key, fallback, keys, values);
    const activeSet = TraxSoundSets[slotSets[activeSlot] - 1];
    const trackLabel = (slot: number) => text('octane.handheld.room_extras.trax.track', 'Track %number%', ['number'], [String(slot + 1)]);

    // A song opened (picked, or bought and opened) goes to the editor; a deleted one back to the list.
    useEffect(() => {
        setPage(editingSongId >= 0 ? 'editor' : 'songs');
    }, [editingSongId]);

    const openSong = (song: ITraxEditorSong) => {
        if (song.id === editingSongId) setPage('editor');
        else onOpenSong(song);
    };

    const songsPage = (
        <div className="octane-handheld-rx__scroll" data-testid="handheld-trax-songs">
            <div className="octane-handheld-rx__section-title">{text('trax.editor.my.songs', 'My songs')}</div>
            <div className="octane-handheld-rx-trax__songs">
                {loaded &&
                    songs.map((song) => (
                        <BaseButton
                            key={song.id}
                            className="octane-handheld-rx-trax__song"
                            data-open={song.id === editingSongId || undefined}
                            onClick={() => openSong(song)}
                        >
                            <span
                                aria-hidden="true"
                                className="octane-handheld-rx-trax__disk"
                                style={{ '--trax-disk': GetDiskColor(song.data) } as CSSProperties}
                            />
                            <span className="octane-handheld-rx-trax__song-text">
                                <span className="octane-handheld-rx-trax__song-name">{song.name}</span>
                                <span className="octane-handheld-rx-trax__song-length">♪ {stamp(song.length)}</span>
                            </span>
                            <svg aria-hidden="true" className="octane-handheld-rx__chevron" viewBox="0 0 16 16">
                                <path d={GLYPHS.next} />
                            </svg>
                        </BaseButton>
                    ))}
                {loaded &&
                    Array.from({ length: emptySlots }, (_, index) =>
                        index === 0 ? (
                            <BaseButton key="buy" className="octane-handheld-rx-trax__buy" disabled={!canBuy} onClick={onBuy}>
                                <span aria-hidden="true" className="octane-handheld-rx-trax__buy-plus">
                                    <Icon d={GLYPHS.plus} />
                                </span>
                                <span className="octane-handheld-rx-trax__song-name">{text('trax.editor.buy.song', 'New song')}</span>
                                {costAmount > 0 && (
                                    <span className="octane-handheld-rx-trax__price">
                                        {costAmount}
                                        <LayoutCurrencyIcon type={costCurrency} />
                                    </span>
                                )}
                            </BaseButton>
                        ) : (
                            <div key={`empty-${index}`} className="octane-handheld-rx-trax__empty-slot">
                                <span aria-hidden="true" className="octane-handheld-rx-trax__disk is-empty" />
                                {text('trax.editor.empty.slot', 'Empty slot')}
                            </div>
                        )
                    )}
            </div>
            {!!errorText && (
                <p className="octane-handheld-rx__error" role="alert">
                    {errorText}
                </p>
            )}
            {editingSongId < 0 && loaded && (
                <p className="octane-handheld-rx__hint is-centred">
                    {text('octane.handheld.room_extras.trax.pick_song', 'Pick a song, or buy a new one, to start composing.')}
                </p>
            )}
        </div>
    );

    const setsPage = (
        <div className="octane-handheld-rx__scroll" data-testid="handheld-trax-sets">
            <div className="octane-handheld-rx__page-head">
                <BackButton label={text('octane.handheld.room_extras.back', 'Back')} onClick={() => setPage('editor')} />
                <span className="octane-handheld-rx__page-title">
                    {text('octane.handheld.room_extras.trax.sets_for', 'Sound set for track %number%', ['number'], [String(activeSlot + 1)])}
                </span>
            </div>
            <div className="octane-handheld-rx-trax__sets">
                {TraxSoundSets.map((set) => (
                    <ToggleButton
                        key={set.cd}
                        className="octane-handheld-rx-trax__set"
                        pressed={slotSets[activeSlot] === set.cd}
                        onClick={() => {
                            onLoadCartridge(set.cd);
                            setPage('editor');
                        }}
                    >
                        <Cartridge set={set} />
                        <span className="octane-handheld-rx-trax__set-title">{set.title}</span>
                        <span className="octane-handheld-rx-trax__set-artist">{set.artist}</span>
                    </ToggleButton>
                ))}
            </div>
        </div>
    );

    const sounds = (
        <div className="octane-handheld-rx-trax__sounds">
            <div aria-label={text('octane.handheld.room_extras.trax.tracks', 'Tracks')} className="octane-handheld-rx-trax__tracks" role="group">
                {Array.from({ length: TRAX_CHANNEL_COUNT }, (_, slot) => {
                    const set = TraxSoundSets[slotSets[slot] - 1];

                    return (
                        <ToggleButton
                            key={slot}
                            aria-label={`${trackLabel(slot)}: ${set?.title ?? ''}`}
                            className="octane-handheld-rx-trax__track"
                            pressed={activeSlot === slot}
                            style={{ '--trax-track': TRACK_COLORS[slot] } as CSSProperties}
                            onClick={() => onActiveSlot(slot)}
                        >
                            <span className="octane-handheld-rx-trax__track-number">{slot + 1}</span>
                            <Cartridge set={set} className="is-small" />
                            <span className="octane-handheld-rx-trax__track-title">{set?.title ?? ''}</span>
                        </ToggleButton>
                    );
                })}
            </div>
            <BaseButton className="octane-handheld-rx-trax__set-button" data-testid="trax-open-sets" onClick={() => setPage('sets')}>
                <Cartridge set={activeSet} />
                <span className="octane-handheld-rx-trax__set-button-text">
                    <span className="octane-handheld-rx-trax__set-title">{activeSet?.title ?? ''}</span>
                    <span className="octane-handheld-rx-trax__set-artist">{text('octane.handheld.room_extras.trax.sets', 'Sound sets')}</span>
                </span>
                <svg aria-hidden="true" className="octane-handheld-rx__chevron" viewBox="0 0 16 16">
                    <path d={GLYPHS.next} />
                </svg>
            </BaseButton>
            <div className="octane-handheld-rx-trax__samples" style={{ '--trax-track': TRACK_COLORS[activeSlot] } as CSSProperties}>
                {(activeSet?.sampleLengths ?? []).map((length, index) => (
                    <ToggleButton
                        key={index}
                        aria-label={`#${index + 1}, ${length * 2}s`}
                        className="octane-handheld-rx-trax__sample"
                        pressed={slotSamples[activeSlot] === index}
                        onClick={() => onSelectSample(activeSlot, index)}
                    >
                        <span className="octane-handheld-rx-trax__sample-number">{index + 1}</span>
                        <span className="octane-handheld-rx-trax__sample-length">{length * 2}s</span>
                    </ToggleButton>
                ))}
            </div>
        </div>
    );

    const timeline = (
        <div className="octane-handheld-rx-trax__timeline" data-erasing={erasing || undefined} data-testid="handheld-trax-timeline">
            <div
                className="octane-handheld-rx-trax__lane"
                style={{ width: songLength * HANDHELD_TRAX_CELL_WIDTH, '--trax-cell': `${HANDHELD_TRAX_CELL_WIDTH}px` } as CSSProperties}
            >
                <div ref={playheadRef} className="octane-handheld-rx-trax__playhead" style={{ left: playheadUnit * HANDHELD_TRAX_CELL_WIDTH }} />
                <div
                    aria-label={text('trax.editor.scrub.hint', 'Click or drag to set the play position')}
                    className="octane-handheld-rx-trax__ruler"
                    role="slider"
                    aria-valuemin={0}
                    aria-valuemax={Math.max(0, songLength - 1)}
                    aria-valuenow={playheadUnit}
                    aria-valuetext={stamp(playheadUnit * 2)}
                    {...scrub}
                >
                    {Array.from({ length: Math.floor(songLength / 5) }, (_, index) => (
                        <span key={index} className="octane-handheld-rx-trax__stamp" style={{ left: (index + 1) * 5 * HANDHELD_TRAX_CELL_WIDTH }}>
                            {stamp((index + 1) * 10)}
                        </span>
                    ))}
                </div>
                {Array.from({ length: TRAX_CHANNEL_COUNT }, (_, channel) => (
                    <div
                        key={channel}
                        className="octane-handheld-rx-trax__channel"
                        data-active={channel === activeSlot || undefined}
                        data-testid={`trax-channel-${channel}`}
                        style={{ '--trax-track': TRACK_COLORS[channel] } as CSSProperties}
                        onClick={(event) => {
                            if (erasing) return;

                            onActiveSlot(channel);
                            onChannelClick(event, channel);
                        }}
                    >
                        {channels[channel].map((placement) => {
                            const cd = GetTraxSoundSetForSample(placement.sampleId);
                            const sampleNumber = placement.sampleId - (cd - 1) * 9;

                            return (
                                <div
                                    key={`${placement.position}-${placement.sampleId}`}
                                    className="octane-handheld-rx-trax__block"
                                    style={{ left: placement.position * HANDHELD_TRAX_CELL_WIDTH, width: placement.length * HANDHELD_TRAX_CELL_WIDTH }}
                                    onClick={(event) => {
                                        event.stopPropagation();

                                        if (erasing) onRemovePlacement(channel, placement);
                                    }}
                                    onContextMenu={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        onRemovePlacement(channel, placement);
                                    }}
                                >
                                    {sampleNumber}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );

    const tools = (
        <div className="octane-handheld-rx-trax__tools">
            <BaseButton aria-label={text('trax.editor.shift.left', 'Move left')} className="octane-handheld-rx__chip is-tool" onClick={() => onShift(-1)}>
                <Icon d={GLYPHS.left} />
                <span className="octane-handheld-rx-trax__tool-text">{text('trax.editor.shift.left', 'Move left')}</span>
            </BaseButton>
            <BaseButton aria-label={text('trax.editor.shift.right', 'Move right')} className="octane-handheld-rx__chip is-tool" onClick={() => onShift(1)}>
                <span className="octane-handheld-rx-trax__tool-text">{text('trax.editor.shift.right', 'Move right')}</span>
                <Icon d={GLYPHS.right} />
            </BaseButton>
            <BaseButton aria-label={text('trax.editor.clear', 'Clear')} className="octane-handheld-rx__chip is-tool is-danger" onClick={onClear}>
                <Icon d={GLYPHS.clear} />
                <span className="octane-handheld-rx-trax__tool-text">{text('trax.editor.clear', 'Clear')}</span>
            </BaseButton>
        </div>
    );

    const transport = (
        <div className="octane-handheld-rx__bar octane-handheld-rx-trax__transport">
            <BaseButton
                aria-label={isPlaying ? text('trax.editor.stop', 'Stop') : text('trax.editor.play', 'Play')}
                className="octane-handheld-rx-trax__key is-play"
                data-playing={isPlaying || undefined}
                onClick={onTogglePlay}
            >
                <Icon fill d={isPlaying ? GLYPHS.pause : GLYPHS.play} />
            </BaseButton>
            <BaseButton aria-label={text('trax.editor.stop', 'Stop')} className="octane-handheld-rx-trax__key" disabled={!isPlaying} onClick={onStop}>
                <Icon fill d={GLYPHS.stop} />
            </BaseButton>
            <BaseButton
                aria-label={text('trax.editor.rewind', 'Back to start')}
                className="octane-handheld-rx-trax__key"
                disabled={!isPlaying && playheadUnit === 0}
                onClick={onRewind}
            >
                <Icon fill d={GLYPHS.rewind} />
            </BaseButton>
            <ToggleButton
                aria-label={text('octane.handheld.room_extras.trax.erase', 'Erase: a tap takes a block away')}
                className="octane-handheld-rx-trax__key is-erase"
                pressed={erasing}
                onClick={() => setErasing((value) => !value)}
            >
                <Icon d={GLYPHS.erase} />
            </ToggleButton>
            <span className="octane-handheld-rx-trax__length">
                <BaseButton
                    aria-label={`${text('trax.editor.length', 'Length')} -`}
                    className="octane-handheld-rx-trax__key is-small"
                    disabled={songLength <= TRAX_MIN_UNITS}
                    onClick={onShorten}
                >
                    <Icon d={GLYPHS.minus} />
                </BaseButton>
                <span className="octane-handheld-rx-trax__length-value">
                    <span className="octane-handheld-rx-trax__length-label">{text('trax.editor.length', 'Length')}</span>
                    {stamp(songLength * 2)}
                </span>
                <BaseButton
                    aria-label={`${text('trax.editor.length', 'Length')} +`}
                    className="octane-handheld-rx-trax__key is-small"
                    disabled={songLength >= TRAX_MAX_UNITS}
                    onClick={onLengthen}
                >
                    <Icon d={GLYPHS.plus} />
                </BaseButton>
            </span>
        </div>
    );

    const head = (
        <div className="octane-handheld-rx-trax__head">
            <BaseButton aria-label={text('trax.editor.my.songs', 'My songs')} className="octane-handheld-rx-trax__icon-button" onClick={() => setPage('songs')}>
                <svg aria-hidden="true" className="octane-handheld-rx__chevron" viewBox="0 0 16 16">
                    <path d={GLYPHS.back} />
                </svg>
            </BaseButton>
            <input
                aria-label={text('octane.handheld.room_extras.trax.name', 'Song name')}
                className="octane-handheld-rx__input"
                enterKeyHint="done"
                maxLength={64}
                type="text"
                value={songName}
                onChange={(event) => onRename(event.target.value)}
            />
            <BaseButton
                aria-label={text('trax.editor.save', 'Save')}
                className="octane-handheld-rx-trax__icon-button is-save"
                disabled={!isDirty}
                onClick={onSave}
            >
                <Icon d={GLYPHS.save} />
            </BaseButton>
            <BaseButton aria-label={text('trax.editor.delete', 'Delete')} className="octane-handheld-rx-trax__icon-button is-delete" onClick={onDelete}>
                <Icon d={GLYPHS.bin} />
            </BaseButton>
        </div>
    );

    let content: ReactNode = songsPage;

    if (page === 'sets' && editingSongId >= 0) content = setsPage;
    else if (page === 'editor' && editingSongId >= 0)
        content = (
            <div className="octane-handheld-rx-trax__editor" data-orientation={orientation} data-testid="handheld-trax-editor">
                {orientation === 'landscape' ? (
                    <>
                        <div className="octane-handheld-rx__scroll octane-handheld-rx-trax__left">{sounds}</div>
                        <div className="octane-handheld-rx-trax__right">
                            <div className="octane-handheld-rx-trax__top">
                                {head}
                                {tools}
                            </div>
                            {timeline}
                            {transport}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="octane-handheld-rx__scroll octane-handheld-rx-trax__stack">
                            {head}
                            {sounds}
                            {tools}
                            {timeline}
                            <p className="octane-handheld-rx__hint is-centred">
                                {erasing
                                    ? text('octane.handheld.room_extras.trax.erase_hint', 'Tap a block to take it away.')
                                    : text('octane.handheld.room_extras.trax.place_hint', 'Tap a track to place the chosen sound.')}
                            </p>
                        </div>
                        {transport}
                    </>
                )}
            </div>
        );

    return (
        <DraggableWindow handheldSheet uniqueKey="trax-editor">
            <HandheldSheetFrame
                className="octane-handheld-rx octane-handheld-rx-trax"
                icon="icon-soundboard"
                title={text('trax.editor.title', 'Trax Machine')}
                onClose={onClose}
            >
                {content}
            </HandheldSheetFrame>
        </DraggableWindow>
    );
};
