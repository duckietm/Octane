import { GetSessionDataManager, SecurityLevel } from '@octane/renderer';

/**
 * A permission key the server sent (1 = allowed); without keys, Flash's rank level. Also works on a
 * renderer from before SessionDataManager.hasPermission, using the same rule on its snapshot.
 */
export function HasSessionPermission(key: string, fallbackLevel: number): boolean {
    const manager = GetSessionDataManager();

    if (!manager) return false;

    if (typeof manager.hasPermission === 'function') return manager.hasPermission(key, fallbackLevel);

    const permissions = typeof manager.getPermissionsSnapshot === 'function' ? manager.getPermissionsSnapshot() : null;

    if (permissions?.size) return permissions.get(key) === 1;

    return manager.hasSecurity(fallbackLevel);
}

/** Flash's isAnyRoomController: acts as a controller of every room (acc_anyroomowner). */
export function IsAnyRoomController(): boolean {
    return HasSessionPermission('acc_anyroomowner', SecurityLevel.MODERATOR);
}
