/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { easeOutCubic, getSpringbackTarget, glideScrollTop, isPinnedToLatest, SPRINGBACK_SNAP_ZONE_PX } from './chatHistoryScroll';

describe('chat history scroll rules', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('treats a list resting within two pixels of the bottom as pinned to the latest line', () => {
        expect(isPinnedToLatest(800, 1000, 200)).toBe(true);
        expect(isPinnedToLatest(798.4, 1000, 200)).toBe(true);
        expect(isPinnedToLatest(790, 1000, 200)).toBe(false);
    });

    it('springs back onto the latest line only when the wheel stopped inside the snap zone', () => {
        expect(getSpringbackTarget(800, 1000, 200)).toBeNull();
        expect(getSpringbackTarget(800 - SPRINGBACK_SNAP_ZONE_PX, 1000, 200)).toBe(800);
        expect(getSpringbackTarget(800 - SPRINGBACK_SNAP_ZONE_PX - 1, 1000, 200)).toBeNull();
    });

    it('eases out like the official curve', () => {
        expect(easeOutCubic(0)).toBe(0);
        expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
        expect(easeOutCubic(1)).toBe(1);
        expect(easeOutCubic(2)).toBe(1);
    });

    it('glides scrollTop to the target within the requested duration and can be cancelled', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });

        const element = document.createElement('div');

        element.scrollTop = 0;

        const glide = glideScrollTop(element, 100, 140);

        vi.advanceTimersByTime(80);

        expect(element.scrollTop).toBeGreaterThan(0);
        expect(element.scrollTop).toBeLessThan(100);

        vi.advanceTimersByTime(200);

        expect(element.scrollTop).toBe(100);

        element.scrollTop = 0;

        const cancelled = glideScrollTop(element, 100, 140);

        cancelled.cancel();
        vi.advanceTimersByTime(300);

        expect(element.scrollTop).toBe(0);
        expect(glide.cancel).toBeTypeOf('function');
    });
});
