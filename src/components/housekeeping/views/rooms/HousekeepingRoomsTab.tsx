import { FC, useState } from 'react';
import {
    FaCrown,
    FaDoorOpen,
    FaExchangeAlt,
    FaHome,
    FaLock,
    FaMapMarkerAlt,
    FaSearch,
    FaTimes,
    FaTrash,
    FaUserSlash,
    FaUsers,
    FaVolumeMute
} from 'react-icons/fa';
import { LocalizeText } from '../../../../api';
import { Button } from '../../../../common';
import { useHousekeeping, useHousekeepingConfirm, useRoom } from '../../../../hooks';

const DEFAULT_MUTE_MINUTES = 10;

export const HousekeepingRoomsTab: FC = () => {
    const {
        selectedRoom,
        setSelectedRoom,
        lookupRoomById,
        isRoomLoading,
        isActionPending,
        openRoom,
        closeRoom,
        muteRoom,
        kickAllFromRoom,
        transferRoomOwnership,
        deleteRoom
    } = useHousekeeping();
    const { roomSession = null } = useRoom();
    const [query, setQuery] = useState('');
    const [muteMinutes, setMuteMinutes] = useState<number>(DEFAULT_MUTE_MINUTES);
    const [newOwnerId, setNewOwnerId] = useState<number>(0);
    const confirm = useHousekeepingConfirm();
    const currentRoomId = roomSession && roomSession.roomId > 0 ? roomSession.roomId : 0;
    const submitLookup = () => {
        const trimmed = query.trim();
        const idFromQuery = parseInt(trimmed);
        const id = Number.isFinite(idFromQuery) && idFromQuery > 0 ? idFromQuery : currentRoomId;

        if (id <= 0) return;

        lookupRoomById(id);
    };

    const useCurrentRoom = () => {
        if (currentRoomId <= 0) return;
        setQuery(String(currentRoomId));
        lookupRoomById(currentRoomId);
    };

    const disableActions = !selectedRoom || isActionPending;

    const confirmAndRun = (key: string, fn: () => void) => confirm(LocalizeText(key), fn);

    const occupancyPct = selectedRoom && selectedRoom.maxUsers > 0 ? Math.min(100, Math.round((selectedRoom.userCount / selectedRoom.maxUsers) * 100)) : 0;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-1.5 items-center">
                <div className="flex items-center gap-1 grow rounded-md border border-zinc-300 bg-white px-2 py-1 shadow-sm focus-within:ring-1 focus-within:ring-sky-300 focus-within:border-sky-400 transition-colors">
                    <FaSearch className="text-zinc-400 shrink-0" size={11} />
                    <input
                        type="number"
                        min={1}
                        className="grow text-sm bg-transparent outline-none placeholder:text-black placeholder:italic"
                        placeholder={
                            currentRoomId > 0
                                ? `${LocalizeText('housekeeping.room.search.placeholder')} · empty → current #${currentRoomId}`
                                : LocalizeText('housekeeping.room.search.placeholder')
                        }
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') submitLookup();
                        }}
                    />
                </div>
                {currentRoomId > 0 && currentRoomId !== selectedRoom?.id && (
                    <Button gap={1} variant="secondary" disabled={isRoomLoading} title={`Lookup current room #${currentRoomId}`} onClick={useCurrentRoom}>
                        <FaMapMarkerAlt size={10} className="text-sky-500" />
                        <span>here</span>
                    </Button>
                )}
                <Button gap={1} disabled={isRoomLoading} onClick={submitLookup}>
                    <FaSearch size={10} className={isRoomLoading ? 'animate-pulse' : ''} />
                    <span>{LocalizeText('housekeeping.room.search.button')}</span>
                </Button>
            </div>
            {selectedRoom ? (
                <div className="relative overflow-hidden rounded-lg border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="rounded-full bg-sky-100 p-2 shrink-0 flex items-center justify-center">
                            <span className="octane-icon octane-icon-hk-hero icon-rooms" />
                        </div>
                        <div className="grow min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-base truncate">{selectedRoom.name}</span>
                                <span className="text-[10px] text-zinc-500 tabular-nums">#{selectedRoom.id}</span>
                                {selectedRoom.isPublic && (
                                    <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800">
                                        public
                                    </span>
                                )}
                                {selectedRoom.isLocked && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 border border-rose-200 text-rose-700">
                                        <FaLock size={8} /> closed
                                    </span>
                                )}
                                {selectedRoom.isMuted && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 border border-amber-200 text-amber-700">
                                        <FaVolumeMute size={8} /> muted
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-zinc-600 truncate mt-0.5">{selectedRoom.description || '—'}</div>
                            <div className="flex items-center gap-3 text-[11px] text-zinc-700 mt-1.5">
                                <span className="inline-flex items-center gap-1" title={`${selectedRoom.userCount} / ${selectedRoom.maxUsers}`}>
                                    <FaUsers size={10} className="text-sky-600" />
                                    <span className="tabular-nums font-semibold">{selectedRoom.userCount}</span>
                                    <span className="text-zinc-400">/</span>
                                    <span className="tabular-nums">{selectedRoom.maxUsers}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 truncate" title={selectedRoom.ownerName}>
                                    <FaCrown size={10} className="text-amber-500" />
                                    <span className="truncate">{selectedRoom.ownerName}</span>
                                    <span className="text-zinc-400 tabular-nums">#{selectedRoom.ownerId}</span>
                                </span>
                            </div>
                            {selectedRoom.maxUsers > 0 && (
                                <div className="h-1 mt-1.5 rounded-full bg-zinc-100 overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${occupancyPct > 85 ? 'bg-rose-500' : occupancyPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${occupancyPct}%` }}
                                    />
                                </div>
                            )}
                        </div>
                        <button
                            className="text-zinc-400 hover:text-rose-600 transition-colors p-1"
                            onClick={() => setSelectedRoom(null)}
                            title={LocalizeText('housekeeping.room.clear')}
                        >
                            <FaTimes size={12} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-3 text-xs text-zinc-500 italic">
                    <FaHome size={14} />
                    {LocalizeText('housekeeping.room.none')}
                </div>
            )}
            <div className="grid grid-cols-2 gap-1.5">
                <Button variant="success" disabled={disableActions || !selectedRoom?.isLocked} onClick={() => openRoom(selectedRoom.id)}>
                    <FaDoorOpen size={10} />
                    <span className="ml-1 text-white">{LocalizeText('housekeeping.room.open')}</span>
                </Button>
                <Button variant="danger" disabled={disableActions || selectedRoom?.isLocked} onClick={() => closeRoom(selectedRoom.id)}>
                    <FaLock size={10} />
                    <span className="ml-1 text-white">{LocalizeText('housekeeping.room.close')}</span>
                </Button>
                <div className="col-span-2 flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/40 px-2 py-1.5">
                    <FaVolumeMute size={11} className="text-amber-600" />
                    <input
                        type="number"
                        min={1}
                        className="w-14 px-1.5 py-0.5 rounded border border-amber-200 bg-white text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-400"
                        value={muteMinutes}
                        onChange={(event) => setMuteMinutes(parseInt(event.target.value) || 0)}
                    />
                    <span className="text-[11px] text-zinc-600">min</span>
                    <Button variant="warning" disabled={disableActions} className="ml-auto" onClick={() => muteRoom(selectedRoom.id, muteMinutes)}>
                        <span>{LocalizeText('housekeeping.room.mute_min', ['m'], [String(muteMinutes)])}</span>
                    </Button>
                </div>
                <Button
                    variant="warning"
                    disabled={disableActions}
                    onClick={() => confirmAndRun('housekeeping.room.kick_all.confirm', () => kickAllFromRoom(selectedRoom.id))}
                >
                    <FaUserSlash size={10} />
                    <span className="ml-1">{LocalizeText('housekeeping.room.kick_all')}</span>
                </Button>
                <Button
                    variant="danger"
                    disabled={disableActions}
                    onClick={() => confirmAndRun('housekeeping.room.delete.confirm', () => deleteRoom(selectedRoom.id))}
                >
                    <FaTrash size={10} />
                    <span className="ml-1 text-white">{LocalizeText('housekeeping.room.delete')}</span>
                </Button>
            </div>
            <div className="flex flex-col gap-1.5 rounded-md border border-violet-200 bg-violet-50/40 p-2">
                <label className="text-[10px] uppercase tracking-wider font-semibold opacity-60 flex items-center gap-1">
                    <FaExchangeAlt size={8} className="text-violet-500" />
                    {LocalizeText('housekeeping.room.transfer.label')}
                </label>
                <div className="flex items-center gap-1.5">
                    <input
                        type="number"
                        min={1}
                        className="w-24 px-1.5 py-1 rounded border border-violet-200 bg-white text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-violet-400 placeholder:text-black placeholder:italic"
                        placeholder={LocalizeText('housekeeping.room.transfer.new_owner')}
                        value={newOwnerId || ''}
                        onChange={(event) => setNewOwnerId(parseInt(event.target.value) || 0)}
                    />
                    <Button
                        variant="primary"
                        disabled={disableActions || !newOwnerId}
                        className="grow"
                        onClick={() => transferRoomOwnership(selectedRoom.id, newOwnerId)}
                    >
                        <FaExchangeAlt size={10} />
                        <span className="ml-1 text-white">{LocalizeText('housekeeping.room.transfer')}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};
