import {
    CreateLinkEvent,
    FurnitureListAddOrUpdateEvent,
    FurnitureListItemParser,
    FurnitureListRemovedEvent
} from '@octane/renderer';
import {
    addFurnitureItem,
    attemptItemPlacement,
    CloneObject,
    cancelRoomObjectPlacement,
    FurnitureItem,
    GroupItem,
    getAllItemIds,
    getPlacingItemId,
    UnseenItemCategory
} from '../../api';

export interface FurniReducerContext {
    isUnseen: (category: number, id: number) => boolean;
    dispatchAdded: (id: number, type: number, category: number) => void;
}

export const applyFurnitureListAddOrUpdate = (state: GroupItem[], event: FurnitureListAddOrUpdateEvent, ctx: FurniReducerContext): GroupItem[] => {
    const parser = event.getParser();
    const newValue = [...state];

    for (const item of parser.items) {
        let i = 0;
        let matched = false;

        while (i < newValue.length) {
            const group = newValue[i];

            let j = 0;

            while (j < group.items.length) {
                const furniture = group.items[j];

                if (furniture.id === item.itemId) {
                    // Clone the group AND the item before mutating, so the input state's objects
                    // are never touched. React may invoke this updater twice (StrictMode /
                    // React-Compiler purity checks); mutating the input makes the second pass
                    // diverge. Mirrors applyFurnitureListRemoved.
                    const clonedGroup = group.clone();
                    const clonedFurniture = furniture.clone();

                    clonedFurniture.update(item);

                    const newFurniture = [...clonedGroup.items];

                    newFurniture[j] = clonedFurniture;

                    clonedGroup.items = newFurniture;
                    clonedGroup.hasUnseenItems = true;

                    newValue[i] = clonedGroup;

                    matched = true;

                    break;
                }

                j++;
            }

            if (matched) break;

            i++;
        }

        if (!matched) {
            const furniture = new FurnitureItem(item);

            addFurnitureItem(newValue, furniture, ctx.isUnseen(UnseenItemCategory.FURNI, item.itemId));

            ctx.dispatchAdded(furniture.id, furniture.type, furniture.category);
        }
    }

    return newValue;
};

// Pure reducer over an ALREADY-MERGED fragment map. Fragment accumulation is I/O-ordering
// state, not derived render state, so it lives in the event handler (useInventoryFurni.ts) and
// must NOT run inside a setState updater: React double-invokes updaters (StrictMode /
// React-Compiler), and the previous in-updater state machine cleared the accumulator on the
// first pass, so the second pass discarded a fully-assembled multi-fragment inventory.
export const applyMergedFurnitureList = (state: GroupItem[], fragment: Map<number, FurnitureListItemParser>, ctx: FurniReducerContext): GroupItem[] => {
    const newValue = [...state];
    const existingIds = getAllItemIds(newValue);
    const existingIdSet = new Set(existingIds);

    for (const existingId of existingIds) {
        if (fragment.get(existingId)) continue;

        let index = 0;

        while (index < newValue.length) {
            const originalGroup = newValue[index];

            if (!originalGroup.getItemById(existingId)) {
                index++;

                continue;
            }

            // Clone before removing so the input state's GroupItem is left untouched.
            const group = originalGroup.clone();
            const item = group.remove(existingId);

            if (item && getPlacingItemId() === item.ref) {
                queueMicrotask(() => {
                    cancelRoomObjectPlacement();

                    if (!attemptItemPlacement(group)) {
                        CreateLinkEvent('inventory/show');
                    }
                });
            }

            if (group.getTotalCount() <= 0) {
                newValue.splice(index, 1);
            } else {
                newValue[index] = group;
            }

            break;
        }
    }

    for (const itemId of fragment.keys()) {
        if (existingIdSet.has(itemId)) continue;

        const parserItem = fragment.get(itemId);

        if (!parserItem) continue;

        const item = new FurnitureItem(parserItem);

        addFurnitureItem(newValue, item, ctx.isUnseen(UnseenItemCategory.FURNI, itemId));

        ctx.dispatchAdded(item.id, item.type, item.category);
    }

    return newValue;
};

export const applyFurnitureListRemoved = (state: GroupItem[], event: FurnitureListRemovedEvent): GroupItem[] => {
    const parser = event.getParser();
    const newValue = [...state];

    let index = 0;

    while (index < newValue.length) {
        const originalGroup = newValue[index];

        // Pure existence check first - must NOT mutate the input state. React can invoke
        // this state updater twice (StrictMode / React Compiler purity checks). GroupItem.remove
        // reassigns the group's internal items, so mutating the input directly makes the second
        // pass a no-op (item already gone), React keeps that result, and the furni lingers.
        if (!originalGroup.getItemById(parser.itemId)) {
            index++;

            continue;
        }

        // Clone before removing so the incoming state's GroupItem is left untouched. remove()
        // reassigns the clone's own _items array (CloneObject shares the reference, but remove
        // copies-then-reassigns), so the original group keeps its items across a re-invocation.
        const group = CloneObject(originalGroup);
        const item = group.remove(parser.itemId);

        if (item && getPlacingItemId() === item.ref) {
            queueMicrotask(() => {
                cancelRoomObjectPlacement();

                if (!attemptItemPlacement(group)) CreateLinkEvent('inventory/show');
            });
        }

        if (group.getTotalCount() <= 0) {
            newValue.splice(index, 1);
        } else {
            newValue[index] = group;
        }

        break;
    }

    return newValue;
};

export const clearUnseenFlags = (state: GroupItem[]): GroupItem[] => {
    if (!state?.length) return state;

    // Pure: clone each group instead of mutating the input state's GroupItems, so a
    // StrictMode / React-Compiler double-invoke of the updater stays deterministic.
    return state.map((groupItem) => {
        const nextGroupItem = groupItem.clone();

        nextGroupItem.hasUnseenItems = false;

        return nextGroupItem;
    });
};

export const refreshGroupItemsLocalization = (state: GroupItem[]): GroupItem[] => {
    if (!state?.length) return state;

    return state.map((groupItem) => {
        const nextGroupItem = groupItem.clone();

        nextGroupItem.refreshLocalization();

        return nextGroupItem;
    });
};
