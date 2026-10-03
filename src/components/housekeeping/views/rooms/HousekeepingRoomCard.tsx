import { FC } from 'react';
import { FaCalendarAlt, FaCrown, FaDoorOpen, FaEyeSlash, FaKey, FaLock, FaTags, FaTimes, FaUsers, FaVolumeMute } from 'react-icons/fa';
import { CreateLinkEvent, formatHousekeepingDate, IHousekeepingRoom, LocalizeText } from '../../../../api';
import { useNavigatorData } from '../../../../hooks';
import { HousekeepingFact, HousekeepingPill } from '../common/HousekeepingParts';

const RoomStatePill: FC<{ room: IHousekeepingRoom }> = ({ room }) => {
    const state = room.settings?.state ?? (room.isLocked ? 1 : 0);

    switch (state) {
        case 1:
            return (
                <HousekeepingPill icon={<FaLock size={8} />} tone="danger">
                    {LocalizeText('housekeeping.room.state.locked')}
                </HousekeepingPill>
            );
        case 2:
            return (
                <HousekeepingPill icon={<FaKey size={8} />} tone="warning">
                    {LocalizeText('housekeeping.room.state.password')}
                </HousekeepingPill>
            );
        case 3:
            return (
                <HousekeepingPill icon={<FaEyeSlash size={8} />} tone="neutral">
                    {LocalizeText('housekeeping.room.state.invisible')}
                </HousekeepingPill>
            );
        default:
            return (
                <HousekeepingPill icon={<FaDoorOpen size={8} />} tone="success">
                    {LocalizeText('housekeeping.room.state.open')}
                </HousekeepingPill>
            );
    }
};

/** Identity, state, owner, category and occupancy of the room being managed. */
export const HousekeepingRoomCard: FC<{ room: IHousekeepingRoom; onClear: () => void }> = ({ room, onClear }) => {
    const { categories = null } = useNavigatorData();
    const occupancyPct = room.maxUsers > 0 ? Math.min(100, Math.round((room.userCount / room.maxUsers) * 100)) : 0;
    const categoryId = room.settings?.categoryId ?? 0;
    const category = categoryId > 0 ? categories?.find((entry) => entry.id === categoryId) : null;
    const categoryName = category ? LocalizeText(category.name) : categoryId > 0 ? `#${categoryId}` : '-';

    return (
        <div className="rounded-lg border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-2.5 shadow-sm">
            <div className="flex items-start gap-2.5">
                <div className="flex shrink-0 items-center justify-center rounded-full bg-sky-100 p-2">
                    <span className="octane-icon octane-icon-hk-hero icon-rooms" />
                </div>
                <div className="min-w-0 grow">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-base font-bold">{room.name}</span>
                        <span className="text-[10px] tabular-nums text-zinc-500">#{room.id}</span>
                        <RoomStatePill room={room} />
                        {room.isPublic && <HousekeepingPill tone="info">{LocalizeText('housekeeping.room.public')}</HousekeepingPill>}
                        {room.isMuted && (
                            <HousekeepingPill icon={<FaVolumeMute size={8} />} tone="warning">
                                {LocalizeText('housekeeping.room.muted')}
                            </HousekeepingPill>
                        )}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-zinc-600">{room.description || LocalizeText('housekeeping.room.no_description')}</div>
                </div>
                <button
                    className="shrink-0 rounded border border-sky-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 hover:bg-sky-50"
                    title={LocalizeText('housekeeping.room.go.title')}
                    onClick={() => CreateLinkEvent(`navigator/goto/${room.id}`)}
                >
                    {LocalizeText('housekeeping.room.go')}
                </button>
                <button className="p-1 text-zinc-400 transition-colors hover:text-rose-600" title={LocalizeText('housekeeping.room.clear')} onClick={onClear}>
                    <FaTimes size={12} />
                </button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1">
                <HousekeepingFact
                    icon={<FaUsers size={8} />}
                    label={LocalizeText('housekeeping.room.fact.users')}
                    value={`${room.userCount} / ${room.maxUsers}`}
                />
                <HousekeepingFact
                    icon={<FaCrown className="text-amber-500" size={8} />}
                    label={LocalizeText('housekeeping.room.fact.owner')}
                    title={`#${room.ownerId}`}
                    value={room.ownerName || `#${room.ownerId}`}
                />
                <HousekeepingFact label={LocalizeText('navigator.category')} value={categoryName} />
                <HousekeepingFact
                    icon={<FaCalendarAlt size={8} />}
                    label={LocalizeText('housekeeping.room.fact.created')}
                    value={formatHousekeepingDate(room.createdAt)}
                />
            </div>
            {room.maxUsers > 0 && (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-100">
                    <div
                        className={`h-full transition-all ${occupancyPct > 85 ? 'bg-rose-500' : occupancyPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${occupancyPct}%` }}
                    />
                </div>
            )}
            {!!room.settings?.tags.length && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <FaTags className="text-zinc-400" size={9} />
                    {room.settings.tags.map((tag) => (
                        <HousekeepingPill key={tag}>{tag}</HousekeepingPill>
                    ))}
                </div>
            )}
        </div>
    );
};
