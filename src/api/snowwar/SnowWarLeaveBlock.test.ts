import { describe, expect, it } from 'vitest';
import { formatSnowWarBlockCountdown, snowWarBlockDeadline, snowWarBlockSecondsLeft } from './SnowWarLeaveBlock';

describe('SnowWarLeaveBlock', () =>
{
    it('formats the AIR m:ss countdown', () =>
    {
        expect(formatSnowWarBlockCountdown(180)).toBe('3:00');
        expect(formatSnowWarBlockCountdown(65)).toBe('1:05');
        expect(formatSnowWarBlockCountdown(9)).toBe('0:09');
        expect(formatSnowWarBlockCountdown(-4)).toBe('0:00');
    });

    it('counts down from a wall-clock deadline', () =>
    {
        const deadline = snowWarBlockDeadline(120, 1_000);

        expect(snowWarBlockSecondsLeft(deadline, 1_000)).toBe(120);
        expect(snowWarBlockSecondsLeft(deadline, 1_500)).toBe(120);
        expect(snowWarBlockSecondsLeft(deadline, 61_000)).toBe(60);
        expect(snowWarBlockSecondsLeft(deadline, 121_000)).toBe(0);
    });

    it('treats a zero block as not blocked', () =>
    {
        expect(snowWarBlockDeadline(0, 5_000)).toBe(0);
        expect(snowWarBlockSecondsLeft(0, 5_000)).toBe(0);
    });
});
