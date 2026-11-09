import { GetRenderer, GetRoomEngine, OctaneRectangle, TextureUtils } from '@octane/renderer';

/**
 * AIR CameraViewFinder.update() snapshots the room display object
 * (snapshotRoomCanvasToBitmap), not the WebGL backbuffer. Copying
 * GetRenderer().canvas every animation frame flickers because the
 * drawing buffer is cleared after present.
 *
 * generateTexture.frame is in the room master's local pixels. Map the
 * viewfinder from CSS into that space: canvas.width / resolution is the
 * logical renderer size (not the backing-store scale), then invert the
 * master's world transform when it is not identity.
 *
 * Pass explicit width/height (AIR 320×320 / 110×110) so a subpixel CSS
 * rect cannot resize and clear the 2D canvas.
 *
 * The readback is the expensive part, so it only happens when the room
 * canvas reported a content change since the last blit or the viewfinder
 * frame moved. `canvasUpdated` only describes the most recent render, so
 * callers invoke this every animation frame and pass `minIntervalMs` to
 * keep their cadence; the flag is sampled on every call and accumulated
 * until the next blit is due.
 */
interface ViewfinderState {
    dirty: boolean;
    frameKey: string;
    lastBlitAt: number;
}

const viewfinderStates = new WeakMap<HTMLCanvasElement, ViewfinderState>();

const getViewfinderState = (target: HTMLCanvasElement): ViewfinderState =>
{
    let state = viewfinderStates.get(target);

    if(!state)
    {
        state = { dirty: true, frameKey: '', lastBlitAt: -Infinity };
        viewfinderStates.set(target, state);
    }

    return state;
};

const toMasterLocal = (master: { worldTransform?: { applyInverse?: (point: { x: number; y: number }) => { x: number; y: number } } }, screenX: number, screenY: number): { x: number; y: number } =>
{
    const inverse = master?.worldTransform?.applyInverse;

    if(typeof inverse === 'function')
    {
        const point = inverse.call(master.worldTransform, { x: screenX, y: screenY });

        return { x: point.x, y: point.y };
    }

    return { x: screenX, y: screenY };
};

export const getViewfinderRoomFrame = (target: HTMLCanvasElement | null, width?: number, height?: number): InstanceType<typeof OctaneRectangle> | null =>
{
    if(!target) return null;

    try
    {
        const master = GetRoomEngine()?.getActiveRoomInstanceRenderingCanvas?.()?.master;
        const renderer = GetRenderer();
        const source = renderer?.canvas as HTMLCanvasElement | undefined;

        if(!master || !source) return null;

        const srcRect = source.getBoundingClientRect();
        const dstRect = target.getBoundingClientRect();

        if(srcRect.width <= 0 || srcRect.height <= 0 || dstRect.width <= 0 || dstRect.height <= 0) return null;

        const bufferWidth = width ?? Math.max(1, Math.round(dstRect.width));
        const bufferHeight = height ?? Math.max(1, Math.round(dstRect.height));
        const resolution = Number(renderer?.resolution) || 1;
        const logicalWidth = (source.width > 0) ? (source.width / resolution) : srcRect.width;
        const logicalHeight = (source.height > 0) ? (source.height / resolution) : srcRect.height;
        const scaleX = logicalWidth / srcRect.width;
        const scaleY = logicalHeight / srcRect.height;
        const screenX = (dstRect.left - srcRect.left) * scaleX;
        const screenY = (dstRect.top - srcRect.top) * scaleY;
        const screenW = bufferWidth * scaleX;
        const screenH = bufferHeight * scaleY;
        const topLeft = toMasterLocal(master, screenX, screenY);
        const bottomRight = toMasterLocal(master, screenX + screenW, screenY + screenH);
        const x = Math.round(Math.min(topLeft.x, bottomRight.x));
        const y = Math.round(Math.min(topLeft.y, bottomRight.y));
        const frameWidth = Math.max(1, Math.round(Math.abs(bottomRight.x - topLeft.x)));
        const frameHeight = Math.max(1, Math.round(Math.abs(bottomRight.y - topLeft.y)));

        return new OctaneRectangle(x, y, frameWidth, frameHeight);
    }
    catch
    {
        return null;
    }
};

export const blitRoomCanvasToViewfinder = (target: HTMLCanvasElement | null, width?: number, height?: number, minIntervalMs: number = 0, now: number = performance.now()): boolean =>
{
    if(!target) return false;
    if((typeof document !== 'undefined') && document.hidden) return false;

    try
    {
        const roomCanvas = GetRoomEngine()?.getActiveRoomInstanceRenderingCanvas?.();
        const master = roomCanvas?.master;

        if(!master) return false;

        const state = getViewfinderState(target);

        if(roomCanvas.canvasUpdated) state.dirty = true;

        if((now - state.lastBlitAt) < minIntervalMs) return false;

        const frame = getViewfinderRoomFrame(target, width, height);

        if(!frame) return false;

        const bufferWidth = width ?? frame.width;
        const bufferHeight = height ?? frame.height;
        const frameKey = `${ frame.x },${ frame.y },${ frame.width },${ frame.height },${ bufferWidth },${ bufferHeight }`;

        if(!state.dirty && (frameKey === state.frameKey)) return false;

        if(target.width !== bufferWidth) target.width = bufferWidth;
        if(target.height !== bufferHeight) target.height = bufferHeight;

        const snapshot = TextureUtils.generateTexture({
            target: master,
            frame,
            resolution: 1
        });

        if(!snapshot) return false;

        const extracted = TextureUtils.generateCanvas(snapshot) as CanvasImageSource | undefined;

        snapshot.destroy?.(true);

        const context = target.getContext('2d');

        if(!context || !extracted) return false;

        context.imageSmoothingEnabled = false;
        context.fillStyle = '#000000';
        context.fillRect(0, 0, bufferWidth, bufferHeight);
        context.drawImage(extracted, 0, 0, bufferWidth, bufferHeight);

        state.dirty = false;
        state.frameKey = frameKey;
        state.lastBlitAt = now;

        return true;
    }
    catch
    {
        return false;
    }
};
