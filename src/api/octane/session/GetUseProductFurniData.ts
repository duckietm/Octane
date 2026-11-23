import { IFurnitureData, RoomObjectCategory } from '@octane/renderer';
import { GetSessionDataManager } from './GetSessionDataManager';
import { GetFurnitureDataForRoomObject } from './GetFurnitureDataForRoomObject';

/**
 * The furni data of a product a pet is about to get: of the room object, or, for a product used from the inventory
 * (its item id in `requestInventoryStripId`), of the furni type AIR keeps in `requestRoomObjectId`.
 */
export const GetUseProductFurniData = (roomId: number, item: { requestRoomObjectId: number; requestInventoryStripId: number }): IFurnitureData =>
    item.requestInventoryStripId !== -1
        ? GetSessionDataManager().getFloorItemData(item.requestRoomObjectId)
        : GetFurnitureDataForRoomObject(roomId, item.requestRoomObjectId, RoomObjectCategory.FLOOR);
