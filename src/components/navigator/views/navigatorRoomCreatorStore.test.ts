import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRoomCreatorStore } from './navigatorRoomCreatorStore';

describe('useRoomCreatorStore', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useRoomCreatorStore.setState({ isCreating: false });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts with isCreating === false', () => {
        expect(useRoomCreatorStore.getState().isCreating).toBe(false);
    });

    it('beginCreate() latches isCreating to true', () => {
        useRoomCreatorStore.getState().beginCreate();
        expect(useRoomCreatorStore.getState().isCreating).toBe(true);
    });

    it('isCreating auto-resets to false after the 5s lockout', () => {
        useRoomCreatorStore.getState().beginCreate();
        expect(useRoomCreatorStore.getState().isCreating).toBe(true);

        vi.advanceTimersByTime(4999);
        expect(useRoomCreatorStore.getState().isCreating).toBe(true);

        vi.advanceTimersByTime(1);
        expect(useRoomCreatorStore.getState().isCreating).toBe(false);
    });

    it('a second beginCreate() resets the lockout timer (no double-fire)', () => {
        useRoomCreatorStore.getState().beginCreate();
        vi.advanceTimersByTime(4000);

        // Re-entry restarts the 5s window
        useRoomCreatorStore.getState().beginCreate();

        // At t=4500 (500ms past the second call), we should still be locked
        vi.advanceTimersByTime(500);
        expect(useRoomCreatorStore.getState().isCreating).toBe(true);

        // Only after another 4500ms (total 5000 since the second call)
        vi.advanceTimersByTime(4500);
        expect(useRoomCreatorStore.getState().isCreating).toBe(false);
    });

    it('endCreate() unlocks at once and cancels the pending lockout timer', () => {
        useRoomCreatorStore.getState().beginCreate();
        useRoomCreatorStore.getState().endCreate();
        expect(useRoomCreatorStore.getState().isCreating).toBe(false);

        useRoomCreatorStore.getState().beginCreate();
        vi.advanceTimersByTime(4999);
        expect(useRoomCreatorStore.getState().isCreating).toBe(true);
    });
});
