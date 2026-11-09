import { GetRoomEngine } from '@octane/renderer';

export function SetActiveRoomId(roomId: number): void {
    GetRoomEngine().setActiveRoomId(roomId);
}
