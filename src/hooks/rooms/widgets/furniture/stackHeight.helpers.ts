import { FurnitureStackHeightComposer } from '@octane/renderer';

/**
 * Pure pieces of the official `CustomStackHeightWidget` / `class_3611` handler (AIR 13).
 */

// Official `class_3611.processEvent`: the walk variant is the `tile_walkmagic*` floor item.
export const WALK_HEIGHT_CLASS_NAME_PREFIX = 'tile_walkmagic';

// Official: `getModel().getNumber("furniture_extra") == 1` selects the multi-walk checkbox.
export const isMultiWalkExtra = (extra: string | number | null | undefined): boolean => {
    if (extra === null || extra === undefined) return false;

    return String(extra) === '1';
};

export const isWalkHeightClassName = (className: string | null | undefined): boolean =>
    typeof className === 'string' && className.startsWith(WALK_HEIGHT_CLASS_NAME_PREFIX);

/**
 * Official `onMultiWalkChange`: `class_2690([furniId, currentHeight, multiWalkMode])`, the same
 * composer as the plain height update with the checkbox state as a trailing boolean. The renderer's
 * composer only knows the two-value form, so the third value is appended to the wire array it
 * hands out by reference.
 */
export const composeMultiWalkStackHeight = (furniId: number, heightHundredths: number, multiWalkMode: boolean): FurnitureStackHeightComposer => {
    const composer = new FurnitureStackHeightComposer(furniId, heightHundredths);

    (composer.getMessageArray() as unknown[]).push(multiWalkMode);

    return composer;
};
