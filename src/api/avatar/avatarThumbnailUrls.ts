export interface ThumbnailUrlEntry {
    url: string;
    bytes: number;
    revoke: () => void;
}

export const THUMBNAIL_REVOKE_GRACE_MS = 30_000;

const canUseObjectUrls = (): boolean =>
    typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && typeof URL.revokeObjectURL === 'function';

const dataUrlEntry = (url: string): ThumbnailUrlEntry => ({ url, bytes: url.length * 2, revoke: () => undefined });

const blobEntry = (blob: Blob): ThumbnailUrlEntry => {
    const url = URL.createObjectURL(blob);

    return { url, bytes: blob.size, revoke: () => URL.revokeObjectURL(url) };
};

export const canvasToThumbnailUrl = async (canvas: HTMLCanvasElement): Promise<ThumbnailUrlEntry | null> => {
    if (!canvas || !canvas.width || !canvas.height) return null;

    if (canUseObjectUrls() && typeof canvas.toBlob === 'function') {
        const blob = await new Promise<Blob | null>((resolve) => {
            try {
                canvas.toBlob((result) => resolve(result), 'image/png');
            } catch {
                resolve(null);
            }
        });

        if (blob) return blobEntry(blob);
    }

    try {
        return dataUrlEntry(canvas.toDataURL('image/png'));
    } catch {
        return null;
    }
};

export const imageUrlToCanvas = async (imageUrl: string): Promise<HTMLCanvasElement | null> => {
    if (!imageUrl) return null;

    const image = new Image();

    try {
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error('thumbnail load failed'));
            image.src = imageUrl;
        });
    } catch {
        return null;
    }

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;

    if (!width || !height) return null;

    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) return null;

    context.drawImage(image, 0, 0);

    return canvas;
};

export const trimCanvasToOpaqueBounds = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const width = canvas?.width ?? 0;
    const height = canvas?.height ?? 0;

    if (!width || !height) return canvas;

    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) return canvas;

    let data: Uint8ClampedArray;

    try {
        data = context.getImageData(0, 0, width, height).data;
    } catch {
        return canvas;
    }

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (maxX < 0) return canvas;

    const trimmedWidth = maxX - minX + 1;
    const trimmedHeight = maxY - minY + 1;

    if (trimmedWidth === width && trimmedHeight === height) return canvas;

    const trimmed = document.createElement('canvas');

    trimmed.width = trimmedWidth;
    trimmed.height = trimmedHeight;

    const trimmedContext = trimmed.getContext('2d');

    if (!trimmedContext) return canvas;

    trimmedContext.drawImage(canvas, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);

    return trimmed;
};

export const centerCanvasIntoBox = (canvas: HTMLCanvasElement, box: number): HTMLCanvasElement => {
    const width = canvas?.width ?? 0;
    const height = canvas?.height ?? 0;

    if (!width || !height) return canvas;
    if (width === box && height === box) return canvas;

    const centered = document.createElement('canvas');

    centered.width = box;
    centered.height = box;

    const context = centered.getContext('2d');

    if (!context) return canvas;

    context.imageSmoothingEnabled = false;
    context.drawImage(canvas, Math.trunc((box - width) / 2), Math.trunc((box - height) / 2));

    return centered;
};

export class ThumbnailUrlCache {
    private _entries: Map<string, ThumbnailUrlEntry> = new Map();
    private _bytes: number = 0;

    constructor(private readonly _maxBytes: number) {}

    public get size(): number {
        return this._entries.size;
    }

    public get bytes(): number {
        return this._bytes;
    }

    public get(key: string): string | undefined {
        const entry = this._entries.get(key);

        if (!entry) return undefined;

        this._entries.delete(key);
        this._entries.set(key, entry);

        return entry.url;
    }

    public set(key: string, entry: ThumbnailUrlEntry): void {
        if (!entry) return;

        this.drop(key);

        while (this._bytes + entry.bytes > this._maxBytes && this._entries.size > 0) {
            const oldest = this._entries.keys().next().value as string;

            this.drop(oldest);
        }

        this._entries.set(key, entry);
        this._bytes += entry.bytes;
    }

    public clear(): void {
        for (const key of [...this._entries.keys()]) this.drop(key);

        this._bytes = 0;
    }

    private drop(key: string): void {
        const entry = this._entries.get(key);

        if (!entry) return;

        this._entries.delete(key);
        this._bytes -= entry.bytes;

        if (typeof setTimeout === 'function') setTimeout(entry.revoke, THUMBNAIL_REVOKE_GRACE_MS);
        else entry.revoke();
    }
}
