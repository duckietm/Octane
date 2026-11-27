import { createOctaneStore } from './createOctaneStore';

/**
 * A wired box asked the room for an area (the "in area" selectors): on a phone the box steps aside while the area is dragged out
 * and comes back when it is chosen. `end` stops waiting for it, for the bar's button.
 */
interface HandheldRoomPickState {
    picking: boolean;
    end: (() => void) | null;
    start: (end: () => void) => void;
    stop: () => void;
}

export const useHandheldRoomPickStore = createOctaneStore<HandheldRoomPickState>()((set, get) => ({
    picking: false,
    end: null,
    start: (end) => set({ picking: true, end }),
    stop: () => {
        if (!get().picking) return;

        set({ picking: false, end: null });
    }
}));
