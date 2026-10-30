/* @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const setLocalStorage = vi.hoisted(() => vi.fn());

vi.mock('../api', () => ({ GetLocalStorage: () => undefined, SetLocalStorage: setLocalStorage }));

const { discardLocalStorage, useLocalStorage } = await import('./useLocalStorage');

afterEach(cleanup);

describe('useLocalStorage', () =>
{
    it('keeps every update of a burst, even through a setter from an earlier render', () =>
    {
        const { result } = renderHook(() => useLocalStorage<number[]>('burst-test', []));
        const staleSetter = result.current[1];

        act(() =>
        {
            staleSetter(value => [ ...value, 1 ]);
            staleSetter(value => [ ...value, 2 ]);
        });

        // An async callback (avatar image, translation) still holding the first render's setter.
        act(() => staleSetter(value => [ ...value, 3 ]));

        expect(result.current[0]).toEqual([ 1, 2, 3 ]);
    });

    it('a discard resets the live value and drops the write still waiting', () =>
    {
        vi.useFakeTimers();
        setLocalStorage.mockClear();

        const { result } = renderHook(() => useLocalStorage<string[]>('discard-test', []));

        act(() => result.current[1]([ 'hello' ]));
        act(() => discardLocalStorage([ 'discard-test' ]));
        act(() => vi.advanceTimersByTime(1000));

        expect(result.current[0]).toEqual([]);
        expect(setLocalStorage).not.toHaveBeenCalled();

        vi.useRealTimers();
    });
});
