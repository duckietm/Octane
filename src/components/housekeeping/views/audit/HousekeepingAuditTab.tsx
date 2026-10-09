import { FC, useMemo, useState } from 'react';
import { FaCaretDown, FaCaretRight, FaCheck, FaExclamationCircle, FaFilter, FaInfoCircle, FaStopwatch, FaSync, FaTrash } from 'react-icons/fa';
import {
    formatRelativePast,
    GetConfigurationValue,
    IHousekeepingActionLogEntry,
    localizeHousekeepingAction,
    LocalizeText,
    resolveHousekeepingTarget,
    sampleToMetric
} from '../../../../api';
import { useHousekeepingStore, useLocalStorage } from '../../../../hooks';
import { HousekeepingAuditEntryDetails } from '../common/HousekeepingAuditEntryDetails';
import { HousekeepingButton } from '../common/HousekeepingParts';

type TargetFilter = 'all' | 'user' | 'room' | 'hotel';
type SuccessFilter = 'all' | 'success' | 'failure';

const FILTER_LABELS: Record<TargetFilter, string> = {
    all: 'housekeeping.audit.filter.all',
    user: 'housekeeping.audit.filter.users',
    room: 'housekeeping.audit.filter.rooms',
    hotel: 'housekeeping.audit.filter.hotel'
};

const passesFilter = (entry: IHousekeepingActionLogEntry, target: TargetFilter, success: SuccessFilter, query: string): boolean => {
    if (target !== 'all' && entry.targetType !== target) return false;
    if (success === 'success' && !entry.success) return false;
    if (success === 'failure' && entry.success) return false;

    if (query.length > 0) {
        const haystack = `${entry.actorName} ${entry.targetLabel} ${entry.action} ${entry.detail}`.toLowerCase();

        if (!haystack.includes(query)) return false;
    }

    return true;
};

export const HousekeepingAuditTab: FC = () => {
    const { actionLog, refreshAuditLog, metricsByAction, resetActionMetrics } = useHousekeepingStore();
    const telemetryEnabled = useMemo(() => GetConfigurationValue<boolean>('housekeeping.telemetry.enabled', false) === true, []);
    const [isTelemetryExpanded, setIsTelemetryExpanded] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [targetFilter, setTargetFilter] = useLocalStorage<TargetFilter>('nitro.housekeeping.audit.target_filter', 'all');
    const [successFilter, setSuccessFilter] = useLocalStorage<SuccessFilter>('nitro.housekeeping.audit.success_filter', 'all');
    const [query, setQuery] = useLocalStorage<string>('nitro.housekeeping.audit.query', '');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const filtered = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return actionLog.filter((entry) => passesFilter(entry, targetFilter, successFilter, normalizedQuery));
    }, [actionLog, targetFilter, successFilter, query]);

    const refresh = async () => {
        setIsRefreshing(true);

        try {
            await refreshAuditLog();
        } finally {
            setIsRefreshing(false);
        }
    };

    const successCount = useMemo(() => actionLog.filter((e) => e.success).length, [actionLog]);
    const failureCount = actionLog.length - successCount;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs uppercase tracking-wider font-semibold opacity-60 flex items-center gap-1">
                    <FaFilter size={10} />
                    {LocalizeText('housekeeping.audit.title')}
                    {actionLog.length > 0 && (
                        <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-normal opacity-80 normal-case">
                            <span className="inline-flex items-center gap-0.5 px-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
                                <FaCheck size={6} />
                                {successCount}
                            </span>
                            {failureCount > 0 && (
                                <span className="inline-flex items-center gap-0.5 px-1 rounded bg-rose-50 border border-rose-200 text-rose-700">
                                    <FaExclamationCircle size={6} />
                                    {failureCount}
                                </span>
                            )}
                        </span>
                    )}
                </h3>
                <HousekeepingButton size="sm" variant="secondary" disabled={isRefreshing} onClick={refresh}>
                    <FaSync size={9} className={isRefreshing ? 'animate-spin' : ''} />
                    <span className="ml-1 text-white">{LocalizeText('housekeeping.audit.refresh')}</span>
                </HousekeepingButton>
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap gap-1 items-center rounded-md border border-zinc-200 bg-zinc-50/50 px-1.5 py-1">
                {(Object.keys(FILTER_LABELS) as TargetFilter[]).map((filter) => (
                    <button
                        key={filter}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                            targetFilter === filter
                                ? 'bg-sky-100 border-sky-300 text-sky-800 shadow-sm'
                                : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50'
                        }`}
                        onClick={() => setTargetFilter(filter)}
                    >
                        {LocalizeText(FILTER_LABELS[filter])}
                    </button>
                ))}
                <span className="mx-1 h-3 w-px bg-zinc-300" />
                <button
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                        successFilter === 'success'
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800 shadow-sm'
                            : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'
                    }`}
                    onClick={() => setSuccessFilter(successFilter === 'success' ? 'all' : 'success')}
                >
                    <FaCheck size={7} />
                    ok
                </button>
                <button
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                        successFilter === 'failure'
                            ? 'bg-rose-100 border-rose-300 text-rose-800 shadow-sm'
                            : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'
                    }`}
                    onClick={() => setSuccessFilter(successFilter === 'failure' ? 'all' : 'failure')}
                >
                    <FaExclamationCircle size={7} />
                    err
                </button>
            </div>

            <input
                className="px-2 py-1 rounded-md border border-zinc-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-300 focus:border-sky-400 transition-colors placeholder:text-black placeholder:italic"
                placeholder={LocalizeText('housekeeping.audit.search.placeholder')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
            />

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 py-4 text-xs text-zinc-500">
                    <FaFilter size={14} className="opacity-40" />
                    <span>{actionLog.length === 0 ? LocalizeText('housekeeping.audit.empty') : LocalizeText('housekeeping.audit.no_match')}</span>
                </div>
            ) : (
                <ul className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto pr-1">
                    {filtered.map((entry) => (
                        <li
                            key={entry.id}
                            className={`flex flex-col text-[11px] px-2 py-1 rounded border transition-colors ${
                                entry.success ? 'border-zinc-200 bg-white hover:bg-zinc-50' : 'border-rose-200 bg-rose-50/60 hover:bg-rose-50'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-zinc-400 tabular-nums w-14 shrink-0">{formatRelativePast(entry.timestamp)}</span>
                                <span className="font-semibold truncate w-24 shrink-0" title={entry.actorName}>
                                    {entry.actorName}
                                </span>
                                <span className="text-zinc-400 shrink-0">→</span>
                                <span className="truncate grow" title={entry.detail}>
                                    <span
                                        className={`inline-block px-1 mr-1 rounded text-[9px] uppercase font-bold ${entry.targetType === 'user' ? 'bg-sky-100 text-sky-700' : entry.targetType === 'room' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'}`}
                                    >
                                        {LocalizeText(`housekeeping.audit.target.${entry.targetType}`)}
                                    </span>
                                    {resolveHousekeepingTarget(entry)}
                                </span>
                                <span
                                    className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.success ? 'bg-zinc-100 text-zinc-700' : 'bg-rose-100 text-rose-700'}`}
                                >
                                    {localizeHousekeepingAction(entry.action)}
                                </span>
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

            {telemetryEnabled && (
                <div className="rounded border border-zinc-200 bg-zinc-50">
                    <button
                        className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] uppercase font-semibold opacity-70 hover:bg-zinc-100"
                        onClick={() => setIsTelemetryExpanded((value) => !value)}
                    >
                        {isTelemetryExpanded ? <FaCaretDown size={10} /> : <FaCaretRight size={10} />}
                        <FaStopwatch size={10} />
                        <span className="grow text-left">{LocalizeText('housekeeping.telemetry.title')}</span>
                        <span className="text-zinc-500 tabular-nums">{metricsByAction.size}</span>
                    </button>
                    {isTelemetryExpanded && (
                        <div className="px-2 py-1 border-t border-zinc-200">
                            {metricsByAction.size === 0 ? (
                                <div className="text-[10px] text-zinc-500 italic py-1">{LocalizeText('housekeeping.telemetry.empty')}</div>
                            ) : (
                                <table className="w-full text-[10px] tabular-nums">
                                    <thead>
                                        <tr className="text-zinc-500 uppercase">
                                            <th className="text-left font-medium">action</th>
                                            <th className="text-right font-medium">n</th>
                                            <th className="text-right font-medium">err</th>
                                            <th className="text-right font-medium">last</th>
                                            <th className="text-right font-medium">p50</th>
                                            <th className="text-right font-medium">p95</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...metricsByAction.entries()]
                                            .map(([action, sample]) => sampleToMetric(action, sample))
                                            .sort((a, b) => b.count - a.count)
                                            .map((metric) => (
                                                <tr key={metric.action} className="border-t border-zinc-100">
                                                    <td className="text-left truncate" title={metric.action}>
                                                        {metric.action}
                                                    </td>
                                                    <td className="text-right">{metric.count}</td>
                                                    <td className={`text-right ${metric.errors > 0 ? 'text-rose-700 font-semibold' : 'text-zinc-500'}`}>
                                                        {metric.errors}
                                                    </td>
                                                    <td className="text-right">{Math.round(metric.lastMs)}ms</td>
                                                    <td className="text-right">{Math.round(metric.p50Ms)}ms</td>
                                                    <td className="text-right">{Math.round(metric.p95Ms)}ms</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            )}
                            <div className="flex items-center justify-end pt-1">
                                <button className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-rose-700" onClick={resetActionMetrics}>
                                    <FaTrash size={8} />
                                    {LocalizeText('housekeeping.telemetry.reset')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
