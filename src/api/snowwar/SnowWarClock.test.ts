import { describe, expect, it } from 'vitest';
import { snowWarDeadlineFromSeconds, snowWarSecondsRemaining } from './SnowWarClock';

describe('SnowWar wall-clock countdown', () =>
{
    it('catches up after a background-tab pause instead of counting intervals', () =>
    {
        const deadline = snowWarDeadlineFromSeconds(10_000, 90);

        expect(snowWarSecondsRemaining(deadline, 11_000)).toBe(89);
        expect(snowWarSecondsRemaining(deadline, 41_250)).toBe(59);
        expect(snowWarSecondsRemaining(deadline, 100_000)).toBe(0);
    });

    it('never returns a negative countdown', () =>
    {
        expect(snowWarDeadlineFromSeconds(1_000, -5)).toBe(1_000);
        expect(snowWarSecondsRemaining(1_000, 2_000)).toBe(0);
    });
});
