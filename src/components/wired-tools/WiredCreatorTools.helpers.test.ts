import { describe, expect, it } from 'vitest';
import {
    clampWiredVariableValue,
    parseWiredVariableValue,
    buildMonitorLogs,
    exceedsVariableHighlightLimit,
    wiredSourceTypeLabelKey,
    monitorDiagnosticType,
    resolveMonitorErrorDescription,
    toMonitorErrorLogs,
    createEmptyMonitorSnapshot,
    formatMonitorHistoryOccurrence,
    formatMonitorLatestOccurrence,
    formatMonitorSource,
    formatVariableTimestamp,
    isStackOnlyVariable,
    normalizeMonitorReason,
    resolveMonitorRoomCounters,
    splitMonitorStatLine,
    WIRED_MONITOR_DEFAULT_PERMANENT_FURNI_VARIABLES_LIMIT,
    WIRED_MONITOR_THRESHOLDS,
    wiredMonitorColor
} from './WiredCreatorTools.helpers';

describe('WiredCreatorTools helpers', () => {
    describe('createEmptyMonitorSnapshot', () => {
        it('returns a zeroed-out snapshot with empty logs and history arrays', () => {
            const snap = createEmptyMonitorSnapshot();

            expect(snap.usageCurrentWindow).toBe(0);
            expect(snap.usageLimitPerWindow).toBe(0);
            expect(snap.isHeavy).toBe(false);
            expect(snap.killedRemainingSeconds).toBe(0);
            expect(snap.logs).toEqual([]);
            expect(snap.history).toEqual([]);
            expect(snap.roomStats).toBeNull();
        });

        it('returns fresh arrays each call (no shared state)', () => {
            const a = createEmptyMonitorSnapshot();
            const b = createEmptyMonitorSnapshot();

            expect(a.logs).not.toBe(b.logs);
            expect(a.history).not.toBe(b.history);
        });
    });

    describe('formatMonitorLatestOccurrence', () => {
        const NOW = 1_700_000_000_000;

        it('returns "/" when no occurrence has been recorded yet', () => {
            expect(formatMonitorLatestOccurrence(0, NOW)).toBe('/');
            expect(formatMonitorLatestOccurrence(-1, NOW)).toBe('/');
        });

        it('returns "Just now" for diffs under 5 seconds', () => {
            const occurredAt = NOW / 1000;
            expect(formatMonitorLatestOccurrence(occurredAt, NOW)).toBe('Just now');
        });

        it('returns "<n>s ago" for diffs under a minute', () => {
            const tenSecondsAgo = (NOW - 10_000) / 1000;
            expect(formatMonitorLatestOccurrence(tenSecondsAgo, NOW)).toBe('10s ago');
        });

        it('returns "<n>m ago" for diffs under an hour', () => {
            const fiveMinutesAgo = (NOW - 5 * 60 * 1000) / 1000;
            expect(formatMonitorLatestOccurrence(fiveMinutesAgo, NOW)).toBe('5m ago');
        });

        it('returns "<n>h ago" for diffs under a day', () => {
            const threeHoursAgo = (NOW - 3 * 60 * 60 * 1000) / 1000;
            expect(formatMonitorLatestOccurrence(threeHoursAgo, NOW)).toBe('3h ago');
        });

        it('returns "<n>d ago" for older diffs', () => {
            const twoDaysAgo = (NOW - 2 * 24 * 60 * 60 * 1000) / 1000;
            expect(formatMonitorLatestOccurrence(twoDaysAgo, NOW)).toBe('2d ago');
        });
    });

    describe('formatMonitorHistoryOccurrence', () => {
        it('returns "/" for non-positive timestamps', () => {
            expect(formatMonitorHistoryOccurrence(0)).toBe('/');
            expect(formatMonitorHistoryOccurrence(-5)).toBe('/');
        });

        it('returns a non-empty formatted string for a real timestamp', () => {
            const out = formatMonitorHistoryOccurrence(1_700_000_000);
            expect(out).not.toBe('/');
            expect(out.length).toBeGreaterThan(0);
        });
    });

    describe('formatVariableTimestamp', () => {
        it('returns "/" for zero, negative, or falsy values', () => {
            expect(formatVariableTimestamp(0)).toBe('/');
            expect(formatVariableTimestamp(-1)).toBe('/');
            expect(formatVariableTimestamp(null)).toBe('/');
        });

        it('formats a positive epoch-seconds value as a locale string', () => {
            const out = formatVariableTimestamp(1_700_000_000);
            expect(out).not.toBe('/');
            expect(out.length).toBeGreaterThan(0);
        });
    });

    describe('formatMonitorSource', () => {
        it('falls back to "Room monitor" when both label and id are missing', () => {
            expect(formatMonitorSource('', 0)).toBe('Room monitor');
            expect(formatMonitorSource('', -1)).toBe('Room monitor');
        });

        it('returns just the label when there is no source id', () => {
            expect(formatMonitorSource('wired-trigger', 0)).toBe('wired-trigger');
        });

        it('appends "(#<id>)" when source id is positive', () => {
            expect(formatMonitorSource('on-walk', 42)).toBe('on-walk (#42)');
        });

        it('uses "wired" as default label when only the id is set', () => {
            expect(formatMonitorSource('', 7)).toBe('wired (#7)');
        });
    });

    describe('normalizeMonitorReason', () => {
        it('returns the trimmed reason when one is provided', () => {
            expect(normalizeMonitorReason('  loop detected  ')).toBe('loop detected');
        });

        it('falls back to a placeholder when the reason is empty or whitespace', () => {
            expect(normalizeMonitorReason('')).toContain('No detailed reason');
            expect(normalizeMonitorReason('   ')).toContain('No detailed reason');
            expect(normalizeMonitorReason(null)).toContain('No detailed reason');
        });
    });

    describe('isStackOnlyVariable', () => {
        it('is true only for a pointer, which AIR cannot highlight or manage', () => {
            expect(isStackOnlyVariable({ requiresExecutionContext: true })).toBe(true);
            expect(isStackOnlyVariable({ requiresExecutionContext: false })).toBe(false);
            expect(isStackOnlyVariable({})).toBe(false);
            expect(isStackOnlyVariable(null)).toBe(false);
        });
    });

    describe('official monitor statistics', () => {
        it('colours a value green, orange and red at the official shares of its limit', () => {
            expect(wiredMonitorColor(29, 100, WIRED_MONITOR_THRESHOLDS.usage)).toBe('008000');
            expect(wiredMonitorColor(30, 100, WIRED_MONITOR_THRESHOLDS.usage)).toBe('BD7800');
            expect(wiredMonitorColor(70, 100, WIRED_MONITOR_THRESHOLDS.usage)).toBe('ff5733');
            expect(wiredMonitorColor(84, 100, WIRED_MONITOR_THRESHOLDS.furni)).toBe('BD7800');
            expect(wiredMonitorColor(49, 100, WIRED_MONITOR_THRESHOLDS.variables)).toBe('008000');
            // 0/0 is not a number; the official comparisons fall through to red.
            expect(wiredMonitorColor(0, 0, WIRED_MONITOR_THRESHOLDS.usage)).toBe('ff5733');
        });

        it('splits a localized line into its label and the coloured value', () => {
            expect(splitMonitorStatLine('Floor furni: <font color="#008000">12/2500</font>')).toEqual({ label: 'Floor furni', value: '12/2500' });
            expect(splitMonitorStatLine('Plain text')).toEqual({ label: 'Plain text', value: '' });
        });
    });

    describe('resolveMonitorRoomCounters', () => {
        const local = { floorCount: 12, wallCount: 3, itemLimit: 2500, permanentFurniVariables: 4 };

        it('uses the server room counters, user and global lines included', () => {
            const roomStats = {
                floorCount: 40,
                floorLimit: 4000,
                wallCount: 5,
                wallLimit: 4000,
                permanentFurniVariables: 2,
                permanentFurniVariablesLimit: 23,
                permanentUserVariables: 50,
                permanentUserVariablesLimit: 93,
                permanentGlobalVariables: 60,
                permanentGlobalVariablesLimit: 70
            };

            expect(resolveMonitorRoomCounters(roomStats, local)).toEqual({ ...roomStats, hasVariableTotals: true });
        });

        it('falls back to the room engine counts, floor and wall apart, without the variable totals', () => {
            const counters = resolveMonitorRoomCounters(null, local);

            expect(counters.floorCount).toBe(12);
            expect(counters.wallCount).toBe(3);
            expect(counters.floorLimit).toBe(2500);
            expect(counters.wallLimit).toBe(2500);
            expect(counters.permanentFurniVariables).toBe(4);
            expect(counters.permanentFurniVariablesLimit).toBe(WIRED_MONITOR_DEFAULT_PERMANENT_FURNI_VARIABLES_LIMIT);
            expect(counters.hasVariableTotals).toBe(false);
        });
    });
    describe('AIR error list (15)', () => {
        const NOW = 1_700_000_000_000;

        it('pins the ms since the latest to the client clock and keeps -1 for never', () => {
            expect(
                toMonitorErrorLogs(
                    [
                        { errorId: 4, errorName: 'KILLED', category: 'ERROR', amount: 2, msSinceLatest: 10_000 },
                        { errorId: 6, errorName: 'TOO_MANY_VARIABLES', category: 'ERROR', amount: 0, msSinceLatest: -1 }
                    ],
                    NOW
                )
            ).toEqual([
                { errorId: 4, name: 'KILLED', category: 'ERROR', amount: 2, latestOccurredAtMs: NOW - 10_000 },
                { errorId: 6, name: 'TOO_MANY_VARIABLES', category: 'ERROR', amount: 0, latestOccurredAtMs: -1 }
            ]);
        });

        it('builds the table in the server order with the latest detail of the matching diagnostic', () => {
            const logs = buildMonitorLogs(
                [
                    { errorId: 8, name: 'PLACEMENT_FAILURE', category: 'ERROR', amount: 1, latestOccurredAtMs: NOW - 10_000 },
                    { errorId: 0, name: 'EXECUTION_CAP', category: 'ERROR', amount: 0, latestOccurredAtMs: -1 }
                ],
                [{ type: 'PLACEMENT_FAILED', latestReason: 'tile taken', latestSourceLabel: 'wf_act_place', latestSourceId: 9 }],
                NOW
            );

            expect(logs.map((log) => log.type)).toEqual(['PLACEMENT_FAILURE', 'EXECUTION_CAP']);
            expect(logs[0]).toMatchObject({ errorId: 8, amount: '1', latest: '10s ago', latestReason: 'tile taken', latestSourceId: 9 });
            expect(logs[1]).toMatchObject({ errorId: 0, amount: '0', latest: '/', latestSourceLabel: '' });
            expect(monitorDiagnosticType('KILLED')).toBe('KILLED');
        });

        it('uses AIR\'s info text split on its line breaks, or ours without it', () => {
            expect(resolveMonitorErrorDescription('First.\\nSecond.', ['ours'])).toEqual(['First.', 'Second.']);
            expect(resolveMonitorErrorDescription('', ['ours'])).toEqual(['ours']);
        });
    });
});

describe('variable overview helpers', () => {
    it('refuses to highlight more than 1000 holders, or 400 that show a value (official MAX_HIGHLIGHTS)', () => {
        expect(exceedsVariableHighlightLimit(1000, false)).toBe(false);
        expect(exceedsVariableHighlightLimit(1001, false)).toBe(true);
        expect(exceedsVariableHighlightLimit(400, true)).toBe(false);
        expect(exceedsVariableHighlightLimit(401, true)).toBe(true);
    });

    it('titles the type buttons with the official source type keys', () => {
        expect(wiredSourceTypeLabelKey('user')).toBe('wiredfurni.params.sourcetype.users');
        expect(wiredSourceTypeLabelKey('furni')).toBe('wiredfurni.params.sourcetype.furni');
    });
});

describe('wired variable values', () => {
    it('holds a value inside the int32 range the server stores', () => {
        expect(clampWiredVariableValue(99999999999)).toBe(2147483647);
        expect(clampWiredVariableValue(-99999999999)).toBe(-2147483648);
        expect(clampWiredVariableValue(12.7)).toBe(12);
        expect(clampWiredVariableValue(Number.NaN)).toBe(0);
    });

    it('parses typed text, NaN when there is no number', () => {
        expect(parseWiredVariableValue(' 42 ')).toBe(42);
        expect(parseWiredVariableValue('3000000000')).toBe(2147483647);
        expect(parseWiredVariableValue('abc')).toBeNaN();
    });
});
