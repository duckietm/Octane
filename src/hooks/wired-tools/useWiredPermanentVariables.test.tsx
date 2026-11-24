/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: unknown) => void>(),
    sent: [] as unknown[][]
}));

vi.mock('@octane/renderer', () => ({
    WiredUserPermanentVariablesListEvent: class {},
    WiredPermanentVariablesRequestComposer: class {
        constructor(...args: unknown[]) {
            mocks.sent.push(['request', ...args]);
        }
    },
    WiredPermanentVariableSetComposer: class {
        constructor(...args: unknown[]) {
            mocks.sent.push(['set', ...args]);
        }
    }
}));

vi.mock('../../api', () => ({ SendMessageComposer: vi.fn() }));

vi.mock('../events', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.handlers.set(type, handler)
}));

import { WiredUserPermanentVariablesListEvent } from '@octane/renderer';
import { permanentVariableItemId, useWiredPermanentVariables, WIRED_PERMANENT_VARIABLE_CREATE, WIRED_PERMANENT_VARIABLE_DELETE } from './useWiredPermanentVariables';

const list = (entityId: number, variables: { variableId: string; value: number }[]) => ({
    getParser: () => ({ entityId, entityFigure: 'hr-1', variables })
});

describe('useWiredPermanentVariables', () => {
    beforeEach(() => {
        mocks.sent.length = 0;
    });

    it('asks for the holder it is given and for nobody without one', () => {
        const { rerender } = renderHook(({ key }) => useWiredPermanentVariables(key), { initialProps: { key: null as number | null } });

        expect(mocks.sent).toEqual([]);

        rerender({ key: 7 });
        expect(mocks.sent).toEqual([['request', 1, 7]]);
    });

    it('keeps only the answer for its holder and drops it when the holder changes', () => {
        const { result, rerender } = renderHook(({ key }) => useWiredPermanentVariables(key), { initialProps: { key: 7 as number | null } });

        expect(result.current.variables).toBeNull();

        act(() => mocks.handlers.get(WiredUserPermanentVariablesListEvent)?.(list(8, [{ variableId: 'user:10', value: 1 }])));
        expect(result.current.variables).toBeNull();

        act(() => mocks.handlers.get(WiredUserPermanentVariablesListEvent)?.(list(7, [{ variableId: 'user:10', value: 5 }])));
        expect(result.current.variables).toEqual([{ variableId: 'user:10', value: 5 }]);
        expect(result.current.figure).toBe('hr-1');

        rerender({ key: 9 });
        expect(result.current.variables).toBeNull();
    });

    it('sends changes with the official actions', () => {
        const { result } = renderHook(() => useWiredPermanentVariables(7));

        mocks.sent.length = 0;
        act(() => result.current.change(10, 4, WIRED_PERMANENT_VARIABLE_CREATE));
        act(() => result.current.change(10, 0, WIRED_PERMANENT_VARIABLE_DELETE));
        act(() => result.current.change(0, 1, WIRED_PERMANENT_VARIABLE_CREATE));
        act(() => result.current.refresh());

        expect(mocks.sent).toEqual([
            ['set', 1, 7, 'user:10', 4, 1],
            ['set', 1, 7, 'user:10', 0, 2],
            ['request', 1, 7]
        ]);
    });

    it('reads the item id of a user variable id', () => {
        expect(permanentVariableItemId('user:12')).toBe(12);
        expect(permanentVariableItemId('furni:12')).toBe(0);
        expect(permanentVariableItemId('')).toBe(0);
    });
});
