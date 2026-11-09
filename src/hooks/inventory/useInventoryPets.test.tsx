/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { handlers } = vi.hoisted(() => ({ handlers: new Map<unknown, (event: any) => void>() }));

vi.mock('@octane/renderer', () => ({
    PetAddedToInventoryEvent: class {},
    PetInventoryEvent: class {},
    PetRemovedFromInventory: class {},
    RequestPetsComposer: class {}
}));
vi.mock('@/state/useSharedHook', () => ({ registerSharedHook: vi.fn(), useSharedHook: (hook: () => unknown) => hook() }));
vi.mock('../../api', () => ({
    addSinglePetItem: (petData: { id: number }, list: { petData: unknown }[]) => list.push({ petData }),
    mergePetFragments: vi.fn(),
    processPetFragment: vi.fn(),
    removePetItemById: (id: number, list: { petData: { id: number } }[]) => {
        const index = list.findIndex((item) => item.petData.id === id);

        if (index !== -1) list.splice(index, 1);
    },
    SendMessageComposer: vi.fn(),
    UnseenItemCategory: { PET: 3 }
}));
vi.mock('../events', () => ({ useMessageEvent: (type: unknown, handler: (event: any) => void) => handlers.set(type, handler) }));
vi.mock('../useSharedVisibility', () => ({ useSharedVisibility: () => ({ isVisible: false, activate: vi.fn(), deactivate: vi.fn() }) }));
vi.mock('./useInventoryUnseenTracker', () => ({ useInventoryUnseenTracker: () => ({ isUnseen: () => false, resetCategory: () => false }) }));

import { PetAddedToInventoryEvent, PetRemovedFromInventory } from '@octane/renderer';
import { useInventoryPets } from './useInventoryPets';

describe('useInventoryPets', () => {
    it('clears the selection when the last pet leaves the inventory', () => {
        const { result } = renderHook(() => useInventoryPets());

        act(() => handlers.get(PetAddedToInventoryEvent)({ getParser: () => ({ pet: { id: 7 } }) }));

        expect(result.current.selectedPet?.petData.id).toBe(7);

        act(() => handlers.get(PetRemovedFromInventory)({ getParser: () => ({ petId: 7 }) }));

        expect(result.current.petItems).toEqual([]);
        expect(result.current.selectedPet).toBeNull();
    });
});
