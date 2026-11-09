import { AvatarFigureContainer, GetAvatarRenderManager, IFigurePartSet } from '@octane/renderer';

const getFirstSelectableColorForSetType = (setType: string): number => {
    const structure = GetAvatarRenderManager()?.structureData;

    if (!structure) return -1;

    const set = structure.getSetType(setType);

    if (!set) return -1;

    const palette = structure.getPalette(set.paletteID);

    if (!palette) return -1;

    for (const color of palette.colors.getValues()) {
        if (!color || !color.isSelectable) continue;

        return color.id;
    }

    return -1;
};

/**
 * Builds a new figure string starting from the base figure and applying the
 * provided figure part set IDs (e.g. a purchasable clothing set or pet set).
 *
 * When the base figure does not already define colours for the set type being
 * applied (common for pet "pt" sets on an avatar that has never worn one), the
 * first selectable palette colour is used so the part still renders instead of
 * being dropped.
 */
export const BuildPurchasableClothingFigure = (baseFigure: string, setIds: number[]): string => {
    const manager = GetAvatarRenderManager();

    if (!manager) return baseFigure;

    const container = new AvatarFigureContainer(baseFigure ?? '');
    const structure = manager.structureData;

    for (const setId of setIds) {
        const partSet: IFigurePartSet = structure?.getFigurePartSet(setId);

        if (!partSet) continue;

        let colorIds = container.getPartColorIds(partSet.type) ?? [];

        if (!colorIds.length) {
            const defaultColor = getFirstSelectableColorForSetType(partSet.type);

            if (defaultColor >= 0) colorIds = [defaultColor];
        }

        container.updatePart(partSet.type, partSet.id, colorIds);
    }

    return container.getFigureString();
};
