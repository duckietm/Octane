import { IChestFurniStoredItem } from '@octane/renderer';

/** Matches official {@code FurniChestView.itemTypeKey}. */
export const chestFurniTypeKey = (item: IChestFurniStoredItem): string =>
    `${item.wallItem ? 1 : 0}-${item.baseItemId}-${item.legacyPosterId ?? ''}`;

/** Group key: LTD items stay separate; rarity (specialType 19) splits by level. */
export const chestFurniGroupKey = (item: IChestFurniStoredItem): string => {
    if ((item.stuffData?.uniqueNumber ?? 0) > 0) return `ltd-${item.inventoryId}`;

    if (item.specialType === 19) {
        return `${chestFurniTypeKey(item)}-r${item.stuffData?.rarityLevel ?? 0}`;
    }

    return chestFurniTypeKey(item);
};

export interface ChestFurniGroup {
    key: string;
    wallItem: boolean;
    baseItemId: number;
    legacyPosterId: string;
    specialType: number;
    quantity: number;
    sample: IChestFurniStoredItem;
}

export const groupStoredFurni = (items: IChestFurniStoredItem[]): ChestFurniGroup[] => {
    const map = new Map<string, ChestFurniGroup>();

    for (const item of items) {
        const key = chestFurniGroupKey(item);
        const existing = map.get(key);

        if (existing) {
            existing.quantity += 1;
        } else {
            map.set(key, {
                key,
                wallItem: item.wallItem,
                baseItemId: item.baseItemId,
                legacyPosterId: item.legacyPosterId ?? '',
                specialType: item.specialType,
                quantity: 1,
                sample: item,
            });
        }
    }

    return Array.from(map.values());
};

export const chestFurniDisplayName = (group: ChestFurniGroup, localize: (key: string) => string, getFloorName: (id: number) => string, getWallName: (id: number) => string): string => {
    if (group.wallItem && group.specialType === 6 && group.legacyPosterId) {
        return localize(`poster_${group.legacyPosterId}_name`);
    }

    return group.wallItem ? getWallName(group.baseItemId) : getFloorName(group.baseItemId);
};
