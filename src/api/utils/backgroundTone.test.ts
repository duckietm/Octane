import { describe, expect, it } from 'vitest';
import { blendOver, contrastRatio, parseCssColors, toneOf } from './backgroundTone';

describe('background tone', () => {
    it('asks for light text on dark colours and dark text on light ones', () => {
        expect(toneOf({ r: 20, g: 24, b: 30 })).toBe('dark');
        expect(toneOf({ r: 31, g: 35, b: 41 })).toBe('dark');
        expect(toneOf({ r: 236, g: 232, b: 220 })).toBe('light');
        expect(toneOf({ r: 201, g: 162, b: 39 })).toBe('light');
    });

    it('measures contrast as WCAG does', () => {
        expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 0);
        expect(contrastRatio({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(1);
    });

    it('reads the colours of a gradient, hex and rgb alike', () => {
        const colors = parseCssColors('linear-gradient(180deg, #1f2329 0%, rgba(10, 20, 30, 0.5) 100%), #fff');

        expect(colors).toEqual([
            { r: 31, g: 35, b: 41, a: 1 },
            { r: 10, g: 20, b: 30, a: 0.5 },
            { r: 255, g: 255, b: 255, a: 1 }
        ]);
    });

    it('lays translucent colours over the window colour', () => {
        expect(blendOver([{ r: 0, g: 0, b: 0, a: 0.5 }], { r: 200, g: 200, b: 200 })).toEqual({ r: 100, g: 100, b: 100 });
        expect(blendOver([], { r: 1, g: 2, b: 3 })).toEqual({ r: 1, g: 2, b: 3 });
    });
});
