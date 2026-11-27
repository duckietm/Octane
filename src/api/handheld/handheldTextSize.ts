/**
 * Volter, AIR's pixel face, is set at 9 px (8 px at times) all over the client: readable with a mouse at arm's length, too small in a
 * hand. On a phone a Volter label in a window that reflows is drawn at the size the client already uses for it on a 125 % display
 * (9 px as 11 px): its pixel letters stay sharp, and the box around it grows with it. Labels in a fixed-layout frame (drawn smaller
 * or bigger as a whole) keep their size, since their coordinates cannot move; the frame's own scale enlarges them there.
 */

/** The phone size of a label in this face and size, or null when it stays as it is (not Volter, or already large enough). */
export const handheldVolterSize = (fontFamily: string, fontSize: number): number | null => {
    const family = (fontFamily ?? '')
        .split(',')[0]
        .trim()
        .replace(/^["']|["']$/g, '');

    if (!/^volter/i.test(family) || !Number.isFinite(fontSize) || fontSize <= 0 || fontSize > 9) return null;

    return Math.round((fontSize * 11) / 9);
};

/**
 * Frames whose content is laid out at fixed coordinates: their labels are never enlarged on their own. The windows mark themselves
 * from their first render (DraggableWindow / AirModalDialog `data-handheld-fixed`), before their labels are measured.
 */
export const HANDHELD_FIXED_FRAME_SELECTOR = "[data-handheld-fixed], [data-handheld-window='scaled'], [data-handheld-scaled], .octane-right-side";
