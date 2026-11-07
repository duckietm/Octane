import { createContext, FC, ReactNode, RefObject, useContext, useMemo } from 'react';

/**
 * The CSS transform scale of a stage and the element it is set on. A view that zooms a whole stage with `transform: scale()` (the
 * hotel view fits its 1172 x 822 scene to the window) tells its labels the factor, so they are drawn at the size they appear and every
 * raster pixel stays one screen pixel; drawn at 1x the zoom would stretch the raster and soften every letter.
 *
 * React context also reaches through portals, but a dropdown list, tooltip or popover rendered in a portal is not inside the zoomed
 * element and is shown at 1x: a label uses the scale only when its own element is inside `stage`.
 */
export interface NativeTextTransform {
    scale: number;
    stage: RefObject<HTMLElement | null> | null;
}

const NONE: NativeTextTransform = { scale: 1, stage: null };

const NativeTextTransformContext = createContext<NativeTextTransform>(NONE);

/** The transform of the labels around this point: the product of every NativeTextTransformScale above it, and the outermost stage. */
export const useNativeTextTransform = (): NativeTextTransform => useContext(NativeTextTransformContext);

/** The scale a nested transform adds up to, rounded to hundredths so a resize does not give every label a new raster for nothing. */
export const combineNativeTextTransformScale = (parent: number, scale: number): number =>
    Number.isFinite(scale) && scale > 0 ? Math.round(parent * scale * 100) / 100 || parent : parent;

/** The scale a label at `element` is shown at: the transform's scale inside its stage, 1 anywhere else (a portal). */
export const nativeTextTransformScaleAt = (transform: NativeTextTransform, element: Element | null): number => {
    const stage = transform.stage?.current;

    return transform.scale !== 1 && !!stage && !!element && stage.contains(element) ? transform.scale : 1;
};

/**
 * The zoom an element is really shown at: its on-screen width over its CSS width, in hundredths, or null when it has no width to measure
 * (not laid out yet, or empty). Read when a label inside a zoomed stage is drawn, so the raster matches what is on screen whatever the
 * label sits in (the stage itself, a nested counter-zoom, or a dropdown list or tooltip in a portal, shown at 1x).
 */
export const measureNativeTextTransformScale = (element: Element | null): number | null => {
    if (!element?.isConnected) return null;

    const shown = element.getBoundingClientRect().width;
    const laidOut = parseFloat(getComputedStyle(element).width);

    if (!(shown > 0) || !(laidOut > 0)) return null;

    return Math.round((shown / laidOut) * 100) / 100;
};

/**
 * Labels inside are drawn for a stage shown at `scale` (multiplied with any scale around it). `stage` is the element the transform is
 * set on; a nested scale may leave it out and keeps the stage around it.
 */
export const NativeTextTransformScale: FC<{ scale: number; stage?: RefObject<HTMLElement | null>; children: ReactNode }> = ({ scale, stage, children }) => {
    const parent = useNativeTextTransform();
    const combined = combineNativeTextTransformScale(parent.scale, scale);
    const outer = parent.stage ?? stage ?? null;
    const value = useMemo(() => ({ scale: combined, stage: outer }), [combined, outer]);

    return <NativeTextTransformContext.Provider value={value}>{children}</NativeTextTransformContext.Provider>;
};
