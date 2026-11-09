import { describe, expect, it } from 'vitest';
import { tradeLockSeconds } from './tradeLockSeconds';

describe('tradeLockSeconds', () => {
    it('sends the sanction length in seconds', () => {
        // "Lock trade 1 week" is 168 hours.
        expect(tradeLockSeconds(168)).toBe(604800);
        expect(tradeLockSeconds(1)).toBe(3600);
        expect(tradeLockSeconds(24)).toBe(86400);
    });

    it('clamps a permanent lock to what fits in a signed int', () => {
        // "Lock trade permanent" is 876000 hours: 3153600000 seconds would wrap.
        expect(tradeLockSeconds(876000)).toBe(2147483647);
    });

    it('never asks for a lock of no length', () => {
        expect(tradeLockSeconds(0)).toBe(3600);
        expect(tradeLockSeconds(-5)).toBe(3600);
    });

    it('rounds a fractional length', () => {
        expect(tradeLockSeconds(1.4)).toBe(3600);
        expect(tradeLockSeconds(1.6)).toBe(7200);
    });
});
