import { describe, expect, it } from 'vitest';
import { dataUrlToBlob, findOpaqueBounds, fitBoundsIntoSquare, scaledAirMeMenuFaceCrop } from './avatarImageCrop';

describe('findOpaqueBounds', () =>
{
    it('returns the tight rectangle containing non-transparent pixels', () =>
    {
        const pixels = new Uint8ClampedArray(4 * 4 * 4);
        const setAlpha = (x: number, y: number) => { pixels[((y * 4) + x) * 4 + 3] = 255; };
        setAlpha(1, 1);
        setAlpha(2, 1);
        setAlpha(2, 3);

        expect(findOpaqueBounds(pixels, 4, 4)).toEqual({ x: 1, y: 1, width: 2, height: 3 });
    });

    it('returns the full image when every pixel is transparent', () =>
    {
        expect(findOpaqueBounds(new Uint8ClampedArray(3 * 2 * 4), 3, 2)).toEqual({ x: 0, y: 0, width: 3, height: 2 });
    });
});

describe('fitBoundsIntoSquare', () =>
{
    it('centers the cropped head in a 22px thumbnail without browser-side scaling', () =>
    {
        expect(fitBoundsIntoSquare({ x: 0, y: 0, width: 40, height: 20 }, 22, 1)).toEqual({ x: 1, y: 6, width: 20, height: 10 });
    });
});

describe('AIR me-menu face crop', () =>
{
    it('keeps HabboFaceFocuser dir-3 coords on the 90x130 scale-h canvas', () =>
    {
        expect(scaledAirMeMenuFaceCrop(90, 130)).toEqual({ sx: 21, sy: 30, sw: 50, sh: 50 });
    });

    it('scales the same window when the raster is doubled', () =>
    {
        expect(scaledAirMeMenuFaceCrop(180, 260)).toEqual({ sx: 42, sy: 60, sw: 100, sh: 100 });
    });
});

describe('dataUrlToBlob', () =>
{
    it('decodes a base64 data url into a typed blob', async () =>
    {
        const blob = dataUrlToBlob('data:image/png;base64,' + btoa('\x89PNG'));

        expect(blob.type).toBe('image/png');
        expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([ 0x89, 0x50, 0x4e, 0x47 ]));
    });

    it('returns null for urls that are not data urls', () =>
    {
        expect(dataUrlToBlob('blob:http://localhost/abc')).toBeNull();
        expect(dataUrlToBlob('data:image/png;base64')).toBeNull();
    });
});
