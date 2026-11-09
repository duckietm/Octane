/** A finished label raster: the canvas pixels and the CSS size the field takes. */
export interface CachedNativeRaster {
    image: ImageData;
    width: number;
    height: number;
}

/**
 * Finished label rasters by everything that decides their pixels, so the same label (every "0" of a list, a window opened again) is
 * drawn once. Least recently used rasters go first once the pixels pass the budget.
 */
export class NativeTextRasterCache {
    private readonly entries = new Map<string, CachedNativeRaster>();
    private bytes = 0;

    constructor(private readonly budget: number) {}

    get(key: string): CachedNativeRaster | null {
        const entry = this.entries.get(key);

        if (!entry) return null;

        this.entries.delete(key);
        this.entries.set(key, entry);

        return entry;
    }

    set(key: string, entry: CachedNativeRaster): void {
        const size = entry.image.data.length;

        if (size > this.budget) return;

        const previous = this.entries.get(key);

        if (previous) {
            this.bytes -= previous.image.data.length;
            this.entries.delete(key);
        }

        this.entries.set(key, entry);
        this.bytes += size;

        for (const [oldest, raster] of this.entries) {
            if (this.bytes <= this.budget) break;

            this.entries.delete(oldest);
            this.bytes -= raster.image.data.length;
        }
    }

    get size(): number {
        return this.entries.size;
    }

    get usedBytes(): number {
        return this.bytes;
    }
}

/** Shared by every NativeText: 16 MB of pixels holds thousands of labels. */
export const nativeTextRasterCache = new NativeTextRasterCache(16 * 1024 * 1024);
