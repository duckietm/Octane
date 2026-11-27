import { describe, expect, it } from 'vitest';
import { movePinch, planPointAt, startPinch } from './pinch';

const view = { viewX: 100, viewY: 50, scale: 0.5, width: 300, height: 200, flipped: false };
const scaleAt = (zoom: number) => zoom * 0.5;

describe('floor plan pinch', () => {
    it('finds the plan point under a point of the view, mirrored when seen from the other side', () => {
        expect(planPointAt({ x: 100, y: 40 }, view)).toEqual({ x: 300, y: 130 });
        expect(planPointAt({ x: 100, y: 40 }, { ...view, flipped: true })).toEqual({ x: 500, y: 130 });
    });

    it('keeps the view still while the fingers do not move', () => {
        const a = { x: 100, y: 100 };
        const b = { x: 200, y: 100 };
        const anchor = startPinch(a, b, 1, view);
        const next = movePinch(anchor, a, b, view, { min: 0.4, max: 6 }, scaleAt);

        expect(next.zoom).toBe(1);
        // The view centre: viewX + width / scale / 2.
        expect(next.centerX).toBeCloseTo(100 + 300 / 0.5 / 2);
        expect(next.centerY).toBeCloseTo(50 + 200 / 0.5 / 2);
    });

    it('zooms with the finger spread and keeps the anchored point under the midpoint', () => {
        const anchor = startPinch({ x: 100, y: 100 }, { x: 200, y: 100 }, 1, view);
        const next = movePinch(anchor, { x: 50, y: 100 }, { x: 250, y: 100 }, view, { min: 0.4, max: 6 }, scaleAt);
        const scale = scaleAt(next.zoom);
        const viewX = next.centerX - view.width / scale / 2;

        expect(next.zoom).toBe(2);
        expect(viewX + 150 / scale).toBeCloseTo(anchor.planX);
    });

    it('clamps the zoom and follows a two-finger pan', () => {
        const anchor = startPinch({ x: 100, y: 100 }, { x: 110, y: 100 }, 1, view);

        expect(movePinch(anchor, { x: 0, y: 100 }, { x: 300, y: 100 }, view, { min: 0.4, max: 6 }, scaleAt).zoom).toBe(6);

        const still = movePinch(anchor, { x: 100, y: 100 }, { x: 110, y: 100 }, view, { min: 0.4, max: 6 }, scaleAt);
        const panned = movePinch(anchor, { x: 140, y: 100 }, { x: 150, y: 100 }, view, { min: 0.4, max: 6 }, scaleAt);

        // The plan follows the fingers: 40 px to the right moves the view 80 plan units to the left.
        expect(still.centerX - panned.centerX).toBeCloseTo(80);
    });
});
