import { GroupItem } from '../../../../../../api';

export interface RecyclerInventoryChoice {
    iconUrl: string;
    itemId: number;
    name: string;
}

export const normalizeRecyclerSlotCount = (value: unknown, fallback = 8) => {
    const count = Number(value);

    return Number.isInteger(count) && count > 0 ? Math.min(count, 12) : fallback;
};

export const getRecyclerInventoryChoices = (groups: readonly GroupItem[], selectedIds: ReadonlySet<number>) =>
    groups.flatMap((group) => {
        const item = group.items.find((candidate) => candidate.recyclable && !candidate.locked && !selectedIds.has(candidate.id));

        if (!item) return [];

        return [{ iconUrl: group.iconUrl, itemId: item.id, name: group.name } satisfies RecyclerInventoryChoice];
    });

/**
 * The furni that may sit in the recycler. `ownIds` are the ones already in its slots: those are locked in the
 * inventory by the recycler itself (AIR RecyclerModel.lockSelectedFurni), which must not make them leave their slot.
 */
export const getRecyclerEligibleItemIds = (groups: readonly GroupItem[], ownIds: ReadonlySet<number> = new Set()) =>
    new Set(
        groups.flatMap((group) =>
            group.items.filter((item) => item.recyclable && (!item.locked || ownIds.has(item.id))).map((item) => item.id)
        )
    );

/** The inventory refs of the furni in the slots: what the inventory locks while they are in the recycler. */
export const getRecyclerLockedRefs = (groups: readonly GroupItem[], ownIds: ReadonlySet<number>): number[] =>
    groups.flatMap((group) => group.items.filter((item) => ownIds.has(item.id)).map((item) => item.ref));

export const reconcileRecyclerSlots = (
    slots: readonly RecyclerInventoryChoice[],
    eligibleIds: ReadonlySet<number>
) => slots.filter((slot, index) => eligibleIds.has(slot.itemId) && slots.findIndex((item) => item.itemId === slot.itemId) === index);

export const addRecyclerSlot = (
    slots: RecyclerInventoryChoice[],
    choice: RecyclerInventoryChoice,
    slotCount: number,
    eligibleIds: ReadonlySet<number>
) => {
    if (slots.length >= slotCount || !eligibleIds.has(choice.itemId) || slots.some((slot) => slot.itemId === choice.itemId)) {
        return slots;
    }

    return [...slots, choice];
};

/**
 * The furni to put in the recycler for one being placed from the inventory (AIR requestSelectedFurniToRecycler):
 * the placed item itself, or another free recyclable one of its stack when that one already sits in a slot.
 * Null when its stack has none, so the furni cannot be recycled.
 */
export const pickRecyclerChoiceForPlacedItem = (
    groups: readonly GroupItem[],
    placedItemId: number,
    selectedIds: ReadonlySet<number>,
    ownIds: ReadonlySet<number> = new Set()
): RecyclerInventoryChoice | null => {
    const id = Math.abs(placedItemId);
    const group = groups.find((candidate) => candidate.items.some((item) => item.id === id));

    if (!group) return null;

    // A furni locked by the recycler itself is free again when its slot is the one being replaced.
    const isFree = (item: { id: number; recyclable: boolean; locked: boolean }) =>
        item.recyclable && !selectedIds.has(item.id) && (!item.locked || ownIds.has(item.id));
    const item = group.items.find((candidate) => candidate.id === id && isFree(candidate)) ?? group.items.find(isFree);

    return item ? { iconUrl: group.iconUrl, itemId: item.id, name: group.name } : null;
};

/** AIR RecyclerLogic.placeObjectAtSlot: the furni takes the slot it is dropped on, or the next free one. */
export const placeRecyclerSlot = (
    slots: readonly RecyclerInventoryChoice[],
    index: number,
    choice: RecyclerInventoryChoice,
    slotCount: number
): RecyclerInventoryChoice[] => {
    if (slots.some((slot) => slot.itemId === choice.itemId)) return [...slots];
    if (index >= 0 && index < slots.length) return slots.map((slot, slotIndex) => (slotIndex === index ? choice : slot));

    return slots.length < slotCount ? [...slots, choice] : [...slots];
};
