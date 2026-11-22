import { describe, expect, it } from 'vitest';
import { clampPlacement, fillScale, fitScale, initialPlacement, leavesEmptyBands, placedRect, PROFILE_IMAGE_MAX_ZOOM, snapPixelScale, zoomPlacement } from './profileImageCrop';

const frame = { width: 1280, height: 220 };
const photo = { width: 4000, height: 3000 };

describe('profile image placement', () => {
    it('starts centred and covering the frame', () => {
        const placement = initialPlacement(photo, frame);
        const rect = placedRect(photo, placement);

        expect(placement.scale).toBeCloseTo(fillScale(photo, frame));
        expect(rect.x).toBeCloseTo(0);
        expect(rect.width).toBeCloseTo(1280);
        expect(leavesEmptyBands(photo, frame, placement)).toBe(false);
    });

    it('never moves a covering picture far enough to show an empty band', () => {
        const placement = clampPlacement(photo, frame, { scale: fillScale(photo, frame), centerX: 640, centerY: -5000 });
        const rect = placedRect(photo, placement);

        expect(rect.y).toBeLessThanOrEqual(0);
        expect(rect.y + rect.height).toBeGreaterThanOrEqual(220);
    });

    it('keeps a fitted picture centred and shows the bands', () => {
        const placement = clampPlacement(photo, frame, { scale: fitScale(photo, frame), centerX: 0, centerY: 0 });

        expect(placement.centerX).toBe(640);
        expect(placement.centerY).toBe(110);
        expect(leavesEmptyBands(photo, frame, placement)).toBe(true);
    });

    it('limits the zoom between fitting and the maximum', () => {
        expect(clampPlacement(photo, frame, { scale: 0.0001, centerX: 640, centerY: 110 }).scale).toBeCloseTo(fitScale(photo, frame));
        expect(clampPlacement(photo, frame, { scale: 100, centerX: 640, centerY: 110 }).scale).toBeCloseTo(fillScale(photo, frame) * PROFILE_IMAGE_MAX_ZOOM);
    });

    it('zooms around the anchor point', () => {
        const start = initialPlacement(photo, frame);
        const zoomed = zoomPlacement(photo, frame, start, start.scale * 2, 640, 110);

        expect(zoomed.scale).toBeCloseTo(start.scale * 2);
        expect(zoomed.centerX).toBeCloseTo(640);
        expect(zoomed.centerY).toBeCloseTo(110);
    });
});

describe('sharp pixel zoom', () => {
    it('snaps to whole scales and whole fractions', () => {
        expect(snapPixelScale(2.4, 0.1, 10)).toBe(2);
        expect(snapPixelScale(1.6, 0.1, 10)).toBe(2);
        expect(snapPixelScale(0.45, 0.1, 10)).toBe(0.5);
        expect(snapPixelScale(0.3, 0.1, 10)).toBeCloseTo(1 / 3);
    });

    it('stays within the limits on a sharp scale', () => {
        expect(snapPixelScale(1, 1.07, 8.5)).toBe(2);
        expect(snapPixelScale(9, 1.07, 8.5)).toBe(8);
        expect(snapPixelScale(0.2, 0.26, 4)).toBeCloseTo(1 / 3);
    });
});
