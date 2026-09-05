import { GetRoomSessionManager, IRoomSession } from '@octane/renderer';

export function StartRoomSession(session: IRoomSession): void {
    GetRoomSessionManager().startSession(session);
}
