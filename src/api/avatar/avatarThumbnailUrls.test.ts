/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canvasToThumbnailUrl, centerCanvasIntoBox, ThumbnailUrlCache, THUMBNAIL_REVOKE_GRACE_MS, trimCanvasToOpaqueBounds } from './avatarThumbnailUrls';

/** A canvas stub: jsdom has no 2D context, so the pixels are supplied by the test. */
const canvasStub = (width: number, height: number, options: { alpha?: (x: number, y: number) => number; toBlob?: unknown } = {}) => {
    const drawn: { source: unknown; args: number[] }[] = [];
    const context = {
        imageSmoothingEnabled: true,
        drawImage: (source: unknown, ...args: number[]) => drawn.push({ source, args }),
        getImageData: (_x: number, _y: number, w: number, h: number) => {
            const data = new Uint8ClampedArray(w * h * 4);

            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) data[(y * w + x) * 4 + 3] = options.alpha ? options.alpha(x, y) : 255;
            }

            return { data };
        }
    };

    return {
        width,
        height,
        drawn,
        context,
        getContext: () => context,
        toDataURL: () => `data:image/png;base64,${'A'.repeat(64)}`,
        ...(options.toBlob === undefined ? {} : { toBlob: options.toBlob })
    } as unknown as HTMLCanvasElement & { drawn: typeof drawn; context: typeof context };
};

describe('canvasToThumbnailUrl', () => {
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;

    beforeEach(() => {
        URL.createObjectURL = vi.fn(() => 'blob:thumb-1') as unknown as typeof URL.createObjectURL;
        URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;
    });

    afterEach(() => {
        URL.createObjectURL = originalCreate;
        URL.revokeObjectURL = originalRevoke;
    });

    it('prefers a blob URL and reports the real image bytes', async () => {
        const blob = new Blob([new Uint8Array(1024)], { type: 'image/png' });
        const canvas = canvasStub(50, 50, { toBlob: (cb: (b: Blob) => void) => cb(blob) });

        const entry = await canvasToThumbnailUrl(canvas);

        expect(entry?.url).toBe('blob:thumb-1');
        // A data URL of the same image would cost about 2.7 times this in string memory.
        expect(entry?.bytes).toBe(1024);

        entry?.revoke();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:thumb-1');
    });

    it('falls back to a data URL when the canvas cannot make a blob', async () => {
        const canvas = canvasStub(50, 50, { toBlob: (cb: (b: Blob | null) => void) => cb(null) });

        const entry = await canvasToThumbnailUrl(canvas);

        expect(entry?.url.startsWith('data:image/png;base64,')).toBe(true);
        expect(entry?.bytes).toBe(entry!.url.length * 2);
        expect(() => entry?.revoke()).not.toThrow();
    });

    it('returns nothing for an empty canvas', async () => {
        expect(await canvasToThumbnailUrl(canvasStub(0, 0))).toBeNull();
    });
});

describe('canvas shaping', () => {
    it('centres a smaller canvas in the box without smoothing it', () => {
        const source = canvasStub(20, 30);
        const target = canvasStub(0, 0);
        const createElement = vi.spyOn(document, 'createElement').mockReturnValueOnce(target);

        const centered = centerCanvasIntoBox(source, 50);

        expect(centered).toBe(target);
        expect(target.width).toBe(50);
        expect(target.height).toBe(50);
        expect(target.context.imageSmoothingEnabled).toBe(false);
        // (50 - 20) / 2 across, (50 - 30) / 2 down.
        expect(target.drawn).toEqual([{ source, args: [15, 10] }]);

        createElement.mockRestore();
    });

    it('keeps a canvas that already fills the box', () => {
        const source = canvasStub(50, 50);

        expect(centerCanvasIntoBox(source, 50)).toBe(source);
    });

    it('keeps a canvas whose pixels reach every edge', () => {
        const source = canvasStub(10, 10);

        expect(trimCanvasToOpaqueBounds(source)).toBe(source);
    });

    it('keeps a fully transparent canvas rather than trimming it away', () => {
        const source = canvasStub(10, 10, { alpha: () => 0 });

        expect(trimCanvasToOpaqueBounds(source)).toBe(source);
    });
});

describe('ThumbnailUrlCache', () => {
    const entry = (url: string, bytes: number, revoke = vi.fn()) => ({ url, bytes, revoke });

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('returns what it stored and counts its bytes', () => {
        const cache = new ThumbnailUrlCache(1000);

        cache.set('a', entry('blob:a', 400));

        expect(cache.get('a')).toBe('blob:a');
        expect(cache.bytes).toBe(400);
        expect(cache.get('missing')).toBeUndefined();
    });

    it('evicts the least recently used entry and releases its URL after the grace period', () => {
        const cache = new ThumbnailUrlCache(1000);
        const revokeA = vi.fn();

        cache.set('a', entry('blob:a', 400, revokeA));
        cache.set('b', entry('blob:b', 400));
        // Touching 'a' makes 'b' the oldest.
        cache.get('a');
        cache.set('c', entry('blob:c', 400));

        expect(cache.get('b')).toBeUndefined();
        expect(cache.get('a')).toBe('blob:a');
        expect(cache.get('c')).toBe('blob:c');
        expect(revokeA).not.toHaveBeenCalled();
    });

    it('waits before revoking, so a render already in flight keeps its image', () => {
        const cache = new ThumbnailUrlCache(500);
        const revoke = vi.fn();

        cache.set('a', entry('blob:a', 400, revoke));
        cache.set('b', entry('blob:b', 400));

        expect(revoke).not.toHaveBeenCalled();

        vi.advanceTimersByTime(THUMBNAIL_REVOKE_GRACE_MS + 1);

        expect(revoke).toHaveBeenCalledTimes(1);
    });

    it('replaces an entry under the same key and releases the old URL', () => {
        const cache = new ThumbnailUrlCache(1000);
        const revokeOld = vi.fn();

        cache.set('a', entry('blob:old', 400, revokeOld));
        cache.set('a', entry('blob:new', 200));

        expect(cache.get('a')).toBe('blob:new');
        expect(cache.bytes).toBe(200);
        expect(cache.size).toBe(1);

        vi.advanceTimersByTime(THUMBNAIL_REVOKE_GRACE_MS + 1);
        expect(revokeOld).toHaveBeenCalledTimes(1);
    });

    it('clearing releases every URL and resets the budget', () => {
        const cache = new ThumbnailUrlCache(1000);
        const revokeA = vi.fn();
        const revokeB = vi.fn();

        cache.set('a', entry('blob:a', 100, revokeA));
        cache.set('b', entry('blob:b', 100, revokeB));
        cache.clear();

        expect(cache.size).toBe(0);
        expect(cache.bytes).toBe(0);

        vi.advanceTimersByTime(THUMBNAIL_REVOKE_GRACE_MS + 1);
        expect(revokeA).toHaveBeenCalledTimes(1);
        expect(revokeB).toHaveBeenCalledTimes(1);
    });
});
