/**
 * Handheld mode: the phone layout of the client. It is decided from plain numbers so the rule can be
 * tested without a browser; `handheldWatcher.ts` feeds it from the window and applies the result.
 */

export type HandheldOrientation = 'portrait' | 'landscape';

export interface HandheldLayout {
    /** True when the phone layout is in use. Everything handheld-only is guarded by this. */
    readonly active: boolean;
    readonly orientation: HandheldOrientation;
}

/** What the browser reports, reduced to what the rule needs. */
export interface HandheldEnvironment {
    readonly width: number;
    readonly height: number;
    /** `(pointer: coarse)`: the primary pointer is a finger. */
    readonly coarsePointer: boolean;
    /** `(any-pointer: fine)`: a mouse or trackpad is attached as well. */
    readonly finePointerAttached: boolean;
    /** The `ui.handheld.enabled` configuration key. */
    readonly enabled: boolean;
    /** A forced choice (`?handheld=on|off`, remembered per browser), or null for automatic. */
    readonly forced: HandheldForce;
}

export type HandheldForce = 'on' | 'off' | null;

/** Phones stay below this on their short edge (CSS px); small tablets start around 600. */
export const HANDHELD_MAX_SHORT_EDGE = 540;
/** And below this on the long edge, so a wide touch laptop with a short window is not taken for a phone. */
export const HANDHELD_MAX_LONG_EDGE = 1000;

export const DESKTOP_LAYOUT: HandheldLayout = Object.freeze({ active: false, orientation: 'landscape' });

export const orientationOf = (width: number, height: number): HandheldOrientation => (height > width ? 'portrait' : 'landscape');

/**
 * The phone layout is used when it is enabled, the primary pointer is a finger, no mouse is attached and
 * the screen is phone sized in either orientation. A forced choice wins over the measurement, but the
 * configuration key still switches the mode off for the whole hotel.
 */
export const resolveHandheldLayout = (environment: HandheldEnvironment): HandheldLayout => {
    const width = Math.max(0, environment.width || 0);
    const height = Math.max(0, environment.height || 0);
    const orientation = orientationOf(width, height);

    if (!environment.enabled || environment.forced === 'off') return { active: false, orientation };
    if (environment.forced === 'on') return { active: true, orientation };

    const shortEdge = Math.min(width, height);
    const longEdge = Math.max(width, height);
    const phoneSized = shortEdge > 0 && shortEdge <= HANDHELD_MAX_SHORT_EDGE && longEdge <= HANDHELD_MAX_LONG_EDGE;

    return { active: environment.coarsePointer && !environment.finePointerAttached && phoneSized, orientation };
};

export const sameHandheldLayout = (a: HandheldLayout, b: HandheldLayout): boolean => a.active === b.active && a.orientation === b.orientation;

/** Reads `on` / `off` / `auto` (anything else is ignored). `auto` clears a remembered choice. */
export const parseHandheldForce = (value: string | null | undefined): HandheldForce | 'auto' | undefined => {
    switch ((value ?? '').trim().toLowerCase()) {
        case 'on':
        case '1':
        case 'true':
            return 'on';
        case 'off':
        case '0':
        case 'false':
            return 'off';
        case 'auto':
            return 'auto';
        default:
            return undefined;
    }
};

/** Smaller than this, a shrunk visual viewport is browser chrome moving, not an on-screen keyboard. */
export const KEYBOARD_MIN_INSET = 120;

export interface KeyboardMeasure {
    readonly layoutHeight: number;
    readonly visualHeight: number;
    readonly visualOffsetTop: number;
    readonly textFieldFocused: boolean;
}

/** How many CSS px of the layout viewport's bottom the on-screen keyboard covers (0 when it is closed). */
export const resolveKeyboardInset = ({ layoutHeight, visualHeight, visualOffsetTop, textFieldFocused }: KeyboardMeasure): number => {
    if (!textFieldFocused) return 0;

    const covered = Math.round(layoutHeight - visualHeight - Math.max(0, visualOffsetTop));

    return covered >= KEYBOARD_MIN_INSET ? covered : 0;
};
