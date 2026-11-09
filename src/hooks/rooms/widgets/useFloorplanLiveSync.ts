import { GetRoomEngine, GetRoomMessageHandler } from '@octane/renderer';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { parseTilemap, serializeTilemap } from '../../../components/floorplan-editor/state/encoding';
import { FloorplanState } from '../../../components/floorplan-editor/state/types';
import { useActiveRoomSessionSnapshot } from '../../session/useSessionSnapshots';

const normalizeTilemap = (raw: string): string => serializeTilemap(parseTilemap(raw));

export type LivePreviewPayload = {
    tilemap: string;
    doorX: number;
    doorY: number;
    doorDir: number;
    thicknessWall: number;
    thicknessFloor: number;
    wallHeight: number;
};

export type UseFloorplanLiveSyncOptions = {
    enabled: boolean;
    state: FloorplanState;
};

export type UseFloorplanLiveSyncApi = {
    setBaseline: (payload: LivePreviewPayload) => void;
    mergeBaseline: (partial: Partial<LivePreviewPayload>) => void;
    revert: () => void;
};

const THICKNESS_RENDERER_VALUE: Record<number, number> = {
    0: 0.25,
    1: 0.5,
    2: 1,
    3: 2
};

export const buildLivePreviewPayload = (state: FloorplanState): LivePreviewPayload => ({
    tilemap: serializeTilemap(state.tiles),
    doorX: state.door.x,
    doorY: state.door.y,
    doorDir: state.door.dir,
    thicknessWall: state.thickness.wall,
    thicknessFloor: state.thickness.floor,
    wallHeight: state.wallHeight
});

export const livePreviewPayloadsEqual = (a: LivePreviewPayload, b: LivePreviewPayload): boolean =>
    a.tilemap === b.tilemap &&
    a.doorX === b.doorX &&
    a.doorY === b.doorY &&
    a.doorDir === b.doorDir &&
    a.thicknessWall === b.thicknessWall &&
    a.thicknessFloor === b.thicknessFloor &&
    a.wallHeight === b.wallHeight;

const applyToRenderer = (payload: LivePreviewPayload, roomId: number): boolean => {
    const handler = GetRoomMessageHandler();

    if (!handler || typeof handler.applyFloorModelLocally !== 'function') return false;

    const ok = handler.applyFloorModelLocally(payload.tilemap, Math.max(0, (payload.wallHeight | 0) - 1), true);

    if (!ok) return false;

    if (roomId >= 0) {
        const engine = GetRoomEngine();
        const wall = THICKNESS_RENDERER_VALUE[payload.thicknessWall];
        const floor = THICKNESS_RENDERER_VALUE[payload.thicknessFloor];

        if (engine && typeof engine.updateRoomInstancePlaneThickness === 'function' && wall !== undefined && floor !== undefined) {
            engine.updateRoomInstancePlaneThickness(roomId, wall, floor);
        }
    }

    return true;
};

export const useFloorplanLiveSync = (opts: UseFloorplanLiveSyncOptions): UseFloorplanLiveSyncApi => {
    const { enabled, state } = opts;
    const session = useActiveRoomSessionSnapshot();
    const roomId = session?.roomId ?? -1;

    const baselineRef = useRef<LivePreviewPayload | null>(null);
    const lastAppliedRef = useRef<LivePreviewPayload | null>(null);

    const { tiles, door, thickness, wallHeight } = state;
    const currentPayload = useMemo<LivePreviewPayload>(
        () => ({
            tilemap: serializeTilemap(tiles),
            doorX: door.x,
            doorY: door.y,
            doorDir: door.dir,
            thicknessWall: thickness.wall,
            thicknessFloor: thickness.floor,
            wallHeight
        }),
        [tiles, door, thickness, wallHeight]
    );

    const setBaseline = useCallback((payload: LivePreviewPayload) => {
        const normalized: LivePreviewPayload = {
            ...payload,
            tilemap: normalizeTilemap(payload.tilemap)
        };

        baselineRef.current = normalized;
        lastAppliedRef.current = normalized;
    }, []);

    const mergeBaseline = useCallback((partial: Partial<LivePreviewPayload>) => {
        const previous = baselineRef.current;

        if (!previous) return;

        const next: LivePreviewPayload = {
            ...previous,
            ...partial,
            tilemap: partial.tilemap !== undefined ? normalizeTilemap(partial.tilemap) : previous.tilemap
        };

        baselineRef.current = next;
        lastAppliedRef.current = next;
    }, []);

    const revert = useCallback(() => {
        const baseline = baselineRef.current;

        if (!baseline) return;

        if (applyToRenderer(baseline, roomId)) lastAppliedRef.current = baseline;
    }, [roomId]);

    useEffect(() => {
        if (!enabled) return;
        if (!baselineRef.current) return;

        const previous = lastAppliedRef.current;

        if (previous && livePreviewPayloadsEqual(currentPayload, previous)) return;

        if (applyToRenderer(currentPayload, roomId)) lastAppliedRef.current = currentPayload;
    }, [enabled, currentPayload, roomId]);

    return { setBaseline, mergeBaseline, revert };
};
