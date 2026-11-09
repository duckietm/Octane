import { GetRenderer, GetTicker, OctaneLogger, OctaneTicker, RoomPreviewer, TextureUtils } from '@octane/renderer';
import { FC, useEffect, useRef } from 'react';
import { GetAnimationFrameInterval } from '../../api/octane/room/AddAnimationTickerCallback';
import { PIXEL_ART_RENDERING } from './PixelArtRendering';

type BackdropColor = [number, number, number, number];

// AIR puts the preview canvas on the display list, so additive layers (lamp
// glows) blend onto the window behind it. This view renders into a texture
// first, where an additive layer over a transparent pixel turns opaque black.
// Clear the texture with the backdrop colour so it composites like AIR.
// A backdrop image cannot be reproduced, so the texture stays transparent then.
export const resolvePreviewBackdropColor = (element: HTMLElement): BackdropColor | null => {
    for (let node: HTMLElement | null = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);

        if (style.backgroundImage && style.backgroundImage !== 'none') return null;

        const match = style.backgroundColor.match(/rgba?\(([^)]+)\)/);

        if (!match) continue;

        const [r, g, b, a = 1] = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);

        if (!a) continue;
        if (a < 1) return null;

        return [r / 255, g / 255, b / 255, 1];
    }

    return null;
};

export const LayoutRoomPreviewerView: FC<{
    roomPreviewer: RoomPreviewer;
    height?: number;
    fitParent?: boolean;
    onPreviewClick?: () => void;
}> = (props) => {
    const { roomPreviewer = null, height = 0, fitParent = false, onPreviewClick } = props;
    const elementRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Consecutive render failures before the preview stops rendering: a transient bad
    // frame recovers, a wedged previewer stops throwing every animation frame.
    const renderFailuresRef = useRef(0);
    const MAX_RENDER_FAILURES = 6;

    const onClick = () => {
        if (onPreviewClick) {
            onPreviewClick();
            return;
        }
        if (!roomPreviewer) return;

        roomPreviewer.changeRoomObjectState();
    };

    useEffect(() => {
        const element = elementRef.current;
        const canvas = canvasRef.current;
        const parent = element?.parentElement;

        if (!roomPreviewer || !element || !canvas || !parent || (!fitParent && height <= 0)) return;

        const context = canvas.getContext('2d');

        if (!context) return;

        let textureWidth = 0;
        let textureHeight = 0;
        let texture: ReturnType<typeof TextureUtils.createRenderTexture> = null;
        let roomCanvasInitialized = false;
        let frameImageData: ImageData = null;
        let backdropColor: BackdropColor | null = null;

        renderFailuresRef.current = 0;

        const noteFailure = (label: string, error: unknown) => {
            renderFailuresRef.current += 1;

            if (renderFailuresRef.current >= MAX_RENDER_FAILURES) {
                OctaneLogger.error(
                    `LayoutRoomPreviewerView ${label} failed ${renderFailuresRef.current} times; disabling further renders for this preview`,
                    error
                );
            }
        };

        const paintToDOM = () => {
            if (!texture) return;

            const renderingCanvas = roomPreviewer.getRenderingCanvas();

            if (!renderingCanvas) return;

            GetRenderer().render({
                target: texture,
                container: renderingCanvas.master,
                clear: true,
                clearColor: backdropColor ?? [0, 0, 0, 0]
            });

            const { pixels, width, height: frameHeight } = GetRenderer().texture.getPixels(texture);

            if (canvas.width !== width || canvas.height !== frameHeight) {
                canvas.width = width;
                canvas.height = frameHeight;
                frameImageData = null;
            }

            if (!frameImageData || frameImageData.width !== width || frameImageData.height !== frameHeight) {
                frameImageData = context.createImageData(width, frameHeight);
            }

            frameImageData.data.set(pixels);
            context.putImageData(frameImageData, 0, 0);
        };

        // Repositioning follows the room's animation clock; the DOM paint below
        // still checks every frame so no rendered canvas update is skipped.
        const repositionInterval = GetAnimationFrameInterval();
        let repositionElapsed = repositionInterval;

        const update = (ticker: OctaneTicker) => {
            if (renderFailuresRef.current >= MAX_RENDER_FAILURES) return;

            const wasUpdated = !!roomPreviewer.getRenderingCanvas()?.canvasUpdated;

            repositionElapsed += ticker.deltaMS;

            if (repositionElapsed >= repositionInterval) {
                repositionElapsed %= repositionInterval;

                try {
                    roomPreviewer.updatePreviewRoomView();
                } catch (error) {
                    noteFailure('update', error);
                    return;
                }
            }

            const renderingCanvas = roomPreviewer.getRenderingCanvas();

            if (renderingCanvas && (wasUpdated || renderingCanvas.canvasUpdated)) {
                paintToDOM();
            }
        };

        const resizeToParent = () => {
            const width = Math.round(parent.clientWidth);
            const targetHeight = fitParent ? Math.round(parent.clientHeight) : height;

            backdropColor = resolvePreviewBackdropColor(element);

            if (width <= 0 || targetHeight <= 0 || (width === textureWidth && targetHeight === textureHeight)) return;

            const nextTexture = TextureUtils.createRenderTexture(width, targetHeight);

            if (!nextTexture) return;

            const previousTexture = texture;

            texture = nextTexture;
            textureWidth = width;
            textureHeight = targetHeight;
            frameImageData = null;

            if (roomCanvasInitialized) roomPreviewer.modifyRoomCanvas(width, targetHeight);
            else {
                roomPreviewer.getRoomCanvas(width, targetHeight);
                roomCanvasInitialized = true;
            }

            previousTexture?.destroy(true);

            paintToDOM();
        };

        const resizeObserver = new ResizeObserver(resizeToParent);

        resizeToParent();
        GetTicker().add(update);

        resizeObserver.observe(fitParent ? parent : element);

        return () => {
            GetTicker().remove(update);

            resizeObserver.disconnect();

            texture?.destroy(true);
        };
    }, [roomPreviewer, height, fitParent]);

    return (
        <div
            ref={elementRef}
            className="relative w-full overflow-hidden rounded-md shadow-room-previewer"
            style={{
                height: fitParent ? '100%' : height,
                minHeight: fitParent ? 0 : height,
                maxHeight: fitParent ? undefined : height
            }}
            onClick={onClick}
        >
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                className="shadow-room-previewer-canvas"
                style={{ display: 'block', width: '100%', height: '100%', imageRendering: PIXEL_ART_RENDERING }}
            />
        </div>
    );
};
