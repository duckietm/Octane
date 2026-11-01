/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    messageHandlers: new Map<unknown, (event: unknown) => void>(),
    sendMessage: vi.fn()
}));

vi.mock('@octane/renderer', () => ({
    CraftableProductsEvent: class {},
    CraftComposer: class {},
    CraftingRecipeEvent: class {},
    CraftingRecipeIngredientParser: class {},
    CraftingRecipesAvailableEvent: class {},
    CraftingResultEvent: class {},
    GetCraftableProductsComposer: class {},
    GetCraftingRecipeComposer: class {},
    GetRoomContentLoader: () => ({ _activeObjectTypeIds: new Map() }),
    GetRoomEngine: () => ({ getFurnitureFloorIconUrl: () => '' }),
    RoomEngineTriggerWidgetEvent: { OPEN_WIDGET: 'open' },
    RoomWidgetEnum: { CRAFTING: 'crafting' }
}));

vi.mock('../../../../api', () => ({ LocalizeText: (key: string) => key, SendMessageComposer: mocks.sendMessage }));

vi.mock('../../../events', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.messageHandlers.set(type, handler),
    useOctaneEvent: () => undefined
}));

vi.mock('../../../inventory', () => ({ useInventoryFurni: () => ({}) }));
vi.mock('./../../../notification', () => ({ useNotification: () => ({}) }));

import { CraftingRecipeEvent } from '@octane/renderer';
import { useFurnitureCraftingWidget } from './useFurnitureCraftingWidget';

const answer = (ingredients: unknown[]) =>
    act(() => mocks.messageHandlers.get(CraftingRecipeEvent)?.({ getParser: () => ({ ingredients }) }));

describe('useFurnitureCraftingWidget', () => {
    beforeEach(() => {
        mocks.messageHandlers.clear();
        mocks.sendMessage.mockClear();
    });

    it('files each recipe answer under the recipe it was asked for', () => {
        const { result } = renderHook(() => useFurnitureCraftingWidget());
        const throne = { name: 'throne', localizedName: 'Throne', iconUrl: '' };
        const chair = { name: 'chair', localizedName: 'Chair', iconUrl: '' };

        act(() => result.current.selectRecipe(throne));
        act(() => result.current.selectRecipe(chair));
        answer(['wood x2']);

        expect(result.current.requiredIngredients).toBeNull();

        answer(['stone x1']);
        expect(result.current.requiredIngredients).toEqual(['stone x1']);

        act(() => result.current.selectRecipe(throne));
        expect(result.current.requiredIngredients).toEqual(['wood x2']);
    });

    it('ignores an answer nothing asked for', () => {
        const { result } = renderHook(() => useFurnitureCraftingWidget());

        expect(() => answer(['wood x2'])).not.toThrow();
        expect(result.current.requiredIngredients).toBeNull();
    });
});
