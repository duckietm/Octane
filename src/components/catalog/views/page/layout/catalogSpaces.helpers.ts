/** AIR SpacesNewCatalogWidget groups, in tab order: walls, floors, views (furni class names). */
export const SPACES_GROUPS = [
    { className: 'wallpaper', tab: 'walls' },
    { className: 'floor', tab: 'floors' },
    { className: 'landscape', tab: 'views' }
] as const;

interface SpacesOfferLike {
    pricingModel: string;
    product: { productType: string; furnitureData?: { className?: string } | null } | null;
}

/**
 * The page's offers per group (walls, floors, views), as AIR's createOfferGroups: single / multi priced wall or
 * floor products whose furni class is wallpaper, floor or landscape.
 */
export const groupSpacesOffers = <T extends SpacesOfferLike>(offers: readonly T[]): T[][] => {
    const groups: T[][] = SPACES_GROUPS.map(() => []);

    for (const offer of offers ?? []) {
        if (offer.pricingModel !== 'pricing_model_single' && offer.pricingModel !== 'pricing_model_multi') continue;

        const product = offer.product;

        if (!product || (product.productType !== 'i' && product.productType !== 's') || !product.furnitureData) continue;

        const index = SPACES_GROUPS.findIndex((group) => group.className === product.furnitureData.className);

        if (index >= 0) groups[index].push(offer);
    }

    return groups;
};
