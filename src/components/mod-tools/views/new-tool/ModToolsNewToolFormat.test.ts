import { describe, expect, it, vi } from 'vitest';

const config: Record<string, string> = {};

vi.mock('../../../../api', () => ({
    GetConfigurationValue: (key: string, fallback: string) => config[key] ?? fallback
}));

import { BAN_DURATIONS, clampAmount, getWarningBounds, parseFurniReference, readIntegerConfig, validateWarning } from './ModToolsNewToolFormat';

describe('warning validation', () => {
    it('refuses an empty, a short and an over-long warning and accepts the rest', () => {
        expect(validateWarning('   ', 10, 250)).toBe('empty');
        expect(validateWarning('too short', 10, 250)).toBe('short');
        expect(validateWarning('x'.repeat(251), 10, 250)).toBe('long');
        expect(validateWarning('Please keep the chat clean.', 10, 250)).toBeNull();
    });

    it('measures the trimmed text so padding cannot satisfy the minimum', () => {
        expect(validateWarning('     hi     ', 5, 250)).toBe('short');
    });
});

describe('warning bounds from configuration', () => {
    it('uses the defaults when nothing is configured', () => {
        delete config['modtools.warning.min.length'];
        delete config['modtools.warning.max.length'];

        expect(getWarningBounds()).toEqual({ min: 10, max: 250 });
    });

    it('reads the configured numbers and never lets the maximum drop under the minimum', () => {
        config['modtools.warning.min.length'] = '50';
        config['modtools.warning.max.length'] = '40';

        expect(getWarningBounds()).toEqual({ min: 50, max: 50 });
    });

    it('ignores configuration that is not a whole number', () => {
        expect(readIntegerConfig('missing', 7)).toBe(7);
        config['modtools.warning.min.length'] = 'ten';
        expect(readIntegerConfig('modtools.warning.min.length', 7)).toBe(7);
    });
});

describe('clampAmount', () => {
    it('keeps the amount inside the limits and rounds it down', () => {
        expect(clampAmount(0, 1, 100)).toBe(1);
        expect(clampAmount(250, 1, 100)).toBe(100);
        expect(clampAmount('12.9', 1, 100)).toBe(12);
    });

    it('falls back to the minimum for garbage', () => {
        expect(clampAmount('abc', 1, 100)).toBe(1);
    });
});

describe('parseFurniReference', () => {
    it('tells a numeric id from a class name', () => {
        expect(parseFurniReference(' 1234 ')).toEqual({ itemId: 1234, className: null });
        expect(parseFurniReference('throne')).toEqual({ itemId: null, className: 'throne' });
        expect(parseFurniReference('')).toEqual({ itemId: null, className: null });
    });
});

describe('ban durations', () => {
    it('ends with the permanent entry, which is what the official drop-down defaults to', () => {
        expect(BAN_DURATIONS[BAN_DURATIONS.length - 1].key).toBe('permanent');
        expect(BAN_DURATIONS.every((duration) => duration.hours > 0)).toBe(true);
    });
});
