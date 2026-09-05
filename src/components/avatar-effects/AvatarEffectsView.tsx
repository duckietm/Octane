import {
    AddLinkEventTracker,
    AvatarDirectionAngle,
    GetConfiguration,
    GetSessionDataManager,
    ILinkEventTracker,
    loadGamedata,
    RemoveLinkEventTracker
} from '@octane/renderer';
import { ChangeEvent, FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaSearch } from 'react-icons/fa';
import { LocalizeText } from '../../api';
import { useAvatarEffects } from '../../hooks';
import { Button, Column, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { AvatarEffectPreviewView } from './AvatarEffectPreviewView';

interface EffectMapEntry {
    id: string;
    lib: string;
    type: string;
    revision?: string | number;
}

const DEFAULT_DIRECTION = 4;
const PAGE_SIZE = 50;

export const AvatarEffectsView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [effects, setEffects] = useState<EffectMapEntry[]>([]);
    const [loadError, setLoadError] = useState<string>(null);
    const [selectedId, setSelectedId] = useState<number>(0);
    const [direction, setDirection] = useState<number>(DEFAULT_DIRECTION);
    const [query, setQuery] = useState<string>('');
    const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

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
                        setIsVisible((prev) => !prev);
                        return;
                }
            },
            eventUrlPrefix: 'avatar-effects/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        if (!isVisible || effects.length || loadError) return;

        const url = GetConfiguration().getValue<string>('avatar.effectmap.url');
        if (!url) {
            setLoadError('Effect map URL is not configured.');
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                // The effectmap is served either as a single JSON file or as a
                // tiered directory with core/custom/seasonal manifests using
                // JSONC syntax (comments and trailing commas allowed). loadGamedata picks the
                // right mode for us and merges tiers.
                const json = await loadGamedata<{ effects?: EffectMapEntry[] }>(url);
                if (cancelled) return;

                const list: EffectMapEntry[] = Array.isArray(json?.effects)
                    ? json.effects.filter((e: EffectMapEntry) => e?.type === 'fx' && /^\d+$/.test(String(e.id)))
                    : [];

                list.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
                setEffects(list);
            } catch (error) {
                if (!cancelled) setLoadError(String((error as Error).message ?? error));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isVisible, effects.length, loadError]);

    const { effects: ownedEffects, activeEffectType, activateEffect, isOwned } = useAvatarEffects();
    const [ownedOnly, setOwnedOnly] = useState(false);

    const session = GetSessionDataManager();
    const figure = session?.figure ?? '';
    const gender = session?.gender ?? 'M';

    const rotateFigure = useCallback((delta: number) => {
        setDirection((prev) => {
            let next = prev + delta;
            if (next < AvatarDirectionAngle.MIN_DIRECTION) next = AvatarDirectionAngle.MAX_DIRECTION;
            if (next > AvatarDirectionAngle.MAX_DIRECTION) next = AvatarDirectionAngle.MIN_DIRECTION;
            return next;
        });
    }, []);

    const applySelectedEffect = useCallback(() => {
        if (!selectedId) return;
        activateEffect(selectedId);
        setIsVisible(false);
    }, [selectedId, activateEffect]);

    const removeCurrentEffect = useCallback(() => {
        activateEffect(0);
        setSelectedId(0);
        setIsVisible(false);
    }, [activateEffect]);

    const onClose = useCallback(() => setIsVisible(false), []);

    // The server is the authority on what is currently running: follow it
    // whenever the window is opened without an explicit pick.
    useEffect(() => {
        if (isVisible && !selectedId && activeEffectType) setSelectedId(activeEffectType);
    }, [isVisible, selectedId, activeEffectType]);

    const filteredEffects = useMemo(() => {
        const trimmed = query.trim().toLowerCase();
        const pool = ownedOnly ? effects.filter((e) => isOwned(parseInt(e.id, 10))) : effects;
        if (!trimmed) return pool;
        return pool.filter((e) => e.id.toLowerCase().includes(trimmed) || e.lib.toLowerCase().includes(trimmed));
    }, [effects, query, ownedOnly, isOwned]);

    const onQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
        setVisibleCount(PAGE_SIZE);
    }, []);

    const visibleEffects = filteredEffects.slice(0, visibleCount);
    const hasMore = filteredEffects.length > visibleEffects.length;
    const selectedEffect = selectedId ? effects.find((e) => parseInt(e.id, 10) === selectedId) : null;

    const selectedRowRef = useRef<HTMLButtonElement>(null);

    const jumpToSelected = useCallback(() => {
        if (!selectedId) return;

        const indexInFiltered = filteredEffects.findIndex((e) => parseInt(e.id, 10) === selectedId);
        const indexInAll = effects.findIndex((e) => parseInt(e.id, 10) === selectedId);

        if (indexInFiltered === -1) {
            setQuery('');
            if (indexInAll >= 0 && indexInAll >= visibleCount) {
                setVisibleCount(Math.ceil((indexInAll + 1) / PAGE_SIZE) * PAGE_SIZE);
            }
        } else if (indexInFiltered >= visibleCount) {
            setVisibleCount(Math.ceil((indexInFiltered + 1) / PAGE_SIZE) * PAGE_SIZE);
        }

        requestAnimationFrame(() => {
            selectedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }, [selectedId, filteredEffects, effects, visibleCount]);

    if (!isVisible) return null;

    return (
        <OctaneCardView className="octane-avatar-effects w-[640px] h-[480px]" isResizable={false} uniqueKey="avatar-effects" theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText('product.type.effect') || 'Avatar effect'} onCloseClick={onClose} />
            <OctaneCardContentView className="flex flex-row gap-3 text-black">
                <Column overflow="hidden" className="w-[220px] items-center justify-between">
                    <div className="figure-preview-container overflow-hidden relative w-full h-[280px] bg-gradient-to-b from-[#1a1a1a] to-black rounded-md shadow-inner">
                        <AvatarEffectPreviewView figure={figure} gender={gender} direction={direction} effect={selectedId} height={280} zoom={2} />
                        <div className="arrow-container absolute inset-y-0 left-0 right-0 flex items-center justify-between px-1 z-10 pointer-events-none">
                            <button
                                type="button"
                                className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-full bg-black/55 hover:bg-black/75 border border-white/15 text-white shadow-md transition-all hover:scale-110 active:scale-95"
                                onClick={() => rotateFigure(1)}
                                aria-label="Rotate left"
                            >
                                <FaChevronLeft className="w-3 h-3" />
                            </button>
                            <button
                                type="button"
                                className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-full bg-black/55 hover:bg-black/75 border border-white/15 text-white shadow-md transition-all hover:scale-110 active:scale-95"
                                onClick={() => rotateFigure(-1)}
                                aria-label="Rotate right"
                            >
                                <FaChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                        {selectedEffect && (
                            <div className="absolute top-2 left-2 right-2 bg-black/65 rounded px-2 py-1 text-white text-xs leading-tight">
                                <div className="font-mono opacity-70 text-[10px]">#{parseInt(selectedEffect.id, 10)}</div>
                                <div className="font-semibold truncate">{selectedEffect.lib}</div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-1 mt-2">
                        <Button variant="success" disabled={!selectedId} onClick={applySelectedEffect} className="flex-1">
                            {LocalizeText('inventory.effects.activate') || 'Use effect'}
                        </Button>
                        <Button variant="danger" onClick={removeCurrentEffect} className="flex-1">
                            {LocalizeText('inventory.effects.remove') || 'Remove effect'}
                        </Button>
                    </div>
                </Column>
                <Column overflow="hidden" className="flex-1 min-h-0">
                    <div className="relative">
                        <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888] text-sm pointer-events-none" />
                        <input
                            type="text"
                            value={query}
                            onChange={onQueryChange}
                            placeholder={LocalizeText('generic.search') || 'Search by name or #number'}
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#2a2a2a]/20 rounded-md bg-white outline-none transition-colors focus:border-[#3a78c4] focus:shadow-[0_0_0_2px_rgba(58,120,196,0.15)]"
                        />
                    </div>
                    <div className="flex items-center justify-between px-1 py-1 text-[11px] uppercase tracking-wide text-[#666] border-b border-[#2a2a2a]/10">
                        <span>
                            {filteredEffects.length === effects.length ? `${effects.length} effects` : `${filteredEffects.length} of ${effects.length}`}
                        </span>
                        {!!ownedEffects.length && (
                            <label className="flex cursor-pointer items-center gap-1 normal-case font-semibold text-[#3a78c4]">
                                <input type="checkbox" checked={ownedOnly} onChange={(event) => setOwnedOnly(event.target.checked)} />
                                {LocalizeText('inventory.effects.owned.only') || `owned (${ownedEffects.length})`}
                            </label>
                        )}
                        {selectedId > 0 && (
                            <button
                                type="button"
                                onClick={jumpToSelected}
                                className="text-[#3a78c4] hover:text-[#2a5d9e] hover:underline normal-case font-semibold cursor-pointer"
                                title="Jump to selected effect"
                            >
                                #{selectedId} selected
                            </button>
                        )}
                    </div>
                    <div className="flex-1 min-h-0 overflow-auto">
                        {loadError && <div className="text-red-600 text-sm px-2 py-3">{loadError}</div>}
                        {!loadError && !effects.length && <div className="text-sm px-2 py-3 opacity-70">{LocalizeText('generic.loading') || 'Loading…'}</div>}
                        {!!effects.length && !filteredEffects.length && (
                            <div className="text-sm px-2 py-3 opacity-70 italic">
                                {LocalizeText('generic.search.noresults') || 'No effects match your search.'}
                            </div>
                        )}
                        {!!visibleEffects.length && (
                            <ul className="flex flex-col">
                                {visibleEffects.map((effect, index) => {
                                    const id = parseInt(effect.id, 10);
                                    const isSelected = id === selectedId;
                                    const owned = isOwned(id);
                                    const isActive = id === activeEffectType;
                                    return (
                                        <li key={effect.id}>
                                            <button
                                                ref={isSelected ? selectedRowRef : undefined}
                                                type="button"
                                                onClick={() => setSelectedId(id)}
                                                className={`flex w-full items-center gap-3 px-3 py-1.5 text-sm border-l-[3px] transition-colors ${
                                                    isSelected
                                                        ? 'border-[#3a78c4] bg-[#cfe1f5] text-[#1d3a5e]'
                                                        : `border-transparent hover:bg-[#eef3f9] ${index % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`
                                                }`}
                                                title={effect.lib}
                                            >
                                                <span className={`font-mono text-xs w-12 text-right shrink-0 ${isSelected ? 'opacity-80' : 'opacity-50'}`}>
                                                    #{id}
                                                </span>
                                                <span className="truncate font-semibold">{effect.lib}</span>
                                                {isActive && (
                                                    <span className="ml-auto shrink-0 rounded bg-[#2f7d32] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                                                        {LocalizeText('inventory.effects.active') || 'active'}
                                                    </span>
                                                )}
                                                {owned && !isActive && (
                                                    <span className="ml-auto shrink-0 rounded bg-[#3a78c4] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                                                        {LocalizeText('inventory.effects.owned') || 'owned'}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                                {hasMore && (
                                    <li className="px-3 py-2 border-t border-[#2a2a2a]/10 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                                            className="w-full text-sm font-semibold text-[#3a78c4] hover:text-[#2a5d9e] hover:bg-[#eef3f9] cursor-pointer py-1.5 rounded-md transition-colors"
                                        >
                                            {LocalizeText('navigator.show.more') || 'See More'}
                                            <span className="opacity-60 ml-1 font-normal">({filteredEffects.length - visibleEffects.length} more)</span>
                                        </button>
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>
                </Column>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
