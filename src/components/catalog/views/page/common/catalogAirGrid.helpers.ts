import { CatalogType, IPurchasableOffer } from '../../../../../api';

export const AIR_CATALOG_GRID_HORIZONTAL_SPACING = 3;
export const AIR_GRID_WINDOW_OVERSCAN = 120;

export interface CatalogAirGridEntry {
    offer: IPurchasableOffer;
    index: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface CatalogAirGridLayout {
    entries: CatalogAirGridEntry[];
    width: number;
    height: number;
}

/** AIR `gridItem`: the price-less 36x36 box. */
export const AIR_BASE_OFFER_DIMENSIONS = { width: 36, height: 36 };

/** AIR `gridItem_with_price`: the 53x74 box that keeps room for the price plate. */
export const AIR_PRICED_OFFER_DIMENSIONS = { width: 53, height: 74 };

export const isAirBaseCatalogOffer = (offer: IPurchasableOffer, currentType: string) =>
    currentType === CatalogType.BUILDER || (offer.priceInCredits <= 0 && offer.priceInActivityPoints <= 0);

/**
 * AIR picks the 36x36 base renderer for a whole grid, never for a single offer. Deciding it per
 * offer means one offer whose price is merely missing (0 credits and 0 activity points) drops to a
 * 36px box among 74px neighbours: from there its column stops sharing a baseline with the others,
 * and the icon and price plate of every following offer slide out of their row. So the base box is
 * used only when EVERY offer of the page is price-less; a mixed page stays on the priced box.
 */
export const catalogPageUsesAirBaseTemplate = (offers: IPurchasableOffer[], currentType: string) =>
    offers.length > 0 && offers.every((offer) => isAirBaseCatalogOffer(offer, currentType));

export const getAirCatalogOfferDimensions = (
    offer: IPurchasableOffer,
    currentType: string,
    pageUsesBaseTemplate: boolean = isAirBaseCatalogOffer(offer, currentType)
) => (pageUsesBaseTemplate ? { ...AIR_BASE_OFFER_DIMENSIONS } : { ...AIR_PRICED_OFFER_DIMENSIONS });

/** Mirrors ItemGridController.resolveColumnForNextItem for the first visual row. */
export const getAirCatalogColumnCount = (offers: IPurchasableOffer[], availableWidth: number, currentType: string) => {
    if (!offers.length) return 0;

    const pageUsesBaseTemplate = catalogPageUsesAirBaseTemplate(offers, currentType);

    let columnCount = 1;
    let right = getAirCatalogOfferDimensions(offers[0], currentType, pageUsesBaseTemplate).width;

    while (columnCount < offers.length) {
        const nextWidth = getAirCatalogOfferDimensions(offers[columnCount], currentType, pageUsesBaseTemplate).width;

        if (right + nextWidth > availableWidth) break;

        right += AIR_CATALOG_GRID_HORIZONTAL_SPACING + nextWidth;
        columnCount++;
    }

    return columnCount;
};

/** AIR fills columns round-robin, widens each to its widest child, and stacks with no vertical gap. */
export const layoutAirCatalogOffers = (offers: IPurchasableOffer[], columnCount: number, currentType: string): CatalogAirGridLayout => {
    if (!offers.length || columnCount <= 0) return { entries: [], width: 0, height: 0 };

    const safeColumnCount = Math.min(columnCount, offers.length);
    const pageUsesBaseTemplate = catalogPageUsesAirBaseTemplate(offers, currentType);
    const columnWidths = Array.from({ length: safeColumnCount }, () => 0);

    offers.forEach((offer, index) => {
        const columnIndex = index % safeColumnCount;
        columnWidths[columnIndex] = Math.max(columnWidths[columnIndex], getAirCatalogOfferDimensions(offer, currentType, pageUsesBaseTemplate).width);
    });

    const columnLefts = columnWidths.map((_, index) =>
        columnWidths.slice(0, index).reduce((left, width) => left + width + AIR_CATALOG_GRID_HORIZONTAL_SPACING, 0)
    );
    const columnHeights = Array.from({ length: safeColumnCount }, () => 0);
    const entries = offers.map((offer, index) => {
        const columnIndex = index % safeColumnCount;
        const dimensions = getAirCatalogOfferDimensions(offer, currentType, pageUsesBaseTemplate);
        const entry = {
            offer,
            index,
            x: columnLefts[columnIndex],
            y: columnHeights[columnIndex],
            ...dimensions
        };

        columnHeights[columnIndex] += dimensions.height;

        return entry;
    });

    return {
        entries,
        width: columnWidths.reduce((width, columnWidth) => width + columnWidth, 0) + AIR_CATALOG_GRID_HORIZONTAL_SPACING * (safeColumnCount - 1),
        height: Math.max(...columnHeights)
    };
};

/** Entries whose vertical span intersects the scroll window; everything while the viewport is unmeasured. */
export const getVisibleAirGridEntries = (
    entries: CatalogAirGridEntry[],
    scrollTop: number,
    viewportHeight: number,
    overscan = AIR_GRID_WINDOW_OVERSCAN
): CatalogAirGridEntry[] => {
    if (viewportHeight <= 0) return entries;

    const top = scrollTop - overscan;
    const bottom = scrollTop + viewportHeight + overscan;

    return entries.filter((entry) => entry.y + entry.height >= top && entry.y <= bottom);
};
