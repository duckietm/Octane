import { FC, useMemo, useState } from 'react';
import { FaComments, FaHistory, FaHome, FaMapMarkerAlt, FaSearch, FaShieldAlt, FaSlidersH } from 'react-icons/fa';
import { HousekeepingRoomSection, IHousekeepingRoom, isAuditEntryAboutRoom, LocalizeText } from '../../../../api';
import { useHousekeeping, useRoom } from '../../../../hooks';
import { HousekeepingHistoryView } from '../common/HousekeepingHistoryView';
import { HousekeepingListChoice, HousekeepingListView } from '../common/HousekeepingListView';
import { HousekeepingButton, HousekeepingEmptyState } from '../common/HousekeepingParts';
import { HousekeepingSubTab, HousekeepingSubTabs } from '../common/HousekeepingSubTabs';
import { HousekeepingRoomCard } from './HousekeepingRoomCard';
import { HousekeepingRoomModerationView } from './HousekeepingRoomModerationView';
import { HousekeepingRoomSettingsForm } from './HousekeepingRoomSettingsForm';

const ROOM_ACTIVITY_LISTS: HousekeepingListChoice[] = [
    { key: 'room.chatlog', labelKey: 'housekeeping.list.room.chatlog' },
    { key: 'room.visits', labelKey: 'housekeeping.list.room.visits' }
];

/** Remount key for the settings form: a new server snapshot resets its draft. */
const settingsKey = (room: IHousekeepingRoom) => JSON.stringify([room.id, room.name, room.description, room.maxUsers, room.settings]);

/** The room page: lookup, the room card, and the sub-pages Settings / Moderation / History. */
export const HousekeepingRoomsTab: FC = () => {
    const { selectedRoom, setSelectedRoom, lookupRoomById, isRoomLoading, isActionPending, saveRoomSettings, roomSection, setRoomSection, actionLog } =
        useHousekeeping();
    const { roomSession = null } = useRoom();
    const [query, setQuery] = useState('');
    const currentRoomId = roomSession && roomSession.roomId > 0 ? roomSession.roomId : 0;
    const history = useMemo(() => (selectedRoom ? actionLog.filter((entry) => isAuditEntryAboutRoom(entry, selectedRoom.id)) : []), [actionLog, selectedRoom]);

    const submitLookup = () => {
        const idFromQuery = parseInt(query.trim());
        const id = Number.isFinite(idFromQuery) && idFromQuery > 0 ? idFromQuery : currentRoomId;

        if (id > 0) lookupRoomById(id);
    };

    const useCurrentRoom = () => {
        if (currentRoomId <= 0) return;

        setQuery(String(currentRoomId));
        lookupRoomById(currentRoomId);
    };

    const sections: HousekeepingSubTab<HousekeepingRoomSection>[] = [
        { id: HousekeepingRoomSection.SETTINGS, label: LocalizeText('housekeeping.room.section.settings'), icon: <FaSlidersH size={9} /> },
        { id: HousekeepingRoomSection.MODERATION, label: LocalizeText('housekeeping.room.section.actions'), icon: <FaShieldAlt size={9} /> },
        { id: HousekeepingRoomSection.ACTIVITY, label: LocalizeText('housekeeping.room.section.activity'), icon: <FaComments size={9} /> },
        { id: HousekeepingRoomSection.HISTORY, label: LocalizeText('housekeeping.room.section.history'), icon: <FaHistory size={9} />, count: history.length }
    ];

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
                <div className="flex grow items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 shadow-sm focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-300">
                    <FaSearch className="shrink-0 text-zinc-400" size={11} />
                    <input
                        className="grow bg-transparent text-sm outline-none placeholder:italic placeholder:text-zinc-500"
                        min={1}
                        placeholder={LocalizeText('housekeeping.room.search.placeholder')}
                        type="number"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') submitLookup();
                        }}
                    />
                </div>
                {currentRoomId > 0 && currentRoomId !== selectedRoom?.id && (
                    <HousekeepingButton
                        disabled={isRoomLoading}
                        gap={1}
                        title={LocalizeText('housekeeping.room.here.title', ['id'], [String(currentRoomId)])}
                        variant="secondary"
                        onClick={useCurrentRoom}
                    >
                        <FaMapMarkerAlt className="text-sky-500" size={10} />
                        <span>{LocalizeText('housekeeping.room.here')}</span>
                    </HousekeepingButton>
                )}
                <HousekeepingButton disabled={isRoomLoading} gap={1} onClick={submitLookup}>
                    <FaSearch className={isRoomLoading ? 'animate-pulse' : ''} size={10} />
                    <span>{LocalizeText('housekeeping.room.search.button')}</span>
                </HousekeepingButton>
            </div>

            {!selectedRoom && <HousekeepingEmptyState icon={<FaHome size={14} />}>{LocalizeText('housekeeping.room.none')}</HousekeepingEmptyState>}

            {selectedRoom && (
                <>
                    <HousekeepingRoomCard room={selectedRoom} onClear={() => setSelectedRoom(null)} />
                    <HousekeepingSubTabs<HousekeepingRoomSection> active={roomSection} tabs={sections} onChange={setRoomSection} />
                    {roomSection === HousekeepingRoomSection.SETTINGS &&
                        (selectedRoom.settings ? (
                            <HousekeepingRoomSettingsForm
                                key={settingsKey(selectedRoom)}
                                disabled={isActionPending}
                                room={selectedRoom}
                                onSave={(input) => saveRoomSettings(selectedRoom.id, input)}
                            />
                        ) : (
                            <HousekeepingEmptyState>{LocalizeText('housekeeping.room.settings.unavailable')}</HousekeepingEmptyState>
                        ))}
                    {roomSection === HousekeepingRoomSection.MODERATION && <HousekeepingRoomModerationView room={selectedRoom} />}
                    {roomSection === HousekeepingRoomSection.ACTIVITY && (
                        <HousekeepingListView key={`activity-${selectedRoom.id}`} lists={ROOM_ACTIVITY_LISTS} targetId={selectedRoom.id} />
                    )}
                    {roomSection === HousekeepingRoomSection.HISTORY && <HousekeepingHistoryView entries={history} />}
                </>
            )}
        </div>
    );
};
