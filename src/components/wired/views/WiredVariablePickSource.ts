import { Triggerable } from '@octane/renderer';

/** The picked furni source of a variable reference, as the AIR editor offers it. */
export const VARIABLE_PICK_SOURCE = 100;

/** The source our editors used for those picks before; stored boxes still hold it. */
export const LEGACY_VARIABLE_PICK_SOURCE = 101;

/** A stored source as the editor shows it: the old 101 reads as the picks (100). */
export const toEditorPickSource = (stored: number) => (stored === LEGACY_VARIABLE_PICK_SOURCE ? VARIABLE_PICK_SOURCE : stored);

/**
 * The source a save sends for the editor's choice. The picks go out as 100, as in AIR, once the server lists 100 for the
 * box's furni slot in its InputSourcesConf; a server without that row still reads the picks only as 101.
 */
export const toWirePickSource = (trigger: Triggerable, source: number, slot = 0) => {
    if (source !== VARIABLE_PICK_SOURCE) return source;

    return trigger?.inputSourcesConf?.furniAllowed?.[slot]?.includes(VARIABLE_PICK_SOURCE) ? VARIABLE_PICK_SOURCE : LEGACY_VARIABLE_PICK_SOURCE;
};
