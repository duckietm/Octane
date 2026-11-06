/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { sessionHandler } = vi.hoisted(() => ({ sessionHandler: { current: null as null | (() => void) } }));

vi.mock('../events', () => ({
    useOctaneEvent: (_types: unknown, handler: () => void) => {
        sessionHandler.current = handler;
    }
}));

import { useRoomEnterOnce } from './useRoomEnterOnce';

describe('useRoomEnterOnce', () => {
    it('counts a room entry once, not every room info refresh', () => {
        const { result } = renderHook(() => useRoomEnterOnce());

        expect(result.current(12)).toBe(true);
        // Opening room info or toggling mute asks (12, false, false), which the server answers with roomEnter.
        expect(result.current(12)).toBe(false);
        expect(result.current(12)).toBe(false);
    });

    it('counts the next visit again once the room session changes', () => {
        const { result } = renderHook(() => useRoomEnterOnce());

        result.current(12);
        act(() => sessionHandler.current());

        expect(result.current(12)).toBe(true);
    });

    it('counts a move to another room', () => {
        const { result } = renderHook(() => useRoomEnterOnce());

        result.current(12);

        expect(result.current(13)).toBe(true);
    });
});
