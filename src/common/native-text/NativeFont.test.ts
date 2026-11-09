import { describe, expect, it } from 'vitest';
import { unpremultiplyPixels } from './NativeFont';

describe('unpremultiplyPixels', () => {
    it('turns premultiplied retained pixels into straight alpha for a transparent canvas', () => {
        const premultiplied = new Uint8ClampedArray([0, 0, 0, 0, 51, 51, 51, 255, 51, 51, 51, 128, 255, 255, 255, 255]);
        const pixels = unpremultiplyPixels(premultiplied);

        expect(Array.from(pixels)).toEqual([0, 0, 0, 0, 51, 51, 51, 255, 102, 102, 102, 128, 255, 255, 255, 255]);
        expect(premultiplied[8]).toBe(51);
    });
});
