import { describe, expect, it } from 'vitest';
import { canEditFootballGate, DEFAULT_FEMALE_FOOTBALL_GATE_LOOK, DEFAULT_MALE_FOOTBALL_GATE_LOOK, getFootballGateLook } from './FootballGateLook';

describe('getFootballGateLook', () => {
    it('opens on the look the gate stored for the chosen gender', () => {
        expect(getFootballGateLook('M', 'ch-3109-92.lg-3116-82', 'ch-3112-1408')).toBe('ch-3109-92.lg-3116-82');
        expect(getFootballGateLook('F', 'ch-3109-92.lg-3116-82', 'ch-3112-1408')).toBe('ch-3112-1408');
    });

    it('opens on the native default when the gate has no look for that gender', () => {
        expect(getFootballGateLook('M', '', 'ch-3112-1408')).toBe(DEFAULT_MALE_FOOTBALL_GATE_LOOK);
        expect(getFootballGateLook('F', 'ch-3109-92', null)).toBe(DEFAULT_FEMALE_FOOTBALL_GATE_LOOK);
        expect(DEFAULT_MALE_FOOTBALL_GATE_LOOK).toBe('hd-99999-99999.lg-270-62');
        expect(DEFAULT_FEMALE_FOOTBALL_GATE_LOOK).toBe('hd-99999-99999.ch-630-62.lg-695-62');
    });
});

describe('canEditFootballGate', () => {
    it('lets the owner, any-room controllers and rights holders edit', () => {
        expect(canEditFootballGate(true, false, 0)).toBe(true);
        expect(canEditFootballGate(false, true, 0)).toBe(true);
        expect(canEditFootballGate(false, false, 1)).toBe(true);
    });

    it('refuses a visitor without rights', () => {
        expect(canEditFootballGate(false, false, 0)).toBe(false);
    });
});
