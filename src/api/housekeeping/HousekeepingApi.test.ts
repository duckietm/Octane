import { HousekeepingActionResultEvent, HousekeepingDashboardEvent } from '@octane/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOUSEKEEPING_DENIED_ACTION_KEY, HOUSEKEEPING_NO_ANSWER_KEY, HousekeepingApi, HousekeepingDeniedError, housekeepingFailureKey } from './HousekeepingApi';

const { handlers, send } = vi.hoisted(() => ({ handlers: new Map<unknown, Set<(event: unknown) => void>>(), send: vi.fn() }));

// The shared renderer stub has no housekeeping packets and no subscribeMessage, so this file
// supplies the few pieces the lookups touch.
vi.mock('@octane/renderer', () => ({
    HousekeepingActionResultEvent: class {},
    HousekeepingDashboardEvent: class {},
    HousekeepingGetDashboardComposer: class {},
    GetCommunication: () => ({
        connection: { send },
        subscribeMessage: (ctor: unknown, handler: (event: unknown) => void) => {
            const set = handlers.get(ctor) ?? new Set<(event: unknown) => void>();

            set.add(handler);
            handlers.set(ctor, set);

            return () => set.delete(handler);
        }
    })
}));

const deliver = (ctor: unknown, parser: unknown) => handlers.get(ctor)?.forEach((handler) => handler({ getParser: () => parser }));

const listenerCount = () => [...handlers.values()].reduce((total, set) => total + set.size, 0);

describe('housekeepingFailureKey', () => {
    it('explains a timeout as a server that did not answer', () => {
        expect(housekeepingFailureKey(new Error('timeout'), 'housekeeping.list.failed')).toBe(HOUSEKEEPING_NO_ANSWER_KEY);
    });

    it('keeps the fallback for any other failure', () => {
        expect(housekeepingFailureKey(new Error('aborted'), 'housekeeping.list.failed')).toBe('housekeeping.list.failed');
        expect(housekeepingFailureKey('boom', 'housekeeping.list.failed')).toBe('housekeeping.list.failed');
    });

    it('shows the reason the server gave for a refusal', () => {
        expect(housekeepingFailureKey(new HousekeepingDeniedError('housekeeping.error.lockdown'), 'housekeeping.list.failed')).toBe('housekeeping.error.lockdown');
    });

    it('keeps the fallback for a refusal that names no reason', () => {
        expect(housekeepingFailureKey(new HousekeepingDeniedError(''), 'housekeeping.list.failed')).toBe('housekeeping.list.failed');
    });
});

describe('a refused housekeeping lookup', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        handlers.clear();
        send.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('rejects at once with the server reason instead of waiting for the timeout', async () => {
        const dashboard = HousekeepingApi.getDashboard();
        const outcome = dashboard.then(
            () => null,
            (error: unknown) => error
        );

        deliver(HousekeepingActionResultEvent, { actionKey: HOUSEKEEPING_DENIED_ACTION_KEY, ok: false, actionId: 0, message: 'housekeeping.error.no_permission' });

        const error = await outcome;

        expect(error).toBeInstanceOf(HousekeepingDeniedError);
        expect(housekeepingFailureKey(error, 'housekeeping.list.failed')).toBe('housekeeping.error.no_permission');
        expect(listenerCount()).toBe(0);
    });

    it('ignores the result of another action and keeps waiting for the reply', async () => {
        let settled = false;
        const dashboard = HousekeepingApi.getDashboard().finally(() => (settled = true));

        deliver(HousekeepingActionResultEvent, { actionKey: 'user.ban', ok: true, actionId: 1, message: '' });
        await Promise.resolve();

        expect(settled).toBe(false);

        deliver(HousekeepingDashboardEvent, {});
        await dashboard.catch(() => undefined);

        expect(settled).toBe(true);
        expect(listenerCount()).toBe(0);
    });

    it('still times out when the server says nothing', async () => {
        const outcome = HousekeepingApi.getDashboard().then(
            () => null,
            (error: unknown) => error
        );

        await vi.advanceTimersByTimeAsync(10_000);

        expect(housekeepingFailureKey(await outcome, 'housekeeping.list.failed')).toBe(HOUSEKEEPING_NO_ANSWER_KEY);
        expect(listenerCount()).toBe(0);
    });
});
