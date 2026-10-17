import type { OctaneAdjustmentFilter } from '@octane/renderer';

/** The part of the room's master container the tint needs. */
export interface RoomTintTarget {
    filters: unknown;
}

/**
 * Applies the room tint (mood light / background colour). A white tint changes nothing, so the
 * filter is attached only while the tint is not white: an attached filter costs Pixi work every
 * frame even when it is idle. Other filters on the container are kept, and the list is only
 * reassigned when membership changes.
 */
export const updateRoomTint = (master: RoomTintTarget, filter: OctaneAdjustmentFilter, color: number): void => {
    filter.red = ((color >> 16) & 0xff) / 255;
    filter.green = ((color >> 8) & 0xff) / 255;
    filter.blue = (color & 0xff) / 255;
    filter.enabled = true;

    if (!master) return;

    const filters = (Array.isArray(master.filters) ? master.filters : []) as unknown[];
    const applied = filters.includes(filter);
    const neutral = (color & 0xffffff) === 0xffffff;

    if (neutral && applied) master.filters = filters.filter((entry) => entry !== filter);
    else if (!neutral && !applied) master.filters = [...filters, filter];
};
