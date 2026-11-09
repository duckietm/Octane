import { GetRoomEngine, RoomEngineObjectEvent, RoomObjectCategory } from '@octane/renderer';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearMockEventDispatcher, mockEventDispatcher } from '../../octane-renderer.mock';
import { useWiredVariableFxRoomDrawing } from './useWiredVariableFxRoomDrawing';
import { useWiredVariableFxStore } from './wiredVariableFxStore';

const config = (configId: number, overrides: Record<string, unknown> = {}) => ({
    configId,
    userFx: true,
    showMode: 0,
    updateMask: 7,
    showOnMouseHover: false,
    showDurationMs: 3000,
    category: 1,
    styleId: 0,
    colorId: -1,
    widthId: 2,
    rendererId: 0,
    defaultMinValue: 0,
    defaultMaxValue: 100,
    extra: {},
    ...overrides
});

const status = (configId: number, entityId: number, value: number) => ({
    configId,
    variableId: 'user:20',
    initialize: false,
    userEntity: true,
    entityId,
    value,
    overrideMinValue: null,
    overrideMaxValue: null,
    extra: {}
});

describe('useWiredVariableFxRoomDrawing', () => {
    let setRoomObjectVariableFx: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(10000);
        clearMockEventDispatcher();
        useWiredVariableFxStore.getState().clear();
        setRoomObjectVariableFx = vi.fn(() => true);
        vi.mocked(GetRoomEngine).mockReturnValue({ setRoomObjectVariableFx } as never);
    });

    afterEach(() => {
        cleanup();
        vi.mocked(GetRoomEngine).mockReset();
        vi.useRealTimers();
    });

    const lastEntries = () => setRoomObjectVariableFx.mock.calls[setRoomObjectVariableFx.mock.calls.length - 1][3] as { key: string; visible: boolean }[];

    it('hands the room renderer the stack of each holder through the room engine', () => {
        renderHook(() => useWiredVariableFxRoomDrawing(5));

        act(() => {
            useWiredVariableFxStore.getState().applyConfigs([config(7)]);
            useWiredVariableFxStore.getState().applyStatuses(false, [status(7, 100, 40)]);
        });

        expect(setRoomObjectVariableFx).toHaveBeenLastCalledWith(5, 100, RoomObjectCategory.UNIT, expect.any(Array));
        expect(lastEntries()).toEqual([expect.objectContaining({ key: '7|user:20|u|100', visible: true, configId: 7, variableId: 'user:20' })]);
    });

    it('hides a "when it changes" value once its show duration is over, for the renderer to fade out', () => {
        renderHook(() => useWiredVariableFxRoomDrawing(5));

        act(() => {
            useWiredVariableFxStore.getState().applyConfigs([config(7, { showMode: 1, showDurationMs: 2000 })]);
            useWiredVariableFxStore.getState().applyStatuses(false, [status(7, 100, 40)]);
        });

        expect(lastEntries()[0].visible).toBe(true);

        act(() => {
            vi.advanceTimersByTime(2100);
        });

        expect(lastEntries()[0].visible).toBe(false);
    });

    it('re-sends the stack to a holder that enters the room later and clears the room on unmount', () => {
        const { unmount } = renderHook(() => useWiredVariableFxRoomDrawing(5));

        act(() => {
            useWiredVariableFxStore.getState().applyConfigs([config(7)]);
            useWiredVariableFxStore.getState().applyStatuses(false, [status(7, 100, 40)]);
        });

        const calls = setRoomObjectVariableFx.mock.calls.length;

        act(() => {
            mockEventDispatcher.dispatchEvent({ type: RoomEngineObjectEvent.ADDED, roomId: 5, objectId: 100, category: RoomObjectCategory.UNIT } as never);
            mockEventDispatcher.dispatchEvent({ type: RoomEngineObjectEvent.ADDED, roomId: 6, objectId: 100, category: RoomObjectCategory.UNIT } as never);
        });

        expect(setRoomObjectVariableFx.mock.calls.length).toBe(calls + 1);

        unmount();

        expect(setRoomObjectVariableFx).toHaveBeenLastCalledWith(5, 100, RoomObjectCategory.UNIT, []);
    });

    it('does nothing outside a room or against a renderer without the call', () => {
        renderHook(() => useWiredVariableFxRoomDrawing(null));

        act(() => {
            useWiredVariableFxStore.getState().applyConfigs([config(7)]);
            useWiredVariableFxStore.getState().applyStatuses(false, [status(7, 100, 40)]);
        });

        expect(setRoomObjectVariableFx).not.toHaveBeenCalled();

        cleanup();
        vi.mocked(GetRoomEngine).mockReturnValue({} as never);

        expect(() => renderHook(() => useWiredVariableFxRoomDrawing(5))).not.toThrow();
    });
});
