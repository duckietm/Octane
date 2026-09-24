/**
 * Habbo's "teleport to room" (`wf_act_teleport_to_room`). Server: WiredEffectForwardUserToRoom.
 * Int params `[user source, furni source]`, string param the room id (may be empty when furni lead
 * the way), picked furni the room links and teleporters.
 */

/** A room link keeps its room in the furni's custom values under this key. */
export const TELEPORT_TO_ROOM_LINK_KEY = 'internalLink';

export const TELEPORT_TO_ROOM_ID_MAX_LENGTH = 10;

/** Plain digits only, as the server stores them. */
export const sanitizeTeleportRoomId = (value: string): string => (value ?? '').replace(/[^0-9]/g, '').slice(0, TELEPORT_TO_ROOM_ID_MAX_LENGTH);

export const isValidTeleportRoomId = (value: string): boolean => {
    if (!/^[0-9]{1,10}$/.test(value ?? '')) return false;

    const id = Number(value);

    return id > 0 && id <= 2147483647;
};

const TELEPORTER_NAME = /^door|tele/;

/** The furni sold in pairs, one per room, that this box is meant to lead through. */
export const ROOM_LINKER_CLASSNAME = 'wf_room_linker';

/**
 * Whether a furni may be picked: a room linker, one carrying a room link, or one named like a
 * teleporter. The client cannot see the server's interaction, so the name is a guess the server
 * checks on save.
 */
export const isTeleportToRoomPickable = (objectData: Record<string, unknown> | null | undefined, names: Array<string | null | undefined>): boolean => {
    if (objectData && typeof objectData === 'object' && TELEPORT_TO_ROOM_LINK_KEY in objectData) return true;

    return names.some((name) => {
        if (typeof name !== 'string') return false;

        const lowered = name.toLowerCase();

        return lowered === ROOM_LINKER_CLASSNAME || TELEPORTER_NAME.test(lowered);
    });
};

export const readTeleportToRoomParams = (intData: number[] | null | undefined): { userSource: number; furniSource: number } => ({
    userSource: intData?.length > 0 ? intData[0] : 0,
    furniSource: intData?.length > 1 ? intData[1] : 100
});
