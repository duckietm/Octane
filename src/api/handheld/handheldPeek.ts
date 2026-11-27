/**
 * A window that works on the room (a wired box picking furni, the area hider choosing tiles, the dimmer tinting the room) covers
 * most of a phone screen. It can be put aside: the window is hidden but stays mounted with all its state, a small bar at the top of
 * the screen names it and brings it back. The feature can also hide it itself while the room has to take the fingers (an area being
 * dragged out), and the bar then offers to end that.
 */
export interface HandheldPeekOptions {
    /** The window's name on the bar. */
    readonly label: string;
    /** A second line on the bar while the window is hidden: what to do in the room, or how many items are picked. */
    readonly hint?: string;
    /** The feature hides the window itself (the room is being used for it); the user cannot bring it back by hand. */
    readonly forced?: boolean;
    /** The bar's button while the feature hides the window (end the area selection, say). */
    readonly onReturn?: () => void;
}

export interface HandheldPeekState {
    /** The window is hidden and the bar is shown. */
    readonly hidden: boolean;
    /** The window shows its "show the room" button. */
    readonly canHide: boolean;
    /** What the bar's button does: bring the window back, or end what the feature hid it for. */
    readonly barAction: 'show' | 'return' | null;
}

const NOTHING: HandheldPeekState = Object.freeze({ hidden: false, canHide: false, barAction: null });

export const resolveHandheldPeek = (phone: boolean, options: HandheldPeekOptions | null | undefined, hiddenByUser: boolean): HandheldPeekState => {
    if (!phone || !options) return NOTHING;

    if (options.forced) return { hidden: true, canHide: false, barAction: options.onReturn ? 'return' : null };

    return hiddenByUser ? { hidden: true, canHide: false, barAction: 'show' } : { hidden: false, canHide: true, barAction: null };
};
