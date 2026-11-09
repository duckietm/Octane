/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: unknown) => void>(),
    sent: [] as string[]
}));

vi.mock('@octane/renderer', () => ({
    WiredVariableHoldersEvent: class {},
    WiredVariableHoldersRequestComposer: class { constructor(public variableId: string) { mocks.sent.push(variableId); } }
}));

vi.mock('../../api', () => ({ SendMessageComposer: vi.fn() }));

vi.mock('../events', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.handlers.set(type, handler)
}));

import { WiredVariableHoldersEvent } from '@octane/renderer';
import { useWiredVariableHolders } from './useWiredVariableHolders';

const reply = (roomId: number, variableId: string, holders: { objectId: number; value: number }[]) => ({
    getParser: () => ({ roomId, variable: { variableId }, holders })
});

describe('useWiredVariableHolders', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mocks.sent.length = 0;
    });

    afterEach(() => vi.useRealTimers());

    it('polls every 500 ms while a variable is given and stops without one', () => {
        const { rerender } = renderHook(({ id }) => useWiredVariableHolders(id, 5), { initialProps: { id: 'user:1' as string | null } });

        expect(mocks.sent).toEqual([ 'user:1' ]);

        act(() => vi.advanceTimersByTime(1000));
        expect(mocks.sent).toEqual([ 'user:1', 'user:1', 'user:1' ]);

        rerender({ id: null });
        act(() => vi.advanceTimersByTime(1000));
        expect(mocks.sent).toHaveLength(3);
    });

    it('keeps only answers for its room and variable', () => {
        const { result } = renderHook(() => useWiredVariableHolders('user:1', 5));

        act(() => mocks.handlers.get(WiredVariableHoldersEvent)?.(reply(6, 'user:1', [ { objectId: 1, value: 1 } ])));
        act(() => mocks.handlers.get(WiredVariableHoldersEvent)?.(reply(5, 'user:2', [ { objectId: 1, value: 1 } ])));
        expect(result.current).toBeNull();

        act(() => mocks.handlers.get(WiredVariableHoldersEvent)?.(reply(5, 'user:1', [ { objectId: 3, value: 9 } ])));
        expect(result.current).toEqual([ { objectId: 3, value: 9 } ]);
    });
});
