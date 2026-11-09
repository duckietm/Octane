import { IWiredLogEntry, WiredLogPageEvent, WiredRoomLogsPageComposer } from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { useMessageEvent } from '../../hooks';
import { useWiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
import { WiredPagedTable, WiredTableCell, WiredTableColumn } from './WiredPagedTable';
import { calculateLastPage, NO_PAGE } from './WiredPaging.helpers';
import { Checkbox } from '../../common/Checkbox';
import { Select } from '../../common/Select';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

/** Rows per page, as the official log list shows them. */
export const WIRED_ROOM_LOGS_PAGE_SIZE = 50;
/** Above the server's own 250 ms limit on the page request. */
const REQUEST_PAGE_RATELIMIT = 300;
const REFRESH_TIME_MS = 2500;
const FILTER_MAX_CHARS = 400;
/** AIR's log levels, by the number the server sends (`wiredmenu.logs_overview.log_level.N`). */
export const WIRED_LOG_LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
/** AIR's two log sources (`wiredmenu.logs_overview.log_source.N`): the engine's own notes and "write to logs" lines. */
export const WIRED_LOG_SOURCES = ['System', 'Wired'];
/** `WiredRoomLogListTableObject.COLORS`: info 0x0011FF, warn 0xB36800, error 0xDB2800, debug 0x9B01C6. */
const LEVEL_CLASS: Record<number, string> = { 0: 'text-[#0011ff]', 1: 'text-[#b36800]', 2: 'text-[#db2800]', 3: 'text-[#9b01c6]' };

interface LogPage {
    totalEntries: number;
    currentPage: number;
    entries: IWiredLogEntry[];
    logLevelFilter: number;
    logSourceFilter: number;
    query: string;
}

export interface WiredRoomLogsViewProps {
    onClose: () => void;
}

export const wiredLogSourceLabel = (source: number): string => {
    const fallback = WIRED_LOG_SOURCES[source];

    return fallback ? localizeWithFallback(`wiredmenu.logs_overview.log_source.${source}`, fallback) : String(source);
};

export const wiredLogLevelLabel = (level: number): string => {
    const fallback = WIRED_LOG_LEVELS[level];

    return fallback ? localizeWithFallback(`wiredmenu.logs_overview.log_level.${level}`, fallback) : String(level);
};

/**
 * The room's wired log: a text filter, the source and level menus, auto refresh every 2.5 s
 * and the log a page of 50 at a time, each line coloured by its level. Paging keeps the page's
 * own filters; changing a filter asks for page 1 with the new ones. A page the user asked for
 * puts its filters back into the controls and scrolls to the top; an auto refresh leaves both
 * alone.
 */
export const WiredRoomLogsView = ({ onClose }: WiredRoomLogsViewProps) => {
    const [page, setPage] = useState<LogPage | null>(null);
    const [source, setSource] = useState(-1);
    const [level, setLevel] = useState(-1);
    const [query, setQuery] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshEpoch, setRefreshEpoch] = useState(0);
    const [scrollKey, setScrollKey] = useState(0);
    // The filters the next request goes out with; paging and auto refresh leave them at the page's own.
    const nextFilters = useRef<{ logSourceFilter: number; logLevelFilter: number; query: string } | null>(null);
    const silentRequest = useRef(false);
    const pageRequestedSilently = useRef(false);

    useMessageEvent<WiredLogPageEvent>(WiredLogPageEvent, (event) => {
        const parser = event.getParser();

        setPage({
            totalEntries: parser.totalEntries,
            currentPage: parser.currentPage,
            entries: [...parser.entries],
            logLevelFilter: parser.logLevelFilter,
            logSourceFilter: parser.logSourceFilter,
            query: parser.query ?? ''
        });

        if (pageRequestedSilently.current) return;

        setSource(parser.logSourceFilter);
        setLevel(parser.logLevelFilter);
        setQuery(parser.query ?? '');
        setScrollKey((key) => key + 1);
    });

    const currentPage = page?.currentPage ?? NO_PAGE;
    const lastPage = page ? calculateLastPage(page.totalEntries, WIRED_ROOM_LOGS_PAGE_SIZE) : NO_PAGE;

    const requests = useWiredPageRequests({
        currentPage,
        lastPage,
        pageKey: page,
        ratelimit: REQUEST_PAGE_RATELIMIT,
        samePageTimeout: false,
        onRequestPage: (requested) => {
            const filters = nextFilters.current ?? {
                logSourceFilter: page?.logSourceFilter ?? -1,
                logLevelFilter: page?.logLevelFilter ?? -1,
                query: page?.query ?? ''
            };

            pageRequestedSilently.current = silentRequest.current;
            SendMessageComposer(
                new WiredRoomLogsPageComposer(requested, WIRED_ROOM_LOGS_PAGE_SIZE, filters.logLevelFilter, filters.logSourceFilter, filters.query)
            );
        }
    });

    // The first page, with no filters.
    useEffect(() => {
        SendMessageComposer(new WiredRoomLogsPageComposer(1, WIRED_ROOM_LOGS_PAGE_SIZE, -1, -1, ''));
    }, []);

    const updateFilters = (changes: Partial<{ source: number; level: number; query: string }> = {}) => {
        if (!requests.canRequestNewPage(false)) return;

        setRefreshEpoch((epoch) => epoch + 1);

        nextFilters.current = {
            logSourceFilter: changes.source ?? source,
            logLevelFilter: changes.level ?? level,
            query: changes.query ?? query
        };
        requests.requestPage(1);
        nextFilters.current = null;
    };

    // The timer outlives renders; it asks through the limiter of the latest one.
    const requestsRef = useRef(requests);

    useEffect(() => {
        requestsRef.current = requests;
    });

    useEffect(() => {
        if (!autoRefresh) return;

        const timer = setInterval(() => {
            silentRequest.current = true;
            requestsRef.current.refresh();
            silentRequest.current = false;
        }, REFRESH_TIME_MS);

        return () => clearInterval(timer);
    }, [autoRefresh, refreshEpoch]);

    const columns: WiredTableColumn[] = [
        { id: 'timestamp', title: localizeWithFallback('wiredmenu.logs_overview.col.timestamp', 'Timestamp'), className: 'w-[150px]' },
        { id: 'source', title: localizeWithFallback('wiredmenu.logs_overview.col.source', 'Source'), className: 'w-[150px]' },
        { id: 'level', title: localizeWithFallback('wiredmenu.logs_overview.col.level', 'Level'), className: 'w-[80px]' },
        { id: 'message', title: localizeWithFallback('wiredmenu.logs_overview.col.message', 'Message') }
    ];

    const getCell = (entry: IWiredLogEntry, columnId: string): WiredTableCell => {
        const className = LEVEL_CLASS[entry.logLevel] ?? '';

        switch (columnId) {
            case 'timestamp':
                return { content: entry.timestampStr, title: entry.timestampStr, className: `${className} tabular-nums` };
            case 'source':
                return { content: wiredLogSourceLabel(entry.logSource), className };
            case 'level':
                return { content: wiredLogLevelLabel(entry.logLevel), className };
            default:
                return { content: entry.logMessage, title: entry.logMessage, className };
        }
    };

    return (
        <NativeTextTree>
            <OctaneCardView
                className="octane-wired-menu min-w-[760px] max-w-[760px] max-h-[560px]"
                theme="primary-slim"
                uniqueKey="wired-room-logs"
                windowPosition={DraggableWindowPosition.TOP_LEFT}
                offsetLeft={560}
                offsetTop={40}
            >
                <OctaneCardHeaderView headerText={localizeWithFallback('wiredmenu.logs_overview.title', 'Wired room logs')} onCloseClick={onClose} />
                <OctaneCardContentView className="text-black bg-[#f4efe3] p-3 flex flex-col gap-3" overflow="hidden">
                    <div className="rounded border border-[#c8c2b2] bg-white p-3 flex items-center justify-between gap-3">
                        <Text className="whitespace-pre-line">
                            {localizeWithFallback(
                                'wiredmenu.logs_overview.info',
                                'Every line the wired engine wrote for this room, newest first. Filter by text, source or level.'
                            ).replace(/\\n/g, '\n')}
                        </Text>
                        <label className="flex items-center gap-1 text-[12px] whitespace-nowrap">
                            <Checkbox checked={autoRefresh} onCheckedChange={(nextChecked) => setAutoRefresh(nextChecked)} />
                            {localizeWithFallback('wiredmenu.logs_overview.auto_refresh', 'Auto refresh')}
                        </label>
                        <Button variant="secondary" onClick={() => requests.refresh()}>
                            {localizeWithFallback('wiredmenu.logs_overview.refresh', 'Refresh')}
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[12px]">
                        <label className="flex items-center gap-2">
                            <Text bold>{localizeWithFallback('wiredmenu.logs_overview.filter', 'Filter:')}</Text>
                            <input
                                className="w-[240px] rounded border border-[#b8b2a4] bg-white px-2 py-[2px] text-[12px]"
                                type="text"
                                maxLength={FILTER_MAX_CHARS}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;

                                    event.preventDefault();
                                    updateFilters();
                                }}
                            />
                        </label>
                        <label className="flex items-center gap-2">
                            <Text bold>{localizeWithFallback('wiredmenu.logs_overview.log_source', 'Log source:')}</Text>
                            <Select
                                className="rounded border border-[#b8b2a4] bg-white px-2 py-[2px] text-[12px]"
                                value={source}
                                onChange={(event) => {
                                    const next = Number(event.target.value);

                                    // AIR refuses the menu selection while the limiter holds requests back.
                                    if (!requests.canRequestNewPage(false)) return;

                                    setSource(next);
                                    updateFilters({ source: next });
                                }}
                            >
                                <option value={-1}>{localizeWithFallback('wiredmenu.logs_overview.log_source.all', 'All')}</option>
                                {WIRED_LOG_SOURCES.map((name, index) => (
                                    <option key={name} value={index}>
                                        {wiredLogSourceLabel(index)}
                                    </option>
                                ))}
                            </Select>
                        </label>
                        <label className="flex items-center gap-2">
                            <Text bold>{localizeWithFallback('wiredmenu.logs_overview.log_level', 'Log level:')}</Text>
                            <Select
                                className="rounded border border-[#b8b2a4] bg-white px-2 py-[2px] text-[12px]"
                                value={level}
                                onChange={(event) => {
                                    const next = Number(event.target.value);

                                    // AIR refuses the menu selection while the limiter holds requests back.
                                    if (!requests.canRequestNewPage(false)) return;

                                    setLevel(next);
                                    updateFilters({ level: next });
                                }}
                            >
                                <option value={-1}>{localizeWithFallback('wiredmenu.logs_overview.log_level.all', 'All')}</option>
                                {WIRED_LOG_LEVELS.map((name, index) => (
                                    <option key={name} value={index}>
                                        {wiredLogLevelLabel(index)}
                                    </option>
                                ))}
                            </Select>
                        </label>
                    </div>
                    <WiredPagedTable
                        columns={columns}
                        rows={page?.entries ?? []}
                        getRowId={(entry) => String(entry.id)}
                        getCell={getCell}
                        currentPage={currentPage}
                        totalEntries={page?.totalEntries ?? 0}
                        lastPage={lastPage}
                        requests={requests}
                        emptyText={localizeWithFallback('wiredmenu.logs_overview.empty', 'No log lines match the current filters')}
                        pagingTextKey="wiredmenu.logs_overview.bottom_text"
                        scrollResetKey={scrollKey}
                        bodyClassName="h-[320px]"
                    />
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
