/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { handlers } = vi.hoisted(() => ({ handlers: new Map<unknown, (event: any) => void>() }));

vi.mock('@octane/renderer', () => ({
    FurnitureListAddOrUpdateEvent: class {},
    FurnitureListComposer: class {},
    FurnitureListEvent: class {},
    FurnitureListInvalidateEvent: class {},
    FurnitureListItemParser: class {},
    FurnitureListRemovedEvent: class {},
    FurnitureListRemoveMultipleEvent: class {}
}));
vi.mock('@/state/useSharedHook', () => ({ registerSharedHook: vi.fn(), useSharedHook: (hook: () => unknown) => hook() }));
vi.mock('../../api', () => ({
    DispatchUiEvent: vi.fn(),
    getGroupItemKey: (group: unknown) => group,
    mergeFurniFragments: vi.fn(),
    SendMessageComposer: vi.fn(),
    UnseenItemCategory: { FURNI: 1 }
}));
vi.mock('../../events', () => ({ InventoryFurniAddedEvent: class {} }));
vi.mock('../events', () => ({ useMessageEvent: (type: unknown, handler: (event: any) => void) => handlers.set(type, handler) }));
vi.mock('../useSharedVisibility', () => ({ useSharedVisibility: () => ({ isVisible: false, activate: vi.fn(), deactivate: vi.fn() }) }));
vi.mock('./useInventoryUnseenTracker', () => ({ useInventoryUnseenTracker: () => ({ isUnseen: () => false, resetCategory: () => false }) }));
// The packet reducer is reduced to what this test needs: it drops the group the packet names.
vi.mock('./useInventoryFurni.reducers', () => ({
    applyFurnitureListAddOrUpdate: (list: unknown[]) => list,
    applyFurnitureListRemoved: (list: unknown[], event: { removed: unknown }) => list.filter((group) => group !== event.removed),
    applyFurnitureListRemovedMany: (list: unknown[]) => list,
    applyMergedFurnitureList: (list: unknown[]) => list,
    clearUnseenFlags: (list: unknown[]) => list,
    refreshGroupItemsLocalization: (list: unknown[]) => list
}));

import { FurnitureListRemovedEvent } from '@octane/renderer';
import { useInventoryFurni } from './useInventoryFurni';

describe('useInventoryFurni group items', () => {
    it('applies a packet to the list a functional update left in the same turn', () => {
        const { result } = renderHook(() => useInventoryFurni());
        const kept = { name: 'kept' } as never;
        const removed = { name: 'removed' } as never;

        act(() => {
            // A trade lock or an unseen reset, then an inventory packet before React renders again.
            result.current.setGroupItems(() => [kept, removed]);
            handlers.get(FurnitureListRemovedEvent)({ removed });
        });

        // The packet used to read the list from the last render, the empty one, and overwrite the update.
        expect(result.current.groupItems).toEqual([kept]);
    });
});
