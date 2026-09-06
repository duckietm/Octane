import { GetRenderer, GetTicker, OctaneLogger, RoomPreviewer, TextureUtils } from '@octane/renderer';
import { FC, useEffect, useRef } from 'react';

export const LayoutRoomPreviewerView: FC<{
    roomPreviewer: RoomPreviewer;
    height?: number;
}> = (props) => {
    const { roomPreviewer = null, height = 0 } = props;
    const elementRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Counter that disables further renders once Pixi throws in this
    // previewer too many times in a row. The Pixi v8 null-texture bug
    // (see src/pixiPatch.ts) is mostly absorbed at the prototype level,
    // but any stray throw still cascades every animation frame. Allow
    // a small number of consecutive failures so a transient bad frame
    // self-recovers; permanently disable only if the previewer is truly
    // wedged, which is what produces the "disabling further renders"
    // log the user sees.
    const renderFailuresRef = useRef(0);
    const MAX_RENDER_FAILURES = 6;

    const onClick = () => {
        if (!roomPreviewer) return;

        roomPreviewer.changeRoomObjectState();
    };

    useEffect(() => {
        const element = elementRef.current;
        const canvas = canvasRef.current;
        const parent = element?.parentElement;

        if (!roomPreviewer || !element || !canvas || !parent || height <= 0) return;

        const context = canvas.getContext('2d');

        if (!context) return;

        renderFailuresRef.current = 0;

        let textureWidth = 0;
        let texture: ReturnType<typeof TextureUtils.createRenderTexture> = null;
        let roomCanvasInitialized = false;
        let frameImageData: ImageData = null;

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
            if (renderFailuresRef.current >= MAX_RENDER_FAILURES) return;
            if (!texture) return;

            const renderingCanvas = roomPreviewer.getRenderingCanvas();

            if (!renderingCanvas) return;

            try {
                GetRenderer().render({
                    target: texture,
                    container: renderingCanvas.master,
                    clear: true
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
                // A successful paint is the signal we've recovered from
                // a transient bad frame; reset the failure counter.
                renderFailuresRef.current = 0;
            } catch (error) {
                noteFailure('paint', error);
            }
        };

        const update = () => {
            if (renderFailuresRef.current >= MAX_RENDER_FAILURES) return;

            const wasUpdated = !!roomPreviewer.getRenderingCanvas()?.canvasUpdated;

            try {
                roomPreviewer.updatePreviewRoomView();
            } catch (error) {
                noteFailure('update', error);
                return;
            }

            const renderingCanvas = roomPreviewer.getRenderingCanvas();

            if (renderingCanvas && (wasUpdated || renderingCanvas.canvasUpdated)) {
                paintToDOM();
            }
        };

        const resizeToParent = () => {
            const width = Math.round(parent.clientWidth);

            if (width <= 0 || width === textureWidth) return;

            const nextTexture = TextureUtils.createRenderTexture(width, height);

            if (!nextTexture) return;

            const previousTexture = texture;

            texture = nextTexture;
            textureWidth = width;
            frameImageData = null;

            if (roomCanvasInitialized) roomPreviewer.modifyRoomCanvas(width, height);
            else {
                roomPreviewer.getRoomCanvas(width, height);
                roomCanvasInitialized = true;
            }

            previousTexture?.destroy(true);

            paintToDOM();
        };

        const resizeObserver = new ResizeObserver(resizeToParent);

        resizeToParent();
        GetTicker().add(update);

        resizeObserver.observe(element);

        return () => {
            GetTicker().remove(update);

            resizeObserver.disconnect();

            texture?.destroy(true);
        };
    }, [roomPreviewer, height]);

    return (
        <div
            ref={elementRef}
            className="relative w-full overflow-hidden rounded-md shadow-room-previewer"
            style={{
                height,
                minHeight: height,
                maxHeight: height
            }}
            onClick={onClick}
        >
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                className="shadow-room-previewer-canvas"
                style={{ display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated' }}
            />
        </div>
    );
};
