import { describe, expect, it, vi } from 'vitest';

/**
 * Mock LocalizeText (which transitively imports @octane/renderer)
 * with a deterministic stub. The stub returns `key|amount` so each test
 * can assert both the bucket FriendlyTime chose AND the value it computed.
 */
vi.mock('./LocalizeText', () => ({
    LocalizeText: (key: string, _params?: string[], replacements?: string[]) => `${key}|${replacements?.[0] ?? ''}`
}));

import { FriendlyTime } from './FriendlyTime';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

describe('FriendlyTime.format', () => {
    it('uses the seconds bucket for small values', () => {
        expect(FriendlyTime.format(5)).toBe('friendlytime.seconds|5');
        expect(FriendlyTime.format(0)).toBe('friendlytime.seconds|0');
    });

    it('uses the minutes bucket once we cross 3 * 60s (default threshold)', () => {
        expect(FriendlyTime.format(4 * MINUTE)).toBe('friendlytime.minutes|4');
        expect(FriendlyTime.format(10 * MINUTE)).toBe('friendlytime.minutes|10');
    });

    it('uses the hours bucket above 3 * HOUR', () => {
        expect(FriendlyTime.format(4 * HOUR)).toBe('friendlytime.hours|4');
    });

    it('uses the days bucket above 3 * DAY', () => {
        expect(FriendlyTime.format(5 * DAY)).toBe('friendlytime.days|5');
    });

    it('uses the months bucket above 3 * MONTH', () => {
        expect(FriendlyTime.format(4 * MONTH)).toBe('friendlytime.months|4');
    });

    it('uses the years bucket above 3 * YEAR', () => {
        expect(FriendlyTime.format(4 * YEAR)).toBe('friendlytime.years|4');
    });

    it('rounds half-hours correctly inside the hours bucket', () => {
        // 4.5 hours -> rounds to 5
        expect(FriendlyTime.format(4 * HOUR + 30 * MINUTE)).toBe('friendlytime.hours|5');
    });

    it('threshold=1 lets the larger bucket win sooner', () => {
        // With default threshold=3, 90s would stay in "seconds"; with threshold=1
        // it crosses into "minutes" (90s > 1*60s).
        expect(FriendlyTime.format(90, '', 1)).toBe('friendlytime.minutes|2');
    });

    it('key suffix is appended to the bucket key', () => {
        // Useful for plurals / variants ('s' for singular fallback, etc.)
        expect(FriendlyTime.format(5, '.foo')).toBe('friendlytime.seconds.foo|5');
        expect(FriendlyTime.format(4 * HOUR, '.foo')).toBe('friendlytime.hours.foo|4');
    });
});

describe('FriendlyTime.shortFormat', () => {
    it('uses the .short variant of each bucket', () => {
        expect(FriendlyTime.shortFormat(5)).toBe('friendlytime.seconds.short|5');
        expect(FriendlyTime.shortFormat(4 * MINUTE)).toBe('friendlytime.minutes.short|4');
        expect(FriendlyTime.shortFormat(4 * HOUR)).toBe('friendlytime.hours.short|4');
        expect(FriendlyTime.shortFormat(5 * DAY)).toBe('friendlytime.days.short|5');
        expect(FriendlyTime.shortFormat(4 * MONTH)).toBe('friendlytime.months.short|4');
        expect(FriendlyTime.shortFormat(4 * YEAR)).toBe('friendlytime.years.short|4');
    });

    it('respects the optional key suffix and threshold', () => {
        expect(FriendlyTime.shortFormat(2 * MINUTE, '.bar', 1)).toBe('friendlytime.minutes.short.bar|2');
    });
});

describe('FriendlyTime.getLocalization', () => {
    it('formats an arbitrary key and amount with the (amount, AMOUNT) replacements', () => {
        expect(FriendlyTime.getLocalization('whatever', 42)).toBe('whatever|42');
    });
});
