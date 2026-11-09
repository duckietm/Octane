import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecyclerEngineAnimation } from './useRecyclerEngineAnimation';

describe('useRecyclerEngineAnimation (AIR RecyclerEngineAnimator)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('runs at least 3 s and until the recycle ends, then rests', () => {
        const { result, rerender } = renderHook(({ active }) => useRecyclerEngineAnimation(active), { initialProps: { active: true } });

        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(result.current.angle).not.toBe(0);

        rerender({ active: false });
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        // Still inside the 3 s minimum.
        expect(result.current.angle).not.toBe(0);

        act(() => {
            vi.advanceTimersByTime(20000);
        });
        expect(result.current).toEqual({ angle: 0, shakeX: 0, shakeY: 0 });
    });

    it('stays at rest while nothing runs', () => {
        const { result } = renderHook(() => useRecyclerEngineAnimation(false));

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(result.current).toEqual({ angle: 0, shakeX: 0, shakeY: 0 });
    });
});
