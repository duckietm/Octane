import { RoomDataParser } from '@octane/renderer';

export interface INavigatorData {
    homeRoomId: number;
    settingsReceived: boolean;
    enteredGuestRoom: RoomDataParser;
    currentRoomOwner: boolean;
    currentRoomId: number;
    currentRoomIsStaffPick: boolean;
    createdFlatId: number;
    avatarId: number;
    roomPicker: boolean;
    eventMod: boolean;
    currentRoomRating: number;
    canRate: boolean;
}
