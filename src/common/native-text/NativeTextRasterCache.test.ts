import { describe, expect, it } from 'vitest';
import { NativeTextRasterCache } from './NativeTextRasterCache';

const raster = (bytes: number) => ({ image: { data: new Uint8ClampedArray(bytes), width: bytes / 4, height: 1 } as ImageData, width: 1, height: 1 });

describe('NativeTextRasterCache', () => {
    it('returns what was stored and drops the least recently used rasters past the budget', () => {
        const cache = new NativeTextRasterCache(100);
        const a = raster(40);

        cache.set('a', a);
        cache.set('b', raster(40));
        expect(cache.get('a')).toBe(a);

        cache.set('c', raster(40));

        expect(cache.get('b')).toBeNull();
        expect(cache.get('a')).toBe(a);
        expect(cache.get('c')).not.toBeNull();
        expect(cache.usedBytes).toBe(80);
    });

    it('replaces a key in place and never keeps a raster larger than the budget', () => {
        const cache = new NativeTextRasterCache(100);

        cache.set('a', raster(40));
        cache.set('a', raster(60));
        cache.set('huge', raster(400));

        expect(cache.size).toBe(1);
        expect(cache.usedBytes).toBe(60);
        expect(cache.get('huge')).toBeNull();
    });
});
