import type { HotelDateTimeParts, MonitorErrorLog, MonitorLog, MonitorRoomStats, MonitorSnapshot } from './WiredCreatorTools.types';

const HOTEL_TIME_FORMATTERS: Map<string, Intl.DateTimeFormat> = new Map();

export const createEmptyMonitorSnapshot = (): MonitorSnapshot => ({
    usageCurrentWindow: 0,
    usageLimitPerWindow: 0,
    isHeavy: false,
    delayedEventsPending: 0,
    delayedEventsLimit: 0,
    averageExecutionMs: 0,
    peakExecutionMs: 0,
    recursionDepthCurrent: 0,
    recursionDepthLimit: 0,
    killedRemainingSeconds: 0,
    usageWindowMs: 0,
    overloadAverageThresholdMs: 0,
    overloadPeakThresholdMs: 0,
    heavyUsageThresholdPercent: 0,
    heavyConsecutiveWindowsThreshold: 0,
    overloadConsecutiveWindowsThreshold: 0,
    heavyDelayedThresholdPercent: 0,
    logs: [],
    history: [],
    roomStats: null,
    errors: []
});

/** AIR WiredMenuMonitorTab: statistic colours, and the share of the limit where each one starts. */
export const WIRED_MONITOR_COLOR = { GREEN: '008000', ORANGE: 'BD7800', RED: 'ff5733' } as const;
export const WIRED_MONITOR_THRESHOLDS = {
    usage: [0.3, 0.7],
    furni: [0.6, 0.85],
    variables: [0.5, 0.8]
} as const;

/** Official colorize(): green below the first share of the limit, orange below the second, red from there (and at 0/0). */
export const wiredMonitorColor = (amount: number, limit: number, thresholds: readonly [number, number]): string => {
    const share = amount / limit;

    if (share < thresholds[0]) return WIRED_MONITOR_COLOR.GREEN;
    if (share < thresholds[1]) return WIRED_MONITOR_COLOR.ORANGE;

    return WIRED_MONITOR_COLOR.RED;
};

/** The permanent furni variable cap of a Habbo room, used until the server sends its own. */
export const WIRED_MONITOR_DEFAULT_PERMANENT_FURNI_VARIABLES_LIMIT = 23;

/** AIR WiredMenuMonitorTab.CLEAR_LOGS_TIMEOUT: "Clear all" stays disabled this long after a clear. */
export const WIRED_MONITOR_CLEAR_LOGS_TIMEOUT_MS = 4000;

/**
 * The room counters the monitor shows: the server's room stats packet (AIR 1891) once one arrived (`hasVariableTotals` then also allows
 * the permanent user and global lines), otherwise what the room engine holds, against the room item limit.
 * Floor and wall furni are counted apart, as AIR does.
 */
export const resolveMonitorRoomCounters = (
    roomStats: MonitorRoomStats | null,
    local: { floorCount: number; wallCount: number; itemLimit: number; permanentFurniVariables: number }
): MonitorRoomStats & { hasVariableTotals: boolean } => {
    if (roomStats) return { ...roomStats, hasVariableTotals: true };

    const itemLimit = Math.max(0, local.itemLimit || 0);

    return {
        floorCount: local.floorCount,
        floorLimit: itemLimit,
        wallCount: local.wallCount,
        wallLimit: itemLimit,
        permanentFurniVariables: local.permanentFurniVariables,
        permanentFurniVariablesLimit: WIRED_MONITOR_DEFAULT_PERMANENT_FURNI_VARIABLES_LIMIT,
        permanentUserVariables: 0,
        permanentUserVariablesLimit: 0,
        permanentGlobalVariables: 0,
        permanentGlobalVariablesLimit: 0,
        hasVariableTotals: false
    };
};

/**
 * An official statistics line ("Floor furni: <font color=\"#008000\">12/2500</font>") split into its label and the
 * value the font tag colours, so the line renders without its HTML.
 */
export const splitMonitorStatLine = (line: string): { label: string; value: string } => {
    const text = line ?? '';
    const strip = (value: string) => value.replace(/<[^>]*>/g, '').trim();
    const index = text.search(/<font\b/i);

    if (index < 0) return { label: strip(text).replace(/:$/, ''), value: '' };

    return { label: strip(text.slice(0, index)).replace(/:$/, '').trim(), value: strip(text.slice(index)) };
};

export const getHotelTimeFormatter = (timeZone: string): Intl.DateTimeFormat => {
    const formatterTimeZone = timeZone || 'UTC';
    const existingFormatter = HOTEL_TIME_FORMATTERS.get(formatterTimeZone);

    if (existingFormatter) return existingFormatter;

    let formatter: Intl.DateTimeFormat = null;

    try {
        formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: formatterTimeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        });
    } catch {
        formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'UTC',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        });
    }

    HOTEL_TIME_FORMATTERS.set(formatterTimeZone, formatter);

    return formatter;
};

export const getHotelDateTimeParts = (epochMs: number, timeZone: string): HotelDateTimeParts => {
    const normalizedEpochMs = Number.isFinite(epochMs) ? epochMs : Date.now();
    const date = new Date(normalizedEpochMs);
    const formatter = getHotelTimeFormatter(timeZone);
    const formattedParts = formatter.formatToParts(date);
    const partsMap = new Map<string, string>();

    for (const part of formattedParts) {
        if (part.type === 'literal') continue;

        partsMap.set(part.type, part.value);
    }

    return {
        year: Number(partsMap.get('year') ?? date.getUTCFullYear()),
        month: Number(partsMap.get('month') ?? date.getUTCMonth() + 1),
        day: Number(partsMap.get('day') ?? date.getUTCDate()),
        hour: Number(partsMap.get('hour') ?? date.getUTCHours()),
        minute: Number(partsMap.get('minute') ?? date.getUTCMinutes()),
        second: Number(partsMap.get('second') ?? date.getUTCSeconds()),
        millisecond: ((normalizedEpochMs % 1000) + 1000) % 1000
    };
};

export const formatMonitorLatestOccurrence = (latestOccurrenceSeconds: number, nowMs: number): string => {
    if (latestOccurrenceSeconds <= 0) return '/';

    const diffMs = Math.max(0, nowMs - latestOccurrenceSeconds * 1000);
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 5) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);

    return `${diffDays}d ago`;
};

export const formatMonitorHistoryOccurrence = (occurredAtSeconds: number): string => {
    if (occurredAtSeconds <= 0) return '/';

    return new Date(occurredAtSeconds * 1000).toLocaleString('en-GB');
};

export const formatVariableTimestamp = (timestamp: number): string => {
    if (!timestamp || timestamp <= 0) return '/';

    return new Date(timestamp * 1000).toLocaleString('en-GB');
};

export const formatMonitorSource = (sourceLabel: string, sourceId: number): string => {
    const normalizedLabel = (sourceLabel || '').trim();

    if (!normalizedLabel && !(sourceId > 0)) return 'Room monitor';
    if (sourceId > 0) return `${normalizedLabel || 'wired'} (#${sourceId})`;

    return normalizedLabel;
};

export const normalizeMonitorReason = (reason: string): string => {
    const normalizedReason = (reason || '').trim();

    return normalizedReason || 'No detailed reason was recorded for this entry.';
};

/** AIR calls a placement failure PLACEMENT_FAILURE; our diagnostics (the 5101 detail, the history) call it PLACEMENT_FAILED. */
const MONITOR_DIAGNOSTIC_TYPE_OF_ERROR: Record<string, string> = { PLACEMENT_FAILURE: 'PLACEMENT_FAILED' };

/** The diagnostic type behind a row of AIR's error list. */
export const monitorDiagnosticType = (errorName: string): string => MONITOR_DIAGNOSTIC_TYPE_OF_ERROR[errorName] ?? errorName;

/**
 * AIR's error list (15) as the store keeps it: the server sends the milliseconds since the latest occurrence, so the
 * time is pinned to the client clock when the packet arrives; -1 (never) stays -1.
 */
export const toMonitorErrorLogs = (
    errors: ReadonlyArray<{ errorId: number; errorName: string; category: string; amount: number; msSinceLatest: number }>,
    receivedAtMs: number
): MonitorErrorLog[] =>
    (errors ?? []).map((error) => ({
        errorId: Number(error.errorId ?? 0),
        name: String(error.errorName ?? ''),
        category: String(error.category ?? ''),
        amount: Number(error.amount ?? 0),
        latestOccurredAtMs: Number(error.msSinceLatest ?? -1) < 0 ? -1 : receivedAtMs - Number(error.msSinceLatest)
    }));

/**
 * The monitor log table: AIR's rows in the server's order (type, category, amount, latest), each with the detail of its
 * latest occurrence from our monitor packet (5101) for the info window.
 */
export const buildMonitorLogs = (errors: ReadonlyArray<MonitorErrorLog>, details: MonitorSnapshot['logs'], nowMs: number): MonitorLog[] =>
    (errors ?? []).map((error) => {
        const detail = (details ?? []).find((entry) => entry.type === monitorDiagnosticType(error.name));
        const amount = Math.max(0, error.amount);

        return {
            errorId: error.errorId,
            type: error.name,
            category: error.category,
            amount: String(amount),
            latest: amount > 0 && error.latestOccurredAtMs >= 0 ? formatMonitorLatestOccurrence(error.latestOccurredAtMs / 1000, nowMs) : '/',
            latestReason: normalizeMonitorReason(detail?.latestReason),
            latestSourceLabel: String(detail?.latestSourceLabel ?? ''),
            latestSourceId: Number(detail?.latestSourceId ?? 0)
        };
    });

/** AIR's info text of an error (`wiredmenu.error_info.<id>`, one paragraph per line break) or, without it, ours. */
export const resolveMonitorErrorDescription = (officialText: string, fallback: string[] = []): string[] => {
    const paragraphs = (officialText ?? '')
        .split(/\\n|\n/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0);

    return paragraphs.length ? paragraphs : fallback;
};

/** A pointer (AIR requiresExecutionContext) only exists while a stack runs: nobody holds it, so it cannot be highlighted or managed. */
export const isStackOnlyVariable = (definition?: { requiresExecutionContext?: boolean } | null): boolean => !!definition?.requiresExecutionContext;

/** Official WiredMenuOverviewTab: at most 1000 holders highlighted, 400 when each shows a value. */
export const WIRED_VARIABLE_HIGHLIGHT_MAX = 1000;
export const WIRED_VARIABLE_HIGHLIGHT_MAX_WITH_VALUE = 400;

/** Whether a variable has too many holders to highlight (`wiredmenu.variable_overview.highlight.error.too_many`). */
export const exceedsVariableHighlightLimit = (holderCount: number, hasValue: boolean): boolean =>
    holderCount > (hasValue ? WIRED_VARIABLE_HIGHLIGHT_MAX_WITH_VALUE : WIRED_VARIABLE_HIGHLIGHT_MAX);

/** Official VariableTypePicker: the furni / users / global / context buttons are titled `wiredfurni.params.sourcetype.*`. */
export const wiredSourceTypeLabelKey = (type: string): string => `wiredfurni.params.sourcetype.${type === 'user' ? 'users' : type}`;

const WIRED_INT_MIN = -2147483648;
const WIRED_INT_MAX = 2147483647;

/** A variable value as the server stores it: a whole number held inside the int32 range, so what is shown is what is saved. */
export const clampWiredVariableValue = (value: number): number =>
    Number.isFinite(value) ? Math.min(WIRED_INT_MAX, Math.max(WIRED_INT_MIN, Math.trunc(value))) : 0;

/** A typed variable value, NaN when the text holds no number (the caller then cancels the edit). */
export const parseWiredVariableValue = (raw: string): number => {
    const parsed = parseInt(raw.trim(), 10);

    return Number.isNaN(parsed) ? Number.NaN : clampWiredVariableValue(parsed);
};
