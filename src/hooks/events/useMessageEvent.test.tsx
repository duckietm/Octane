import { GetCommunication, MessageEvent } from '@octane/renderer';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMessageEvent } from './useMessageEvent';

class PingEvent extends MessageEvent {}
class PongEvent extends MessageEvent {}

const communication = () => {
    const registerMessageEvent = vi.fn();
    const removeMessageEvent = vi.fn();

    vi.mocked(GetCommunication).mockReturnValue({ registerMessageEvent, removeMessageEvent } as never);

    return { registerMessageEvent, removeMessageEvent };
};

describe('useMessageEvent', () => {
    afterEach(() => vi.mocked(GetCommunication).mockReset());

    it('registers the listener once and calls the handler of the latest render', () => {
        const { registerMessageEvent, removeMessageEvent } = communication();
        const first = vi.fn();
        const second = vi.fn();
        const { rerender } = renderHook(({ handler }) => useMessageEvent(PingEvent as never, handler), { initialProps: { handler: first } });

        rerender({ handler: second });

        expect(registerMessageEvent).toHaveBeenCalledTimes(1);
        expect(removeMessageEvent).not.toHaveBeenCalled();

        registerMessageEvent.mock.calls[0][0].callBack('payload');

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith('payload');
    });

    it('removes the exact listener it registered when it unmounts', () => {
        const { registerMessageEvent, removeMessageEvent } = communication();
        const { unmount } = renderHook(() => useMessageEvent(PingEvent as never, vi.fn()));

        unmount();

        expect(removeMessageEvent).toHaveBeenCalledTimes(1);
        expect(removeMessageEvent).toHaveBeenCalledWith(registerMessageEvent.mock.calls[0][0]);
    });

    it('registers again when the event type changes', () => {
        const { registerMessageEvent, removeMessageEvent } = communication();
        const handler = vi.fn();
        const { rerender } = renderHook(({ type }) => useMessageEvent(type as never, handler), { initialProps: { type: PingEvent as typeof MessageEvent } });

        rerender({ type: PongEvent as typeof MessageEvent });

        expect(removeMessageEvent).toHaveBeenCalledTimes(1);
        expect(registerMessageEvent).toHaveBeenCalledTimes(2);
        expect(registerMessageEvent.mock.calls[1][0]).toBeInstanceOf(PongEvent);
    });
});
