import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText } from '../../api';
import { useSoundboard } from '../../hooks';
import {
    DisplaySoundboardSound,
    filterSoundboardSounds,
    SoundboardCategory
} from '../../hooks/soundboard/soundboardPresentation';
import { OctaneCard } from '../../layout';
import { SoundboardPadView } from './SoundboardPadView';

const PAGE_SIZE = 10;

interface SoundboardContentViewProps {
    sounds: DisplaySoundboardSound[];
    categories: SoundboardCategory[];
    recentSoundIds: number[];
    isCoolingDown: boolean;
    onPlay: (sound: DisplaySoundboardSound) => void;
}

export const SoundboardContentView: FC<SoundboardContentViewProps> = ({
    sounds,
    categories,
    recentSoundIds,
    isCoolingDown,
    onPlay
}) => {
    const [query, setQuery] = useState('');
    const [categoryId, setCategoryId] = useState('all');
    const [page, setPage] = useState(0);
    const filteredSounds = useMemo(
        () => filterSoundboardSounds(sounds, query, categoryId, recentSoundIds),
        [sounds, query, categoryId, recentSoundIds]
    );
    const totalPages = Math.max(1, Math.ceil(filteredSounds.length / PAGE_SIZE));
    const pageSounds = filteredSounds.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    useEffect(() => setPage(0), [query, categoryId, sounds, recentSoundIds]);

    useEffect(() => {
        if (page >= totalPages) setPage(totalPages - 1);
    }, [page, totalPages]);

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
                type="search"
                value={query}
                aria-label={LocalizeText('soundboard.search')}
                placeholder={LocalizeText('soundboard.search')}
                onChange={(event) => setQuery(event.target.value)}
                className="h-8 w-full rounded-md border border-[#8ca9b8] bg-white px-2.5 text-xs text-[#17384b] outline-none focus:border-[#3d8fba] focus:ring-1 focus:ring-[#3d8fba]"
            />

            <div className="flex gap-1.5 overflow-x-auto pb-0.5" aria-label={LocalizeText('soundboard.categories')}>
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
                <div className="grid grid-cols-5 gap-1.5" data-testid="soundboard-grid">
                    {pageSounds.map((sound) => (
                        <SoundboardPadView key={sound.id} sound={sound} disabled={isCoolingDown} onPlay={onPlay} />
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex select-none items-center justify-center gap-2 pt-0.5">
                    <button
                        type="button"
                        aria-label={LocalizeText('soundboard.pagination.previous')}
                        disabled={page === 0}
                        onClick={() => setPage((current) => Math.max(0, current - 1))}
                        className="h-7 w-8 cursor-pointer rounded bg-[#3d8fba] text-xs font-bold text-white hover:bg-[#347da3] disabled:cursor-default disabled:opacity-40"
                    >
                        &lt;
                    </button>
                    <span className="min-w-10 text-center text-[11px] font-bold text-[#2f6f95]">{page + 1} / {totalPages}</span>
                    <button
                        type="button"
                        aria-label={LocalizeText('soundboard.pagination.next')}
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                        className="h-7 w-8 cursor-pointer rounded bg-[#3d8fba] text-xs font-bold text-white hover:bg-[#347da3] disabled:cursor-default disabled:opacity-40"
                    >
                        &gt;
                    </button>
                </div>
            )}
        </div>
    );
};

export const SoundboardView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const { enabled, sounds, categories, recentSoundIds, isCoolingDown, play, refresh } = useSoundboard();
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

    if (!isVisible || !enabled) return null;

    return (
        <OctaneCard className="w-[420px] max-w-[96vw]" uniqueKey="soundboard">
            <OctaneCard.Header headerText={LocalizeText('soundboard.title')} onCloseClick={() => setIsVisible(false)} />
            <OctaneCard.Content>
                <SoundboardContentView
                    sounds={sounds}
                    categories={categories}
                    recentSoundIds={recentSoundIds}
                    isCoolingDown={isCoolingDown}
                    onPlay={play}
                />
            </OctaneCard.Content>
        </OctaneCard>
    );
};
