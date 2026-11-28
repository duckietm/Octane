import { describe, expect, it, vi } from 'vitest';
import { useHandheldRoomPickStore } from './handheldRoomPickStore';

describe('handheldRoomPickStore', () => {
    it('holds the area pick and its way out until it stops', () => {
        const end = vi.fn();

        useHandheldRoomPickStore.getState().start(end);
        expect(useHandheldRoomPickStore.getState().picking).toBe(true);

        useHandheldRoomPickStore.getState().end?.();
        expect(end).toHaveBeenCalledTimes(1);

        useHandheldRoomPickStore.getState().stop();
        expect(useHandheldRoomPickStore.getState()).toMatchObject({ picking: false, end: null });
    });
});
