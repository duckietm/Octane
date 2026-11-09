/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLiveState } from './useLiveState';

describe('useLiveState', () => {
    it('updates the live ref synchronously, before React re-renders', () => {
        const { result } = renderHook(() => useLiveState('initial'));
        const [, setValue, liveValue] = result.current;

        act(() => {
            setValue('updated');

            expect(liveValue.current).toBe('updated');
        });

        expect(result.current[0]).toBe('updated');
    });

    it('applies functional updates against the live value, not the render value', () => {
        const { result } = renderHook(() => useLiveState<number[]>([]));
        const [, setValue, liveValue] = result.current;

        act(() => {
            setValue([1]);
            setValue((previous) => [...previous, 2]);
        });

        expect(liveValue.current).toEqual([1, 2]);
        expect(result.current[0]).toEqual([1, 2]);
    });

    it('keeps the setter referentially stable', () => {
        const { rerender, result } = renderHook(() => useLiveState(0));
        const firstSetter = result.current[1];

        act(() => result.current[1](5));
        rerender();

        expect(result.current[1]).toBe(firstSetter);
    });
});
