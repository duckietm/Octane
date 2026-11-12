import {
    CraftableProductsEvent,
    CraftComposer,
    CraftingRecipeEvent,
    CraftingRecipeIngredientParser,
    CraftingRecipesAvailableEvent,
    CraftingResultEvent,
    CraftSecretComposer,
    GetCraftableProductsComposer,
    GetCraftingRecipeComposer,
    GetCraftingRecipesAvailableComposer,
    GetRoomContentLoader,
    GetRoomEngine,
    RoomEngineTriggerWidgetEvent,
    RoomWidgetEnum
} from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { ICraftingIngredient, ICraftingRecipe, LocalizeText, SendMessageComposer } from '../../../../api';
import { useMessageEvent, useOctaneEvent } from '../../../events';
import { useInventoryFurni } from '../../../inventory';
import { useFurniRemovedEvent } from '../../engine';
import { useNotification } from './../../../notification';
import { CraftingMixerItem, CraftingMixerVerdict, craftingMixerVerdict, pickMixerInventoryId } from './furnitureCraftingMixer';

const useFurnitureCraftingWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [recipes, setRecipes] = useState<ICraftingRecipe[]>([]);
    const [selectedRecipe, setSelectedRecipe] = useState<ICraftingRecipe>(null);
    const [ingredients, setIngredients] = useState<ICraftingIngredient[]>([]);
    const [ingredientNames, setIngredientNames] = useState<string[]>(null);
    const [cachedIngredients, setCachedIngredients] = useState<Map<string, CraftingRecipeIngredientParser[]>>(new Map());
    const [isCrafting, setIsCrafting] = useState(false);
    // The free mixer: the inventory furni laid in it, and the server's verdict on that content with its recipe count.
    const [mixerItems, setMixerItems] = useState<CraftingMixerItem[]>([]);
    const [mixerVerdict, setMixerVerdict] = useState<{ verdict: CraftingMixerVerdict; count: number } | null>(null);
    const requestedRecipesRef = useRef<string[]>([]);
    const { groupItems = [], getItemsByType = null, activate = null, deactivate = null } = useInventoryFurni();
    const { simpleAlert = null } = useNotification();

    const requiredIngredients = (selectedRecipe && cachedIngredients.get(selectedRecipe.name)) || null;

    const resetData = () => {
        setRecipes([]);
        setSelectedRecipe(null);
        setIngredients([]);
        setCachedIngredients(new Map());
        setMixerItems([]);
        setMixerVerdict(null);
        // The request queue stays: an answer still on its way after a close and reopen would otherwise be filed
        // under the next recipe asked for, whose own answer was then dropped. Answers come back in order.
        setIsCrafting(false);
    };

    const onClose = () => {
        setObjectId(-1);
        resetData();
    };

    // The crafting table picked up or deleted while open: nothing is left to craft on.
    useFurniRemovedEvent(objectId !== -1, (event) => {
        if (event.id === objectId) onClose();
    });

    const craft = () => {
        setIsCrafting(true);

        SendMessageComposer(new CraftComposer(objectId, selectedRecipe.name));
    };

    /** Asks the server what the mixer's content can become; an empty mixer has no verdict. */
    const updateMixer = (items: CraftingMixerItem[]) => {
        setMixerItems(items);
        // Until the answer is in, and when the server stays silent (a recipe the player already knows is crafted
        // from the product list), nothing can be made.
        setMixerVerdict(items.length ? { verdict: 'nohit', count: 0 } : null);

        if (items.length) SendMessageComposer(new GetCraftingRecipesAvailableComposer(objectId, items.map((item) => item.inventoryId)));
    };

    /** Lays one more furni of this kind from the inventory in the mixer; leaves the recipe view, as the official widget does. */
    const addToMixer = (ingredient: ICraftingIngredient) => {
        //@ts-ignore
        const itemId = GetRoomContentLoader()._activeObjectTypeIds.get(ingredient.name);
        const inventoryIds: number[] = [];

        for (const group of getItemsByType(itemId) ?? []) {
            for (const item of group.items) inventoryIds.push(item.id);
        }

        const inventoryId = pickMixerInventoryId(inventoryIds, mixerItems);

        if (inventoryId === null) return;

        setSelectedRecipe(null);
        updateMixer([...mixerItems, { name: ingredient.name, inventoryId, iconUrl: ingredient.iconUrl }]);
    };

    const removeFromMixer = (inventoryId: number) => updateMixer(mixerItems.filter((item) => item.inventoryId !== inventoryId));

    const craftMixer = () => {
        if (!mixerItems.length) return;

        setIsCrafting(true);
        SendMessageComposer(new CraftSecretComposer(objectId, mixerItems.map((item) => item.inventoryId)));
    };

    const selectRecipe = (recipe: ICraftingRecipe) => {
        // A recipe and the free mixer exclude each other.
        setMixerItems([]);
        setMixerVerdict(null);
        setSelectedRecipe(recipe);

        const cache = cachedIngredients.get(recipe.name);

        if (!cache) {
            requestedRecipesRef.current.push(recipe.name);
            SendMessageComposer(new GetCraftingRecipeComposer(recipe.name));
        }
    };

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.OPEN_WIDGET, (event) => {
        if (event.widget !== RoomWidgetEnum.CRAFTING) return;

        setObjectId(event.objectId);
        resetData();
        SendMessageComposer(new GetCraftableProductsComposer(event.objectId));
    });

    useMessageEvent<CraftableProductsEvent>(CraftableProductsEvent, (event) => {
        const parser = event.getParser();

        if (!parser.isActive()) {
            setObjectId(-1);

            return;
        }

        setRecipes((prevValue) => {
            const newValue: ICraftingRecipe[] = [];

            for (const recipe of parser.recipes) {
                //@ts-ignore
                const itemId = GetRoomContentLoader()._activeObjectTypeIds.get(recipe.itemName);
                const iconUrl = GetRoomEngine().getFurnitureFloorIconUrl(itemId);

                newValue.push({
                    name: recipe.recipeName,
                    localizedName: LocalizeText('roomItem.name.' + itemId),
                    iconUrl
                });
            }

            return newValue;
        });

        setIngredientNames(parser.ingredients);
    });

    useMessageEvent<CraftingRecipeEvent>(CraftingRecipeEvent, (event) => {
        const parser = event.getParser();
        // The answer carries no recipe name; the server answers in order, so it belongs to the oldest request. It
        // was filed under the recipe selected now: two quick clicks put one recipe's ingredients under the other,
        // and with nothing selected the widget threw.
        const recipeName = requestedRecipesRef.current.shift();

        if (!recipeName) return;

        setCachedIngredients((prevValue) => {
            const newValue = new Map(prevValue);

            newValue.set(recipeName, parser.ingredients);

            return newValue;
        });
    });

    useMessageEvent<CraftingResultEvent>(CraftingResultEvent, (event) => {
        setSelectedRecipe(null);
        setIsCrafting(false);
        // Crafted or refused, the furni go back out of the mixer (the crafted ones leave the inventory by themselves).
        setMixerItems([]);
        setMixerVerdict(null);

        const parser = event.getParser();

        if (parser.result) simpleAlert(LocalizeText('crafting.info.result.ok'));
    });

    useMessageEvent<CraftingRecipesAvailableEvent>(CraftingRecipesAvailableEvent, (event) => {
        const parser = event.getParser();

        setMixerVerdict((prevValue) => (prevValue ? { verdict: craftingMixerVerdict(parser.count, parser.hasRecipes), count: parser.count } : prevValue));
    });

    useEffect(() => {
        if (!ingredientNames || !ingredientNames.length) return;

        setIngredients((prevValue) => {
            const newValue: ICraftingIngredient[] = [];

            for (const name of ingredientNames) {
                //@ts-ignore
                const itemId = GetRoomContentLoader()._activeObjectTypeIds.get(name);
                const iconUrl = GetRoomEngine().getFurnitureFloorIconUrl(itemId);

                const inventoryItems = getItemsByType(itemId);

                let amountAvailable = 0;

                if (inventoryItems) for (const inventoryItem of inventoryItems) amountAvailable += inventoryItem.items.length;

                newValue.push({
                    name: name,
                    iconUrl,
                    count: amountAvailable
                });
            }

            return newValue;
        });
    }, [groupItems, ingredientNames, getItemsByType]);

    useEffect(() => {
        if (objectId === -1) return;

        const id = activate();

        return () => deactivate(id);
    }, [objectId, activate, deactivate]);

    return {
        objectId,
        recipes,
        ingredients,
        selectedRecipe,
        requiredIngredients,
        isCrafting,
        mixerItems,
        mixerVerdict,
        selectRecipe,
        craft,
        addToMixer,
        removeFromMixer,
        craftMixer,
        onClose
    };
};

export const useFurnitureCraftingWidget = useFurnitureCraftingWidgetState;
