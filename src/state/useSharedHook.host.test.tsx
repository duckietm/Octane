/* @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { registerSharedHook, SharedHookRegistry, useSharedHook } from './useSharedHook';

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<typeof import('@octane/renderer')>('@octane/renderer');

    return { ...actual, OctaneLogger: { ...actual.OctaneLogger, error: vi.fn() } };
});

/**
 * A shared hook's host renders nothing and exists only to fill the store. If it throws
 * before its first layout effect, readyPromise never resolves - and `useSharedHook`
 * suspends on that promise, so every consumer of that hook, and the whole MainView tree
 * behind them, sits on the loading fallback for the rest of the session.
 */
describe('SharedHookRegistry hosts', () => {
    it('lets consumers through when a host crashes', async () => {
        const useBrokenStore = () => {
            throw new Error('host exploded');
        };
        registerSharedHook(useBrokenStore);

        const Consumer = () => {
            const snapshot = useSharedHook(useBrokenStore);

            return <div data-testid="consumer">{Object.keys(snapshot ?? {}).length}</div>;
        };

        render(
            <SharedHookRegistry>
                <Suspense fallback={<div data-testid="loading">loading</div>}>
                    <Consumer />
                </Suspense>
            </SharedHookRegistry>
        );

        // The empty default snapshot, not a permanent "loading".
        await waitFor(() => expect(screen.getByTestId('consumer')).toBeInTheDocument());
        expect(screen.queryByTestId('loading')).toBeNull();
    });

    it('still serves a host that works', async () => {
        const useWorkingStore = () => ({ value: 42 });
        registerSharedHook(useWorkingStore);

        const Consumer = () => {
            const snapshot = useSharedHook(useWorkingStore);

            return <div data-testid="value">{snapshot.value}</div>;
        };

        render(
            <SharedHookRegistry>
                <Suspense fallback={null}>
                    <Consumer />
                </Suspense>
            </SharedHookRegistry>
        );

        await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('42'));
    });
});
