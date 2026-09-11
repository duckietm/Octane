import type { IRoomRenderingCanvas } from '@octane/renderer';
import { GetRoomEngine, RoomGeometry } from '@octane/renderer';
import { GetConfigurationValue } from '../../../../api';

// The flip state and the preview rotation arrive with the renderer change that goes with this
// one (Octane-Renderer, room flip); until it is published the published engine lacks them, so
// they are read through this optional shape and answer "not flipped" / "nothing to rotate".
interface FlipAwareRoomEngine {
    getRoomInstanceRenderingCanvasIsFlipped(roomId: number, canvasId: number): boolean;
    rotateActiveObjectPreview(positive: boolean): boolean;
}

const flipAwareEngine = (): Partial<FlipAwareRoomEngine> => GetRoomEngine() as unknown as Partial<FlipAwareRoomEngine>;

// The single zoom model for the room canvas, ported from the official
// RoomDesktop: one scale table, discrete stepping, and a log2-space tween.
export const ROOM_ZOOM_SCALES = [0.5, 1, 2, 4, 8, 16] as const;
export const ROOM_ZOOM_CANVAS_ID = 1;
export const ROOM_ZOOM_EPSILON = 0.001;

// Official ROOM_ZOOM_SCROLL_COOLDOWN_MS: small wheel deltas (trackpads) are
// rate limited, a full mouse notch bypasses the cooldown.
export const ROOM_ZOOM_WHEEL_COOLDOWN_MS = 400;
const ROOM_ZOOM_WHEEL_BYPASS_LINES = 2;
// Browsers report roughly 100 px or 3 lines per mouse notch.
const WHEEL_PIXELS_PER_LINE = 100 / 3;
const WHEEL_LINES_PER_PAGE = 3;

// The official tween moves 0.14 log2 units per 60 Hz frame and snaps to the
// target once it is within 0.01 log2 units.
const ZOOM_ANIMATION_FRAME_MS = 1000 / 60;
const ZOOM_ANIMATION_MAX_FRAME_MS = 50;
const ZOOM_ANIMATION_STEP_PER_FRAME = 0.14;
const ZOOM_ANIMATION_DONE_EPSILON = 0.01;

export type RoomZoomAnchor = { x: number; y: number };

const MIN_ZOOM_SCALE = ROOM_ZOOM_SCALES[0];
const MAX_ZOOM_SCALE = ROOM_ZOOM_SCALES[ROOM_ZOOM_SCALES.length - 1];

export const clampRoomZoomScale = (scale: number): number => Math.max(MIN_ZOOM_SCALE, Math.min(MAX_ZOOM_SCALE, scale));

export const getNearestRoomZoomScale = (scale: number): number => {
    if (!Number.isFinite(scale)) return 1;

    let nearest: number = MIN_ZOOM_SCALE;
    let distance = Math.abs(scale - nearest);

    for (const candidate of ROOM_ZOOM_SCALES) {
        const candidateDistance = Math.abs(scale - candidate);

        if (candidateDistance < distance) {
            nearest = candidate;
            distance = candidateDistance;
        }
    }

    return nearest;
};

// Official getNextZoomScale: the next table entry strictly above or below
// the current scale, or the current scale at either end of the table.
export const getNextRoomZoomScale = (scale: number, direction: number): number => {
    if (!Number.isFinite(scale) || direction === 0) return scale;

    if (direction > 0) {
        if (scale >= MAX_ZOOM_SCALE - ROOM_ZOOM_EPSILON) return scale;

        return ROOM_ZOOM_SCALES.find((candidate) => candidate > scale + ROOM_ZOOM_EPSILON) ?? MAX_ZOOM_SCALE;
    }

    if (scale <= MIN_ZOOM_SCALE + ROOM_ZOOM_EPSILON) return scale;

    for (let index = ROOM_ZOOM_SCALES.length - 1; index >= 0; index--) {
        if (ROOM_ZOOM_SCALES[index] < scale - ROOM_ZOOM_EPSILON) return ROOM_ZOOM_SCALES[index];
    }

    return MIN_ZOOM_SCALE;
};

export const getRoomZoomLevel = (scale: number): number => {
    const nearest = getNearestRoomZoomScale(scale);

    return ROOM_ZOOM_SCALES.findIndex((candidate) => candidate === nearest);
};

export const getRoomZoomScale = (level: number): number => ROOM_ZOOM_SCALES[Math.max(0, Math.min(ROOM_ZOOM_SCALES.length - 1, Math.round(level)))];

export const stepRoomZoom = (currentScale: number, direction: -1 | 1): number => getNextRoomZoomScale(getNearestRoomZoomScale(currentScale), direction);

// Chat `:zoom N` levels map like the official RoomUI: 0 is half size and
// levels above 5 all reach the 16x cap.
export const roomZoomLevelToScale = (level: number): number => {
    if (!Number.isFinite(level)) return 1;

    const flooredLevel = Math.floor(level);

    if (flooredLevel < 1) return 0.5;

    return 1 << (Math.min(5, flooredLevel) - 1);
};

export const roomZoomScaleToLog2 = (scale: number): number => Math.log2(scale);

export const log2ToRoomZoomScale = (level: number): number => 2 ** level;

export const getRoomZoomAnimationStep = (fromLevel: number, toLevel: number, frameMs: number): number => {
    const distance = Math.abs(toLevel - fromLevel);
    const clampedFrameMs = frameMs > 0 ? Math.min(frameMs, ZOOM_ANIMATION_MAX_FRAME_MS) : ZOOM_ANIMATION_FRAME_MS;

    return Math.min(distance, (ZOOM_ANIMATION_STEP_PER_FRAME * clampedFrameMs) / ZOOM_ANIMATION_FRAME_MS);
};

// One tween frame in log2 space; returns the exact target once close enough
// so the last frame lands on a table entry instead of a rounding remainder.
export const interpolateRoomZoomScale = (currentScale: number, targetScale: number, frameMs: number): number => {
    const currentLevel = roomZoomScaleToLog2(currentScale);
    const targetLevel = roomZoomScaleToLog2(targetScale);
    const delta = targetLevel - currentLevel;

    if (Math.abs(delta) <= ZOOM_ANIMATION_DONE_EPSILON) return targetScale;

    const step = getRoomZoomAnimationStep(currentLevel, targetLevel, frameMs);

    return log2ToRoomZoomScale(currentLevel + (delta < 0 ? -Math.min(step, -delta) : Math.min(step, delta)));
};

export const getWheelLineDelta = (deltaY: number, deltaMode: number): number => {
    switch (deltaMode) {
        case 1:
            return deltaY;
        case 2:
            return deltaY * WHEEL_LINES_PER_PAGE;
        default:
            return deltaY / WHEEL_PIXELS_PER_LINE;
    }
};

export const shouldProcessRoomZoomWheel = (deltaY: number, deltaMode: number, now: number, lastZoomAt: number): boolean => {
    if (Math.abs(getWheelLineDelta(deltaY, deltaMode)) >= ROOM_ZOOM_WHEEL_BYPASS_LINES) return true;

    return lastZoomAt <= 0 || now - lastZoomAt > ROOM_ZOOM_WHEEL_COOLDOWN_MS;
};

const isRoomZoomEnabled = (): boolean => GetConfigurationValue<boolean>('room.zoom.enabled', true) !== false;

// Below 1x the room geometry drops to its size-32 assets so zoomed-out furni
// stay crisp; the canvas then shows that half-size geometry at twice the scale.
const GEOMETRY_ZOOM_RATIO = RoomGeometry.SCALE_ZOOMED_IN / RoomGeometry.SCALE_ZOOMED_OUT;

const wantsZoomedOutGeometry = (logicalScale: number): boolean => logicalScale < 1 - ROOM_ZOOM_EPSILON;

// The logical scale is what the user sees: the canvas scale corrected for
// the geometry currently in use.
export const getLogicalRoomZoomScale = (roomId: number): number => {
    const roomEngine = GetRoomEngine();
    const displayScale = roomEngine.getRoomInstanceRenderingCanvasScale(roomId, ROOM_ZOOM_CANVAS_ID);
    const geometry = roomEngine.getRoomInstanceGeometry(roomId, ROOM_ZOOM_CANVAS_ID);
    const geometryScale = geometry?.scale ?? RoomGeometry.SCALE_ZOOMED_IN;

    return displayScale * (geometryScale / RoomGeometry.SCALE_ZOOMED_IN);
};

// Official CameraWidget and RoomThumbnailCameraWidget rule: photos are only
// blocked below normal zoom or while the room is flipped.
export const isRoomZoomPhotoReady = (roomId: number): boolean => {
    const roomEngine = GetRoomEngine();

    if (getLogicalRoomZoomScale(roomId) < 1 - ROOM_ZOOM_EPSILON) return false;

    return !(flipAwareEngine().getRoomInstanceRenderingCanvasIsFlipped?.(roomId, ROOM_ZOOM_CANVAS_ID) ?? false);
};

// Screen position of the room's own origin: a geometry switch scales the
// content around it, so anchoring the canvas there keeps the switch invisible.
const getRoomCanvasOrigin = (canvas: IRoomRenderingCanvas): RoomZoomAnchor | null => {
    if (!canvas) return null;

    const sign = (canvas as IRoomRenderingCanvas & { isFlipped?: boolean }).isFlipped ? -1 : 1;

    return { x: canvas.screenOffsetX + (sign * canvas.width) / 2, y: canvas.screenOffsetY + (sign * canvas.height) / 2 };
};

// The published engine types the anchor as a pixi Point while only reading x and y; the renderer
// change that goes with this one widens it to a plain point, so the cast goes away with it.
type CanvasScaleAnchor = Parameters<ReturnType<typeof GetRoomEngine>['setRoomInstanceRenderingCanvasScale']>[3];

const setCanvasScale = (roomId: number, displayScale: number, anchor: RoomZoomAnchor | null, isAnimated: boolean): void => {
    GetRoomEngine().setRoomInstanceRenderingCanvasScale(roomId, ROOM_ZOOM_CANVAS_ID, displayScale, anchor as unknown as CanvasScaleAnchor, null, false, isAnimated);
};

// Switches the geometry for the requested logical scale and returns the
// display scale that shows it; the switch itself does not move the room.
const syncGeometry = (roomId: number, logicalScale: number): number => {
    const roomEngine = GetRoomEngine();
    const geometry = roomEngine.getRoomInstanceGeometry(roomId, ROOM_ZOOM_CANVAS_ID);
    const zoomOut = wantsZoomedOutGeometry(logicalScale);

    if (geometry && geometry.isZoomedIn() === zoomOut) {
        const canvas = roomEngine.getRoomInstanceRenderingCanvas(roomId, ROOM_ZOOM_CANVAS_ID);
        const currentLogicalScale = getLogicalRoomZoomScale(roomId);

        if (zoomOut) geometry.performZoomOut();
        else geometry.performZoomIn();

        setCanvasScale(roomId, zoomOut ? currentLogicalScale * GEOMETRY_ZOOM_RATIO : currentLogicalScale, getRoomCanvasOrigin(canvas), true);
    }

    return zoomOut ? logicalScale * GEOMETRY_ZOOM_RATIO : logicalScale;
};

export const applyRoomZoom = (roomId: number, logicalScale: number, isFlipForced: boolean = false): void => {
    if (isFlipForced) {
        GetRoomEngine().setRoomInstanceRenderingCanvasScale(roomId, ROOM_ZOOM_CANVAS_ID, logicalScale, null, null, true);
        return;
    }

    cancelRoomZoomAnimation();

    setCanvasScale(roomId, syncGeometry(roomId, logicalScale), null, false);
};

type RoomZoomAnimation = {
    roomId: number;
    targetScale: number;
    anchor: RoomZoomAnchor | null;
    frameId: number;
    lastFrameTime: number;
};

let activeAnimation: RoomZoomAnimation | null = null;

export const isRoomZoomAnimating = (): boolean => activeAnimation !== null;

export const getRoomZoomAnimationTarget = (): number | null => activeAnimation?.targetScale ?? null;

export const cancelRoomZoomAnimation = (): void => {
    if (!activeAnimation) return;

    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(activeAnimation.frameId);

    activeAnimation = null;
};

const runRoomZoomAnimationFrame = (frameTime: number): void => {
    const animation = activeAnimation;

    if (!animation) return;

    const frameMs = animation.lastFrameTime > 0 ? frameTime - animation.lastFrameTime : ZOOM_ANIMATION_FRAME_MS;

    animation.lastFrameTime = frameTime;

    // The geometry stays zoomed in while tweening so the canvas scale is the
    // logical scale; the final frame restores the crisp zoomed-out geometry.
    const currentScale = getLogicalRoomZoomScale(animation.roomId);
    const nextScale = interpolateRoomZoomScale(currentScale, animation.targetScale, frameMs);

    if (nextScale === animation.targetScale) {
        activeAnimation = null;
        setCanvasScale(animation.roomId, syncGeometry(animation.roomId, nextScale), animation.anchor, true);
        return;
    }

    setCanvasScale(animation.roomId, nextScale, animation.anchor, true);

    // A canvas that ignores the frame (no room yet, zoom disabled) would never
    // converge, so a stalled tween ends instead of spinning forever.
    if (getLogicalRoomZoomScale(animation.roomId) === currentScale) {
        activeAnimation = null;
        return;
    }

    animation.frameId = requestAnimationFrame(runRoomZoomAnimationFrame);
};

// Official animateRoomCanvasScale: retargeting a running tween keeps it going
// from wherever it is; the anchor is the screen point that must stay fixed.
export const animateRoomZoom = (roomId: number, targetScale: number, anchor: RoomZoomAnchor | null = null): void => {
    if (!Number.isFinite(targetScale) || !isRoomZoomEnabled()) return;

    const clampedTarget = clampRoomZoomScale(targetScale);

    if (typeof requestAnimationFrame !== 'function') {
        applyRoomZoom(roomId, clampedTarget);
        return;
    }

    if (activeAnimation && activeAnimation.roomId === roomId) {
        activeAnimation.targetScale = clampedTarget;
        activeAnimation.anchor = anchor;
        return;
    }

    cancelRoomZoomAnimation();

    // Tweening below 1x needs the zoomed-in geometry so fractional scales render.
    syncGeometry(roomId, 1);

    activeAnimation = { roomId, targetScale: clampedTarget, anchor, frameId: 0, lastFrameTime: 0 };
    activeAnimation.frameId = requestAnimationFrame(runRoomZoomAnimationFrame);
};

// Official getCurrentRoomCanvasZoomScale: while a tween runs, its target is
// the level the user is on.
export const getCurrentRoomZoomScale = (roomId: number): number => {
    if (activeAnimation && activeAnimation.roomId === roomId) return getNearestRoomZoomScale(activeAnimation.targetScale);

    return getNearestRoomZoomScale(getLogicalRoomZoomScale(roomId));
};

let lastWheelZoomAt = 0;

export const resetRoomZoomWheelCooldown = (): void => {
    lastWheelZoomAt = 0;
};

// Official RoomDesktop.mouseWheelHandler: a plain wheel rotates the furni being
// moved or placed, Ctrl+wheel steps the zoom toward the cursor.
export const handleRoomCanvasWheel = (event: WheelEvent, roomId: number, canvas: Element | null = null, now: number = Date.now()): boolean => {
    if (event.deltaY === 0) return false;

    // Flash reports wheel-up as a positive delta; the DOM reports it as negative.
    const wheelUp = event.deltaY < 0;

    if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
        if (!(flipAwareEngine().rotateActiveObjectPreview?.(wheelUp) ?? false)) return false;

        event.preventDefault();
        return true;
    }

    if (!event.ctrlKey || event.altKey || event.shiftKey) return false;

    // Ctrl+wheel over the room must never zoom the browser page.
    event.preventDefault();

    if (!shouldProcessRoomZoomWheel(event.deltaY, event.deltaMode, now, lastWheelZoomAt)) return true;

    const currentScale = getCurrentRoomZoomScale(roomId);
    const nextScale = getNextRoomZoomScale(currentScale, wheelUp ? 1 : -1);

    if (Math.abs(nextScale - currentScale) <= ROOM_ZOOM_EPSILON) return true;

    const rect = canvas?.getBoundingClientRect?.();
    const anchor: RoomZoomAnchor = { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };

    animateRoomZoom(roomId, nextScale, anchor);
    lastWheelZoomAt = now;

    return true;
};
