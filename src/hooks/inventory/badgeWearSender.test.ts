import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTrailingSender } from './badgeWearSender';

describe('createTrailingSender', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('sends only the last value of a quick run', () => {
        const send = vi.fn();
        const sender = createTrailingSender<string[]>(send, 300);

        sender.push(['a']);
        vi.advanceTimersByTime(100);
        sender.push(['a', 'b']);
        vi.advanceTimersByTime(100);
        sender.push(['b']);
        expect(sender.isPending()).toBe(true);

        vi.advanceTimersByTime(300);
        expect(send).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledWith(['b']);
        expect(sender.isPending()).toBe(false);
    });

    it('flush sends the waiting value at once and only once', () => {
        const send = vi.fn();
        const sender = createTrailingSender<number>(send, 300);

        sender.push(1);
        sender.flush();
        vi.advanceTimersByTime(300);
        sender.flush();

        expect(send).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledWith(1);
    });
});
