/** What the editor needs of a definition to read its official source slots. */
interface ISourceSlotsLike {
    furniSourceTypes?: number[];
    userSourceTypes?: number[];
    selectedItems?: number[];
}

/** The furni source of official slot `index`; a box without one picks its furni (100) when it has picks, else the trigger (0). */
export const slotFurniSource = (trigger: ISourceSlotsLike | null, index = 0) =>
    trigger?.furniSourceTypes?.[index] ?? ((trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0);

/** The user source of official slot `index`, the triggering user (0) when not sent. */
export const slotUserSource = (trigger: ISourceSlotsLike | null, index = 0, fallback = 0) => trigger?.userSourceTypes?.[index] ?? fallback;
