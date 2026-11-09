import { IFigurePartSet, IStructureData } from '@octane/renderer';

export interface SanitizeFigureOptions {
    gender: string;
    clubLevel: number;
    ownedSetIds: number[];
    /** Mandatory set types for the gender and club level (head, body, legs...). */
    mandatorySetTypes: string[];
}

/** Habbo's defaults when switching to a gender that has no look yet. */
export const DEFAULT_MALE_FIGURE = 'hr-100.hd-180-7.ch-215-66.lg-270-79.sh-305-62.ha-1002-70.wa-2007';
export const DEFAULT_FEMALE_FIGURE = 'hr-515-33.hd-600-1.ch-635-70.lg-716-66-62.sh-735-68';

const fitsGender = (partSet: IFigurePartSet, gender: string) => !partSet.gender || partSet.gender === 'U' || partSet.gender === gender;

const isWearable = (partSet: IFigurePartSet, options: SanitizeFigureOptions) =>
    !!partSet &&
    fitsGender(partSet, options.gender) &&
    partSet.clubLevel <= options.clubLevel &&
    !(partSet.isSellable && options.ownedSetIds.indexOf(partSet.id) === -1);

/**
 * Like Habbo's editor: drops parts the user can't wear (club level, unowned sellable, other
 * gender), puts the first wearable part back for mandatory types, and replaces club colours.
 */
export const sanitizeAvatarFigure = (figure: string, structure: IStructureData, options: SanitizeFigureOptions): string => {
    if (!figure || !structure) return figure;

    const result: string[] = [];
    const seenTypes = new Set<string>();

    for (const set of figure.split('.')) {
        const [type, idText, ...colorTexts] = set.split('-');
        const setType = type ? structure.getSetType(type) : null;

        if (!setType) continue;

        let partSet = setType.getPartSet(parseInt(idText));

        if (!isWearable(partSet, options)) {
            if (options.mandatorySetTypes.indexOf(type) === -1) continue;

            partSet = setType.partSets.getValues().find((candidate) => candidate.isSelectable && isWearable(candidate, options)) ?? null;

            if (!partSet) continue;
        }

        const palette = structure.getPalette(setType.paletteID);
        const firstColor = palette?.colors.getValues().find((color) => color.isSelectable && color.clubLevel <= options.clubLevel);
        const colors = colorTexts.map((text) => {
            const color = palette?.getColor(parseInt(text));

            return (color && color.clubLevel > options.clubLevel && firstColor) ? firstColor.id.toString() : text;
        });

        seenTypes.add(type);
        result.push([type, partSet.id.toString(), ...colors].join('-'));
    }

    // A mandatory type that was missing gets its first wearable part too.
    for (const type of options.mandatorySetTypes) {
        if (seenTypes.has(type)) continue;

        const setType = structure.getSetType(type);
        const partSet = setType?.partSets.getValues().find((candidate) => candidate.isSelectable && isWearable(candidate, options));

        if (partSet) result.push(`${type}-${partSet.id}`);
    }

    return result.join('.');
};
