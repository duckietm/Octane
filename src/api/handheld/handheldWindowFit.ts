/**
 * Where a window goes on a phone. A window that fits the usable area is shown as a dialog, centred and
 * kept fully on screen; a bigger one becomes a sheet that fills the usable area and scrolls inside.
 */

export interface HandheldArea {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
}

export interface HandheldInsets {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
}

/** `scaled`: a fixed-layout window drawn smaller as a whole (see fitHandheldFrame). */
export type HandheldWindowMode = 'dialog' | 'sheet' | 'scaled';

export interface HandheldWindowPlacement {
    readonly mode: HandheldWindowMode;
    readonly x: number;
    readonly y: number;
}

/** Room left free around a dialog, so its edges are not hidden under rounded screen corners. */
export const HANDHELD_WINDOW_MARGIN = 6;
/** Space kept for the bottom toolbar when a window is placed. */
export const HANDHELD_TOOLBAR_RESERVE = 52;

/** The most a small window is ever enlarged. */
const HANDHELD_MAX_ENLARGE = 2;

const ZERO_INSETS: HandheldInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** The part of the viewport a window may use: inside the safe area, above the toolbar. */
export const handheldUsableArea = (viewportWidth: number, viewportHeight: number, insets: HandheldInsets = ZERO_INSETS, toolbarReserve = HANDHELD_TOOLBAR_RESERVE): HandheldArea => {
    const left = Math.max(0, insets.left);
    const top = Math.max(0, insets.top);
    const width = Math.max(0, viewportWidth - left - Math.max(0, insets.right));
    const height = Math.max(0, viewportHeight - top - Math.max(0, insets.bottom) - Math.max(0, toolbarReserve));

    return { left, top, width, height };
};

/** Keeps a box of the given size fully inside the area; a box bigger than the area sticks to its top-left. */
export const clampIntoArea = (x: number, y: number, width: number, height: number, area: HandheldArea): { x: number; y: number } => {
    const maxX = area.left + Math.max(0, area.width - width);
    const maxY = area.top + Math.max(0, area.height - height);

    return {
        x: Math.round(Math.min(Math.max(x, area.left), maxX)),
        y: Math.round(Math.min(Math.max(y, area.top), maxY))
    };
};

export const placeHandheldWindow = (width: number, height: number, area: HandheldArea, margin = HANDHELD_WINDOW_MARGIN): HandheldWindowPlacement => {
    const fitsWidth = width > 0 && width + margin * 2 <= area.width;
    const fitsHeight = height > 0 && height + margin * 2 <= area.height;

    if (!fitsWidth || !fitsHeight) return { mode: 'sheet', x: area.left, y: area.top };

    const centred = clampIntoArea(area.left + (area.width - width) / 2, area.top + (area.height - height) / 2, width, height, area);

    return { mode: 'dialog', x: centred.x, y: centred.y };
};

const SAFE_PROBE_ID = 'octane-safe-area-probe';

/**
 * The safe-area insets (notch, rounded corners, home indicator) in px. A custom property holding env()
 * is not resolved by getComputedStyle, so a hidden probe element takes them as padding and is measured.
 */
export const readSafeInsets = (doc: Document | null = typeof document !== 'undefined' ? document : null): HandheldInsets => {
    if (!doc?.body || typeof getComputedStyle !== 'function') return ZERO_INSETS;

    let probe = doc.getElementById(SAFE_PROBE_ID);

    if (!probe) {
        probe = doc.createElement('div');
        probe.id = SAFE_PROBE_ID;
        probe.setAttribute('aria-hidden', 'true');
        probe.style.cssText =
            'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
            'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
        doc.body.appendChild(probe);
    }

    const style = getComputedStyle(probe);
    const read = (value: string) => {
        const parsed = parseFloat(value);

        return Number.isFinite(parsed) ? parsed : 0;
    };

    return { top: read(style.paddingTop), right: read(style.paddingRight), bottom: read(style.paddingBottom), left: read(style.paddingLeft) };
};

/**
 * A window with a fixed pixel layout (the reward track, the avatar editor, ...) cannot reflow, so on a phone it
 * is drawn smaller as a whole. It is scaled down until it fits the usable area, but never below `minScale`, so its
 * text and buttons stay usable; what is still bigger than the area is then panned inside it.
 */
export interface HandheldFrameFit {
    readonly scale: number;
    /** The scaled size of the frame. */
    readonly width: number;
    readonly height: number;
    /** The frame is still wider / taller than the area at that scale. */
    readonly panX: boolean;
    readonly panY: boolean;
}

/**
 * `maxScale` above 1 lets a small window grow until it fills the area (at most that much): its pixel text (Volter 9 px, u_small)
 * and buttons are then drawn bigger instead of staying desktop-sized on a phone. A grown scale is rounded down to twentieths, so a
 * small change of the screen does not draw every label of the window again.
 */
export const fitHandheldFrame = (width: number, height: number, area: HandheldArea, minScale: number, margin = HANDHELD_WINDOW_MARGIN, maxScale = 1): HandheldFrameFit => {
    const room = { width: Math.max(1, area.width - margin * 2), height: Math.max(1, area.height - margin * 2) };
    const floor = Math.min(1, Math.max(0.1, minScale || 0));
    const ceiling = Math.min(HANDHELD_MAX_ENLARGE, Math.max(1, Number.isFinite(maxScale) ? maxScale : 1));

    if (width <= 0 || height <= 0) return { scale: 1, width: Math.max(0, width), height: Math.max(0, height), panX: false, panY: false };

    const whole = Math.min(ceiling, room.width / width, room.height / height);
    const scale = whole > 1 ? Math.max(1, Math.floor(whole * 20) / 20) : Math.floor(Math.max(floor, whole) * 1000) / 1000;
    const scaledWidth = Math.round(width * scale);
    const scaledHeight = Math.round(height * scale);

    return { scale, width: scaledWidth, height: scaledHeight, panX: scaledWidth > room.width, panY: scaledHeight > room.height };
};

/**
 * With the on-screen keyboard open over a window that holds the focused field, the window keeps clear of it: a
 * sheet ends at the keyboard's top edge, a dialog moves up until its bottom does (pinned to the area's top when it
 * is taller than the space left). The toolbar is hidden while the keyboard is open, so its reserve is not kept.
 */
export const fitAboveKeyboard = (
    placement: { mode: HandheldWindowMode; x: number; y: number },
    size: { width: number; height: number },
    area: HandheldArea,
    viewportHeight: number,
    keyboardInset: number,
    margin = HANDHELD_WINDOW_MARGIN
): { x: number; y: number; height: number } => {
    if (keyboardInset <= 0) return { x: placement.x, y: placement.y, height: size.height };

    const bottom = Math.max(area.top, viewportHeight - keyboardInset);

    if (placement.mode === 'sheet') return { x: placement.x, y: area.top, height: Math.max(0, Math.min(size.height, bottom - area.top)) };

    const y = Math.max(area.top, Math.min(placement.y, bottom - margin - size.height));

    return { x: placement.x, y: Math.round(y), height: size.height };
};

/** The smallest scale of a large fixed-layout window (the reward and talent tracks): its texts stay readable. */
export const HANDHELD_MIN_FRAME_SCALE = 0.6;
/** The smallest scale of a fixed-layout window whose grids are tapped (avatar editor, achievements). */
export const HANDHELD_TOUCH_FRAME_SCALE = 0.75;
/**
 * The most a small AIR window (a wired box, a furni window, a moderator or group frame) is enlarged on a phone: its 9 px pixel text and
 * 15-20 px buttons reach a size a finger and an eye can use, while a 256 px wired box still fits a 360 px wide screen at 1.35.
 */
export const HANDHELD_ENLARGE_FRAME_SCALE = 1.35;
/** A window that must keep its real pixel size (the camera viewfinder captures what is under it): never scaled, only panned. */
export const HANDHELD_PAN_ONLY_SCALE = 1;
