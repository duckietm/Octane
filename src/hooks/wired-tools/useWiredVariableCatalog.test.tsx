/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: unknown) => void>(),
    octaneHandlers: [] as ((event: unknown) => void)[],
    sent: [] as unknown[]
}));

vi.mock('@octane/renderer', () => ({
    RoomSessionEvent: { CREATED: 'RSE_CREATED', ENDED: 'RSE_ENDED' },
    WiredAllVariablesDiffEvent: class {},
    WiredAllVariablesHashEvent: class {},
    WiredAllVariablesRequestComposer: class { kind = 'request'; },
    WiredVariableHashesComposer: class { kind = 'hashes'; constructor(public hashes: unknown) {} }
}));

vi.mock('../../api', () => ({ SendMessageComposer: (composer: unknown) => mocks.sent.push(composer) }));

vi.mock('../events', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.handlers.set(type, handler),
    useOctaneEvent: (_types: unknown, handler: (event: unknown) => void) => mocks.octaneHandlers.splice(0, mocks.octaneHandlers.length, handler)
}));

vi.mock('@/state/useSharedHook', () => ({ registerSharedHook: vi.fn(), useSharedHook: vi.fn() }));

import { WiredAllVariablesDiffEvent, WiredAllVariablesHashEvent } from '@octane/renderer';
import { useWiredVariableCatalogStore } from './useWiredVariableCatalog';

const hash = (allVariablesHash: number) => ({ getParser: () => ({ allVariablesHash }) });
const diff = (allVariablesHash: number, isLastChunk: boolean, added: string[], removed: string[] = []) => ({
    getParser: () => ({
        allVariablesHash,
        isLastChunk,
        removedVariables: removed,
        addedOrUpdated: added.map((variableId) => ({ hash: 1, variable: { variableId, variableName: variableId } }))
    })
});
const kinds = () => mocks.sent.map((composer: any) => composer.kind);

describe('useWiredVariableCatalogStore', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mocks.sent.length = 0;
        mocks.handlers.clear();
    });

    afterEach(() => vi.useRealTimers());

    it('asks for the hash at most once per 800 ms and gives up an unanswered request after 4 s', () => {
        const { result } = renderHook(() => useWiredVariableCatalogStore());

        act(() => result.current.refresh());
        act(() => result.current.refresh());
        expect(kinds()).toEqual([ 'request' ]);

        act(() => vi.advanceTimersByTime(3000));
        act(() => result.current.refresh());
        expect(kinds()).toEqual([ 'request' ]);

        act(() => vi.advanceTimersByTime(1100));
        act(() => result.current.refresh());
        expect(kinds()).toEqual([ 'request', 'request' ]);
    });

    it('sends its hashes on a new hash and publishes the catalogue on the last chunk only', () => {
        const { result } = renderHook(() => useWiredVariableCatalogStore());

        act(() => result.current.refresh());
        act(() => mocks.handlers.get(WiredAllVariablesHashEvent)?.(hash(7)));
        expect(kinds()).toEqual([ 'request', 'hashes' ]);

        act(() => mocks.handlers.get(WiredAllVariablesDiffEvent)?.(diff(7, false, [ 'user:1' ])));
        expect(result.current.ready).toBe(false);
        expect(result.current.catalog.size).toBe(0);

        act(() => mocks.handlers.get(WiredAllVariablesDiffEvent)?.(diff(7, true, [ 'user:2' ])));
        expect(result.current.ready).toBe(true);
        expect([ ...result.current.catalog.keys() ]).toEqual([ 'user:1', 'user:2' ]);

        // The same hash again: nothing to fetch.
        act(() => vi.advanceTimersByTime(900));
        act(() => result.current.refresh());
        act(() => mocks.handlers.get(WiredAllVariablesHashEvent)?.(hash(7)));
        expect(kinds()).toEqual([ 'request', 'hashes', 'request' ]);
    });

    it('drops the catalogue with the room', () => {
        const { result } = renderHook(() => useWiredVariableCatalogStore());

        act(() => result.current.refresh());
        act(() => mocks.handlers.get(WiredAllVariablesHashEvent)?.(hash(1)));
        act(() => mocks.handlers.get(WiredAllVariablesDiffEvent)?.(diff(1, true, [ 'user:1' ])));
        expect(result.current.catalog.size).toBe(1);

        act(() => mocks.octaneHandlers[0]?.({}));
        expect(result.current.catalog.size).toBe(0);
        expect(result.current.ready).toBe(false);
    });
});
