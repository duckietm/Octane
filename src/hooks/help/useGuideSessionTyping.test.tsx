import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sent: unknown[] = [];

vi.mock('../../api', () => ({ SendMessageComposer: (composer: unknown) => sent.push(composer) }));

import { GUIDE_TYPING_POLL_MS, useGuideSessionTyping } from './useGuideSessionTyping';

const typingStates = () => sent.map((composer) => (composer as { isTyping: boolean }).isTyping);

describe('useGuideSessionTyping', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        sent.length = 0;
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('sends typing once when the text changes and not typing once it stops changing', () => {
        const { rerender } = renderHook(({ length }) => useGuideSessionTyping(length), { initialProps: { length: 0 } });

        act(() => vi.advanceTimersByTime(GUIDE_TYPING_POLL_MS));
        expect(typingStates()).toEqual([]);

        rerender({ length: 3 });
        act(() => vi.advanceTimersByTime(GUIDE_TYPING_POLL_MS));
        expect(typingStates()).toEqual([true]);

        rerender({ length: 6 });
        act(() => vi.advanceTimersByTime(GUIDE_TYPING_POLL_MS));
        expect(typingStates()).toEqual([true]);

        act(() => vi.advanceTimersByTime(GUIDE_TYPING_POLL_MS));
        expect(typingStates()).toEqual([true, false]);
    });

    it('restart samples the current length again, so clearing the input after a send is not typing', () => {
        const { result, rerender } = renderHook(({ length }) => useGuideSessionTyping(length), { initialProps: { length: 5 } });

        rerender({ length: 0 });
        act(() => result.current.restart());
        act(() => vi.advanceTimersByTime(GUIDE_TYPING_POLL_MS));

        expect(typingStates()).toEqual([]);
    });

    it('does not sample while inactive', () => {
        const { rerender } = renderHook(({ length }) => useGuideSessionTyping(length, false), { initialProps: { length: 0 } });

        rerender({ length: 4 });
        act(() => vi.advanceTimersByTime(GUIDE_TYPING_POLL_MS * 2));

        expect(typingStates()).toEqual([]);
    });
});
