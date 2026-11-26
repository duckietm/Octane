/* @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const setLocalStorage = vi.hoisted(() => vi.fn());
const storedValues = vi.hoisted(() => new Map<string, unknown>());

const session = vi.hoisted(() => ({ userId: 0 }));

vi.mock('../api', () => ({ GetLocalStorage: (key: string) => storedValues.get(key), SetLocalStorage: setLocalStorage }));
vi.mock('./session/useSessionSnapshots', () => ({ useUserDataSnapshot: () => ({ userId: session.userId }) }));

const { discardAccountLocalStorage, discardLocalStorage, useAccountLocalStorage, useLocalStorage } = await import('./useLocalStorage');

afterEach(() =>
{
    cleanup();
    storedValues.clear();
    window.localStorage.clear();
    session.userId = 0;
    vi.useRealTimers();
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

describe('useAccountLocalStorage', () =>
{
    it('keeps the value in memory only until the session knows the account', () =>
    {
        vi.useFakeTimers();
        setLocalStorage.mockClear();
        storedValues.set('chatHistory', [ 'shared by every account' ]);

        const { result } = renderHook(() => useAccountLocalStorage<string[]>('chatHistory', []));

        expect(result.current[0]).toEqual([]);

        act(() => result.current[1]([ 'hello' ]));
        act(() => vi.advanceTimersByTime(1000));

        expect(result.current[0]).toEqual([ 'hello' ]);
        expect(setLocalStorage).not.toHaveBeenCalled();
    });

    it('reads and writes under the account, never the history of another account', () =>
    {
        vi.useFakeTimers();
        setLocalStorage.mockClear();
        storedValues.set('chatHistory#1', [ 'from account 1' ]);
        storedValues.set('chatHistory#2', [ 'from account 2' ]);
        session.userId = 2;

        const { result, rerender } = renderHook(() => useAccountLocalStorage<string[]>('chatHistory', []));

        expect(result.current[0]).toEqual([ 'from account 2' ]);

        act(() => result.current[1](value => [ ...value, 'new' ]));
        act(() => vi.advanceTimersByTime(1000));

        expect(setLocalStorage).toHaveBeenLastCalledWith('chatHistory#2', [ 'from account 2', 'new' ]);

        // Another account logs in on the same page: its own history shows, and the pending value of the first is not written over it.
        act(() => result.current[1]([ 'late' ]));
        session.userId = 1;
        rerender();
        act(() => vi.advanceTimersByTime(1000));

        expect(result.current[0]).toEqual([ 'from account 1' ]);
        expect(setLocalStorage).not.toHaveBeenCalledWith('chatHistory#1', expect.anything());
    });

    it('removes what other accounts and older clients stored once the account is known', () =>
    {
        window.localStorage.setItem('chatHistory', '[]');
        window.localStorage.setItem('chatHistory.7', '[]');
        window.localStorage.setItem('chatHistory#7', '[]');
        window.localStorage.setItem('chatHistory#3', '[]');
        window.localStorage.setItem('chatWindowEnabled', 'true');
        session.userId = 3;

        renderHook(() => useAccountLocalStorage<string[]>('chatHistory', []));

        expect(Object.keys(window.localStorage).sort()).toEqual([ 'chatHistory#3', 'chatWindowEnabled' ]);
    });

    it('a discard removes every account\'s value and resets the live one', () =>
    {
        vi.useFakeTimers();
        setLocalStorage.mockClear();
        session.userId = 3;

        const { result } = renderHook(() => useAccountLocalStorage<string[]>('chatHistory', []));

        window.localStorage.setItem('chatHistory#3', '["x"]');
        window.localStorage.setItem('chatHistory#4', '["y"]');

        act(() => result.current[1]([ 'pending' ]));
        act(() => discardAccountLocalStorage([ 'chatHistory' ]));
        act(() => vi.advanceTimersByTime(1000));

        expect(result.current[0]).toEqual([]);
        expect(setLocalStorage).not.toHaveBeenCalled();
        expect(window.localStorage.getItem('chatHistory#3')).toBeNull();
        expect(window.localStorage.getItem('chatHistory#4')).toBeNull();
    });
});
