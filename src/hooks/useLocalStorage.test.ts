import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api', () => ({ GetLocalStorage: () => undefined, SetLocalStorage: vi.fn() }));

const { useLocalStorage } = await import('./useLocalStorage');

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
});
