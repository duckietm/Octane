/**
 * Turns the fingers on the room canvas into a short list of intents. It knows nothing about the room
 * engine or the DOM: the caller hands in touch points and the time, and maps the intents to mouse
 * events (see `DispatchHandheldTouchEvent`). That keeps every rule here testable.
 *
 *  - one finger down            -> press
 *  - it moves past the slop     -> drag (the room pans, or the item being placed follows)
 *  - it lifts without moving    -> release + tap (a second tap close by in time and space: double)
 *  - it lifts after a drag      -> release only, so a pan never walks or clicks
 *  - it stays still long enough -> hold (the caller opens the info / actions of what is under it)
 *  - a second finger arrives    -> the open press is released and a pinch starts
 *  - the pinch spreads / closes -> zoom steps, one per ratio step, several per gesture allowed
 */

export interface TouchPoint {
    readonly id: number;
    readonly x: number;
    readonly y: number;
}

export type RoomGestureIntent =
    | { readonly type: 'press'; readonly x: number; readonly y: number }
    | { readonly type: 'drag'; readonly x: number; readonly y: number }
    | { readonly type: 'release'; readonly x: number; readonly y: number; readonly moved: boolean }
    | { readonly type: 'tap'; readonly x: number; readonly y: number; readonly double: boolean }
    | { readonly type: 'hold'; readonly x: number; readonly y: number }
    | { readonly type: 'zoom'; readonly direction: 1 | -1; readonly x: number; readonly y: number };

export interface RoomTouchGestureOptions {
    /** A finger that strays further than this (CSS px) is dragging, not tapping. */
    readonly slop: number;
    /** A still finger turns into a hold after this many ms. */
    readonly holdMs: number;
    /** Two taps at most this far apart in time make a double tap. */
    readonly doubleTapMs: number;
    /** ... and at most this far apart on screen. */
    readonly doubleTapDistance: number;
    /** The finger distance must grow (or shrink) by this factor for one zoom step. */
    readonly zoomStepRatio: number;
}

export const ROOM_TOUCH_DEFAULTS: RoomTouchGestureOptions = Object.freeze({
    slop: 10,
    holdMs: 550,
    doubleTapMs: 320,
    doubleTapDistance: 28,
    zoomStepRatio: 1.35
});

type Phase = 'idle' | 'pressed' | 'dragging' | 'held' | 'pinching';

const NONE: readonly RoomGestureIntent[] = Object.freeze([]);

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

const midpoint = (a: TouchPoint, b: TouchPoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export class RoomTouchGesture {
    private readonly options: RoomTouchGestureOptions;
    private phase: Phase = 'idle';
    private pressOpen = false;
    private origin = { x: 0, y: 0 };
    private last = { x: 0, y: 0 };
    private holdDeadline: number | null = null;
    private pinchBase = 0;
    private previousTap: { x: number; y: number; at: number } | null = null;

    constructor(options: Partial<RoomTouchGestureOptions> = {}) {
        this.options = { ...ROOM_TOUCH_DEFAULTS, ...options };
    }

    /** When `pollHold` should be called next, or null when no hold can happen. */
    public get holdAt(): number | null {
        return this.holdDeadline;
    }

    /** The last point the single finger touched; the item being placed follows it. */
    public get lastPoint(): { x: number; y: number } {
        return { ...this.last };
    }

    public get isPinching(): boolean {
        return this.phase === 'pinching';
    }

    /** One or more fingers went down; `touches` holds every finger now on the canvas. */
    public begin(touches: readonly TouchPoint[], now: number): readonly RoomGestureIntent[] {
        if (!touches.length) return NONE;

        if (touches.length >= 2) return this.startPinch(touches);

        // The rest of a pinch: a finger put back down does not press until all were lifted.
        if (this.phase === 'pinching') return NONE;

        const [touch] = touches;

        this.phase = 'pressed';
        this.pressOpen = true;
        this.origin = { x: touch.x, y: touch.y };
        this.last = { x: touch.x, y: touch.y };
        this.holdDeadline = now + this.options.holdMs;

        return [{ type: 'press', x: touch.x, y: touch.y }];
    }

    public move(touches: readonly TouchPoint[], _now: number): readonly RoomGestureIntent[] {
        if (!touches.length) return NONE;

        if (this.phase === 'pinching') return touches.length >= 2 ? this.stepPinch(touches) : NONE;

        if (this.phase === 'idle' || this.phase === 'held') return NONE;

        const [touch] = touches;

        if (this.phase === 'pressed') {
            if (distance(touch, this.origin) <= this.options.slop) return NONE;

            this.phase = 'dragging';
            this.holdDeadline = null;
        }

        this.last = { x: touch.x, y: touch.y };

        return [{ type: 'drag', x: touch.x, y: touch.y }];
    }

    /** Fingers were lifted; `remaining` holds the fingers still down, `lifted` one that went up. */
    public finish(remaining: readonly TouchPoint[], lifted: TouchPoint | null, now: number): readonly RoomGestureIntent[] {
        if (this.phase === 'pinching') {
            if (!remaining.length) this.reset();

            return NONE;
        }

        if (this.phase === 'idle') return NONE;

        const point = lifted ? { x: lifted.x, y: lifted.y } : this.last;
        const phase = this.phase;

        this.reset();

        if (phase !== 'pressed') {
            this.previousTap = null;

            return [{ type: 'release', x: point.x, y: point.y, moved: phase === 'dragging' }];
        }

        const previous = this.previousTap;
        const double = !!previous && now - previous.at <= this.options.doubleTapMs && distance(previous, point) <= this.options.doubleTapDistance;

        this.previousTap = double ? null : { x: point.x, y: point.y, at: now };

        return [
            { type: 'release', x: point.x, y: point.y, moved: false },
            { type: 'tap', x: point.x, y: point.y, double }
        ];
    }

    /** The browser took the touch away (a system gesture, an alert). Nothing taps. */
    public cancel(): readonly RoomGestureIntent[] {
        const open = this.pressOpen;
        const point = this.last;

        this.reset();
        this.previousTap = null;

        return open ? [{ type: 'release', x: point.x, y: point.y, moved: true }] : NONE;
    }

    /** Called when the hold deadline passed: a finger that is still pressed and still turns into a hold. */
    public pollHold(now: number): readonly RoomGestureIntent[] {
        if (this.phase !== 'pressed' || this.holdDeadline === null || now < this.holdDeadline) return NONE;

        this.phase = 'held';
        this.holdDeadline = null;

        return [{ type: 'hold', x: this.origin.x, y: this.origin.y }];
    }

    private startPinch(touches: readonly TouchPoint[]): readonly RoomGestureIntent[] {
        const intents: RoomGestureIntent[] = [];

        if (this.pressOpen) intents.push({ type: 'release', x: this.last.x, y: this.last.y, moved: true });

        this.phase = 'pinching';
        this.pressOpen = false;
        this.holdDeadline = null;
        this.previousTap = null;
        this.pinchBase = Math.max(1, distance(touches[0], touches[1]));

        return intents;
    }

    private stepPinch(touches: readonly TouchPoint[]): readonly RoomGestureIntent[] {
        const spread = Math.max(1, distance(touches[0], touches[1]));
        const ratio = spread / this.pinchBase;
        const centre = midpoint(touches[0], touches[1]);

        if (ratio >= this.options.zoomStepRatio) {
            this.pinchBase = spread;

            return [{ type: 'zoom', direction: 1, x: centre.x, y: centre.y }];
        }

        if (ratio <= 1 / this.options.zoomStepRatio) {
            this.pinchBase = spread;

            return [{ type: 'zoom', direction: -1, x: centre.x, y: centre.y }];
        }

        return NONE;
    }

    private reset(): void {
        this.phase = 'idle';
        this.pressOpen = false;
        this.holdDeadline = null;
        this.pinchBase = 0;
    }
}

/** Reads a TouchList (or any list of touches) into plain points. */
export const toTouchPoints = (list: ArrayLike<{ identifier: number; clientX: number; clientY: number }> | null | undefined): TouchPoint[] => {
    const points: TouchPoint[] = [];

    if (!list) return points;

    for (let index = 0; index < list.length; index++) {
        const touch = list[index];

        if (touch) points.push({ id: touch.identifier, x: touch.clientX, y: touch.clientY });
    }

    return points;
};

/** Picks the smallest of the boxes that contain the point: the object a finger most likely meant. */
export const pickSmallestContaining = <T extends { readonly bounds: { x: number; y: number; width: number; height: number } | null }>(
    candidates: readonly T[],
    x: number,
    y: number
): T | null => {
    let best: T | null = null;
    let bestArea = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
        const box = candidate.bounds;

        if (!box || box.width <= 0 || box.height <= 0) continue;
        if (x < box.x || y < box.y || x > box.x + box.width || y > box.y + box.height) continue;

        const area = box.width * box.height;

        if (area < bestArea) {
            best = candidate;
            bestArea = area;
        }
    }

    return best;
};
