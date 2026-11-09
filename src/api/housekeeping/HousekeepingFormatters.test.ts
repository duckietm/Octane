import { describe, expect, it } from 'vitest';
import {
    formatCompactNumber,
    formatHousekeepingDate,
    formatHousekeepingListCell,
    parseAuditDetail,
    formatRelativePast,
    formatUptime,
    isAuditEntryAboutRoom,
    isAuditEntryAboutUser,
    isPermanentHousekeepingBan,
    resolveHousekeepingTarget
} from './HousekeepingFormatters';

describe('formatHousekeepingDate', () => {
    it('reads unix seconds, not milliseconds', () => {
        expect(formatHousekeepingDate(1_790_000_000, 'en-GB')).toContain('2026');
    });

    it('shows a dash for a missing or zero time', () => {
        expect(formatHousekeepingDate(0)).toBe('-');
        expect(formatHousekeepingDate(null)).toBe('-');
        expect(formatHousekeepingDate(Number.NaN)).toBe('-');
    });
});

describe('resolveHousekeepingTarget', () => {
    it('prefers the label, then the target id', () => {
        expect(resolveHousekeepingTarget({ targetLabel: 'alice', targetId: 4, detail: '' })).toBe('alice');
        expect(resolveHousekeepingTarget({ targetLabel: '', targetId: 4, detail: '' })).toBe('#4');
    });

    it('falls back to the room id kept in the detail of room actions', () => {
        expect(resolveHousekeepingTarget({ targetLabel: '', targetId: null, detail: 'roomId=411 open=false' })).toBe('#411');
        expect(resolveHousekeepingTarget({ targetLabel: '', targetId: null, detail: 'minutes=5' })).toBe('-');
    });
});

describe('formatUptime', () => {
    it('renders 0/negative/NaN/Infinity as "-"', () => {
        expect(formatUptime(-1)).toBe('-');
        expect(formatUptime(NaN)).toBe('-');
        expect(formatUptime(Infinity)).toBe('-');
    });

    it('renders seconds only for the fresh-boot case', () => {
        expect(formatUptime(0)).toBe('0s');
        expect(formatUptime(45)).toBe('45s');
    });

    it('renders minutes (no hour part) when below 1h', () => {
        expect(formatUptime(60)).toBe('1m');
        expect(formatUptime(60 * 59)).toBe('59m');
    });

    it('renders hours + minutes when below 1 day', () => {
        expect(formatUptime(60 * 60)).toBe('1h 0m');
        expect(formatUptime(60 * 60 * 5 + 60 * 12)).toBe('5h 12m');
    });

    it('renders days + hours + minutes when over a day', () => {
        const fiveDaysTwelveHoursThreeMinutes = 5 * 86400 + 12 * 3600 + 3 * 60;

        expect(formatUptime(fiveDaysTwelveHoursThreeMinutes)).toBe('5d 12h 3m');
    });
});

describe('formatRelativePast', () => {
    const NOW = 1_700_000_000_000; // fixed reference

    it('renders "-" for invalid input', () => {
        expect(formatRelativePast(0, NOW)).toBe('-');
        expect(formatRelativePast(-100, NOW)).toBe('-');
        expect(formatRelativePast(NaN, NOW)).toBe('-');
    });

    it('renders "now" for the first 5 seconds', () => {
        expect(formatRelativePast(NOW - 1_000, NOW)).toBe('now');
        expect(formatRelativePast(NOW - 4_000, NOW)).toBe('now');
    });

    it('renders seconds-ago between 5s and 1m', () => {
        expect(formatRelativePast(NOW - 10_000, NOW)).toBe('10s ago');
        expect(formatRelativePast(NOW - 59_000, NOW)).toBe('59s ago');
    });

    it('renders minutes / hours / days as we cross each unit boundary', () => {
        expect(formatRelativePast(NOW - 60 * 1000, NOW)).toBe('1m ago');
        expect(formatRelativePast(NOW - 3600 * 1000, NOW)).toBe('1h ago');
        expect(formatRelativePast(NOW - 86_400 * 1000, NOW)).toBe('1d ago');
        expect(formatRelativePast(NOW - 3 * 86_400 * 1000, NOW)).toBe('3d ago');
    });

    it('switches to a fixed ISO-date prefix beyond 7 days', () => {
        const tenDaysAgoMs = NOW - 10 * 86_400 * 1000;
        const expected = new Date(tenDaysAgoMs).toISOString().slice(0, 10);

        expect(formatRelativePast(tenDaysAgoMs, NOW)).toBe(expected);
    });
});

describe('formatCompactNumber', () => {
    it('returns "-" for non-finite input', () => {
        expect(formatCompactNumber(NaN)).toBe('-');
        expect(formatCompactNumber(Infinity)).toBe('-');
    });

    it('passes through small values', () => {
        expect(formatCompactNumber(0)).toBe('0');
        expect(formatCompactNumber(42)).toBe('42');
        expect(formatCompactNumber(999)).toBe('999');
    });

    it('uses K from 1_000 onwards (drops decimals at 10K+ for readability)', () => {
        expect(formatCompactNumber(1_000)).toBe('1.0K');
        expect(formatCompactNumber(1_500)).toBe('1.5K');
        expect(formatCompactNumber(12_345)).toBe('12K');
    });

    it('uses M from 1_000_000 onwards (drops decimals at 10M+)', () => {
        expect(formatCompactNumber(1_000_000)).toBe('1.0M');
        expect(formatCompactNumber(2_300_000)).toBe('2.3M');
        expect(formatCompactNumber(15_000_000)).toBe('15M');
    });
});

describe('audit entry filters', () => {
    it('matches a user by target id only for user entries', () => {
        expect(isAuditEntryAboutUser({ targetType: 'user', targetId: 7, detail: '' }, 7)).toBe(true);
        expect(isAuditEntryAboutUser({ targetType: 'user', targetId: 8, detail: '' }, 7)).toBe(false);
        expect(isAuditEntryAboutUser({ targetType: 'room', targetId: 7, detail: '' }, 7)).toBe(false);
    });

    it('matches a room by target or by the room id in the detail, without prefix collisions', () => {
        expect(isAuditEntryAboutRoom({ targetType: 'room', targetId: 41, detail: '' }, 41)).toBe(true);
        expect(isAuditEntryAboutRoom({ targetType: 'user', targetId: null, detail: 'roomId=41 open=true' }, 41)).toBe(true);
        expect(isAuditEntryAboutRoom({ targetType: 'user', targetId: null, detail: 'roomId=411 open=true' }, 41)).toBe(false);
    });
});

describe('parseAuditDetail', () => {
    it('splits key=value pairs and keeps spaces inside values', () => {
        expect(parseAuditDetail('roomId=12 reason=spam in chat ip=1.2.3.4')).toEqual([
            { key: 'roomId', value: '12' },
            { key: 'reason', value: 'spam in chat' },
            { key: 'ip', value: '1.2.3.4' }
        ]);
    });

    it('keeps free text and an empty detail', () => {
        expect(parseAuditDetail('')).toEqual([]);
        expect(parseAuditDetail('manual note')).toEqual([{ key: '', value: 'manual note' }]);
        expect(parseAuditDetail('note first minutes=5')).toEqual([
            { key: '', value: 'note first' },
            { key: 'minutes', value: '5' }
        ]);
    });
});

describe('formatHousekeepingListCell', () => {
    it('turns time columns into dates and empty times into a dash', () => {
        expect(formatHousekeepingListCell('enter', '1790000000', 'en-GB')).toContain('2026');
        expect(formatHousekeepingListCell('trade_locked_until', '0')).toBe('-');
    });

    it('keeps other values and dashes the empty ones', () => {
        expect(formatHousekeepingListCell('message', 'hello')).toBe('hello');
        expect(formatHousekeepingListCell('user', '')).toBe('-');
        expect(formatHousekeepingListCell('mute_minutes', '0')).toBe('-');
        expect(formatHousekeepingListCell('mute_minutes', '15')).toBe('15');
    });
});

describe('isPermanentHousekeepingBan', () => {
    const now = 1_790_622_185;

    it('treats the saturated expiry of a permanent ban as permanent', () => {
        expect(isPermanentHousekeepingBan(2_147_483_647, now)).toBe(true);
    });

    it('keeps a timed ban as a date', () => {
        expect(isPermanentHousekeepingBan(now + 7 * 24 * 3600, now)).toBe(false);
    });
});
