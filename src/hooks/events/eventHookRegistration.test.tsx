/* @vitest-environment jsdom */
import { GetCommunication, MessageEvent } from '@octane/renderer';
import { mockEventDispatcher } from '../../octane-renderer.mock';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEventDispatcher } from './useEventDispatcher';
import { useMessageEvent } from './useMessageEvent';

afterEach(cleanup);

class RegistrationProbeEvent extends MessageEvent {}

describe('event hook registration', () => {
    it('useMessageEvent registers once and calls the newest handler', () => {
        const calls: string[] = [];
        const before = vi.mocked(GetCommunication).mock.calls.length;
        const { rerender } = renderHook(({ label }) => useMessageEvent(RegistrationProbeEvent as any, () => calls.push(label)), {
            initialProps: { label: 'first' }
        });

        rerender({ label: 'second' });
        rerender({ label: 'third' });

        expect(vi.mocked(GetCommunication).mock.calls.length - before).toBe(1);

        act(() => mockEventDispatcher.dispatchEvent(new (RegistrationProbeEvent as any)()));
        expect(calls).toEqual(['third']);
    });

    it('useEventDispatcher listens once for an inline type array and calls the newest handler', () => {
        const calls: string[] = [];
        const dispatcher = { addEventListener: vi.fn(), removeEventListener: vi.fn() } as any;
        const { rerender, unmount } = renderHook(({ label }) => useEventDispatcher(['a', 'b'], dispatcher, () => calls.push(label)), {
            initialProps: { label: 'first' }
        });

        rerender({ label: 'second' });

        expect(dispatcher.addEventListener).toHaveBeenCalledTimes(2);
        expect(dispatcher.removeEventListener).not.toHaveBeenCalled();

        dispatcher.addEventListener.mock.calls[0][1]({ type: 'a' });
        expect(calls).toEqual(['second']);

        unmount();
        expect(dispatcher.removeEventListener).toHaveBeenCalledTimes(2);
    });
});
