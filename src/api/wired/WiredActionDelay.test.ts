import { describe, expect, it } from 'vitest';
import { encodeWiredDelay, formatWiredDelaySeconds, wiredDelayFromSeconds, wiredDelayUnits } from './WiredActionDelay';

describe('wired action delay', () => {
    it('encodes standard pulses and precise 50 ms steps like the official editor', () => {
        expect(encodeWiredDelay(3, false)).toBe(3);
        expect(encodeWiredDelay(3, true)).toBe(-150);
        expect(encodeWiredDelay(0, true)).toBe(0);
        expect(encodeWiredDelay(5000, true)).toBe(-60000);
        expect(wiredDelayUnits(-150)).toBe(3);
        expect(wiredDelayUnits(7)).toBe(7);
    });

    it('shows and reads seconds', () => {
        expect(formatWiredDelaySeconds(3)).toBe('1.5');
        expect(formatWiredDelaySeconds(-50)).toBe('0.05');
        expect(wiredDelayFromSeconds(1.5, false)).toBe(3);
        expect(wiredDelayFromSeconds(0.25, true)).toBe(-250);
    });
});
