// The official catalog frame opens at 635px and can be dragged taller, never shorter than the
// point where the page layouts start clipping their purchase widgets.
export const CATALOG_WINDOW_DEFAULT_HEIGHT = 635;
export const CATALOG_WINDOW_MIN_HEIGHT = 570;

/**
 * Keeps a requested window height between the layout minimum and the viewport, so a resize drag
 * can neither squash the page nor push the window's bottom edge off screen.
 */
export const clampCatalogWindowHeight = (height: number, viewportHeight: number): number => {
    if (!Number.isFinite(height)) return CATALOG_WINDOW_DEFAULT_HEIGHT;

    const maxHeight = Number.isFinite(viewportHeight) && viewportHeight > 0 ? Math.max(CATALOG_WINDOW_MIN_HEIGHT, viewportHeight) : Number.POSITIVE_INFINITY;

    return Math.round(Math.min(maxHeight, Math.max(CATALOG_WINDOW_MIN_HEIGHT, height)));
};
