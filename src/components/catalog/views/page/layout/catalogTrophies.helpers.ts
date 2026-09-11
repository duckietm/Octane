import { IPurchasableOffer } from '../../../../../api';

export type TrophyColour = 'g' | 's' | 'b' | '';

export interface ITrophyModelGroup {
    baseName: string;
    offers: IPurchasableOffer[];
}

/**
 * TrophyCatalogWidget.getTrophyTypeFromProduct: the colour is the single trailing `_g`, `_s`
 * or `_b` of the product name; the 2011 prize trophies have no colour variants at all.
 */
export const getTrophyColour = (localizationId: string): TrophyColour => {
    const name = localizationId ?? '';

    if (name.indexOf('prizetrophy_2011_') !== -1) return '';

    const separator = name.lastIndexOf('_');

    if (separator < 0) return '';

    const suffix = name.substring(separator + 1);

    return suffix === 'g' || suffix === 's' || suffix === 'b' ? suffix : '';
};

/** The model name shared by the gold, silver and bronze variants of one trophy. */
export const getTrophyBaseName = (localizationId: string): string => {
    const name = localizationId ?? '';
    const colour = getTrophyColour(name);

    return colour ? name.substring(0, name.length - 1 - colour.length) : name;
};

/**
 * Groups a page's offers by model, keeping the page order for the first variant of each model,
 * so prev/next cycles through trophies rather than through colours.
 */
export const groupTrophyOffers = (offers: IPurchasableOffer[]): ITrophyModelGroup[] => {
    const groups: ITrophyModelGroup[] = [];
    const byBaseName = new Map<string, ITrophyModelGroup>();

    for (const offer of offers ?? []) {
        if (!offer) continue;

        const baseName = getTrophyBaseName(offer.localizationId);
        let group = byBaseName.get(baseName);

        if (!group) {
            group = { baseName, offers: [] };
            byBaseName.set(baseName, group);
            groups.push(group);
        }

        group.offers.push(offer);
    }

    return groups;
};

/**
 * TrophyCatalogWidget.onClickNext / onClickPrev: step to the neighbouring model (wrapping at
 * both ends) and pick the variant in the colour currently selected, or the first variant when
 * that model has no such colour. Without a current offer the first model is selected.
 */
export const getAdjacentTrophyOffer = (offers: IPurchasableOffer[], currentOffer: IPurchasableOffer | null, direction: 1 | -1): IPurchasableOffer | null => {
    const groups = groupTrophyOffers(offers);

    if (!groups.length) return null;

    const currentBaseName = currentOffer ? getTrophyBaseName(currentOffer.localizationId) : null;
    const currentIndex = currentBaseName === null ? -1 : groups.findIndex((group) => group.baseName === currentBaseName);

    if (currentIndex === -1) return groups[0].offers[0];

    const nextIndex = (currentIndex + direction + groups.length) % groups.length;
    const nextGroup = groups[nextIndex];
    const colour = getTrophyColour(currentOffer.localizationId);

    return nextGroup.offers.find((offer) => getTrophyColour(offer.localizationId) === colour) ?? nextGroup.offers[0];
};
