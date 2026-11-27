import { describe, expect, it } from 'vitest';
import { shouldDismissSheet, sheetPullDistance } from './handheldSheet';
import { clampIntoArea, fitAboveKeyboard, fitHandheldFrame, handheldUsableArea, placeHandheldWindow } from './handheldWindowFit';

describe('handheldUsableArea', () => {
    it('leaves out the safe-area insets and the toolbar', () => {
        expect(handheldUsableArea(390, 844, { top: 47, right: 0, bottom: 34, left: 0 }, 52)).toEqual({ left: 0, top: 47, width: 390, height: 711 });
        expect(handheldUsableArea(844, 390, { top: 0, right: 47, bottom: 21, left: 47 }, 52)).toEqual({ left: 47, top: 0, width: 750, height: 317 });
    });
});

describe('placeHandheldWindow', () => {
    const area = { left: 0, top: 40, width: 390, height: 700 };

    it('centres a window that fits as a dialog', () => {
        expect(placeHandheldWindow(300, 200, area)).toEqual({ mode: 'dialog', x: 45, y: 290 });
    });

    it('turns a window wider or taller than the usable area into a sheet over the area', () => {
        expect(placeHandheldWindow(600, 400, area)).toEqual({ mode: 'sheet', x: 0, y: 40 });
        expect(placeHandheldWindow(300, 720, area)).toEqual({ mode: 'sheet', x: 0, y: 40 });
    });

    it('takes a window that has no size yet as a sheet', () => {
        expect(placeHandheldWindow(0, 0, area).mode).toBe('sheet');
    });
});

describe('clampIntoArea', () => {
    const area = { left: 10, top: 20, width: 300, height: 400 };

    it('keeps the whole box inside the area', () => {
        expect(clampIntoArea(-50, -50, 100, 100, area)).toEqual({ x: 10, y: 20 });
        expect(clampIntoArea(400, 600, 100, 100, area)).toEqual({ x: 210, y: 320 });
        expect(clampIntoArea(50, 60, 100, 100, area)).toEqual({ x: 50, y: 60 });
    });

    it('pins a box bigger than the area to its top-left corner', () => {
        expect(clampIntoArea(100, 100, 500, 900, area)).toEqual({ x: 10, y: 20 });
    });
});

describe('info sheet pull', () => {
    it('only counts downward pulls', () => {
        expect(sheetPullDistance(300, 260)).toBe(0);
        expect(sheetPullDistance(300, 380)).toBe(80);
    });

    it('closes past a share of the sheet, with a minimum for short sheets', () => {
        expect(shouldDismissSheet(80, 400)).toBe(false);
        expect(shouldDismissSheet(120, 400)).toBe(true);
        expect(shouldDismissSheet(50, 100)).toBe(false);
        expect(shouldDismissSheet(64, 100)).toBe(true);
        expect(shouldDismissSheet(0, 0)).toBe(false);
    });
});

describe('fitHandheldFrame', () => {
    const portrait = { left: 0, top: 47, width: 390, height: 711 };
    const landscape = { left: 47, top: 0, width: 750, height: 317 };

    it('keeps a frame that fits at its own size', () => {
        expect(fitHandheldFrame(300, 400, portrait, 0.6)).toEqual({ scale: 1, width: 300, height: 400, panX: false, panY: false });
    });

    it('draws a frame smaller until it fits when that stays above the minimum', () => {
        const fit = fitHandheldFrame(490, 523, portrait, 0.75);

        expect(fit.scale).toBeCloseTo(0.771, 3);
        expect(fit.panX || fit.panY).toBe(false);
        expect(fit.width).toBeLessThanOrEqual(portrait.width - 12);
    });

    it('stops at the minimum scale and pans what is still too big', () => {
        expect(fitHandheldFrame(1103, 722, portrait, 0.6)).toEqual({ scale: 0.6, width: 662, height: 433, panX: true, panY: false });
        expect(fitHandheldFrame(1103, 722, landscape, 0.6)).toEqual({ scale: 0.6, width: 662, height: 433, panX: false, panY: true });
    });

    it('leaves a frame without a size alone', () => {
        expect(fitHandheldFrame(0, 0, portrait, 0.6).scale).toBe(1);
    });

    it('never draws a frame bigger unless a maximum scale above 1 is given', () => {
        expect(fitHandheldFrame(256, 300, portrait, 0.75).scale).toBe(1);
        expect(fitHandheldFrame(256, 300, portrait, 0.75, 6, 1).scale).toBe(1);
    });

    it('enlarges a small frame up to the maximum, in twentieths, while it still fits', () => {
        // 378 / 256 = 1.476: capped at 1.35.
        expect(fitHandheldFrame(256, 300, portrait, 0.75, 6, 1.35)).toEqual({ scale: 1.35, width: 346, height: 405, panX: false, panY: false });
        // Height bound: 699 / 600 = 1.165, rounded down to 1.15.
        expect(fitHandheldFrame(256, 600, portrait, 0.75, 6, 1.35).scale).toBe(1.15);
        // A frame that does not fit is not enlarged at all.
        expect(fitHandheldFrame(490, 523, portrait, 0.75, 6, 1.35).scale).toBeCloseTo(0.771, 3);
    });

    it('caps an absurd maximum at twice the size', () => {
        expect(fitHandheldFrame(100, 100, portrait, 0.75, 6, 10).scale).toBe(2);
    });
});

describe('fitAboveKeyboard', () => {
    const area = { left: 0, top: 47, width: 390, height: 711 };

    it('changes nothing while the keyboard is closed', () => {
        expect(fitAboveKeyboard({ mode: 'sheet', x: 0, y: 47 }, { width: 390, height: 711 }, area, 844, 0)).toEqual({ x: 0, y: 47, height: 711 });
    });

    it('ends a sheet at the top of the keyboard', () => {
        expect(fitAboveKeyboard({ mode: 'sheet', x: 0, y: 47 }, { width: 390, height: 711 }, area, 844, 336)).toEqual({ x: 0, y: 47, height: 461 });
    });

    it('moves a dialog up until its bottom clears the keyboard, but never above the area', () => {
        expect(fitAboveKeyboard({ mode: 'dialog', x: 45, y: 300 }, { width: 300, height: 200 }, area, 844, 336)).toEqual({ x: 45, y: 300, height: 200 });
        expect(fitAboveKeyboard({ mode: 'dialog', x: 45, y: 400 }, { width: 300, height: 200 }, area, 844, 336)).toEqual({ x: 45, y: 302, height: 200 });
        expect(fitAboveKeyboard({ mode: 'dialog', x: 45, y: 300 }, { width: 300, height: 600 }, area, 844, 336)).toEqual({ x: 45, y: 47, height: 600 });
    });
});
