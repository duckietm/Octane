import { createOctaneStore } from '../../../state/createOctaneStore';

interface RoomStatsState {
    enabled: boolean;
    /** How the room's floors and walls are drawn, shown under the readout once `:directplanes` was used; null before. */
    planeMode: 'direct' | 'baked' | null;
    toggle: () => void;
    /** Turns the readout on and names the plane mode under it. */
    showPlaneMode: (direct: boolean) => void;
}

/** Whether the room statistics readout (`:showstats`) is on. */
export const useRoomStatsStore = createOctaneStore<RoomStatsState>()((set) => ({
    enabled: false,
    planeMode: null,
    toggle: () => set((state) => ({ enabled: !state.enabled })),
    showPlaneMode: (direct) => set({ enabled: true, planeMode: direct ? 'direct' : 'baked' })
}));

export interface RoomStatsSample {
    /** Round trip to the server, or below zero when it has not been measured. */
    pingMs: number;
    /** Average time from one frame to the next. */
    frameIntervalMs: number;
    /** Average time spent producing a frame. */
    frameTimeMs: number;
}

/** The readout's text, as the official room canvas writes it. */
export const formatRoomStats = ({ pingMs, frameIntervalMs, frameTimeMs }: RoomStatsSample): string => {
    const lines: string[] = [];

    if (pingMs >= 0) lines.push(`ping: ${Math.round(pingMs)}ms`);

    lines.push(`fps: ${frameIntervalMs > 0 ? (1000 / frameIntervalMs).toFixed(1) : '0.0'}`);
    lines.push(`frame time: ${frameTimeMs < 1 ? '<1.0' : frameTimeMs.toFixed(1)}ms`);

    return lines.join('\n');
};
