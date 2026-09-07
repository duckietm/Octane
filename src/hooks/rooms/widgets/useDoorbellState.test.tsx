/* @vitest-environment jsdom */

import { RoomSessionDoorbellEvent } from '@octane/renderer';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearMockEventDispatcher, mockEventDispatcher } from '../../../octane-renderer.mock';
import { useDoorbellState } from './useDoorbellState';

// Server push helper — mirrors the renderer wire by emitting the same
// constants the SUT listens to. The real constructor takes a session
// reference too; pass null since the SUT only reads `.userName`.
const dispatchDoorbell = (type: string, userName: string) => {
    act(() => {
        mockEventDispatcher.dispatchEvent(new RoomSessionDoorbellEvent(type, null as any, userName));
    });
};

describe('useDoorbellState', () => {
    beforeEach(() => {
        clearMockEventDispatcher();
    });

    afterEach(() => {
        cleanup();
    });

    it('starts with no users pending', () => {
        const { result } = renderHook(() => useDoorbellState());

        expect(result.current).toEqual([]);
    });

    it('appends the username from a DOORBELL event', () => {
        const { result } = renderHook(() => useDoorbellState());

        dispatchDoorbell(RoomSessionDoorbellEvent.DOORBELL, 'Alice');

        expect(result.current).toEqual(['Alice']);
    });

    it('ignores duplicate DOORBELL events for the same username', () => {
        const { result } = renderHook(() => useDoorbellState());

        dispatchDoorbell(RoomSessionDoorbellEvent.DOORBELL, 'Alice');
        dispatchDoorbell(RoomSessionDoorbellEvent.DOORBELL, 'Alice');

        expect(result.current).toEqual(['Alice']);
    });

    it('removes a user on RSDE_ACCEPTED while keeping the others', () => {
        const { result } = renderHook(() => useDoorbellState());

        dispatchDoorbell(RoomSessionDoorbellEvent.DOORBELL, 'Alice');
        dispatchDoorbell(RoomSessionDoorbellEvent.DOORBELL, 'Bob');
        dispatchDoorbell(RoomSessionDoorbellEvent.RSDE_ACCEPTED, 'Alice');

        expect(result.current).toEqual(['Bob']);
    });

    it('removes a user on RSDE_REJECTED', () => {
        const { result } = renderHook(() => useDoorbellState());

        dispatchDoorbell(RoomSessionDoorbellEvent.DOORBELL, 'Carol');
        dispatchDoorbell(RoomSessionDoorbellEvent.RSDE_REJECTED, 'Carol');

        expect(result.current).toEqual([]);
    });

    it('ignores accept/reject events for users that were never pending', () => {
        const { result } = renderHook(() => useDoorbellState());

        dispatchDoorbell(RoomSessionDoorbellEvent.RSDE_ACCEPTED, 'Ghost');

        expect(result.current).toEqual([]);
    });

    it('unsubscribes from all three events on unmount', () => {
        const { unmount } = renderHook(() => useDoorbellState());

        expect(mockEventDispatcher.hasListeners(RoomSessionDoorbellEvent.DOORBELL)).toBe(true);
        expect(mockEventDispatcher.hasListeners(RoomSessionDoorbellEvent.RSDE_ACCEPTED)).toBe(true);
        expect(mockEventDispatcher.hasListeners(RoomSessionDoorbellEvent.RSDE_REJECTED)).toBe(true);

        unmount();

        expect(mockEventDispatcher.hasListeners(RoomSessionDoorbellEvent.DOORBELL)).toBe(false);
        expect(mockEventDispatcher.hasListeners(RoomSessionDoorbellEvent.RSDE_ACCEPTED)).toBe(false);
        expect(mockEventDispatcher.hasListeners(RoomSessionDoorbellEvent.RSDE_REJECTED)).toBe(false);
    });
});
