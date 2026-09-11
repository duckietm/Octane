import { describe, expect, it } from 'vitest';
import { formatTimeLeft, progressPercent, secondsLeft } from './achievementResolution.helpers';

describe('secondsLeft', () => {
    it('counts down from the timestamp the hotel sends', () => {
        expect(secondsLeft(1_000_120, 1_000_000_000)).toBe(120);
    });

    it('never goes negative', () => {
        expect(secondsLeft(900, 1_000_000_000)).toBe(0);
    });
});

describe('formatTimeLeft', () => {
    it('shows days and hours while a day is left', () => {
        expect(formatTimeLeft(2 * 86400 + 3 * 3600)).toBe('2d 3h');
    });

    it('drops to hours and minutes inside the last day', () => {
        expect(formatTimeLeft(5 * 3600 + 30 * 60)).toBe('5h 30m');
    });

    it('shows only minutes in the last hour, and never a negative clock', () => {
        expect(formatTimeLeft(90)).toBe('1m');
        expect(formatTimeLeft(-500)).toBe('0m');
    });
});

describe('progressPercent', () => {
    it('is a clamped percentage of the target', () => {
        expect(progressPercent(5, 10)).toBe(50);
        expect(progressPercent(0, 10)).toBe(0);
        expect(progressPercent(30, 10)).toBe(100);
    });

    it('is zero when the target is unknown', () => {
        expect(progressPercent(5, 0)).toBe(0);
    });
});
