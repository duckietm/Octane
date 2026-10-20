/* @vitest-environment jsdom */
import { GetRoomEngine, GetRoomSessionManager, GetSessionDataManager, RoomEngineTriggerWidgetEvent, RoomObjectVariable } from '@octane/renderer';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearMockEventDispatcher, mockEventDispatcher } from '../../../../octane-renderer.mock';
import { isWalkMagicType, readMultiWalk, useFurnitureStackHeightWidget } from './useFurnitureStackHeightWidget';

const setUp = (playTestMode: boolean, freeFurniMovements: boolean, type = 'tile_stackmagic', extras: string = null) => {
    const session = { roomId: 1, isRoomOwner: true, controllerLevel: 0, playTestMode };

    vi.mocked(GetRoomSessionManager).mockReturnValue({ getSession: () => session } as never);
    vi.mocked(GetSessionDataManager).mockReturnValue({ hasPermission: () => false, userId: 7 } as never);
    vi.mocked(GetRoomEngine).mockReturnValue({
        activeRoomHasFreeFurniMovementsMode: freeFurniMovements,
        getRoomObject: () => ({
            type,
            getLocation: () => ({ z: 1.5 }),
            model: { getValue: (key: string): unknown => (key === RoomObjectVariable.FURNITURE_EXTRAS ? extras : 0) }
        })
    } as never);
};

const requestStackHeight = () =>
    act(() => {
        mockEventDispatcher.dispatchEvent({ type: RoomEngineTriggerWidgetEvent.REQUEST_STACK_HEIGHT, roomId: 1, objectId: 5, category: 10 } as never);
    });

describe('useFurnitureStackHeightWidget in playtest (the hotel rule beyond AIR)', () => {
    beforeEach(() => clearMockEventDispatcher());

    afterEach(() => {
        cleanup();
        vi.mocked(GetRoomSessionManager).mockReset();
        vi.mocked(GetSessionDataManager).mockReset();
        vi.mocked(GetRoomEngine).mockReset();
    });

    it('opens for the room owner in normal play', () => {
        setUp(false, false);
        const { result } = renderHook(() => useFurnitureStackHeightWidget());

        requestStackHeight();

        expect(result.current.objectId).toBe(5);
        expect(result.current.height).toBe(1.5);
    });

    it('stays closed for the room owner in playtest', () => {
        setUp(true, false);
        const { result } = renderHook(() => useFurnitureStackHeightWidget());

        requestStackHeight();

        expect(result.current.objectId).toBe(-1);
    });

    it('opens in playtest when the room has free furni movements', () => {
        setUp(true, true);
        const { result } = renderHook(() => useFurnitureStackHeightWidget());

        requestStackHeight();

        expect(result.current.objectId).toBe(5);
    });
});

describe('useFurnitureStackHeightWidget walk tile (official CustomStackHeightWidgetHandler)', () => {
    beforeEach(() => clearMockEventDispatcher());

    afterEach(() => {
        cleanup();
        vi.mocked(GetRoomSessionManager).mockReset();
        vi.mocked(GetSessionDataManager).mockReset();
        vi.mocked(GetRoomEngine).mockReset();
    });

    it('recognises a walk tile by its class name prefix', () => {
        expect(isWalkMagicType('tile_walkmagic')).toBe(true);
        expect(isWalkMagicType('tile_walkmagic*2')).toBe(true);
        expect(isWalkMagicType('tile_stackmagic')).toBe(false);
        expect(isWalkMagicType(null)).toBe(false);
    });

    it('reads multi-walk only from furniture_extra 1', () => {
        expect(readMultiWalk('1')).toBe(true);
        expect(readMultiWalk(1)).toBe(true);
        expect(readMultiWalk('0')).toBe(false);
        expect(readMultiWalk(null)).toBe(false);
    });

    it('opens a walk tile with the walk caption and its stored multi-walk state', () => {
        setUp(false, false, 'tile_walkmagic', '1');
        const { result } = renderHook(() => useFurnitureStackHeightWidget());

        requestStackHeight();

        expect(result.current.isWalkTile).toBe(true);
        expect(result.current.isWalkHeightHelper).toBe(true);
        expect(result.current.multiWalk).toBe(true);
    });

    it('keeps the multi-walk row hidden for a stack tile', () => {
        setUp(false, false, 'tile_stackmagic', '1');
        const { result } = renderHook(() => useFurnitureStackHeightWidget());

        requestStackHeight();

        expect(result.current.isWalkTile).toBe(false);
        expect(result.current.isWalkHeightHelper).toBe(false);
    });
});
