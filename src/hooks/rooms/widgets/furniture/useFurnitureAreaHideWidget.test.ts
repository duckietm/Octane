/* @vitest-environment jsdom */
import {
    FurnitureMultiStateComposer,
    GetCommunication,
    GetRoomEngine,
    GetSessionDataManager,
    RoomEngineAreaHideStateEvent,
    RoomEngineTriggerWidgetEvent,
    RoomObjectVariable,
    SetObjectDataMessageComposer
} from '@octane/renderer';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearMockEventDispatcher, mockEventDispatcher } from '../../../../octane-renderer.mock';
import { useFurnitureAreaHideWidget } from './useFurnitureAreaHideWidget';
import { buildAreaHideValues, canOpenAreaHide, getAreaHideControlState } from './useFurnitureAreaHideWidget.helpers';

const session = { roomId: 1, isRoomOwner: true, controllerLevel: 0 };

vi.mock('../../useRoom', () => ({ useRoom: () => ({ roomSession: session }) }));

const OBJECT_ID = 5;

// The mock composers keep their arguments (see octane-renderer.mock.ts).
type SentObjectData = { objectId: number; data: Map<string, string> };
type SentMultiState = { itemId: number; state: number };

let selectionCallback: (rootX: number, rootY: number, width: number, length: number) => void = null;
const selection = {
    activate: vi.fn((callback: typeof selectionCallback) => {
        selectionCallback = callback;
        return true;
    }),
    deactivate: vi.fn(),
    setHighlight: vi.fn(),
    startSelecting: vi.fn(),
    clearHighlight: vi.fn()
};

const send = vi.fn();
const sent = () => send.mock.calls.map(([composer]) => composer);

const setUp = (state: number) => {
    const values: Record<string, number> = {
        [RoomObjectVariable.FURNITURE_AREA_HIDE_ROOT_X]: 2,
        [RoomObjectVariable.FURNITURE_AREA_HIDE_ROOT_Y]: 3,
        [RoomObjectVariable.FURNITURE_AREA_HIDE_WIDTH]: 4,
        [RoomObjectVariable.FURNITURE_AREA_HIDE_LENGTH]: 5,
        [RoomObjectVariable.FURNITURE_AREA_HIDE_INVISIBILITY]: 0,
        [RoomObjectVariable.FURNITURE_AREA_HIDE_WALL_ITEMS]: 1,
        [RoomObjectVariable.FURNITURE_AREA_HIDE_INVERT]: 0
    };

    vi.mocked(GetSessionDataManager).mockReturnValue({ hasPermission: () => false, userId: 7 } as never);
    vi.mocked(GetRoomEngine).mockReturnValue({
        areaSelectionManager: selection,
        getRoomObject: () => ({ getState: () => state, model: { getValue: (key: string) => values[key] } })
    } as never);
};

const open = () =>
    act(() => {
        mockEventDispatcher.dispatchEvent({ type: RoomEngineTriggerWidgetEvent.REQUEST_AREA_HIDE, roomId: 1, objectId: OBJECT_ID, category: 10 } as never);
    });

describe('useFurnitureAreaHideWidget (AIR AreaHideFurniWidget)', () => {
    beforeEach(() => {
        clearMockEventDispatcher();
        send.mockClear();
        const communication = GetCommunication();
        vi.mocked(GetCommunication).mockReturnValue({ ...communication, connection: { ...communication.connection, send } } as never);
        Object.assign(session, { isRoomOwner: true, controllerLevel: 0 });
        selectionCallback = null;
    });

    afterEach(() => {
        cleanup();
        vi.mocked(GetSessionDataManager).mockReset();
        vi.mocked(GetRoomEngine).mockReset();
        vi.mocked(GetCommunication).mockRestore();
        selection.activate.mockClear();
        selection.deactivate.mockClear();
        selection.setHighlight.mockClear();
    });

    it('stays closed for a visitor without rights', () => {
        Object.assign(session, { isRoomOwner: false, controllerLevel: 0 });
        setUp(0);
        const { result } = renderHook(() => useFurnitureAreaHideWidget());

        open();

        expect(result.current.objectId).toBe(-1);
    });

    it('reads the saved area and options and shows the selection while the area is not hidden', () => {
        setUp(0);
        const { result } = renderHook(() => useFurnitureAreaHideWidget());

        open();

        expect(result.current.objectId).toBe(OBJECT_ID);
        expect(result.current.isOn).toBe(false);
        expect([result.current.rootX, result.current.rootY, result.current.width, result.current.length]).toEqual([2, 3, 4, 5]);
        expect(result.current.wallItems).toBe(true);
        expect(selection.activate).toHaveBeenCalled();
        expect(selection.setHighlight).toHaveBeenCalledWith(2, 3, 4, 5);
    });

    it('saves an option at once without switching the furni on', () => {
        setUp(0);
        const { result } = renderHook(() => useFurnitureAreaHideWidget());

        open();
        act(() => result.current.setInverted(true));

        const composer = sent().at(-1) as unknown as SentObjectData;

        expect(composer).toBeInstanceOf(SetObjectDataMessageComposer);
        expect(composer.objectId).toBe(OBJECT_ID);
        expect(composer.data.get('state')).toBe('0');
        expect(composer.data.get('invert')).toBe('1');
        expect(composer.data.get('wallItems')).toBe('1');
        expect(result.current.objectId).toBe(OBJECT_ID);
    });

    it('saves a new area as soon as it is selected', () => {
        setUp(0);
        renderHook(() => useFurnitureAreaHideWidget());

        open();
        act(() => selectionCallback(1, 1, 6, 7));

        const composer = sent().at(-1) as unknown as SentObjectData;

        expect(composer.data.get('rootX')).toBe('1');
        expect(composer.data.get('width')).toBe('6');
        expect(composer.data.get('length')).toBe('7');
        expect(composer.data.get('state')).toBe('0');
    });

    it('switches on through the furni use and keeps the window open, then locks the settings', () => {
        setUp(0);
        const { result } = renderHook(() => useFurnitureAreaHideWidget());

        open();
        act(() => result.current.toggleOnOff());

        const toggle = sent().at(-1) as unknown as SentMultiState;

        expect(toggle).toBeInstanceOf(FurnitureMultiStateComposer);
        expect(toggle.itemId).toBe(OBJECT_ID);
        expect(result.current.objectId).toBe(OBJECT_ID);

        act(() => {
            mockEventDispatcher.dispatchEvent({
                type: RoomEngineAreaHideStateEvent.UPDATE_STATE_AREA_HIDE,
                objectId: OBJECT_ID,
                category: 10,
                isOn: true
            } as never);
        });

        expect(result.current.isOn).toBe(true);
        expect(selection.deactivate).toHaveBeenCalled();

        const before = sent().length;

        act(() => result.current.setWallItems(false));

        expect(sent().length).toBe(before);
    });
});

describe('area hide helpers', () => {
    it('builds the eight custom values with the state left as it is', () => {
        const values = buildAreaHideValues(true, { rootX: 1.7, rootY: -2, width: 3, length: 4, invisibility: true, wallItems: false, inverted: true });

        expect(Object.fromEntries(values)).toEqual({
            state: '1',
            rootX: '1',
            rootY: '0',
            width: '3',
            length: '4',
            invisibility: '1',
            wallItems: '0',
            invert: '1'
        });
    });

    it('locks everything but the on/off button while the area is hidden', () => {
        expect(getAreaHideControlState(true, false, false)).toEqual({ optionsDisabled: true, selectDisabled: true, clearDisabled: true });
        expect(getAreaHideControlState(false, false, true)).toEqual({ optionsDisabled: false, selectDisabled: false, clearDisabled: false });
        expect(getAreaHideControlState(false, true, true).selectDisabled).toBe(true);
    });

    it('opens for the owner, rights holders and staff only', () => {
        expect(canOpenAreaHide(true, 0, false)).toBe(true);
        expect(canOpenAreaHide(false, 1, false)).toBe(true);
        expect(canOpenAreaHide(false, 0, true)).toBe(true);
        expect(canOpenAreaHide(false, 0, false)).toBe(false);
    });
});
