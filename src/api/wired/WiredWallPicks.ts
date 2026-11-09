import { RoomObjectCategory } from '@octane/renderer';

/**
 * AIR picks a wall item as its negative id (`getFurni(-id, category 20)`) and a floor item as its id. Boxes saved
 * before kept a wall pick's own (positive) id; the server sends those back positive for boxes that take no wall
 * furni, and both forms name the same wall item.
 */
export const wiredPickIdOf = (objectId: number, category: number): number => (category === RoomObjectCategory.WALL ? -objectId : objectId);

/** Whether `picks` holds the room object, in AIR's form or, for a wall item, the form boxes stored before. */
export const wiredPickIndexOf = (picks: number[], objectId: number, category: number): number => {
    const index = picks.indexOf(wiredPickIdOf(objectId, category));

    if (index >= 0 || category !== RoomObjectCategory.WALL) return index;

    return picks.indexOf(objectId);
};

/** The picks without the removed wall item, in either form. */
export const withoutWallPick = (picks: number[], wallItemId: number): number[] => picks.filter((id) => id !== -wallItemId && id !== wallItemId);
