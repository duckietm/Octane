import { FC, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { FaBolt, FaChartLine, FaCircle, FaCrown, FaExclamationTriangle, FaHome, FaPaperPlane, FaServer, FaSync, FaTicketAlt, FaUsers } from 'react-icons/fa';
import {
    formatCompactNumber,
    formatRelativePast,
    formatUptime,
    HousekeepingApi,
    HousekeepingTabId,
    LocalizeText,
    NotificationBubbleType
} from '../../../../api';
import { Button } from '../../../../common';
import { useHousekeepingStore, useNotification } from '../../../../hooks';

const AUTO_REFRESH_MS = 30_000;
const STALE_AFTER_MS = 60_000;

interface StatCardProps {
    icon: ReactNode;
    label: string;
    value: string;
    subtle?: string;
    tone?: 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
    onClick?: () => void;
}

const TONE_BG: Record<NonNullable<StatCardProps['tone']>, string> = {
    sky: 'from-sky-50 to-transparent border-sky-200',
    emerald: 'from-emerald-50 to-transparent border-emerald-200',
    amber: 'from-amber-50 to-transparent border-amber-200',
    rose: 'from-rose-50 to-transparent border-rose-200',
    violet: 'from-violet-50 to-transparent border-violet-200'
};

const TONE_ICON: Record<NonNullable<StatCardProps['tone']>, string> = {
    sky: 'text-sky-600 bg-sky-100',
    emerald: 'text-emerald-600 bg-emerald-100',
    amber: 'text-amber-600 bg-amber-100',
    rose: 'text-rose-600 bg-rose-100',
    violet: 'text-violet-600 bg-violet-100'
};

const StatCard: FC<StatCardProps> = ({ icon, label, value, subtle, tone = 'sky', onClick }) => {
    const interactive = !!onClick;

    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-2.5 rounded-lg p-2.5 border bg-gradient-to-br shadow-sm ${TONE_BG[tone]} ${interactive ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
        >
            <div className={`${TONE_ICON[tone]} shrink-0 rounded-md p-1.5`}>{icon}</div>
            <div className="flex flex-col grow min-w-0">
                <span className="text-[10px] uppercase tracking-wide opacity-60 font-semibold">{label}</span>
                <span className="text-xl font-bold leading-tight tabular-nums">{value}</span>
                {subtle && <span className="text-[10px] text-zinc-500 truncate">{subtle}</span>}
            </div>
        </div>
    );
};

export const HousekeepingDashboardTab: FC = () => {
    const { dashboard, isDashboardLoading, refreshDashboard, actionLog, recentLookups, lookupUserById, lookupRoomById, setActiveTab } = useHousekeepingStore();
    const { simpleAlert = null } = useNotification();
    const [alertMessage, setAlertMessage] = useState('');
    const [isSendingAlert, setIsSendingAlert] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [refreshedAt, setRefreshedAt] = useState<number | null>(null);

    useEffect(() => {
        if (dashboard) setRefreshedAt(Date.now());
    }, [dashboard]);

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1_000);
        return () => clearInterval(id);
    }, []);

    const refreshRef = useRef(refreshDashboard);
    refreshRef.current = refreshDashboard;

    useEffect(() => {
        const id = setInterval(() => {
            const ctrl = new AbortController();
            refreshRef.current?.(ctrl.signal);
        }, AUTO_REFRESH_MS);

        return () => clearInterval(id);
    }, []);

    const ageMs = refreshedAt ? now - refreshedAt : null;
    const isStale = ageMs !== null && ageMs > STALE_AFTER_MS;
    const ageLabel = ageMs === null ? '—' : ageMs < 5_000 ? 'now' : `${Math.floor(ageMs / 1000)}s ago`;

    const recentSanctions = useMemo(() => actionLog.filter((entry) => entry && entry.success && entry.targetType === 'user').slice(0, 5), [actionLog]);

    const trimmedAlert = alertMessage.trim();
    const canSendAlert = trimmedAlert.length > 0 && !isSendingAlert;

    const onSubmitAlert = async (event: FormEvent) => {
        event.preventDefault();
        if (!canSendAlert) return;

        setIsSendingAlert(true);

        try {
            const result = await HousekeepingApi.sendHotelAlert(trimmedAlert);

            if (simpleAlert) {
                if (result.ok) simpleAlert(LocalizeText('housekeeping.action.success'), NotificationBubbleType.INFO);
                else simpleAlert(result.message || LocalizeText('housekeeping.action.error'), NotificationBubbleType.INFO);
            }

            if (result.ok) setAlertMessage('');
        } finally {
            setIsSendingAlert(false);
        }
    };

    const onRecentClick = (entry: { kind: 'user' | 'room'; id: number; label: string }) => {
        if (entry.kind === 'user') {
            setActiveTab(HousekeepingTabId.USERS);
            lookupUserById?.(entry.id);
        } else {
            setActiveTab(HousekeepingTabId.ROOMS);
            lookupRoomById?.(entry.id);
        }
    };

    return (
        <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider font-semibold opacity-60 flex items-center gap-1">
                    <FaChartLine size={10} />
                    {LocalizeText('housekeeping.dashboard.title')}
                </h3>
                <div className="flex items-center gap-1.5">
                    <span
                        title={refreshedAt ? new Date(refreshedAt).toLocaleTimeString() : ''}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${isStale ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
                    >
                        <FaCircle size={6} className={isStale ? '' : 'animate-pulse'} />
                        {isStale ? `stale · ${ageLabel}` : `live · ${ageLabel}`}
                    </span>
                    <Button size="sm" variant="secondary" disabled={isDashboardLoading} onClick={() => refreshDashboard()}>
                        <FaSync size={9} className={isDashboardLoading ? 'animate-spin' : ''} />
                        <span className="ml-1 text-white">{LocalizeText('housekeeping.dashboard.refresh')}</span>
                    </Button>
                </div>
            </div>

            {!dashboard && isDashboardLoading && (
                <div className="grid grid-cols-2 gap-1.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-lg border bg-zinc-50 animate-pulse h-16" />
                    ))}
                </div>
            )}

            {!dashboard && !isDashboardLoading && (
                <div className="flex items-center gap-2 rounded border border-dashed border-zinc-300 bg-zinc-50/50 p-3 text-xs text-zinc-500 italic">
                    <FaExclamationTriangle size={12} />
                    {LocalizeText('housekeeping.dashboard.unavailable')}
                </div>
            )}

            {dashboard && (
                <>
                    <div className="relative overflow-hidden rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="rounded-full bg-emerald-100 p-2 flex items-center justify-center">
                                    <span className="octane-icon octane-icon-hk-hero icon-modtools" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-60 font-semibold">
                                        <FaCircle size={6} className="text-emerald-500 animate-pulse" />
                                        {LocalizeText('housekeeping.dashboard.online')}
                                    </div>
                                    <div className="text-3xl font-bold leading-none tabular-nums">{formatCompactNumber(dashboard.onlineUsers)}</div>
                                    <div className="text-[11px] text-zinc-500">
                                        {LocalizeText('housekeeping.dashboard.total_users', ['count'], [dashboard.totalUsers.toLocaleString()])}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase tracking-wider opacity-60 font-semibold flex items-center gap-1 justify-end">
                                    <FaCrown size={9} className="text-amber-500" />
                                    {LocalizeText('housekeeping.dashboard.peak_today')}
                                </div>
                                <div className="text-xl font-semibold tabular-nums">{formatCompactNumber(dashboard.peakOnlineToday)}</div>
                                <div className="text-[10px] text-zinc-500">
                                    {LocalizeText('housekeeping.dashboard.peak_alltime', ['count'], [formatCompactNumber(dashboard.peakOnlineAllTime)])}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4-card grid */}
                    <div className="grid grid-cols-2 gap-1.5">
                        <StatCard
                            icon={<FaHome size={14} />}
                            label={LocalizeText('housekeeping.dashboard.rooms_active')}
                            value={formatCompactNumber(dashboard.activeRooms)}
                            subtle={LocalizeText('housekeeping.dashboard.total_rooms', ['count'], [dashboard.totalRooms.toLocaleString()])}
                            tone="sky"
                            onClick={() => setActiveTab(HousekeepingTabId.ROOMS)}
                        />
                        <StatCard
                            icon={<FaTicketAlt size={14} />}
                            label={LocalizeText('housekeeping.dashboard.pending_tickets')}
                            value={formatCompactNumber(dashboard.pendingTickets)}
                            subtle={LocalizeText('housekeeping.dashboard.sanctions_24h', ['count'], [String(dashboard.sanctionsLast24h)])}
                            tone={dashboard.pendingTickets > 0 ? 'rose' : 'emerald'}
                        />
                        <div className="col-span-2">
                            <StatCard
                                icon={<FaServer size={14} />}
                                label={LocalizeText('housekeeping.dashboard.server')}
                                value={formatUptime(dashboard.serverUptimeSeconds)}
                                subtle={dashboard.serverVersion}
                                tone="violet"
                            />
                        </div>
                    </div>

                    <form onSubmit={onSubmitAlert} className="flex flex-col gap-1.5 rounded-lg border border-amber-200 bg-amber-50/40 p-2.5">
                        <label className="text-[10px] uppercase tracking-wider font-semibold opacity-60 flex items-center gap-1">
                            <FaBolt size={9} className="text-amber-500" />
                            {LocalizeText('housekeeping.hotel.alert.label')}
                        </label>
                        <div className="flex items-center gap-1.5">
                            <input
                                type="text"
                                value={alertMessage}
                                onChange={(e) => setAlertMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && canSendAlert) {
                                        e.preventDefault();
                                        onSubmitAlert(e as unknown as FormEvent);
                                    }
                                }}
                                placeholder={LocalizeText('housekeeping.hotel.alert.placeholder')}
                                className="grow rounded border border-amber-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-black placeholder:italic"
                                maxLength={280}
                            />
                            <Button
                                size="sm"
                                variant="primary"
                                disabled={!canSendAlert}
                                onClick={() => onSubmitAlert({ preventDefault: () => {} } as FormEvent)}
                            >
                                <FaPaperPlane size={9} className={isSendingAlert ? 'animate-pulse' : ''} />
                                <span className="ml-1">{LocalizeText('housekeeping.hotel.alert.send')}</span>
                            </Button>
                        </div>
                    </form>
                </>
            )}

            {recentSanctions.length > 0 && (
                <div className="flex flex-col gap-1">
                    <h4 className="text-[10px] uppercase tracking-wider font-semibold opacity-60 pt-1">
                        {LocalizeText('housekeeping.dashboard.recent_sanctions')}
                    </h4>
                    <ul className="flex flex-col gap-0.5 rounded-lg border bg-white/50 divide-y divide-zinc-100">
                        {recentSanctions.map((entry) => (
                            <li key={entry.id} className="flex items-center gap-2 text-[11px] px-2 py-1 hover:bg-zinc-50">
                                <span className="text-zinc-400 tabular-nums w-14 shrink-0">{formatRelativePast(entry.timestamp)}</span>
                                <span className="font-semibold truncate" title={entry.actorName}>
                                    {entry.actorName}
                                </span>
                                <span className="text-zinc-400">→</span>
                                <span className="truncate" title={entry.targetLabel}>
                                    {entry.targetLabel}
                                </span>
                                <span className="ml-auto px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-medium shrink-0 text-[10px]">{entry.action}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {recentLookups.length > 0 && (
                <div className="flex flex-col gap-1">
                    <h4 className="text-[10px] uppercase tracking-wider font-semibold opacity-60 pt-1">
                        {LocalizeText('housekeeping.dashboard.recent_lookups')}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                        {recentLookups.map((entry, index) => (
                            <button
                                key={`${entry.kind}-${entry.id}-${index}`}
                                type="button"
                                onClick={() => onRecentClick(entry)}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors ${entry.kind === 'user' ? 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100' : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'}`}
                                title={`${entry.kind} #${entry.id}`}
                            >
                                <span className="opacity-60 font-bold">{entry.kind === 'user' ? 'U' : 'R'}</span>
                                <span className="font-medium">{entry.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
