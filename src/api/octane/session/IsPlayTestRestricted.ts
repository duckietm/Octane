import { GetRoomEngine, IRoomSession } from '@octane/renderer';

/**
 * Playtest mode (the wired menu preference) for the building rights the hotel refuses on top of AIR:
 * placing from the inventory (Builders Club too), the dimmer and toner settings, the stack helper
 * height and the build height. AIR's own playtest check only covers moving, picking up and using
 * furni; the server (`RoomPlayTestSupport.isBuildingRefused`) refuses these too, and the room's free
 * furni movements mode lifts both, as it lifts AIR's checks.
 *
 * Room owners still read `isRoomOwner` in playtest, so a widget that lets owners through on that
 * shortcut asks this as well.
 */
export function IsPlayTestRestricted(roomSession: IRoomSession): boolean {
    if (!roomSession || !roomSession.playTestMode) return false;

    return !GetRoomEngine()?.activeRoomHasFreeFurniMovementsMode;
}
