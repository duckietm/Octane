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

export const getRecyclerEligibleItemIds = (groups: readonly GroupItem[]) =>
    new Set(
        groups.flatMap((group) =>
            group.items.filter((item) => item.recyclable && !item.locked).map((item) => item.id)
        )
    );

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
