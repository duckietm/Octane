import { GetSessionDataManager, IRoomSession, RoomControllerLevel, SecurityLevel } from '@octane/renderer';

/** permission_definitions key for the ranks that may open `:furni` without room rights. */
export const FURNI_CHOOSER_PERMISSION = 'acc_furni_chooser';

/**
 * AIR `ChatInputWidgetHandler` `:furni`: the furni chooser opens for room rights holders (controller level 1
 * and up, so owners too) and ambassadors. Where AIR checks `hasSecurity(2)` we check the rank's
 * `acc_furni_chooser` permission; a server that sends no permission keys keeps AIR's security level 2.
 * Anyone else gets nothing.
 */
export const CanOpenFurniChooser = (roomSession: IRoomSession): boolean =>
{
    if ((roomSession?.controllerLevel ?? 0) >= RoomControllerLevel.GUEST) return true;

    const sessionData = GetSessionDataManager();

    if (!sessionData) return false;

    if (sessionData.isAmbassador) return true;

    const permissions = (typeof sessionData.getPermissionsSnapshot === 'function') ? sessionData.getPermissionsSnapshot() : null;

    if (permissions?.size) return (permissions.get(FURNI_CHOOSER_PERMISSION) === 1);

    return sessionData.hasSecurity(SecurityLevel.PARTNER);
};
