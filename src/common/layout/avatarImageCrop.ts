export interface OpaqueBounds
{
    x: number;
    y: number;
    width: number;
    height: number;
}

export const findOpaqueBounds = (pixels: Uint8ClampedArray, width: number, height: number): OpaqueBounds =>
{
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;

    for(let y = 0; y < height; y++)
    {
        for(let x = 0; x < width; x++)
        {
            if(pixels[((y * width) + x) * 4 + 3] === 0) continue;
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
        }
    }

    if(right < left || bottom < top) return { x: 0, y: 0, width, height };
    return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
};

export const fitBoundsIntoSquare = (bounds: OpaqueBounds, size: number = 22, padding: number = 1): OpaqueBounds =>
{
    const availableSize = Math.max(1, size - (padding * 2));
    const scale = Math.min(availableSize / bounds.width, availableSize / bounds.height);
    const width = Math.max(1, Math.round(bounds.width * scale));
    const height = Math.max(1, Math.round(bounds.height * scale));

    return { x: Math.floor((size - width) / 2), y: Math.floor((size - height) / 2), width, height };
};

/**
 * Crops the transparent border off an image at native resolution (no
 * scaling). Full-body avatar canvases are 90x130 with the figure occupying
 * only part of it — and not always centered — so tile layouts that
 * object-fit the raw canvas end up with tiny, drifting figures. Returns the
 * original url unchanged when nothing can be cropped.
 */
export const cropOpaqueBoundsImageUrl = (imageUrl: string, padding: number = 2): Promise<string> => new Promise(resolve =>
{
    const image = new Image();
    image.onload = () =>
    {
        try
        {
            const source = document.createElement('canvas');
            source.width = image.naturalWidth;
            source.height = image.naturalHeight;
            const sourceContext = source.getContext('2d', { willReadFrequently: true });
            if(!sourceContext) return resolve(imageUrl);
            sourceContext.drawImage(image, 0, 0);
            const bounds = findOpaqueBounds(sourceContext.getImageData(0, 0, source.width, source.height).data, source.width, source.height);
            const x = Math.max(0, bounds.x - padding);
            const y = Math.max(0, bounds.y - padding);
            const width = Math.min(source.width - x, bounds.width + (padding * 2));
            const height = Math.min(source.height - y, bounds.height + (padding * 2));
            if((width >= source.width) && (height >= source.height)) return resolve(imageUrl);
            const output = document.createElement('canvas');
            output.width = width;
            output.height = height;
            const outputContext = output.getContext('2d');
            if(!outputContext) return resolve(imageUrl);
            outputContext.imageSmoothingEnabled = false;
            outputContext.drawImage(source, x, y, width, height, 0, 0, width, height);
            resolve(output.toDataURL('image/png'));
        }
        catch
        {
            resolve(imageUrl);
        }
    };
    image.onerror = () => resolve(imageUrl);
    image.src = imageUrl;
});

export const cropTransparentImageUrl = (imageUrl: string, targetSize: number = 22, padding: number = 1): Promise<string> => new Promise(resolve =>
{
    const image = new Image();
    image.onload = () =>
    {
        try
        {
            const source = document.createElement('canvas');
            source.width = image.naturalWidth;
            source.height = image.naturalHeight;
            const sourceContext = source.getContext('2d', { willReadFrequently: true });
            if(!sourceContext) return resolve(imageUrl);
            sourceContext.drawImage(image, 0, 0);
            const bounds = findOpaqueBounds(sourceContext.getImageData(0, 0, source.width, source.height).data, source.width, source.height);
            const destination = fitBoundsIntoSquare(bounds, targetSize, padding);
            const output = document.createElement('canvas');
            output.width = targetSize;
            output.height = targetSize;
            const outputContext = output.getContext('2d');
            if(!outputContext) return resolve(imageUrl);
            outputContext.imageSmoothingEnabled = true;
            outputContext.imageSmoothingQuality = 'high';
            outputContext.drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height, destination.x, destination.y, destination.width, destination.height);
            resolve(output.toDataURL('image/png'));
        }
        catch
        {
            resolve(imageUrl);
        }
    };
    image.onerror = () => resolve(imageUrl);
    image.src = imageUrl;
});

/**
 * Decodes a `data:` url into a Blob so the bytes can be cached once and
 * shown through object urls instead of a base64 string per consumer.
 * Returns null for anything that is not a data url.
 */
export const dataUrlToBlob = (dataUrl: string): Blob | null =>
{
    const separator = dataUrl.indexOf(',');

    if(!dataUrl.startsWith('data:') || (separator < 0)) return null;

    const header = dataUrl.slice('data:'.length, separator);
    const isBase64 = header.endsWith(';base64');
    const type = (isBase64 ? header.slice(0, -';base64'.length) : header) || 'text/plain';
    const payload = dataUrl.slice(separator + 1);

    try
    {
        const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
        const bytes = new Uint8Array(binary.length);

        for(let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        return new Blob([ bytes ], { type });
    }
    catch
    {
        return null;
    }
};

export const AIR_ME_MENU_FACE = {
    canvasWidth: 90,
    canvasHeight: 130,
    x: 21,
    y: 30,
    size: 50,
    circleRadius: 20
};

export const airMeMenuFaceScale = (naturalWidth: number, naturalHeight: number): number =>
{
    const horizontal = naturalWidth / AIR_ME_MENU_FACE.canvasWidth;
    const vertical = naturalHeight / AIR_ME_MENU_FACE.canvasHeight;
    const scale = Math.min(horizontal, vertical);

    if(!Number.isFinite(scale) || (scale <= 0)) return 1;

    return scale;
};

export const scaledAirMeMenuFaceCrop = (naturalWidth: number, naturalHeight: number) =>
{
    const scale = airMeMenuFaceScale(naturalWidth, naturalHeight);

    return {
        sx: AIR_ME_MENU_FACE.x * scale,
        sy: AIR_ME_MENU_FACE.y * scale,
        sw: AIR_ME_MENU_FACE.size * scale,
        sh: AIR_ME_MENU_FACE.size * scale
    };
};

export const cropAirMeMenuFaceImageUrl = (imageUrl: string): Promise<string> => new Promise(resolve =>
{
    const image = new Image();
    image.onload = () =>
    {
        try
        {
            const canvas = document.createElement('canvas');
            canvas.width = AIR_ME_MENU_FACE.size;
            canvas.height = AIR_ME_MENU_FACE.size;
            const context = canvas.getContext('2d');
            if(!context) return resolve(imageUrl);
            context.imageSmoothingEnabled = false;
            const crop = scaledAirMeMenuFaceCrop(image.naturalWidth, image.naturalHeight);
            // focusUserFace copies with BitmapData.copyPixels, which only
            // transfers the part of the window that overlaps the source and
            // leaves the rest transparent. Clamping the window and then
            // stretching it over the whole icon instead would distort the face.
            const sx = Math.max(0, Math.min(crop.sx, image.naturalWidth));
            const sy = Math.max(0, Math.min(crop.sy, image.naturalHeight));
            const sw = Math.max(0, Math.min(crop.sx + crop.sw, image.naturalWidth) - sx);
            const sh = Math.max(0, Math.min(crop.sy + crop.sh, image.naturalHeight) - sy);
            if((sw > 0) && (sh > 0))
            {
                const factor = AIR_ME_MENU_FACE.size / crop.sw;
                context.drawImage(image, sx, sy, sw, sh, (sx - crop.sx) * factor, (sy - crop.sy) * factor, sw * factor, sh * factor);
            }
            context.globalCompositeOperation = 'destination-in';
            context.beginPath();
            context.arc(AIR_ME_MENU_FACE.size / 2, AIR_ME_MENU_FACE.size / 2, AIR_ME_MENU_FACE.circleRadius, 0, Math.PI * 2);
            context.fill();
            resolve(canvas.toDataURL('image/png'));
        }
        catch
        {
            resolve(imageUrl);
        }
    };
    image.onerror = () => resolve(imageUrl);
    image.src = imageUrl;
});
