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

    it('runs at least 3 s, ends with the needle on the right and reports it once', () => {
        const onFinish = vi.fn();
        const { result } = renderHook(() => useRecyclerEngineAnimation(onFinish));

        act(() => result.current.start());
        expect(result.current.busy).toBe(true);

        act(() => {
            vi.advanceTimersByTime(2900);
        });
        expect(onFinish).not.toHaveBeenCalled();
        expect(result.current.busy).toBe(true);

        act(() => {
            vi.advanceTimersByTime(60000);
        });
        expect(onFinish).toHaveBeenCalledTimes(1);
        expect(result.current.busy).toBe(false);
        expect(result.current.frame.angle).toBeGreaterThanOrEqual(82);
        expect(result.current.frame).toMatchObject({ shakeX: 0, shakeY: 0 });

        act(() => result.current.reset());
        act(() => {
            vi.advanceTimersByTime(300);
        });
        expect(result.current.frame).toEqual({ angle: 0, shakeX: 0, shakeY: 0 });
    });

    it('stops without finishing when aborted, and swings back on reset', () => {
        const onFinish = vi.fn();
        const { result } = renderHook(() => useRecyclerEngineAnimation(onFinish));

        act(() => result.current.start());
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        act(() => result.current.stop());
        expect(result.current.busy).toBe(false);

        act(() => {
            vi.advanceTimersByTime(60000);
        });
        expect(onFinish).not.toHaveBeenCalled();

        act(() => result.current.reset());
        act(() => {
            vi.advanceTimersByTime(300);
        });
        expect(result.current.frame).toEqual({ angle: 0, shakeX: 0, shakeY: 0 });
    });

    it('stays at rest while nothing runs', () => {
        const { result } = renderHook(() => useRecyclerEngineAnimation(() => undefined));

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(result.current.frame).toEqual({ angle: 0, shakeX: 0, shakeY: 0 });
        expect(result.current.busy).toBe(false);
    });
});
