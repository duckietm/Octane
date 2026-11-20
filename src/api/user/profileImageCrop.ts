/** What an uploaded picture becomes: the banner across the top, or the background of the window body. */
export type ProfileImageKind = 'banner' | 'background';

/** The size each kind is saved at: twice the size it is shown at, so it stays sharp on high density screens. */
export const PROFILE_IMAGE_SIZE: Record<ProfileImageKind, { width: number; height: number }> = {
    banner: { width: 1280, height: 220 },
    background: { width: 1280, height: 1380 }
};

/** The server refuses anything bigger (its HTTP requests stop at 500 000 bytes); the encoder lowers the quality until the picture fits. */
export const PROFILE_IMAGE_MAX_BYTES = 450 * 1024;

export const PROFILE_IMAGE_MAX_ZOOM = 8;

/** Where the picture sits in the frame: its scale, and the frame point its centre is on. */
export interface ProfileImagePlacement {
    scale: number;
    centerX: number;
    centerY: number;
}

export interface Size {
    width: number;
    height: number;
}

/** The scale at which the whole picture is visible. */
export const fitScale = (image: Size, frame: Size): number => Math.min(frame.width / image.width, frame.height / image.height);

/** The scale at which the picture covers the whole frame. */
export const fillScale = (image: Size, frame: Size): number => Math.max(frame.width / image.width, frame.height / image.height);

export const centeredPlacement = (image: Size, frame: Size, scale: number): ProfileImagePlacement => ({
    scale,
    centerX: frame.width / 2,
    centerY: frame.height / 2
});

/** A new picture starts centred and covering the frame. */
export const initialPlacement = (image: Size, frame: Size): ProfileImagePlacement => centeredPlacement(image, frame, fillScale(image, frame));

/**
 * Keeps the picture inside the frame: along an axis where it is larger than the frame no empty band
 * may show, along an axis where it is smaller it stays centred. The scale stays between the fitting
 * scale and PROFILE_IMAGE_MAX_ZOOM times the covering one.
 */
export const clampPlacement = (image: Size, frame: Size, placement: ProfileImagePlacement): ProfileImagePlacement => {
    const minScale = fitScale(image, frame);
    const maxScale = fillScale(image, frame) * PROFILE_IMAGE_MAX_ZOOM;
    const scale = Math.min(maxScale, Math.max(minScale, placement.scale));
    const clampAxis = (center: number, imageLength: number, frameLength: number) => {
        const half = (imageLength * scale) / 2;

        if (half * 2 <= frameLength) return frameLength / 2;

        return Math.min(half, Math.max(frameLength - half, center));
    };

    return {
        scale,
        centerX: clampAxis(placement.centerX, image.width, frame.width),
        centerY: clampAxis(placement.centerY, image.height, frame.height)
    };
};

/** Zooms around a frame point (the pointer, or the centre), so that point stays where it is. */
export const zoomPlacement = (image: Size, frame: Size, placement: ProfileImagePlacement, scale: number, anchorX = frame.width / 2, anchorY = frame.height / 2): ProfileImagePlacement => {
    const ratio = scale / placement.scale;

    return clampPlacement(image, frame, {
        scale,
        centerX: anchorX + (placement.centerX - anchorX) * ratio,
        centerY: anchorY + (placement.centerY - anchorY) * ratio
    });
};

/** The rectangle the picture covers in frame coordinates. */
export const placedRect = (image: Size, placement: ProfileImagePlacement) => {
    const width = image.width * placement.scale;
    const height = image.height * placement.scale;

    return { x: placement.centerX - width / 2, y: placement.centerY - height / 2, width, height };
};

/** True when the picture leaves part of the frame empty. */
export const leavesEmptyBands = (image: Size, frame: Size, placement: ProfileImagePlacement): boolean =>
    image.width * placement.scale < frame.width - 0.5 || image.height * placement.scale < frame.height - 0.5;

export interface DrawOptions {
    /** Nearest-neighbour scaling, for pixel art. */
    pixelated: boolean;
}

/**
 * Draws the picture into a frame-sized canvas. Where it leaves empty bands they are filled with a
 * blurred, enlarged copy of the same picture, so a small or narrow picture still looks finished.
 */
export const drawProfileImage = (context: CanvasRenderingContext2D, image: CanvasImageSource, size: Size, frame: Size, placement: ProfileImagePlacement, options: DrawOptions): void => {
    context.save();
    context.clearRect(0, 0, frame.width, frame.height);

    if (leavesEmptyBands(size, frame, placement)) {
        const cover = placedRect(size, centeredPlacement(size, frame, fillScale(size, frame) * 1.1));

        context.imageSmoothingEnabled = true;
        context.filter = 'blur(24px) brightness(0.85)';
        context.drawImage(image, cover.x, cover.y, cover.width, cover.height);
        context.filter = 'none';
    }

    const rect = placedRect(size, placement);

    context.imageSmoothingEnabled = !options.pixelated;
    if (!options.pixelated) context.imageSmoothingQuality = 'high';
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
    context.restore();
};

/** Encodes the frame as JPEG, lowering the quality until it fits PROFILE_IMAGE_MAX_BYTES. */
export const encodeProfileImage = async (canvas: HTMLCanvasElement, maxBytes = PROFILE_IMAGE_MAX_BYTES): Promise<Uint8Array | null> => {
    for (const quality of [0.92, 0.86, 0.8, 0.72, 0.64, 0.55]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

        if (!blob) return null;
        if (blob.size <= maxBytes) return new Uint8Array(await blob.arrayBuffer());
    }

    return null;
};

/** Pictures the editor accepts; the server re-encodes whatever it gets anyway. */
export const PROFILE_IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';

/** Larger files are refused before they are read, so a huge photo cannot stall the client. */
export const PROFILE_IMAGE_MAX_SOURCE_BYTES = 15 * 1024 * 1024;
