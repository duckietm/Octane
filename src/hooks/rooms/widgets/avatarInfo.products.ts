import { RoomObjectCategory, RoomObjectType } from '@octane/renderer';
import { FurniCategory } from '../../../api/inventory/FurniCategory';
import { UseProductItem } from '../../../api/room/widgets/UseProductItem';

/** The fields of a room unit's user data that decide whether a pet product applies to it. */
export interface UseProductCandidate {
    type: number;
    roomIndex: number;
    name: string;
    ownerId: number;
    figure: string;
    hasSaddle: boolean;
    canRevive: boolean;
    canBreed: boolean;
    petLevel: number;
}

/** The furni data of the product being used: its pet part in `customParams` and its kind in `specialType`. */
export interface UseProductFurniData {
    customParams: string;
    specialType: number;
}

export interface UseProductUnit {
    roomObjectId: number;
    userData: UseProductCandidate | null;
}

/**
 * The pets of the product owner that a product placed in the room can be used on, one bubble each.
 * A saddle replaces the saddle a pet already has; the monster plant products apply only at the right
 * stage (revival to a dead plant, rebreed to a grown one that cannot breed, fertilizer to a young one).
 *
 * Returns null when the product names no pet part, so the caller leaves an open confirm alone.
 */
export const collectUseProductBubbles = (
    furniData: UseProductFurniData,
    ownerId: number,
    productObjectId: number,
    units: readonly UseProductUnit[],
    inventoryStripId: number = -1
): UseProductItem[] | null => {
    const parts = furniData.customParams.split(' ');
    const part = parts.length ? parseInt(parts[0]) : -1;

    if (part === -1) return null;

    const bubbles: UseProductItem[] = [];

    for (const { roomObjectId, userData } of units) {
        if (!userData || userData.type !== RoomObjectType.PET || userData.ownerId !== ownerId) continue;

        const replace = userData.hasSaddle && furniData.specialType === FurniCategory.PET_SADDLE;
        const figureParts = userData.figure.split(' ');
        const figurePart = figureParts.length ? parseInt(figureParts[0]) : -1;

        if (figurePart !== part) continue;

        if (furniData.specialType === FurniCategory.MONSTERPLANT_REVIVAL && !userData.canRevive) continue;

        if (furniData.specialType === FurniCategory.MONSTERPLANT_REBREED && (userData.petLevel < 7 || userData.canRevive || userData.canBreed)) continue;

        if (furniData.specialType === FurniCategory.MONSTERPLANT_FERTILIZE && (userData.petLevel >= 7 || userData.canRevive)) continue;

        bubbles.push(new UseProductItem(userData.roomIndex, RoomObjectCategory.UNIT, userData.name, productObjectId, roomObjectId, inventoryStripId, replace));
    }

    return bubbles;
};

/**
 * Whether the product of a bubble lies in the inventory. AIR then keeps the furni's type id in
 * `requestRoomObjectId` (there is no room object) and the inventory item's id in `requestInventoryStripId`.
 */
export const isUseProductFromInventory = (item: Pick<UseProductItem, 'requestInventoryStripId'> | null | undefined): boolean =>
    !!item && item.requestInventoryStripId !== -1;

/** The id the server is asked to use: the inventory item's, or the room object's. */
export const useProductRequestId = (item: Pick<UseProductItem, 'requestInventoryStripId' | 'requestRoomObjectId'>): number =>
    isUseProductFromInventory(item) ? item.requestInventoryStripId : item.requestRoomObjectId;

/** The furni kinds AIR's inventory offers "Use" for in a private room: pet shampoo, parts, saddle and plant revival. */
const INVENTORY_PET_PRODUCTS: readonly number[] = [
    FurniCategory.PET_SHAMPOO,
    FurniCategory.PET_CUSTOM_PART,
    FurniCategory.PET_CUSTOM_PART_SHAMPOO,
    FurniCategory.PET_SADDLE,
    FurniCategory.MONSTERPLANT_REVIVAL
];

export const isInventoryPetProduct = (category: number): boolean => INVENTORY_PET_PRODUCTS.includes(category);
