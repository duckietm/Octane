import { describe, expect, it } from 'vitest';
import { backgroundImageUrl, cssColorLuminance, DARK_TONE_THRESHOLD, darkPixelShare, gradientLuminance, gradientTone, meanLuminance, toneForLuminance, toneForPixels } from './BackgroundTone';

const pixels = (...rgba: number[][]) => Uint8ClampedArray.from(rgba.flat());

describe('meanLuminance', () => {
    it('is 0 for black and 1 for white', () => {
        expect(meanLuminance(pixels([0, 0, 0, 255]))).toBe(0);
        expect(meanLuminance(pixels([255, 255, 255, 255]))).toBeCloseTo(1, 5);
    });

    it('ignores transparent pixels and treats an empty buffer as light', () => {
        expect(meanLuminance(pixels([0, 0, 0, 0], [255, 255, 255, 255]))).toBeCloseTo(1, 5);
        expect(meanLuminance(pixels())).toBe(1);
    });

    it('weights by alpha and can sample every nth pixel', () => {
        const buffer = pixels([0, 0, 0, 255], [255, 255, 255, 255], [0, 0, 0, 255], [255, 255, 255, 255]);

        expect(meanLuminance(buffer)).toBeCloseTo(0.5, 5);
        expect(meanLuminance(buffer, 2)).toBe(0);
    });
});

describe('toneForLuminance', () => {
    it('flips to the light copy below the threshold', () => {
        expect(toneForLuminance(DARK_TONE_THRESHOLD - 0.01)).toBe('dark');
        expect(toneForLuminance(DARK_TONE_THRESHOLD)).toBe('light');
        expect(toneForLuminance(0.9)).toBe('light');
    });
});

describe('backgroundImageUrl', () => {
    it('extracts the url from a computed background-image', () => {
        expect(backgroundImageUrl('url("http://x/bg_3.png")')).toBe('http://x/bg_3.png');
        expect(backgroundImageUrl("url('/a.png')")).toBe('/a.png');
        expect(backgroundImageUrl('url(/a.png)')).toBe('/a.png');
        expect(backgroundImageUrl('none')).toBeNull();
        expect(backgroundImageUrl('')).toBeNull();
    });
});

describe('gradientLuminance', () => {
    it('averages the stops of a computed gradient', () => {
        expect(gradientLuminance('linear-gradient(135deg, rgb(0, 0, 0) 0%, rgb(255, 255, 255) 100%)')).toBeCloseTo(0.5, 5);
        expect(gradientLuminance('repeating-linear-gradient(45deg, #000000 0px, #000000 10px)')).toBe(0);
    });

    it('is null for images and plain values', () => {
        expect(gradientLuminance('url("/a.png")')).toBeNull();
        expect(gradientLuminance('none')).toBeNull();
    });
});

describe('toneForPixels', () => {
    it('calls a mostly dark pattern with bright accents dark', () => {
        const navy = [20, 30, 80, 255];
        const yellow = [255, 230, 80, 255];
        const buffer = pixels(navy, navy, navy, navy, navy, navy, navy, yellow, yellow);

        expect(darkPixelShare(buffer)).toBeCloseTo(7 / 9, 5);
        expect(toneForPixels(buffer)).toBe('dark');
    });

    it('calls a mostly light pattern light even with dark accents', () => {
        const cream = [240, 235, 220, 255];
        const black = [0, 0, 0, 255];

        expect(toneForPixels(pixels(cream, cream, cream, cream, black))).toBe('light');
    });
});

describe('gradientTone', () => {
    it('lets the base colour decide under a see-through pattern', () => {
        // card-background-11: yellow dots over navy
        expect(gradientTone('radial-gradient(circle, rgb(255, 213, 79) 1.5px, rgba(0, 0, 0, 0) 2px)', 'rgb(44, 62, 80)')).toBe('dark');
        expect(gradientTone('radial-gradient(circle, rgb(0, 0, 0) 1.5px, transparent 2px)', 'rgb(240, 240, 240)')).toBe('light');
    });

    it('averages opaque stops with the base colour, or alone without one', () => {
        expect(gradientTone('linear-gradient(135deg, rgb(36, 57, 73) 0%, rgb(81, 127, 164) 100%)', 'rgba(0, 0, 0, 0)')).toBe('dark');
        expect(gradientTone('linear-gradient(135deg, rgb(255, 255, 255) 0%, rgb(230, 230, 230) 100%)', 'rgb(0, 0, 0)')).toBe('light');
        expect(gradientTone('url("/a.png")', 'rgb(0, 0, 0)')).toBeNull();
    });

    it('reads computed colours', () => {
        expect(cssColorLuminance('rgb(0, 0, 0)')).toBe(0);
        expect(cssColorLuminance('rgba(0, 0, 0, 0)')).toBeNull();
        expect(cssColorLuminance('transparent')).toBeNull();
    });
});
