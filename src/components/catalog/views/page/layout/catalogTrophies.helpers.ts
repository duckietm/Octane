/** AIR TrophyCatalogWidget metals: gold, silver, bronze (the colour grid's swatches, in this order). */
export const TROPHY_METALS = ['g', 's', 'b'] as const;

export type TrophyMetal = (typeof TROPHY_METALS)[number];

export const TROPHY_METAL_COLOURS: Record<TrophyMetal, string> = { g: '#ffcc00', s: '#cccccc', b: '#cc6600' };

export interface TrophyModel<T> {
    base: string;
    offers: Map<TrophyMetal, T>;
    first: T;
}

/** AIR getTrophyTypeFromProduct: `_g` / `_s` / `_b` at the end of the offer name, never for prizetrophy_2011_*. */
export const getTrophyMetal = (localizationId: string): TrophyMetal | '' => {
    const name = localizationId ?? '';

    if (name.indexOf('prizetrophy_2011_') !== -1) return '';

    const suffix = name.substring(name.lastIndexOf('_') + 1);

    if (name.lastIndexOf('_') < 0 || suffix.length !== 1) return '';

    return (TROPHY_METALS as readonly string[]).includes(suffix) ? (suffix as TrophyMetal) : '';
};

/** AIR getBaseNameFromProduct: the offer name without its metal. */
export const getTrophyBaseName = (localizationId: string): string => {
    const metal = getTrophyMetal(localizationId);

    return metal ? localizationId.slice(0, localizationId.length - 2) : (localizationId ?? '');
};

/** The page's offers as AIR groups them: one model per base name, each with its metals, in page order. */
export const groupTrophyOffers = <T extends { localizationId: string }>(offers: readonly T[]): TrophyModel<T>[] => {
    const models = new Map<string, TrophyModel<T>>();

    for (const offer of offers ?? []) {
        const base = getTrophyBaseName(offer.localizationId);
        const metal = getTrophyMetal(offer.localizationId) || 'g';
        let model = models.get(base);

        if (!model) {
            model = { base, offers: new Map(), first: offer };
            models.set(base, model);
        }

        if (!model.offers.has(metal)) model.offers.set(metal, offer);
    }

    return Array.from(models.values());
};

/** AIR: the model's offer in the chosen metal, else its first offer. */
export const pickTrophyOffer = <T>(model: TrophyModel<T> | null | undefined, metal: TrophyMetal): T | null =>
    model ? (model.offers.get(metal) ?? model.first) : null;
