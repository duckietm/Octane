/**
 * Two fingers on the floor plan: spreading them zooms, moving them pans. The plan point that was under the fingers' midpoint when
 * they landed stays under the midpoint as it moves, at whatever zoom the spread gives. Pure: the canvas hands in the points, the view
 * size and the zoom, and gets the new zoom and the plan point to centre the view on.
 */

export interface PinchPoint {
    readonly x: number;
    readonly y: number;
}

export interface PinchAnchor {
    /** Finger distance and zoom when the pinch started. */
    readonly distance: number;
    readonly zoom: number;
    /** The plan point (SVG units) under the midpoint when it started. */
    readonly planX: number;
    readonly planY: number;
}

export interface PlanView {
    /** The plan's left / top edge in SVG units (the viewBox origin). */
    readonly viewX: number;
    readonly viewY: number;
    /** Screen pixels per SVG unit. */
    readonly scale: number;
    /** The view's size in screen pixels. */
    readonly width: number;
    readonly height: number;
    /** Seen from the other side: the drawing is mirrored left to right. */
    readonly flipped: boolean;
}

export const pinchDistance = (a: PinchPoint, b: PinchPoint): number => Math.hypot(a.x - b.x, a.y - b.y);

export const pinchMidpoint = (a: PinchPoint, b: PinchPoint): PinchPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** The plan point under a point of the view (in view pixels from its top-left corner). */
export const planPointAt = (local: PinchPoint, view: PlanView): PinchPoint => {
    const x = view.flipped ? view.width - local.x : local.x;

    return { x: view.viewX + x / view.scale, y: view.viewY + local.y / view.scale };
};

export const startPinch = (a: PinchPoint, b: PinchPoint, zoom: number, view: PlanView): PinchAnchor => {
    const plan = planPointAt(pinchMidpoint(a, b), view);

    return { distance: Math.max(1, pinchDistance(a, b)), zoom, planX: plan.x, planY: plan.y };
};

/**
 * Where the pinch is now: the zoom (clamped by the caller's bounds) and the plan point to put in the middle of the view, so the
 * anchored plan point sits under the current midpoint. `scaleAt` turns a zoom into screen pixels per SVG unit.
 */
export const movePinch = (
    anchor: PinchAnchor,
    a: PinchPoint,
    b: PinchPoint,
    view: Pick<PlanView, 'width' | 'height' | 'flipped'>,
    bounds: { min: number; max: number },
    scaleAt: (zoom: number) => number
): { zoom: number; centerX: number; centerY: number } => {
    const ratio = pinchDistance(a, b) / anchor.distance;
    const zoom = Math.max(bounds.min, Math.min(bounds.max, anchor.zoom * (Number.isFinite(ratio) && ratio > 0 ? ratio : 1)));
    const scale = scaleAt(zoom);
    const mid = pinchMidpoint(a, b);
    const midX = view.flipped ? view.width - mid.x : mid.x;

    return {
        zoom,
        centerX: anchor.planX - midX / scale + view.width / scale / 2,
        centerY: anchor.planY - mid.y / scale + view.height / scale / 2
    };
};

/** A finger that strays further than this (px) is drawing, not about to be joined by a second one. */
export const TOUCH_DRAW_SLOP = 6;
/** How long a lone finger waits for a second one before it starts to draw (ms). */
export const TOUCH_DRAW_DELAY_MS = 90;
