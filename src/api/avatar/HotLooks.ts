/**
 * Pure helpers for the avatar editor "hot looks" tab (AIR 13 HotLooksModel).
 *
 * The official model keeps one list per gender ("M" / "F"), shows at most 20 looks
 * and ignores a click on a look whose figure string is empty.
 */
export interface IHotLookEntry {
    gender: string;
    figureString: string;
}

export type HotLookGender = 'M' | 'F';

export const MAX_HOT_LOOKS = 20;

/** Maps any gender spelling the server may send onto the two editor genders. */
export const normalizeHotLookGender = (gender: string): HotLookGender => {
    const first = (gender ?? '').trim().charAt(0).toUpperCase();

    return first === 'F' ? 'F' : 'M';
};

/** Groups the looks per gender, keeping server order and the official 20-look cap. */
export const groupHotLooksByGender = (looks: IHotLookEntry[]): Record<HotLookGender, IHotLookEntry[]> => {
    const grouped: Record<HotLookGender, IHotLookEntry[]> = { M: [], F: [] };

    for (const look of looks ?? []) {
        if (!look) continue;

        const gender = normalizeHotLookGender(look.gender);
        const bucket = grouped[gender];

        if (bucket.length >= MAX_HOT_LOOKS) continue;

        bucket.push({ gender, figureString: look.figureString ?? '' });
    }

    return grouped;
};

/** The look to load when the entry at `index` of the current gender is clicked, or null when nothing should happen. */
export const selectHotLookFigure = (looks: IHotLookEntry[], gender: string, index: number): IHotLookEntry | null => {
    const bucket = groupHotLooksByGender(looks)[normalizeHotLookGender(gender)];
    const look = bucket[index];

    if (!look || !look.figureString) return null;

    return look;
};
