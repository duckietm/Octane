import { GetRoomSessionManager, OctaneLogger } from '@octane/renderer';
import { GetRoomSession } from './GetRoomSession';
import { GoToDesktop } from './GoToDesktop';

export const VisitDesktop = () => {
    if (!GetRoomSession()) return;

    OctaneLogger.log('[VisitDesktop] Called (isReconnecting=' + GetRoomSessionManager().isReconnecting + ')');

    GoToDesktop();
    GetRoomSessionManager().removeSession(-1);
};
