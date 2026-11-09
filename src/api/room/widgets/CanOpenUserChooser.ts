import { GetRoomEngine, IRoomSession, RoomControllerLevel } from '@octane/renderer';

/**
 * AIR `ChatInputWidgetHandler` `:chooser` + `UserChooserWidgetHandler.isChooserDisabled`: while the room's
 * `:chooser` disabler is on (ConfigurationItemStates), the user list stays closed for visitors below rights
 * (controller level 1).
 */
export const CanOpenUserChooser = (roomSession: IRoomSession): boolean =>
    !GetRoomEngine()?.activeRoomHasChooserDisabled || (roomSession?.controllerLevel ?? 0) >= RoomControllerLevel.GUEST;
