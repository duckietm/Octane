import { describe, expect, it } from 'vitest';
import { pointerInElement, shownZoomOf, toLayoutOffset } from './handheldPointer';

const element = (shownWidth: number, layoutWidth: number, left = 0, top = 0) =>
    ({ offsetWidth: layoutWidth, getBoundingClientRect: () => ({ left, top, width: shownWidth, height: shownWidth }) }) as unknown as HTMLElement;

describe('handheld pointer helpers', () => {
    it('reads the zoom an element is shown at', () => {
        expect(shownZoomOf(element(150, 100))).toBe(1.5);
        expect(shownZoomOf(element(75, 100))).toBe(0.75);
    });

    it('takes an unscaled, unmeasurable or rounding-off element as unzoomed', () => {
        expect(shownZoomOf(element(100, 100))).toBe(1);
        expect(shownZoomOf(element(100.4, 100))).toBe(1);
        expect(shownZoomOf(element(0, 0))).toBe(1);
        expect(shownZoomOf(null)).toBe(1);
    });

    it("turns screen offsets into the element's own pixels", () => {
        expect(toLayoutOffset(30, 1.5)).toBe(20);
        expect(toLayoutOffset(30, 0)).toBe(30);
        expect(pointerInElement(70, 40, element(200, 100, 10, 20))).toEqual({ x: 30, y: 10 });
    });
});
