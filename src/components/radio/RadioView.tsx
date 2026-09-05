import { FC, useEffect, useState } from 'react';
import { FaBroadcastTower, FaChevronDown, FaChevronUp, FaPlay, FaStop, FaTimes } from 'react-icons/fa';
import { LocalizeText, localizeWithFallback } from '../../api';
import { DraggableWindow, DraggableWindowPosition, LayoutImage } from '../../common';
import { RadioStation, useRadio } from '../../hooks';

export const RadioView: FC<{}> = () => {
    const { stations, currentId, isPlaying, volume, loadError, play, stop, setVolume } = useRadio();
    const [open, setOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedId && stations.length) setSelectedId(stations[0].id);
    }, [stations, selectedId]);

    const selected: RadioStation | null = stations.find((s) => s.id === selectedId) ?? stations[0] ?? null;
    const selectedPlaying = !!selected && currentId === selected.id && isPlaying;

    const onPlayToggle = () => {
        if (!selected) return;
        if (selectedPlaying) stop();
        else play(selected);
    };

    const onPick = (station: RadioStation) => {
        setSelectedId(station.id);
        setOpen(false);
        play(station);
    };

    const toggleCollapsed = () => {
        setCollapsed((value) => {
            if (!value) setOpen(false);
            return !value;
        });
    };

    const onClose = () => {
        stop();
        setHidden(true);
    };

    if (hidden) return null;

    return (
        <DraggableWindow uniqueKey="octane-radio" windowPosition={DraggableWindowPosition.TOP_LEFT}>
            <div className="radio-widget w-[244px] max-w-[64vw] select-none overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[rgba(22,24,30,0.94)] to-[rgba(10,11,14,0.94)] text-white shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-sm">
                <div className="drag-handler flex cursor-move items-center gap-2 border-b border-white/10 px-3 py-1.5">
                    <FaBroadcastTower className={`text-[11px] ${isPlaying ? 'text-sky-400' : 'text-white/45'}`} />
                    <span className="grow text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">{LocalizeText('radio.title')}</span>
                    <div className={`radio-eq ${isPlaying ? 'is-live' : ''}`}>
                        <span />
                        <span />
                        <span />
                        <span />
                    </div>
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        title={collapsed ? LocalizeText('radio.show') : LocalizeText('radio.hide')}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white"
                    >
                        {collapsed ? <FaChevronDown className="text-[9px]" /> : <FaChevronUp className="text-[9px]" />}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        title={localizeWithFallback('radio.close', 'Close')}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white"
                    >
                        <FaTimes className="text-[9px]" />
                    </button>
                </div>

                {!collapsed && (
                    <>
                        <div className="flex items-center gap-2.5 px-3 py-2.5">
                            <button
                                type="button"
                                onClick={onPlayToggle}
                                disabled={!selected}
                                title={selectedPlaying ? LocalizeText('radio.stop') : LocalizeText('radio.title')}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs text-white shadow-inner transition-all hover:bg-emerald-400 disabled:opacity-40"
                            >
                                {selectedPlaying ? <FaStop /> : <FaPlay className="translate-x-px" />}
                            </button>
                            <div className="min-w-0 grow">
                                <div className="truncate text-sm font-bold leading-tight">{selected ? selected.name : LocalizeText('radio.title')}</div>
                                <div className="mt-0.5 flex items-center gap-1.5">
                                    {selectedPlaying && (
                                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-sky-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> {LocalizeText('radio.live')}
                                        </span>
                                    )}
                                    {selected?.genre && <span className="truncate text-[10px] text-white/45">{selected.genre}</span>}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen((value) => !value)}
                                title={LocalizeText('radio.title')}
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${open ? 'bg-white/20' : 'bg-white/8 hover:bg-white/15'}`}
                            >
                                <FaChevronDown className={`text-[10px] transition-transform ${open ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {selectedPlaying && (
                            <div className="flex items-center gap-2 px-3 pb-2.5">
                                <span className="text-xs text-white/55">🔊</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={volume}
                                    onChange={(e) => setVolume(e.target.valueAsNumber)}
                                    className="radio-vol h-1 grow cursor-pointer"
                                />
                            </div>
                        )}

                        {open && (
                            <div className="border-t border-white/10 bg-black/20 p-1.5">
                                {loadError && <div className="px-2 py-2 text-[11px] text-red-400">{LocalizeText('radio.error')}</div>}
                                {!loadError && !stations.length && <div className="px-2 py-2 text-[11px] text-white/50">{LocalizeText('radio.empty')}</div>}
                                <div className="radio-scroll flex max-h-[156px] flex-col gap-1 overflow-y-auto pr-0.5">
                                    {stations.map((station) => {
                                        const isActive = station.id === selectedId;
                                        const playingThis = currentId === station.id && isPlaying;
                                        return (
                                            <div
                                                key={station.id}
                                                onClick={() => onPick(station)}
                                                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${isActive ? 'bg-sky-500/15 ring-1 ring-sky-400/40' : 'hover:bg-white/8'}`}
                                            >
                                                {station.logo ? (
                                                    <LayoutImage imageUrl={station.logo} className="h-7 w-7 shrink-0 rounded bg-contain bg-center bg-no-repeat" />
                                                ) : (
                                                    <div
                                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] ${playingThis ? 'bg-sky-500/80' : 'bg-white/10'}`}
                                                    >
                                                        {playingThis ? <FaStop /> : <FaPlay className="translate-x-px" />}
                                                    </div>
                                                )}
                                                <div className="min-w-0 grow">
                                                    <div className="truncate text-xs font-bold leading-tight">{station.name}</div>
                                                    {station.genre && <div className="truncate text-[10px] text-white/45">{station.genre}</div>}
                                                </div>
                                                {playingThis && (
                                                    <div className="radio-eq is-live shrink-0">
                                                        <span />
                                                        <span />
                                                        <span />
                                                        <span />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </DraggableWindow>
    );
};
