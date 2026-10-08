import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText } from '../../api';
import { useSoundboard } from '../../hooks';
import { useSoundboardFeedStore } from '../../hooks/soundboard/soundboardFeedStore';
import {
    DisplaySoundboardSound,
    filterSoundboardSounds,
    SoundboardCategory
} from '../../hooks/soundboard/soundboardPresentation';
import { OctaneCard } from '../../layout';
import { SoundboardPadView } from './SoundboardPadView';

const PAGE_SIZE = 10;
const PLAYING_MS = 1_500;

const isTypingTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

interface SoundboardContentViewProps {
    sounds: DisplaySoundboardSound[];
    categories: SoundboardCategory[];
    recentSoundIds: number[];
    favoriteIds?: number[];
    isCoolingDown: boolean;
    cooldownRemainingSeconds?: number;
    cooldownTotalSeconds?: number;
    playingSoundId?: number | null;
    silencedCount?: number;
    rightsOnly?: boolean;
    onPlay: (sound: DisplaySoundboardSound) => void;
    onToggleFavorite?: (sound: DisplaySoundboardSound) => void;
    onRestoreSilenced?: () => void;
}

export const SoundboardContentView: FC<SoundboardContentViewProps> = ({
    sounds,
    categories,
    recentSoundIds,
    favoriteIds = [],
    isCoolingDown,
    cooldownRemainingSeconds = 0,
    cooldownTotalSeconds = 0,
    playingSoundId = null,
    silencedCount = 0,
    rightsOnly = false,
    onPlay,
    onToggleFavorite,
    onRestoreSilenced
}) => {
    const [query, setQuery] = useState('');
    const [categoryId, setCategoryId] = useState('all');
    const [page, setPage] = useState(0);
    const searchRef = useRef<HTMLInputElement>(null);
    const filteredSounds = useMemo(
        () => filterSoundboardSounds(sounds, query, categoryId, recentSoundIds, favoriteIds),
        [sounds, query, categoryId, recentSoundIds, favoriteIds]
    );
    const totalPages = Math.max(1, Math.ceil(filteredSounds.length / PAGE_SIZE));
    const pageSounds = filteredSounds.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
    const cooldownPercent = isCoolingDown && cooldownTotalSeconds > 0
        ? Math.min(100, Math.round((cooldownRemainingSeconds / cooldownTotalSeconds) * 100))
        : 0;

    useEffect(() => setPage(0), [query, categoryId, sounds, recentSoundIds]);

    useEffect(() => {
        if (page >= totalPages) setPage(totalPages - 1);
    }, [page, totalPages]);

    useEffect(() => {
        if (categoryId === 'favorites' && !favoriteIds.length) setCategoryId('all');
    }, [categoryId, favoriteIds.length]);

    const changePage = (delta: number) => setPage((current) => Math.min(totalPages - 1, Math.max(0, current + delta)));

    // Shortcuts while the panel is open: 1-9 and 0 play the visible pads, arrows page, "/" searches.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.altKey || event.metaKey || isTypingTarget(event.target)) return;

            if (event.key === '/') {
                event.preventDefault();
                searchRef.current?.focus();
                return;
            }

            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                changePage(event.key === 'ArrowLeft' ? -1 : 1);
                return;
            }

            if (/^[0-9]$/.test(event.key)) {
                const sound = pageSounds[(Number(event.key) + 9) % 10];
                if (!sound || isCoolingDown) return;

                event.preventDefault();
                onPlay(sound);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    });

    const selectCategory = (value: string) => {
        setCategoryId(value);
        setPage(0);
    };

    const categoryClassName = (value: string) => `shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
        categoryId === value
            ? 'border-[#286889] bg-[#3d8fba] text-white'
            : 'border-[#8ca9b8] bg-white/70 text-[#28566f] hover:bg-white'
    }`;

    return (
        <div className="flex flex-col gap-2">
            <input
                ref={searchRef}
                type="search"
                value={query}
                aria-label={LocalizeText('soundboard.search')}
                placeholder={`${LocalizeText('soundboard.search')}  ( / )`}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Escape' && event.currentTarget.blur()}
                className="h-8 w-full rounded-md border border-[#8ca9b8] bg-white px-2.5 text-xs text-[#17384b] outline-none focus:border-[#3d8fba] focus:ring-1 focus:ring-[#3d8fba]"
            />

            <div className="flex gap-1.5 overflow-x-auto pb-0.5" aria-label={LocalizeText('soundboard.categories')}>
                {!!favoriteIds.length && (
                    <button type="button" onClick={() => selectCategory('favorites')} className={categoryClassName('favorites')}>
                        ★ {LocalizeText('soundboard.category.favorites')}
                    </button>
                )}
                <button type="button" onClick={() => selectCategory('all')} className={categoryClassName('all')}>
                    {LocalizeText('soundboard.category.all')}
                </button>
                {!!recentSoundIds.length && (
                    <button type="button" onClick={() => selectCategory('recent')} className={categoryClassName('recent')}>
                        {LocalizeText('soundboard.category.recent')}
                    </button>
                )}
                {categories.map((category) => (
                    <button key={category.id} type="button" onClick={() => selectCategory(category.id)} className={categoryClassName(category.id)}>
                        {category.label}
                    </button>
                ))}
            </div>

            {!filteredSounds.length ? (
                <div className="py-4 text-center text-xs text-black/50">{LocalizeText('soundboard.empty')}</div>
            ) : (
                <div
                    className="grid grid-cols-5 gap-1.5"
                    data-testid="soundboard-grid"
                    onWheel={(event) => totalPages > 1 && event.deltaY !== 0 && changePage(event.deltaY > 0 ? 1 : -1)}
                >
                    {pageSounds.map((sound, index) => (
                        <SoundboardPadView
                            key={sound.id}
                            sound={sound}
                            hotkey={String((index + 1) % 10)}
                            favorite={favoriteSet.has(sound.id)}
                            playing={sound.id === playingSoundId}
                            disabled={isCoolingDown}
                            onPlay={onPlay}
                            onToggleFavorite={onToggleFavorite}
                        />
                    ))}
                </div>
            )}

            <div
                className="soundboard-cooldown"
                role="progressbar"
                aria-label={LocalizeText('soundboard.cooldown')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={cooldownPercent}
            >
                <div className="soundboard-cooldown__fill" style={{ width: `${cooldownPercent}%` }} />
            </div>

            {totalPages > 1 && (
                <div className="flex select-none items-center justify-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, index) => (
                        <button
                            key={index}
                            type="button"
                            aria-label={LocalizeText('soundboard.pagination.page', ['page'], [String(index + 1)])}
                            aria-current={index === page ? 'page' : undefined}
                            onClick={() => setPage(index)}
                            className={`h-2 w-2 cursor-pointer rounded-full transition-colors ${index === page ? 'bg-[#3d8fba]' : 'bg-[#9bb7c7] hover:bg-[#6f98b0]'}`}
                        />
                    ))}
                </div>
            )}

            {silencedCount > 0 && (
                <div className="soundboard-silenced text-black/60">
                    <span>{LocalizeText('soundboard.silenced.count', ['count'], [String(silencedCount)])}</span>
                    <button type="button" className="soundboard-silenced__restore" onClick={onRestoreSilenced}>
                        {LocalizeText('soundboard.silenced.restore')}
                    </button>
                </div>
            )}

            {rightsOnly && <div className="text-center text-[10px] text-black/60">{LocalizeText('soundboard.room.mode.rights')}</div>}

            <div className="text-center text-[10px] text-black/45">{LocalizeText('soundboard.hint')}</div>
        </div>
    );
};

export const SoundboardView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const {
        enabled,
        roomMode,
        sounds,
        categories,
        recentSoundIds,
        favoriteIds,
        silencedUserIds,
        isCoolingDown,
        cooldownRemainingSeconds,
        cooldownTotalSeconds,
        play,
        toggleFavorite,
        restoreSilencedUsers,
        refresh
    } = useSoundboard();
    const lastPlayed = useSoundboardFeedStore((state) => state.lastPlayed);
    const [playingSoundId, setPlayingSoundId] = useState<number | null>(null);
    const wasVisibleRef = useRef(false);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');
                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((current) => !current);
                        return;
                }
            },
            eventUrlPrefix: 'soundboard/'
        };

        AddLinkEventTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        if (!enabled) setIsVisible(false);
    }, [enabled]);

    useEffect(() => {
        const visible = isVisible && enabled;

        if (visible && !wasVisibleRef.current) refresh();
        wasVisibleRef.current = visible;
    }, [enabled, isVisible, refresh]);

    useEffect(() => {
        if (!lastPlayed) return;

        setPlayingSoundId(lastPlayed.soundId);
        const timer = window.setTimeout(() => setPlayingSoundId(null), PLAYING_MS);

        return () => window.clearTimeout(timer);
    }, [lastPlayed]);

    if (!isVisible || !enabled) return null;

    return (
        <OctaneCard className="w-[420px] max-w-[96vw]" uniqueKey="soundboard">
            <OctaneCard.Header headerText={LocalizeText('soundboard.title')} onCloseClick={() => setIsVisible(false)} />
            <OctaneCard.Content>
                <SoundboardContentView
                    sounds={sounds}
                    categories={categories}
                    recentSoundIds={recentSoundIds}
                    favoriteIds={favoriteIds}
                    isCoolingDown={isCoolingDown}
                    cooldownRemainingSeconds={cooldownRemainingSeconds}
                    cooldownTotalSeconds={cooldownTotalSeconds}
                    playingSoundId={playingSoundId}
                    silencedCount={silencedUserIds.length}
                    rightsOnly={roomMode === 2}
                    onPlay={play}
                    onToggleFavorite={(sound) => toggleFavorite(sound.id)}
                    onRestoreSilenced={restoreSilencedUsers}
                />
            </OctaneCard.Content>
        </OctaneCard>
    );
};
