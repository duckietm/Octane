/* @vitest-environment jsdom */

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FloorplanState } from '../../../components/floorplan-editor/state/types';
import { buildLivePreviewPayload, LivePreviewPayload, livePreviewPayloadsEqual, useFloorplanLiveSync } from './useFloorplanLiveSync';

// Spy on the renderer hook seam — we hand back a manager that
// records calls to applyFloorModelLocally so we can assert what
// the hook pushed to the room.
const applyMock = vi.fn<(model: string, wallHeight: number, scale: boolean) => boolean>();
const thicknessMock = vi.fn<(roomId: number, wall: number, floor: number) => boolean>();

vi.mock('@octane/renderer', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@octane/renderer')>();

    return {
        ...actual,
        GetRoomMessageHandler: () => ({
            applyFloorModelLocally: (model: string, wallHeight: number, scale: boolean) => applyMock(model, wallHeight, scale)
        }),
        GetRoomEngine: () => ({
            updateRoomInstancePlaneThickness: (roomId: number, wall: number, floor: number) => thicknessMock(roomId, wall, floor)
        })
    };
});

// Pin the active room id so the engine.updateRoomInstancePlaneThickness
// branch is exercised. -1 is the "no active room" sentinel and skips
// the thickness call.
vi.mock('../../session/useSessionSnapshots', () => ({
    useActiveRoomSessionSnapshot: () => ({ roomId: 42 })
}));

const baseState: FloorplanState = {
    tiles: [
        [
            { h: 0, blocked: false },
            { h: 0, blocked: false }
        ],
        [
            { h: 0, blocked: false },
            { h: 0, blocked: false }
        ]
    ],
    door: { x: 1, y: 1, dir: 2 },
    thickness: { wall: 1, floor: 1 },
    wallHeight: 1,
    brush: { h: 0, action: 'SET' },
    selection: new Set(),
    squareSelect: false,
    lease: { holder: null, me: false, expiresAt: null },
    seq: 0
};

const samePayload = (s: FloorplanState): LivePreviewPayload => buildLivePreviewPayload(s);

describe('useFloorplanLiveSync', () => {
    beforeEach(() => {
        applyMock.mockReset().mockReturnValue(true);
        thicknessMock.mockReset().mockReturnValue(true);
    });

    afterEach(() => {
        cleanup();
    });

    it('does not call the renderer before a baseline is set', () => {
        renderHook(() => useFloorplanLiveSync({ enabled: true, state: baseState }));

        expect(applyMock).not.toHaveBeenCalled();
    });

    it('does not call the renderer when the state equals the baseline', () => {
        const { result } = renderHook(() => useFloorplanLiveSync({ enabled: true, state: baseState }));

        act(() => {
            result.current.setBaseline(samePayload(baseState));
        });

        expect(applyMock).not.toHaveBeenCalled();
    });

    it('applies the new floor model locally on every diverging state change', () => {
        const { result, rerender } = renderHook(({ state }: { state: FloorplanState }) => useFloorplanLiveSync({ enabled: true, state }), {
            initialProps: { state: baseState }
        });

        act(() => {
            result.current.setBaseline(samePayload(baseState));
        });

        const next: FloorplanState = {
            ...baseState,
            tiles: [
                [
                    { h: 1, blocked: false },
                    { h: 0, blocked: false }
                ],
                [
                    { h: 0, blocked: false },
                    { h: 0, blocked: false }
                ]
            ]
        };

        rerender({ state: next });

        expect(applyMock).toHaveBeenCalledTimes(1);
        // The renderer parser takes server-space wallHeight (editor - 1).
        expect(applyMock.mock.calls[0][1]).toBe(0);
        expect(applyMock.mock.calls[0][2]).toBe(true);
        // Same brush/selection change should NOT push another paint.
        rerender({ state: { ...next, selection: new Set(['0,0']) } });
        expect(applyMock).toHaveBeenCalledTimes(1);
    });

    it('mirrors the thickness slider into the renderer engine', () => {
        const { result, rerender } = renderHook(({ state }: { state: FloorplanState }) => useFloorplanLiveSync({ enabled: true, state }), {
            initialProps: { state: baseState }
        });

        act(() => {
            result.current.setBaseline(samePayload(baseState));
        });

        rerender({ state: { ...baseState, thickness: { wall: 3, floor: 2 } } });

        // Thickness 3 -> 2.0, thickness 2 -> 1.0
        const [roomId, wall, floor] = thicknessMock.mock.calls[thicknessMock.mock.calls.length - 1];
        expect(roomId).toBe(42);
        expect(wall).toBe(2);
        expect(floor).toBe(1);
    });

    it('does not call the renderer when disabled', () => {
        const { result, rerender } = renderHook(({ enabled, state }: { enabled: boolean; state: FloorplanState }) => useFloorplanLiveSync({ enabled, state }), {
            initialProps: { enabled: false, state: baseState }
        });

        act(() => {
            result.current.setBaseline(samePayload(baseState));
        });

        rerender({ enabled: false, state: { ...baseState, wallHeight: 5 } });

        expect(applyMock).not.toHaveBeenCalled();
    });

    it('revert re-applies the baseline to the renderer', () => {
        const { result, rerender } = renderHook(({ state }: { state: FloorplanState }) => useFloorplanLiveSync({ enabled: true, state }), {
            initialProps: { state: baseState }
        });

        act(() => {
            result.current.setBaseline(samePayload(baseState));
        });

        rerender({ state: { ...baseState, wallHeight: 7 } });

        // One push from the wallHeight bump.
        expect(applyMock).toHaveBeenCalledTimes(1);

        act(() => {
            result.current.revert();
        });

        expect(applyMock).toHaveBeenCalledTimes(2);
        // Revert applies the baseline payload, which has wallHeight=1
        // → server-space 0.
        expect(applyMock.mock.calls[1][1]).toBe(0);
    });

    it('revert is a no-op when no baseline has been recorded', () => {
        const { result } = renderHook(() => useFloorplanLiveSync({ enabled: true, state: baseState }));

        act(() => {
            result.current.revert();
        });

        expect(applyMock).not.toHaveBeenCalled();
    });
});

describe('livePreviewPayloadsEqual', () => {
    const p: LivePreviewPayload = {
        tilemap: 'xx\rxx',
        doorX: 0,
        doorY: 0,
        doorDir: 2,
        thicknessWall: 1,
        thicknessFloor: 1,
        wallHeight: 3
    };

    it('returns true for identical payloads', () => {
        expect(livePreviewPayloadsEqual(p, { ...p })).toBe(true);
    });

    it('detects a tilemap diff', () => {
        expect(livePreviewPayloadsEqual(p, { ...p, tilemap: '00\r00' })).toBe(false);
    });

    it('detects a wallHeight diff', () => {
        expect(livePreviewPayloadsEqual(p, { ...p, wallHeight: 4 })).toBe(false);
    });

    it('detects a door diff', () => {
        expect(livePreviewPayloadsEqual(p, { ...p, doorDir: 4 })).toBe(false);
    });
});
