import { GetRoomSessionManager } from '@octane/renderer';

/** Flips playtest mode with the switch notification: what AIR's `:playtest` chat command does. */
export const WIRED_PLAYTEST_TOGGLE_LINK = 'wired-tools/playtest/toggle';

/** The notification AIR's WiredMenuController.setPlayTestMode shows after the user switched it. */
export const wiredPlayTestNotificationKey = (enabled: boolean): string =>
    `wiredmenu.settings.preferences.notification.playtest.${enabled ? 'enabled' : 'disabled'}`;

/**
 * AIR WiredMenuController.setPlayTestMode: the preference goes on the room session, whose
 * controllerLevel then reads "no rights" and whose room engine refuses furni moves and the use of
 * rights-only furni; the session manager keeps it for every room entered later. A renderer without
 * the playtest API leaves the room as it is.
 */
export const applyWiredPlayTestMode = (enabled: boolean): void => {
    const manager = GetRoomSessionManager();

    if (!manager || typeof manager.setPlayTestMode !== 'function') return;

    manager.setPlayTestMode(!!enabled);
};
