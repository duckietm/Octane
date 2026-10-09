const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "5d 12h 3m" — compact uptime display for the dashboard. We don't
 * use the existing `friendlyTime` helper because that one is tuned
 * for "how long ago" (past tense, single-unit), while uptime needs
 * multi-unit forward-looking output and to handle seconds-only
 * fresh-boot cases.
 */
export const formatUptime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return '-';
    if (seconds < MINUTE) return `${Math.floor(seconds)}s`;

    const d = Math.floor(seconds / DAY);
    const h = Math.floor((seconds % DAY) / HOUR);
    const m = Math.floor((seconds % HOUR) / MINUTE);

    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;

    return `${m}m`;
};

/**
 * "5m ago", "2h ago", "3d ago" — past-tense relative formatter for
 * audit-log timestamps. Anything older than a day rolls to a fixed
 * date string so the log entries stay scannable even after a week.
 */
export const formatRelativePast = (timestampMs: number, nowMs: number = Date.now()): string => {
    if (!Number.isFinite(timestampMs) || timestampMs <= 0) return '-';

    const deltaSeconds = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));

    if (deltaSeconds < 5) return 'now';
    if (deltaSeconds < MINUTE) return `${deltaSeconds}s ago`;
    if (deltaSeconds < HOUR) return `${Math.floor(deltaSeconds / MINUTE)}m ago`;
    if (deltaSeconds < DAY) return `${Math.floor(deltaSeconds / HOUR)}h ago`;
    if (deltaSeconds < 7 * DAY) return `${Math.floor(deltaSeconds / DAY)}d ago`;

    const date = new Date(timestampMs);

    return date.toISOString().slice(0, 10);
};

export const formatCompactNumber = (value: number): string => {
    if (!Number.isFinite(value)) return '-';

    const abs = Math.abs(value);

    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;

    return value.toString();
};

/**
 * Calendar date for a unix time in seconds, as the server sends it (account
 * creation, room creation). Zero or a missing value shows a dash.
 */
export const formatHousekeepingDate = (unixSeconds: number | null | undefined, locale?: string): string => {
    if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return '-';

    return new Date(unixSeconds * 1000).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Readable target of an audit entry. The server leaves the label empty and,
 * for room actions, keeps the room id only in the detail ("roomId=12 ...").
 */
export const resolveHousekeepingTarget = (entry: { targetLabel: string; targetId: number | null; detail: string }): string => {
    if (entry.targetLabel) return entry.targetLabel;
    if (entry.targetId) return `#${entry.targetId}`;

    const roomId = /(?:^|\s)roomId=(\d+)/.exec(entry.detail || '');

    return roomId ? `#${roomId[1]}` : '-';
};

type AuditEntryTarget = { targetType: string; targetId: number | null; detail: string };

/** Whether an audit entry acted on this user. */
export const isAuditEntryAboutUser = (entry: AuditEntryTarget, userId: number): boolean => entry.targetType === 'user' && entry.targetId === userId;

/**
 * Whether an audit entry acted on this room: room actions carry the room id in
 * the target once the server writes it, and in the detail ("roomId=12") today.
 */
export const isAuditEntryAboutRoom = (entry: AuditEntryTarget, roomId: number): boolean =>
    (entry.targetType === 'room' && entry.targetId === roomId) || (entry.detail || '').split(/\s+/).includes(`roomId=${roomId}`);

/**
 * Splits an audit detail ("roomId=12 reason=spam in chat ip=1.2.3.4") into
 * its fields. A value runs until the next "key=", so reasons and messages may
 * contain spaces; text before the first key is kept under an empty key.
 */
export const parseAuditDetail = (detail: string): { key: string; value: string }[] => {
    const text = (detail || '').trim();

    if (!text) return [];

    const fields: { key: string; value: string }[] = [];
    const pattern = /(?:^|\s)([A-Za-z_][A-Za-z0-9_]*)=/g;
    const marks: { key: string; start: number; valueStart: number }[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        marks.push({ key: match[1], start: match.index, valueStart: match.index + match[0].length });
    }

    if (!marks.length) return [{ key: '', value: text }];
    if (marks[0].start > 0) fields.push({ key: '', value: text.slice(0, marks[0].start).trim() });

    marks.forEach((mark, index) => {
        const end = index + 1 < marks.length ? marks[index + 1].start : text.length;

        fields.push({ key: mark.key, value: text.slice(mark.valueStart, end).trim() });
    });

    return fields;
};

/** Full local date and time of a timestamp in milliseconds. */
export const formatHousekeepingDateTime = (timestampMs: number, locale?: string): string => {
    if (!Number.isFinite(timestampMs) || timestampMs <= 0) return '-';

    return new Date(timestampMs).toLocaleString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

/** List columns the server sends as unix seconds. */
export const HOUSEKEEPING_TIME_COLUMNS: ReadonlySet<string> = new Set(['time', 'enter', 'expires', 'last_online', 'probation_until', 'trade_locked_until', 'since']);

/** Display text of one list cell: time columns become dates, empty and zero values a dash. */
export const formatHousekeepingListCell = (column: string, value: string, locale?: string): string => {
    const text = (value ?? '').trim();

    if (HOUSEKEEPING_TIME_COLUMNS.has(column)) {
        const seconds = parseInt(text);

        return seconds > 0 ? formatHousekeepingDateTime(seconds * 1000, locale) : '-';
    }

    if (column === 'mute_minutes') return text && text !== '0' ? text : '-';

    return text || '-';
};

/** A ban ending this far ahead is shown as permanent; a permanent one is stored as the int maximum, in 2038. */
const PERMANENT_BAN_AFTER_SECONDS = 5 * 365 * 24 * 3600;

export const isPermanentHousekeepingBan = (expiresSeconds: number, nowSeconds: number = Math.floor(Date.now() / 1000)): boolean =>
    Number.isFinite(expiresSeconds) && expiresSeconds - nowSeconds >= PERMANENT_BAN_AFTER_SECONDS;
