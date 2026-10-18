import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sent: Array<{ args: unknown[] }> = [];
let replyHandler: ((event: unknown) => void) | null = null;

vi.mock('@octane/renderer', () => ({
    WiredGetVariablesForObjectComposer: class {
        public args: unknown[];
        constructor(...args: unknown[]) {
            this.args = args;
        }
    },
    WiredVariablesForObjectEvent: class {}
}));

vi.mock('../../api', async () => {
    const actual = await vi.importActual<typeof import('../../api/wired/WiredObjectInspection')>('../../api/wired/WiredObjectInspection');

    return {
        ...actual,
        SendMessageComposer: (composer: { args: unknown[] }) => sent.push(composer)
    };
});

vi.mock('../events', () => ({
    useMessageEvent: (_type: unknown, handler: (event: unknown) => void) => {
        replyHandler = handler;
    }
}));

import { useWiredObjectInspection } from './useWiredObjectInspection';

type Request = { type: number; objectId: number } | null;

const reply = (type: number, id: number, values: Record<string, number>, configuredInWireds: number[] = []) =>
    act(() =>
        replyHandler?.({
            getParser: () => ({
                type,
                objectId: type === 0 ? id : 0,
                userIndex: type === 1 ? id : 0,
                values: new Map(Object.entries(values)),
                configuredInWireds
            })
        })
    );

describe('useWiredObjectInspection', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        sent.length = 0;
        replyHandler = null;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('asks for the object as soon as it is inspected and re-reads it every 500 ms while the tab is open', () => {
        renderHook(() => useWiredObjectInspection({ active: true, request: { type: 0, objectId: 77 } }));

        expect(sent.map((composer) => composer.args)).toEqual([[0, 77]]);

        act(() => vi.advanceTimersByTime(1000));

        expect(sent).toHaveLength(3);
    });

    it('asks nothing while the tab is closed or nothing is inspected', () => {
        const { rerender } = renderHook((props: { active: boolean; request: Request }) => useWiredObjectInspection(props), {
            initialProps: { active: false, request: { type: 0, objectId: 77 } as Request }
        });

        act(() => vi.advanceTimersByTime(1000));
        rerender({ active: true, request: null });
        act(() => vi.advanceTimersByTime(1000));

        expect(sent).toHaveLength(0);
    });

    it('keeps only replies about the inspected object and drops them when another object is inspected', () => {
        const { result, rerender } = renderHook((props: { request: Request }) => useWiredObjectInspection({ active: true, ...props }), {
            initialProps: { request: { type: 0, objectId: 77 } as Request }
        });

        reply(0, 78, { 'furni:1': 4 });
        expect(result.current.data).toBeNull();

        reply(0, 77, { 'furni:1': 5 }, [900]);
        expect(result.current.data?.values.get('furni:1')).toBe(5);
        expect(result.current.data?.configuredInWireds).toEqual([900]);

        rerender({ request: { type: 1, objectId: 77 } });
        expect(result.current.data).toBeNull();
        expect(sent.at(-1)?.args).toEqual([1, 77]);
    });

    it('re-reads on demand after a change was sent', () => {
        const { result } = renderHook(() => useWiredObjectInspection({ active: true, request: { type: -10, objectId: 0 } }));

        act(() => result.current.refresh());

        expect(sent.map((composer) => composer.args)).toEqual([
            [-10, 0],
            [-10, 0]
        ]);
    });
});
