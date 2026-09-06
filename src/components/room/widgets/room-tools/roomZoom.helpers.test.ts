import { GetRoomEngine } from '@octane/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    animateRoomZoom,
    applyRoomZoom,
    cancelRoomZoomAnimation,
    clampRoomZoomScale,
    getCurrentRoomZoomScale,
    getLogicalRoomZoomScale,
    getNearestRoomZoomScale,
    getNextRoomZoomScale,
    getRoomZoomAnimationStep,
    getRoomZoomLevel,
    getRoomZoomScale,
    getWheelLineDelta,
    handleRoomCanvasWheel,
    interpolateRoomZoomScale,
    isRoomZoomAnimating,
    isRoomZoomPhotoReady,
    ROOM_ZOOM_SCALES,
    resetRoomZoomWheelCooldown,
    roomZoomLevelToScale,
    shouldProcessRoomZoomWheel,
    stepRoomZoom
} from './roomZoom.helpers';

vi.mock('../../../../api', () => ({
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback
}));

// A minimal room engine: one canvas whose scale the engine applies verbatim,
// and a geometry that flips between the size-64 and size-32 assets.
const createEngine = (options: { scale?: number; geometryScale?: number; flipped?: boolean } = {}) => {
    const geometry = {
        scale: options.geometryScale ?? 64,
        isZoomedIn() {
            return this.scale === 64;
        },
        performZoomIn: vi.fn(function (this: { scale: number }) {
            this.scale = 64;
        }),
        performZoomOut: vi.fn(function (this: { scale: number }) {
            this.scale = 32;
        })
    };
    const canvas = { scale: options.scale ?? 1, isFlipped: options.flipped ?? false, screenOffsetX: 0, screenOffsetY: 0, width: 800, height: 600 };
    const engine = {
        getRoomInstanceRenderingCanvasScale: vi.fn(() => canvas.scale),
        getRoomInstanceRenderingCanvasIsFlipped: vi.fn(() => canvas.isFlipped),
        getRoomInstanceGeometry: vi.fn(() => geometry),
        getRoomInstanceRenderingCanvas: vi.fn(() => canvas),
        setRoomInstanceRenderingCanvasScale: vi.fn((_roomId: number, _canvasId: number, scale: number) => {
            canvas.scale = scale;
        }),
        rotateActiveObjectPreview: vi.fn(() => false)
    };

    vi.mocked(GetRoomEngine).mockReturnValue(engine as unknown as ReturnType<typeof GetRoomEngine>);

    return { engine, canvas, geometry };
};

const wheelEvent = (init: Partial<WheelEvent> & { deltaY: number }): WheelEvent => {
    const event = {
        deltaX: 0,
        deltaMode: 0,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        clientX: 0,
        clientY: 0,
        preventDefault: vi.fn(),
        ...init
    };

    return event as unknown as WheelEvent;
};

beforeEach(() => {
    resetRoomZoomWheelCooldown();
});

afterEach(() => {
    cancelRoomZoomAnimation();
    vi.mocked(GetRoomEngine).mockReset();
    vi.useRealTimers();
});

describe('AIR room zoom table', () => {
    it('matches the official RoomDesktop scales up to 16x', () => {
        expect([...ROOM_ZOOM_SCALES]).toEqual([0.5, 1, 2, 4, 8, 16]);
    });

    it.each([
        [0, 0.5],
        [1, 1],
        [2, 2],
        [3, 4],
        [4, 8],
        [5, 16]
    ])('maps level %i to renderer scale %f', (level, scale) => {
        expect(getRoomZoomScale(level)).toBe(scale);
        expect(getRoomZoomLevel(scale)).toBe(level);
    });

    it('snaps arbitrary scales to the nearest table entry', () => {
        expect(getNearestRoomZoomScale(0.7)).toBe(0.5);
        expect(getNearestRoomZoomScale(1.4)).toBe(1);
        expect(getNearestRoomZoomScale(11)).toBe(8);
        expect(getNearestRoomZoomScale(40)).toBe(16);
        expect(getNearestRoomZoomScale(Number.NaN)).toBe(1);
    });

    it('steps to the next table entry and stops at both ends', () => {
        expect(getNextRoomZoomScale(1, 1)).toBe(2);
        expect(getNextRoomZoomScale(1.5, 1)).toBe(2);
        expect(getNextRoomZoomScale(1.5, -1)).toBe(1);
        expect(getNextRoomZoomScale(16, 1)).toBe(16);
        expect(getNextRoomZoomScale(0.5, -1)).toBe(0.5);
        expect(getNextRoomZoomScale(8, 1)).toBe(16);
        expect(getNextRoomZoomScale(4, 0)).toBe(4);
    });

    it('clamps zoom steps between 0.5x and 16x', () => {
        expect(stepRoomZoom(0.5, -1)).toBe(0.5);
        expect(stepRoomZoom(0.5, 1)).toBe(1);
        expect(stepRoomZoom(4, 1)).toBe(8);
        expect(stepRoomZoom(8, 1)).toBe(16);
        expect(stepRoomZoom(16, 1)).toBe(16);
        expect(stepRoomZoom(16, -1)).toBe(8);
        expect(clampRoomZoomScale(0.1)).toBe(0.5);
        expect(clampRoomZoomScale(64)).toBe(16);
    });

    it('maps chat zoom levels like the official RoomUI, capping at 16x', () => {
        expect(roomZoomLevelToScale(0)).toBe(0.5);
        expect(roomZoomLevelToScale(1)).toBe(1);
        expect(roomZoomLevelToScale(3)).toBe(4);
        expect(roomZoomLevelToScale(4)).toBe(8);
        expect(roomZoomLevelToScale(5)).toBe(16);
        expect(roomZoomLevelToScale(9)).toBe(16);
        expect(roomZoomLevelToScale(Number.NaN)).toBe(1);
    });
});

describe('AIR room zoom tween', () => {
    it('moves 0.14 log2 units per 60 Hz frame and never overshoots', () => {
        expect(getRoomZoomAnimationStep(0, 1, 1000 / 60)).toBeCloseTo(0.14);
        expect(getRoomZoomAnimationStep(0, 1, 1000 / 30)).toBeCloseTo(0.28);
        // Frames longer than 50 ms are clamped so a stalled tab does not jump.
        expect(getRoomZoomAnimationStep(0, 1, 500)).toBeCloseTo(0.42);
        expect(getRoomZoomAnimationStep(0, 0.05, 1000 / 60)).toBeCloseTo(0.05);
        expect(getRoomZoomAnimationStep(0, 1, 0)).toBeCloseTo(0.14);
    });

    it('interpolates in log2 space in both directions and snaps at the end', () => {
        expect(interpolateRoomZoomScale(1, 2, 1000 / 60)).toBeCloseTo(2 ** 0.14);
        expect(interpolateRoomZoomScale(2, 1, 1000 / 60)).toBeCloseTo(2 ** 0.86);
        expect(interpolateRoomZoomScale(2 ** 0.995, 2, 1000 / 60)).toBe(2);
        expect(interpolateRoomZoomScale(2, 2, 1000 / 60)).toBe(2);
    });

    it('animates the canvas frame by frame toward the target and finishes on the table entry', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
        const { engine, canvas } = createEngine();

        animateRoomZoom(7, 2, { x: 100, y: 50 });

        expect(isRoomZoomAnimating()).toBe(true);
        expect(getCurrentRoomZoomScale(7)).toBe(2);

        vi.advanceTimersToNextFrame();

        expect(canvas.scale).toBeGreaterThan(1);
        expect(canvas.scale).toBeLessThan(2);
        expect(engine.setRoomInstanceRenderingCanvasScale).toHaveBeenLastCalledWith(7, 1, canvas.scale, { x: 100, y: 50 }, null, false, true);

        for (let frame = 0; frame < 20 && isRoomZoomAnimating(); frame++) vi.advanceTimersToNextFrame();

        expect(isRoomZoomAnimating()).toBe(false);
        expect(canvas.scale).toBe(2);
    });

    it('retargets a running tween instead of restarting it', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
        const { canvas } = createEngine();

        animateRoomZoom(7, 4);
        vi.advanceTimersToNextFrame();
        animateRoomZoom(7, 1);

        expect(getCurrentRoomZoomScale(7)).toBe(1);

        for (let frame = 0; frame < 20 && isRoomZoomAnimating(); frame++) vi.advanceTimersToNextFrame();

        expect(canvas.scale).toBe(1);
    });

    it('drops to the size-32 geometry only once the tween reaches half size', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
        const { canvas, geometry } = createEngine();

        animateRoomZoom(7, 0.5);
        vi.advanceTimersToNextFrame();

        expect(geometry.performZoomOut).not.toHaveBeenCalled();
        expect(canvas.scale).toBeLessThan(1);

        for (let frame = 0; frame < 20 && isRoomZoomAnimating(); frame++) vi.advanceTimersToNextFrame();

        // Half size renders as the zoomed-out geometry at canvas scale 1.
        expect(geometry.performZoomOut).toHaveBeenCalledTimes(1);
        expect(canvas.scale).toBe(1);
        expect(getLogicalRoomZoomScale(7)).toBe(0.5);
    });

    it('restores the size-64 geometry before tweening up from half size', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
        const { canvas, geometry, engine } = createEngine({ scale: 1, geometryScale: 32 });

        animateRoomZoom(7, 1);

        // The switch itself keeps the room the same size on screen.
        expect(geometry.performZoomIn).toHaveBeenCalledTimes(1);
        expect(canvas.scale).toBe(0.5);
        expect(engine.setRoomInstanceRenderingCanvasScale).toHaveBeenLastCalledWith(7, 1, 0.5, { x: 400, y: 300 }, null, false, true);

        for (let frame = 0; frame < 20 && isRoomZoomAnimating(); frame++) vi.advanceTimersToNextFrame();

        expect(canvas.scale).toBe(1);
        expect(geometry.scale).toBe(64);
    });

    it('ends a tween the canvas ignores instead of spinning forever', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
        const { engine } = createEngine();

        engine.setRoomInstanceRenderingCanvasScale.mockImplementation(() => undefined);

        animateRoomZoom(7, 2);
        vi.advanceTimersToNextFrame();

        expect(isRoomZoomAnimating()).toBe(false);
    });

    it('applies an instant zoom immediately and cancels any running tween', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
        const { canvas, geometry } = createEngine();

        animateRoomZoom(7, 4);
        applyRoomZoom(7, 0.5);

        expect(isRoomZoomAnimating()).toBe(false);
        expect(geometry.scale).toBe(32);
        expect(canvas.scale).toBe(1);

        applyRoomZoom(7, 2);

        expect(geometry.scale).toBe(64);
        expect(canvas.scale).toBe(2);
    });

    it('forwards a forced flip to the engine untouched', () => {
        const { engine } = createEngine();

        applyRoomZoom(7, -1, true);

        expect(engine.setRoomInstanceRenderingCanvasScale).toHaveBeenCalledWith(7, 1, -1, null, null, true);
    });
});

describe('AIR camera zoom gate', () => {
    it('allows photos at normal and zoomed-in scale', () => {
        createEngine({ scale: 1 });
        expect(isRoomZoomPhotoReady(7)).toBe(true);

        createEngine({ scale: 4 });
        expect(isRoomZoomPhotoReady(7)).toBe(true);
    });

    it('blocks photos below normal zoom or while the room is flipped', () => {
        createEngine({ scale: 1, geometryScale: 32 });
        expect(isRoomZoomPhotoReady(7)).toBe(false);

        createEngine({ scale: 1, flipped: true });
        expect(isRoomZoomPhotoReady(7)).toBe(false);
    });
});

describe('AIR room wheel handling', () => {
    it('converts wheel deltas to lines per browser delta mode', () => {
        expect(getWheelLineDelta(100, 0)).toBeCloseTo(3);
        expect(getWheelLineDelta(3, 1)).toBe(3);
        expect(getWheelLineDelta(1, 2)).toBe(3);
    });

    it('rate limits small deltas and lets a full mouse notch through', () => {
        expect(shouldProcessRoomZoomWheel(100, 0, 1000, 900)).toBe(true);
        expect(shouldProcessRoomZoomWheel(-10, 0, 1000, 900)).toBe(false);
        expect(shouldProcessRoomZoomWheel(-10, 0, 1000, 0)).toBe(true);
        expect(shouldProcessRoomZoomWheel(-10, 0, 1401, 1000)).toBe(true);
    });

    it('rotates the furni being moved on a plain wheel', () => {
        const { engine } = createEngine();

        engine.rotateActiveObjectPreview.mockReturnValue(true);

        const event = wheelEvent({ deltaY: -100 });

        expect(handleRoomCanvasWheel(event, 7)).toBe(true);
        expect(engine.rotateActiveObjectPreview).toHaveBeenCalledWith(true);
        expect(event.preventDefault).toHaveBeenCalled();

        handleRoomCanvasWheel(wheelEvent({ deltaY: 100 }), 7);

        expect(engine.rotateActiveObjectPreview).toHaveBeenLastCalledWith(false);
    });

    it('lets a plain wheel through when nothing is being moved', () => {
        const { engine } = createEngine();
        const event = wheelEvent({ deltaY: 100 });

        expect(handleRoomCanvasWheel(event, 7)).toBe(false);
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(engine.setRoomInstanceRenderingCanvasScale).not.toHaveBeenCalled();
    });

    it('zooms toward the cursor on Ctrl+wheel and blocks the browser zoom', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
        const { engine, canvas } = createEngine();
        const target = { getBoundingClientRect: () => ({ left: 20, top: 10 }) } as unknown as Element;
        const event = wheelEvent({ deltaY: -100, ctrlKey: true, clientX: 320, clientY: 210 });

        expect(handleRoomCanvasWheel(event, 7, target, 5000)).toBe(true);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(engine.rotateActiveObjectPreview).not.toHaveBeenCalled();
        expect(getCurrentRoomZoomScale(7)).toBe(2);

        vi.advanceTimersToNextFrame();

        expect(engine.setRoomInstanceRenderingCanvasScale).toHaveBeenLastCalledWith(7, 1, canvas.scale, { x: 300, y: 200 }, null, false, true);
    });

    it('steps from the tween target so quick notches keep climbing the table', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
        createEngine();

        handleRoomCanvasWheel(wheelEvent({ deltaY: -100, ctrlKey: true }), 7, null, 5000);
        handleRoomCanvasWheel(wheelEvent({ deltaY: -100, ctrlKey: true }), 7, null, 5050);

        expect(getCurrentRoomZoomScale(7)).toBe(4);
    });

    it('applies the 400 ms cooldown to trackpad-sized deltas', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
        createEngine();

        handleRoomCanvasWheel(wheelEvent({ deltaY: -10, ctrlKey: true }), 7, null, 5000);
        handleRoomCanvasWheel(wheelEvent({ deltaY: -10, ctrlKey: true }), 7, null, 5100);

        expect(getCurrentRoomZoomScale(7)).toBe(2);

        handleRoomCanvasWheel(wheelEvent({ deltaY: -10, ctrlKey: true }), 7, null, 5500);

        expect(getCurrentRoomZoomScale(7)).toBe(4);
    });

    it('ignores wheel events with other modifiers', () => {
        const { engine } = createEngine();

        expect(handleRoomCanvasWheel(wheelEvent({ deltaY: -100, ctrlKey: true, shiftKey: true }), 7)).toBe(false);
        expect(handleRoomCanvasWheel(wheelEvent({ deltaY: -100, altKey: true }), 7)).toBe(false);
        expect(handleRoomCanvasWheel(wheelEvent({ deltaY: 0, ctrlKey: true }), 7)).toBe(false);
        expect(engine.rotateActiveObjectPreview).not.toHaveBeenCalled();
        expect(engine.setRoomInstanceRenderingCanvasScale).not.toHaveBeenCalled();
    });
});
