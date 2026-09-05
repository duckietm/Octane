import { AddLinkEventTracker, GetSessionDataManager, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { CSSProperties, FC, MouseEvent as ReactMouseEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
    EmuStatsMemoryPoint,
    EmuStatsRoomRow,
    EmuStatsSnapshot,
    EmuStatsUserRow,
    EmuStatsWiredRow,
    EmuStatsWiredTopRoomRow,
    fetchEmuStats,
    getCachedEmuStats
} from '../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';

type EmuStatsSection = 'overview' | 'system' | 'wiredInsights' | 'users' | 'rooms' | 'wired';

const REFRESH_INTERVAL_MS = 2_500;

const formatDateTime = (value: number): string => {
    if (!value) return '-';

    return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(value));
};

const formatUptime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
};

const formatCpu = (value: number): string => `${value.toFixed(1)}%`;
const formatMemory = (used: number, max: number): string => `${used} MB / ${max} MB`;
const formatCompactNumber = (value: number): string => new Intl.NumberFormat().format(value);
const formatThroughput = (value: number, suffix: string): string => `${value.toFixed(1)} ${suffix}`;
const formatMs = (value: number): string => `${value.toFixed(2)} ms`;
const formatBoolean = (value: boolean): string => (value ? 'Yes' : 'No');
const formatRoomLabel = (roomId: number, roomName: string): string => (roomId ? (roomName?.length ? `${roomName} (#${roomId})` : `#${roomId}`) : '-');

const MemoryChart: FC<{ history: EmuStatsMemoryPoint[] }> = ({ history }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number>(-1);

    const chart = useMemo(() => {
        if (!history?.length) {
            return {
                linePoints: '',
                areaPoints: '',
                peak: 0,
                latest: 0,
                plotPoints: [],
                gridValues: [0, 0, 0, 0]
            };
        }

        const width = 100;
        const height = 100;
        const maxMb = Math.max(...history.map((point) => point.maxMb || 1), 1);
        const lastIndex = Math.max(history.length - 1, 1);

        const plotPoints = history.map((point, index) => {
            const x = (index / lastIndex) * width;
            const y = height - (point.usedMb / maxMb) * (height - 8) - 4;

            return {
                x,
                y,
                usedMb: point.usedMb,
                usagePercent: point.usagePercent,
                timestamp: point.timestamp
            };
        });

        const points = plotPoints.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`);
        const latest = history[history.length - 1]?.usedMb || 0;
        const peak = Math.max(...history.map((point) => point.usedMb), 0);
        const gridValues = [1, 0.75, 0.5, 0.25].map((value) => Math.round(maxMb * value));

        return {
            linePoints: points.join(' '),
            areaPoints: `0,100 ${points.join(' ')} 100,100`,
            peak,
            latest,
            plotPoints,
            gridValues
        };
    }, [history]);

    const hoveredPoint = hoveredIndex >= 0 ? chart.plotPoints[hoveredIndex] : null;

    const onMouseMove = (event: ReactMouseEvent<SVGSVGElement>) => {
        if (!chart.plotPoints.length) return;

        const bounds = event.currentTarget.getBoundingClientRect();
        const relativeX = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
        const ratio = bounds.width > 0 ? relativeX / bounds.width : 0;
        const nextIndex = Math.min(chart.plotPoints.length - 1, Math.max(0, Math.round(ratio * (chart.plotPoints.length - 1))));

        setHoveredIndex(nextIndex);
    };

    return (
        <div className="octane-emustats__chart-card">
            <div className="octane-emustats__section-header">
                <div>
                    <h3>Realtime Memory Usage</h3>
                    <p>Rolling history from the emulator process.</p>
                </div>
                <div className="octane-emustats__chart-meta">
                    <span>Peak {chart.peak} MB</span>
                    <strong>{chart.latest} MB</strong>
                </div>
            </div>
            <div className="octane-emustats__chart-shell">
                <div className="octane-emustats__chart-axis">
                    {chart.gridValues.map((value, index) => (
                        <span key={`${value}-${index}`}>{value} MB</span>
                    ))}
                    <span>0 MB</span>
                </div>
                <div className="octane-emustats__chart-canvas">
                    <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="octane-emustats__chart"
                        onMouseLeave={() => setHoveredIndex(-1)}
                        onMouseMove={onMouseMove}
                    >
                        <defs>
                            <linearGradient id="emuStatsArea" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="rgba(99,102,241,0.45)" />
                                <stop offset="100%" stopColor="rgba(99,102,241,0.02)" />
                            </linearGradient>
                        </defs>
                        <line x1="0" y1="20" x2="100" y2="20" className="octane-emustats__chart-grid" />
                        <line x1="0" y1="40" x2="100" y2="40" className="octane-emustats__chart-grid" />
                        <line x1="0" y1="60" x2="100" y2="60" className="octane-emustats__chart-grid" />
                        <line x1="0" y1="80" x2="100" y2="80" className="octane-emustats__chart-grid" />
                        {!!chart.areaPoints.length && <polygon points={chart.areaPoints} fill="url(#emuStatsArea)" />}
                        {!!chart.linePoints.length && <polyline points={chart.linePoints} className="octane-emustats__chart-line" />}
                        {hoveredPoint && (
                            <>
                                <line x1={hoveredPoint.x} y1="0" x2={hoveredPoint.x} y2="100" className="octane-emustats__chart-hover-line" />
                                <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="1.8" className="octane-emustats__chart-hover-point" />
                            </>
                        )}
                    </svg>
                    {hoveredPoint && (
                        <div
                            className="octane-emustats__chart-tooltip"
                            style={{
                                left: `${Math.min(88, Math.max(6, hoveredPoint.x))}%`,
                                top: `${Math.min(72, Math.max(6, hoveredPoint.y - 10))}%`
                            }}
                        >
                            <strong>{hoveredPoint.usedMb} MB</strong>
                            <span>{hoveredPoint.usagePercent.toFixed(1)}%</span>
                            <small>{formatDateTime(hoveredPoint.timestamp)}</small>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatsTable = <TRow extends object>({
    columns,
    rows,
    rowKey
}: {
    columns: { key: keyof TRow; label: string; className?: string; render?: (row: TRow) => ReactNode }[];
    rows: TRow[];
    rowKey: (row: TRow, index: number) => string;
}) => {
    return (
        <div className="octane-emustats__table-shell">
            <table className="octane-emustats__table">
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={String(column.key)} className={column.className}>
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="octane-emustats__table-empty">
                                Nothing to show right now.
                            </td>
                        </tr>
                    )}
                    {rows.map((row, index) => (
                        <tr key={rowKey(row, index)}>
                            {columns.map((column) => (
                                <td key={String(column.key)} className={column.className}>
                                    {column.render ? column.render(row) : (row[column.key] as ReactNode)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const DetailPanel: FC<{ title: string; description?: string; children: ReactNode }> = ({ title, description = '', children }) => {
    return (
        <div className="octane-emustats__detail-panel">
            <div className="octane-emustats__detail-panel-header">
                <h3>{title}</h3>
                {!!description.length && <p>{description}</p>}
            </div>
            {children}
        </div>
    );
};

const KeyValueGrid: FC<{ items: { label: string; value: string; tone?: 'default' | 'good' | 'warn' }[]; columns?: 1 | 2 }> = ({ items, columns = 2 }) => {
    return (
        <div className={`octane-emustats__kv-grid is-${columns}col`}>
            {items.map((item) => (
                <div key={item.label} className="octane-emustats__kv-item">
                    <span>{item.label}</span>
                    <strong data-tone={item.tone || 'default'}>{item.value}</strong>
                </div>
            ))}
        </div>
    );
};

const SystemSection: FC<{ snapshot: EmuStatsSnapshot }> = ({ snapshot }) => {
    const { databasePool, garbageCollector, network, overview, scheduler } = snapshot;

    return (
        <div className="octane-emustats__detail-layout">
            <DetailPanel title="Database Pool" description="Current Hikari pool pressure and connection availability.">
                <KeyValueGrid
                    items={[
                        { label: 'Active', value: formatCompactNumber(databasePool.activeConnections) },
                        { label: 'Idle', value: formatCompactNumber(databasePool.idleConnections) },
                        { label: 'Total', value: formatCompactNumber(databasePool.totalConnections) },
                        { label: 'Max', value: formatCompactNumber(databasePool.maxConnections) },
                        {
                            label: 'Waiting Threads',
                            value: formatCompactNumber(databasePool.waitingThreads),
                            tone: databasePool.waitingThreads > 0 ? 'warn' : 'good'
                        }
                    ]}
                />
            </DetailPanel>
            <DetailPanel title="Network Throughput" description="Realtime rates sampled from incoming and outgoing packet pipelines.">
                <KeyValueGrid
                    items={[
                        { label: 'Incoming Packets/s', value: formatThroughput(network.incomingPacketsPerSecond, 'pkt') },
                        { label: 'Outgoing Packets/s', value: formatThroughput(network.outgoingPacketsPerSecond, 'pkt') },
                        { label: 'Incoming KB/s', value: formatThroughput(network.incomingKilobytesPerSecond, 'KB') },
                        { label: 'Outgoing KB/s', value: formatThroughput(network.outgoingKilobytesPerSecond, 'KB') },
                        { label: 'Total Incoming', value: formatCompactNumber(network.totalIncomingPackets) },
                        { label: 'Total Outgoing', value: formatCompactNumber(network.totalOutgoingPackets) }
                    ]}
                />
            </DetailPanel>
            <DetailPanel title="Scheduler" description="Executor load behind delayed tasks and internal service work.">
                <KeyValueGrid
                    items={[
                        { label: 'Queued Tasks', value: formatCompactNumber(scheduler.queuedTasks), tone: scheduler.queuedTasks > 0 ? 'warn' : 'good' },
                        { label: 'Active Threads', value: formatCompactNumber(scheduler.activeThreads) },
                        { label: 'Pool Size', value: formatCompactNumber(scheduler.poolSize) },
                        { label: 'Completed Tasks', value: formatCompactNumber(scheduler.completedTasks) },
                        { label: 'Running', value: formatBoolean(scheduler.running), tone: scheduler.running ? 'good' : 'warn' }
                    ]}
                />
            </DetailPanel>
            <DetailPanel title="Garbage Collection" description="Observed JVM collection activity since emulator startup.">
                <KeyValueGrid
                    items={[
                        { label: 'Total Collections', value: formatCompactNumber(garbageCollector.totalCollections) },
                        { label: 'Collections This Sample', value: formatCompactNumber(garbageCollector.collectionsSinceLastSample) },
                        { label: 'Total Pause Time', value: `${formatCompactNumber(garbageCollector.totalCollectionTimeMs)} ms` },
                        {
                            label: 'Last Observed Pause',
                            value: `${formatCompactNumber(garbageCollector.lastObservedPauseMs)} ms`,
                            tone: garbageCollector.lastObservedPauseMs > 250 ? 'warn' : 'default'
                        },
                        { label: 'Sampled At', value: formatDateTime(garbageCollector.sampledAtEpochMs) }
                    ]}
                />
            </DetailPanel>
            <DetailPanel title="Cycle Health" description="Aggregated timing from the active room update loop.">
                <KeyValueGrid
                    items={[
                        { label: 'Average Room Cycle', value: formatMs(overview.averageRoomCycleMs) },
                        { label: 'Worst Room Cycle', value: formatMs(overview.worstRoomCycleMs), tone: overview.worstRoomCycleMs > 20 ? 'warn' : 'default' },
                        { label: 'Worst Room', value: formatRoomLabel(overview.worstRoomCycleRoomId, overview.worstRoomCycleRoomName) },
                        {
                            label: 'WebSocket Sessions',
                            value: `${formatCompactNumber(overview.activeWebSocketSessions)} / ${formatCompactNumber(overview.peakWebSocketSessions)} peak`
                        }
                    ]}
                    columns={1}
                />
            </DetailPanel>
        </div>
    );
};

const WiredInsightsSection: FC<{ snapshot: EmuStatsSnapshot }> = ({ snapshot }) => {
    const { overview } = snapshot;

    return (
        <div className="octane-emustats__detail-layout">
            <DetailPanel title="Wired Pressure" description="Live summary of tick load, delayed actions and heavy rooms.">
                <KeyValueGrid
                    items={[
                        { label: 'Tickables', value: formatCompactNumber(overview.wiredTickables) },
                        {
                            label: 'Delayed Events',
                            value: formatCompactNumber(overview.delayedEventsPending),
                            tone: overview.delayedEventsPending > 0 ? 'warn' : 'good'
                        },
                        { label: 'Heavy Rooms', value: formatCompactNumber(overview.heavyWiredRooms), tone: overview.heavyWiredRooms > 0 ? 'warn' : 'good' },
                        {
                            label: 'Overloaded Rooms',
                            value: formatCompactNumber(overview.overloadedWiredRooms),
                            tone: overview.overloadedWiredRooms > 0 ? 'warn' : 'good'
                        },
                        { label: 'Activity / Second', value: formatThroughput(overview.wiredActivityPerSecond, 'ops') }
                    ]}
                />
            </DetailPanel>
            <DetailPanel title="Top Wired Rooms" description="Highest usage rooms in the current diagnostics window.">
                <StatsTable<EmuStatsWiredTopRoomRow>
                    columns={[
                        { key: 'roomId', label: 'Room', className: 'is-xs' },
                        { key: 'name', label: 'Name' },
                        { key: 'usagePercent', label: 'Usage', className: 'is-xs', render: (row) => `${row.usagePercent}%` },
                        { key: 'averageTickMs', label: 'Avg Tick', className: 'is-sm', render: (row) => `${row.averageTickMs} ms` },
                        { key: 'peakTickMs', label: 'Peak Tick', className: 'is-sm', render: (row) => `${row.peakTickMs} ms` },
                        { key: 'delayedEventsPending', label: 'Delayed', className: 'is-xs' },
                        { key: 'activityPerSecond', label: 'Ops/s', className: 'is-sm', render: (row) => row.activityPerSecond.toFixed(1) },
                        { key: 'heavy', label: 'Heavy', className: 'is-sm', render: (row) => formatBoolean(row.heavy) }
                    ]}
                    rowKey={(row) => `wired-top-${row.roomId}`}
                    rows={snapshot.wiredTopRooms}
                />
            </DetailPanel>
        </div>
    );
};

const MetricCard: FC<{ title: string; value: string; subtitle?: string; accent?: string }> = ({ title, value, subtitle = '', accent }) => {
    return (
        <div className="octane-emustats__metric-card" style={accent ? ({ '--emustats-accent': accent } as CSSProperties) : undefined}>
            <span>{title}</span>
            <strong>{value}</strong>
            {!!subtitle.length && <small>{subtitle}</small>}
        </div>
    );
};

export const EmuStatsView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>(null);
    const [section, setSection] = useState<EmuStatsSection>('overview');
    const [version, setVersion] = useState(0);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            eventUrlPrefix: 'emustats/',
            linkReceived: (url) => {
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
                        setIsVisible((value) => !value);
                        return;
                    case 'refresh':
                        setVersion((value) => value + 1);
                        return;
                }
            }
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        let cancelled = false;

        const load = async (force = false) => {
            try {
                setIsLoading(true);
                const payload = await fetchEmuStats(force);

                if (cancelled) return;

                if (payload) setError(null);
            } catch (err) {
                if (cancelled) return;

                setError(String((err as Error)?.message || err));
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void load(version > 0);

        const interval = window.setInterval(() => void load(true), REFRESH_INTERVAL_MS);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [isVisible, version]);

    const snapshot = getCachedEmuStats();
    const overview = snapshot?.overview;
    const session = GetSessionDataManager();

    const navItems: { key: EmuStatsSection; label: string; count?: number }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'system', label: 'System Health' },
        { key: 'wiredInsights', label: 'Wired Insights', count: snapshot?.wiredTopRooms?.length || 0 },
        { key: 'wired', label: 'Wired Diagnostics', count: snapshot?.wired?.length || 0 },
        { key: 'users', label: 'Online Users', count: snapshot?.users?.length || 0 },
        { key: 'rooms', label: 'Active Rooms', count: snapshot?.rooms?.length || 0 }
    ];

    const content = useMemo(() => {
        if (!snapshot || !overview) return null;

        switch (section) {
            case 'system':
                return <SystemSection snapshot={snapshot} />;
            case 'wiredInsights':
                return <WiredInsightsSection snapshot={snapshot} />;
            case 'users':
                return (
                    <StatsTable<EmuStatsUserRow>
                        columns={[
                            { key: 'id', label: 'ID', className: 'is-xs' },
                            { key: 'username', label: 'Username' },
                            { key: 'rank', label: 'Rank' },
                            { key: 'credits', label: 'Credits', className: 'is-sm' },
                            { key: 'roomId', label: 'Room ID', className: 'is-sm' }
                        ]}
                        rowKey={(row) => `user-${row.id}`}
                        rows={snapshot.users}
                    />
                );
            case 'rooms':
                return (
                    <StatsTable<EmuStatsRoomRow>
                        columns={[
                            { key: 'roomId', label: 'Room', className: 'is-xs' },
                            { key: 'name', label: 'Name' },
                            { key: 'players', label: 'Players', className: 'is-xs' },
                            { key: 'items', label: 'Items', className: 'is-xs' },
                            { key: 'tickables', label: 'Tickables', className: 'is-xs' },
                            { key: 'cpuMs', label: 'CPU (ms)', className: 'is-sm', render: (row) => row.cpuMs.toFixed(2) },
                            { key: 'estimatedRamKb', label: 'RAM (KB)', className: 'is-sm' },
                            { key: 'thread', label: 'Thread', className: 'is-md' }
                        ]}
                        rowKey={(row) => `room-${row.roomId}`}
                        rows={snapshot.rooms}
                    />
                );
            case 'wired':
                return (
                    <StatsTable<EmuStatsWiredRow>
                        columns={[
                            { key: 'roomId', label: 'Room', className: 'is-xs' },
                            { key: 'averageTickMs', label: 'Avg Tick', className: 'is-sm', render: (row) => `${row.averageTickMs} ms` },
                            { key: 'peakTickMs', label: 'Peak Tick', className: 'is-sm', render: (row) => `${row.peakTickMs} ms` },
                            { key: 'usagePercent', label: 'Usage', className: 'is-xs', render: (row) => `${row.usagePercent}%` },
                            { key: 'delayedEventsPending', label: 'Delayed', className: 'is-xs' },
                            { key: 'overloaded', label: 'Overloaded', className: 'is-sm', render: (row) => formatBoolean(row.overloaded) },
                            { key: 'heavy', label: 'Heavy', className: 'is-sm', render: (row) => formatBoolean(row.heavy) }
                        ]}
                        rowKey={(row) => `wired-${row.roomId}`}
                        rows={snapshot.wired}
                    />
                );
            case 'overview':
            default:
                return (
                    <div className="octane-emustats__overview">
                        <div className="octane-emustats__overview-cards">
                            <MetricCard title="Uptime" accent="#6366f1" value={formatUptime(overview.uptimeSeconds)} />
                            <MetricCard title="Last Refresh" accent="#22c55e" value={formatDateTime(overview.lastRefreshEpochMs)} />
                            <MetricCard title="GUI Status" accent="#f59e0b" value={overview.guiStatus} />
                            <MetricCard
                                title="Memory Allocation"
                                value={formatMemory(overview.memoryUsedMb, overview.memoryMaxMb)}
                                subtitle={`${overview.memoryAllocatedMb} MB allocated`}
                            />
                            <MetricCard title="CPU Load" value={formatCpu(overview.cpuLoadPercent)} />
                            <MetricCard title="Active OS Threads" value={String(overview.activeOsThreads)} />
                            <MetricCard title="Connected Players" value={String(overview.connectedPlayers)} />
                            <MetricCard title="Peak Players" value={String(overview.peakPlayers)} />
                            <MetricCard title="Loaded Rooms" value={String(overview.loadedRooms)} />
                            <MetricCard title="Wired Tickables" value={String(overview.wiredTickables)} />
                            <MetricCard
                                title="WS Sessions"
                                value={`${overview.activeWebSocketSessions} / ${overview.peakWebSocketSessions}`}
                                subtitle="current / peak"
                            />
                            <MetricCard title="Avg Room Cycle" value={formatMs(overview.averageRoomCycleMs)} />
                        </div>
                        <MemoryChart history={snapshot.memoryHistory} />
                    </div>
                );
        }
    }, [overview, section, snapshot]);

    if (!isVisible) return null;

    return (
        <OctaneCardView className="octane-emustats-window w-[980px] h-[620px]" isResizable={false} theme="primary-slim" uniqueKey="emu-stats">
            <OctaneCardHeaderView headerText="Emulator Stats" onCloseClick={() => setIsVisible(false)} />
            <OctaneCardContentView classNames={['octane-emustats-window__content']}>
                <div className="octane-emustats">
                    <aside className="octane-emustats__sidebar">
                        <div className="octane-emustats__sidebar-brand">
                            <h2>Arcturus</h2>
                            <p>{session?.userName || 'Operator'}</p>
                        </div>
                        <nav className="octane-emustats__nav">
                            {navItems.map((item) => (
                                <button
                                    key={item.key}
                                    className={`octane-emustats__nav-button ${section === item.key ? 'is-active' : ''}`}
                                    onClick={() => setSection(item.key)}
                                    type="button"
                                >
                                    <span>{item.label}</span>
                                    {typeof item.count === 'number' && <strong>{item.count}</strong>}
                                </button>
                            ))}
                        </nav>
                        <div className="octane-emustats__sidebar-footer">
                            <button className="octane-emustats__refresh-button" onClick={() => setVersion((value) => value + 1)} type="button">
                                Refresh now
                            </button>
                            <p>Auto refresh every {REFRESH_INTERVAL_MS / 1000}s</p>
                        </div>
                    </aside>
                    <section className="octane-emustats__main">
                        <div className="octane-emustats__header">
                            <div>
                                <h1>{navItems.find((item) => item.key === section)?.label || 'Overview'}</h1>
                                <p>Live operational view of emulator health, activity and wired performance.</p>
                            </div>
                            {overview && (
                                <div className="octane-emustats__status-pill" data-status={overview.guiStatus.toLowerCase().replace(/\s+/g, '-')}>
                                    {overview.guiStatus}
                                </div>
                            )}
                        </div>
                        {error && <div className="octane-emustats__error">{error}</div>}
                        {isLoading && !snapshot && <div className="octane-emustats__empty">Loading emulator stats...</div>}
                        {!isLoading && !snapshot && !error && <div className="octane-emustats__empty">No emulator stats available yet.</div>}
                        {snapshot && (
                            <div className="octane-emustats__body" style={{ '--emustats-section': `"${section}"` } as CSSProperties}>
                                {content}
                            </div>
                        )}
                    </section>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
