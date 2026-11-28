/**
 * A window drawn smaller or bigger as a whole on a phone (CSS zoom) still lays its content out in its own pixels, while pointer
 * positions and getBoundingClientRect are in screen pixels. Code that turns a finger position into a slider value or a grid cell in
 * the element's own pixels divides by the zoom the element is shown at; on desktop that is 1 and nothing changes.
 */

/** The zoom an element is shown at: its on-screen width over its layout width, 1 when it cannot be measured. */
export const shownZoomOf = (element: HTMLElement | null): number => {
    if (!element) return 1;

    const shown = element.getBoundingClientRect().width;
    const laidOut = element.offsetWidth;

    if (!(shown > 0) || !(laidOut > 0)) return 1;

    const zoom = shown / laidOut;

    // Rounding of sub-pixel boxes: a few hundredths off 1 is no zoom.
    return Math.abs(zoom - 1) < 0.01 ? 1 : zoom;
};

/** Screen pixels from the element's left / top edge, in the element's own layout pixels. */
export const toLayoutOffset = (screenOffset: number, zoom: number): number => (Number.isFinite(zoom) && zoom > 0 ? screenOffset / zoom : screenOffset);

/** A pointer's position inside an element, in the element's own layout pixels. */
export const pointerInElement = (clientX: number, clientY: number, element: HTMLElement): { x: number; y: number } => {
    const rect = element.getBoundingClientRect();
    const zoom = shownZoomOf(element);

    return { x: toLayoutOffset(clientX - rect.left, zoom), y: toLayoutOffset(clientY - rect.top, zoom) };
};
