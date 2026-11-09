import { GetGuestRoomMessageComposer } from '@octane/renderer';
import { SendMessageComposer } from '../octane';

export function TryVisitRoom(roomId: number): void {
    SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, true));
}
