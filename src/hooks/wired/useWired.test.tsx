/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: unknown) => void>(),
    sendMessage: vi.fn(),
    showConfirm: vi.fn(),
    isOwner: vi.fn(() => true)
}));

vi.mock('@octane/renderer', () => {
    const composer = (name: string) =>
        class {
            public readonly name = name;
            public readonly args: unknown[];

            constructor(...args: unknown[]) {
                this.args = args;
            }
        };

    return {
        ConditionDefinition: class {},
        FurnitureFloorRemoveEvent: class {},
        FurnitureWallRemoveEvent: class {},
        GetRoomEngine: vi.fn(),
        GetSessionDataManager: vi.fn(),
        OpenMessageComposer: composer('open'),
        RoomObjectCategory: { FLOOR: 10, WALL: 20 },
        RoomObjectVariable: {},
        RoomSessionEvent: { ENDED: 'RSE_ENDED' },
        TriggerDefinition: class {},
        UpdateActionMessageComposer: composer('action'),
        UpdateAddonMessageComposer: composer('addon'),
        UpdateConditionMessageComposer: composer('condition'),
        UpdateSelectorMessageComposer: composer('selector'),
        UpdateTriggerMessageComposer: composer('trigger'),
        UpdateVariableMessageComposer: composer('variable'),
        WiredActionDefinition: class {},
        WiredAddonDefinition: class {},
        WiredFurniActionEvent: class {},
        WiredFurniAddonEvent: class {},
        WiredFurniConditionEvent: class {},
        WiredFurniSelectorEvent: class {},
        WiredFurniTriggerEvent: class {},
        WiredFurniVariableEvent: class {},
        WiredOpenEvent: class {},
        WiredSaveSuccessEvent: class {},
        WiredSelectorDefinition: class {},
        WiredValidationErrorEvent: class {},
        WiredVariableDefinition: class {}
    };
});

vi.mock('../../api', () => ({
    GetRoomSession: vi.fn(),
    IsOwnerOfFloorFurniture: mocks.isOwner,
    LocalizeText: (key: string) => key,
    localizeWiredError: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    NotificationBubbleType: { INFO: 'info' },
    pasteTriggerableData: vi.fn(),
    removeFurniFromWiredPicks: vi.fn(),
    resolveWiredQuantifier: (code: number | null, sent: number) => code ?? sent,
    resetTriggerableData: vi.fn(),
    SendMessageComposer: mocks.sendMessage,
    wiredClipboardKeyOf: () => 'key',
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 },
    isDualFurniPickingMode: () => false,
    WiredSelectionVisualizer: {
        clearAllSelectionShaders: vi.fn(),
        clearSelectionShaderFromFurni: vi.fn(),
        hide: vi.fn(),
        refresh: vi.fn(),
        setDualPickingMode: vi.fn(),
        setEditingPickList: vi.fn(),
        show: vi.fn()
    },
    wiredPickIdOf: (id: number) => id,
    wiredPickIndexOf: vi.fn(() => -1),
    withoutWallPick: (ids: number[]) => ids,
    withServerDefaultIntParams: (definition: unknown) => definition,
    withTriggerableData: vi.fn()
}));

vi.mock('../events', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.handlers.set(type, handler),
    useOctaneEvent: vi.fn()
}));

vi.mock('../notification', () => ({
    useNotification: () => ({ showConfirm: mocks.showConfirm, showSingleBubble: vi.fn(), simpleAlert: vi.fn() })
}));

vi.mock('../wired-tools/useWiredTools', () => ({ useWiredTools: () => ({ requestUserVariables: null, roomSettings: null }) }));

vi.mock('@/state/useSharedHook', () => ({ registerSharedHook: vi.fn(), useSharedHook: vi.fn() }));

import { TriggerDefinition, WiredSaveSuccessEvent } from '@octane/renderer';
import { useWiredState } from './useWired';

const makeTrigger = (id: number) => Object.assign(new (TriggerDefinition as unknown as new () => object)(), { id, selectedItems2: [] }) as any;

const saveSuccess = { getParser: () => ({}) };

const sentArgs = (call: number) => (mocks.sendMessage.mock.calls[call][0] as { args: unknown[] }).args;

describe('useWiredState saving', () => {
    beforeEach(() => {
        mocks.handlers.clear();
        mocks.sendMessage.mockClear();
        mocks.showConfirm.mockClear();
        mocks.isOwner.mockReturnValue(true);
    });

    it('saves what was configured when the confirmation is answered after the editor closed', () => {
        mocks.isOwner.mockReturnValue(false);

        const { result } = renderHook(() => useWiredState());

        act(() => result.current.setTrigger(makeTrigger(7)));
        act(() => {
            result.current.setIntParams([3, 4]);
            result.current.setStringParam('hello');
            result.current.setFurniIds([11, 12]);
        });
        act(() => result.current.saveWired());
        act(() => result.current.closeWired());

        const onConfirm = mocks.showConfirm.mock.calls[0][1] as () => void;

        act(() => onConfirm());

        expect(mocks.sendMessage).toHaveBeenCalledTimes(1);
        expect(sentArgs(0).slice(0, 4)).toEqual([7, [3, 4], 'hello', [11, 12]]);
    });

    it('closes the editor when the success belongs to the box it shows', () => {
        const { result } = renderHook(() => useWiredState());

        act(() => result.current.setTrigger(makeTrigger(7)));
        act(() => result.current.saveWired());
        act(() => mocks.handlers.get(WiredSaveSuccessEvent)?.(saveSuccess));

        expect(result.current.trigger).toBeNull();
    });

    it('leaves another box open when the success belongs to a box saved earlier', () => {
        const { result } = renderHook(() => useWiredState());

        act(() => result.current.setTrigger(makeTrigger(7)));
        act(() => result.current.saveWired());
        act(() => result.current.setTrigger(makeTrigger(8)));
        act(() => mocks.handlers.get(WiredSaveSuccessEvent)?.(saveSuccess));

        expect(result.current.trigger?.id).toBe(8);
    });

    it('leaves the editor open on a success no save of this editor asked for', () => {
        const { result } = renderHook(() => useWiredState());

        act(() => result.current.setTrigger(makeTrigger(7)));
        act(() => mocks.handlers.get(WiredSaveSuccessEvent)?.(saveSuccess));

        expect(result.current.trigger?.id).toBe(7);
    });
});
