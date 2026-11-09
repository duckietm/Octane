/* @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const setLocalStorage = vi.hoisted(() => vi.fn());
const storedValues = vi.hoisted(() => new Map<string, unknown>());

vi.mock('../api', () => ({ GetLocalStorage: (key: string) => storedValues.get(key), SetLocalStorage: setLocalStorage }));

const { discardLocalStorage, useLocalStorage } = await import('./useLocalStorage');

afterEach(() =>
{
    cleanup();
    storedValues.clear();
});

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

    it('writes a null set over a pending value', () =>
    {
        vi.useFakeTimers();
        setLocalStorage.mockClear();

        const { result } = renderHook(() => useLocalStorage<string | null>('null-test', null));

        act(() => result.current[1]('picked'));
        act(() => result.current[1](null));
        act(() => vi.advanceTimersByTime(1000));

        expect(setLocalStorage).toHaveBeenCalledTimes(1);
        expect(setLocalStorage).toHaveBeenLastCalledWith('null-test', null);

        vi.useRealTimers();
    });

    it('restores a stored value of the expected shape', () =>
    {
        storedValues.set('restore-test', [ { id: 1 } ]);

        const { result } = renderHook(() => useLocalStorage<{ id: number }[]>('restore-test', []));

        expect(result.current[0]).toEqual([ { id: 1 } ]);
    });

    it('falls back to the initial value when the stored value has another shape', () =>
    {
        storedValues.set('history-test', { 0: 'old format' });
        storedValues.set('flag-test', 'yes');
        storedValues.set('settings-test', [ 1, 2 ]);

        const history = renderHook(() => useLocalStorage<string[]>('history-test', []));
        const flag = renderHook(() => useLocalStorage('flag-test', false));
        const settings = renderHook(() => useLocalStorage('settings-test', { enabled: true }));

        expect(history.result.current[0]).toEqual([]);
        expect(flag.result.current[0]).toBe(false);
        expect(settings.result.current[0]).toEqual({ enabled: true });
    });
});
