export const CATALOG_GRID_VIRTUALIZATION_THRESHOLD = 90;

/** Admin mode no longer opts out: the reorder handlers carry the offer index, not a DOM position. */
export const shouldVirtualizeCatalogOffers = (offerCount: number, _adminMode: boolean): boolean =>
    offerCount > CATALOG_GRID_VIRTUALIZATION_THRESHOLD;
