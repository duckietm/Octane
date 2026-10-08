import { GetRoomEngine, GetSessionDataManager, IRoomSession, RoomControllerLevel } from '@octane/renderer';
import { IsOwnerOfFurniture } from './IsOwnerOfFurniture';
import { IsAnyRoomController } from './HasSessionPermission';

export function CanManipulateFurniture(roomSession: IRoomSession, objectId: number, category: number): boolean {
    if (!roomSession) return false;

    return (
        roomSession.isRoomOwner ||
        roomSession.controllerLevel >= RoomControllerLevel.GUEST ||
        IsAnyRoomController() ||
        IsOwnerOfFurniture(GetRoomEngine().getRoomObject(roomSession.roomId, objectId, category))
    );
}
