import { FC, useState } from 'react';
import { FaHistory, FaInfoCircle, FaSync } from 'react-icons/fa';
import { formatRelativePast, IHousekeepingActionLogEntry, localizeHousekeepingAction, LocalizeText } from '../../../../api';
import { useHousekeepingStore } from '../../../../hooks';
import { HousekeepingAuditEntryDetails } from './HousekeepingAuditEntryDetails';
import { HousekeepingButton, HousekeepingEmptyState } from './HousekeepingParts';

/**
 * Staff actions on one user or one room, read from the loaded action log.
 * The log holds the most recent entries only, so older actions are not here.
 */
export const HousekeepingHistoryView: FC<{ entries: IHousekeepingActionLogEntry[] }> = ({ entries }) => {
    const { refreshAuditLog } = useHousekeepingStore();
    const [expandedId, setExpandedId] = useState<number | null>(null);

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] italic text-zinc-500">{LocalizeText('housekeeping.history.hint')}</span>
                <HousekeepingButton classNames={['ml-auto']} gap={1} size="sm" variant="secondary" onClick={() => refreshAuditLog()}>
                    <FaSync size={9} />
                    <span>{LocalizeText('housekeeping.history.refresh')}</span>
                </HousekeepingButton>
            </div>
            {entries.length === 0 ? (
                <HousekeepingEmptyState icon={<FaHistory size={13} />}>{LocalizeText('housekeeping.history.empty')}</HousekeepingEmptyState>
            ) : (
                <ul className="m-0 flex max-h-[260px] list-none flex-col gap-0.5 overflow-y-auto p-0 pr-1">
                    {entries.map((entry) => (
                        <li
                            key={entry.id}
                            className={`flex flex-col rounded border px-2 py-1 text-[11px] ${entry.success ? 'border-zinc-200 bg-white' : 'border-rose-200 bg-rose-50/60'}`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-16 shrink-0 tabular-nums text-zinc-400">{formatRelativePast(entry.timestamp)}</span>
                                <span className="w-24 shrink-0 truncate font-semibold">{entry.actorName}</span>
                                <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700">
                                    {localizeHousekeepingAction(entry.action)}
                                </span>
                                <span className="grow truncate text-zinc-500">{entry.detail}</span>
                                <button
                                    aria-expanded={expandedId === entry.id}
                                    className={`shrink-0 rounded p-0.5 transition-colors ${expandedId === entry.id ? 'bg-sky-100 text-sky-700' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700'}`}
                                    title={LocalizeText('housekeeping.audit.detail.toggle')}
                                    type="button"
                                    onClick={() => setExpandedId((current) => (current === entry.id ? null : entry.id))}
                                >
                                    <FaInfoCircle size={11} />
                                </button>
                            </div>
                            {expandedId === entry.id && <HousekeepingAuditEntryDetails entry={entry} />}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
