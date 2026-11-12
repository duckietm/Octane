import { describe, expect, it } from 'vitest';
import { formatRoomStats, useRoomStatsStore } from './roomStatsStore';

describe('room statistics readout', () => {
    it('writes ping, frames per second and frame time as the official canvas does', () => {
        expect(formatRoomStats({ pingMs: 42.4, frameIntervalMs: 1000 / 24, frameTimeMs: 3.26 })).toBe('ping: 42ms\nfps: 24.0\nframe time: 3.3ms');
    });

    it('leaves the ping out until it has been measured', () => {
        expect(formatRoomStats({ pingMs: -1, frameIntervalMs: 20, frameTimeMs: 0.4 })).toBe('fps: 50.0\nframe time: <1.0ms');
    });

    it('is switched by its toggle', () => {
        expect(useRoomStatsStore.getState().enabled).toBe(false);
        useRoomStatsStore.getState().toggle();
        expect(useRoomStatsStore.getState().enabled).toBe(true);
        useRoomStatsStore.getState().toggle();
        expect(useRoomStatsStore.getState().enabled).toBe(false);
    });
});
