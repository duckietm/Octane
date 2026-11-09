/** The link a click landed on: the anchor itself, or the one around the bold text or image that was hit. */
export const getClickedAnchor = (target: EventTarget | null): HTMLAnchorElement | null => (target instanceof Element ? target.closest('a') : null);
