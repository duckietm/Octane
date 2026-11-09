import { CSSProperties, FC, useEffect, useRef } from 'react';
import { NativeSkin, NativeSkinRect, planNativeSkin } from './NativeSkin';

const images = new Map<string, Promise<HTMLImageElement>>();

const loadImage = (url: string): Promise<HTMLImageElement> => {
    let image = images.get(url);

    if (!image) {
        image = new Promise((resolve, reject) => {
            const element = new Image();

            element.onload = () => resolve(element);
            element.onerror = reject;
            element.src = url;
        });
        images.set(url, image);
    }

    return image;
};

const tinted = new Map<string, HTMLCanvasElement>();

/** BitmapSkinRenderer colorTransform: every colour channel is multiplied by (window colour channel / 255), the alpha channel is kept; products are rounded (the native title bar 0xd7dbdc x 0x418db0 gives 0x377998). */
const tint = (image: HTMLImageElement, url: string, rect: NativeSkinRect, color: number): HTMLCanvasElement => {
    const key = `${url}|${rect.x},${rect.y},${rect.width},${rect.height}|${color}`;
    let canvas = tinted.get(key);

    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = rect.width;
        canvas.height = rect.height;

        const context = canvas.getContext('2d');

        context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

        const data = context.getImageData(0, 0, rect.width, rect.height);
        const red = (color >> 16) & 255;
        const green = (color >> 8) & 255;
        const blue = color & 255;

        for (let index = 0; index < data.data.length; index += 4) {
            data.data[index] = Math.round((data.data[index] * red) / 255);
            data.data[index + 1] = Math.round((data.data[index + 1] * green) / 255);
            data.data[index + 2] = Math.round((data.data[index + 2] * blue) / 255);
        }

        context.putImageData(data, 0, 0);
        tinted.set(key, canvas);
    }

    return canvas;
};

interface NativeSkinViewProps {
    skin: NativeSkin;
    layout: string;
    state?: string;
    atlas: string;
    width: number;
    height: number;
    /** Window colour (RGB): applied to every entity that is not `colorize="false"`; white or absent means no colour transform. */
    color?: number;
    /** Opaque layouts (transparent="false") are filled with this RGB colour before their entities are drawn. */
    fill?: number;
    className?: string;
    style?: CSSProperties;
}

/** Draws a window-manager skin layout at an exact size from its atlas bitmap, replicating the classic skin renderer's pixel operations. */
export const NativeSkinView: FC<NativeSkinViewProps> = ({ skin, layout, state = 'default', atlas, width, height, color, fill, className = '', style }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let disposed = false;

        loadImage(atlas).then((image) => {
            const canvas = canvasRef.current;

            if (disposed || !canvas) return;

            const context = canvas.getContext('2d');
            const plan = planNativeSkin(skin, layout, state, width, height);
            const useColor = color !== undefined && color !== null && (color & 0xffffff) < 0xffffff;

            context.clearRect(0, 0, width, height);

            if (fill !== undefined) {
                context.fillStyle = `#${(fill & 0xffffff).toString(16).padStart(6, '0')}`;
                context.fillRect(0, 0, width, height);
            }
            context.imageSmoothingEnabled = false;

            for (const draw of plan.draws) {
                const { source, destination } = draw;
                const surface: CanvasImageSource = useColor && draw.colorize ? tint(image, atlas, source, color) : image;
                const sx = useColor && draw.colorize ? 0 : source.x;
                const sy = useColor && draw.colorize ? 0 : source.y;
                const x = Math.floor(destination.x);
                const y = Math.floor(destination.y);

                if (draw.mode === 'copy') {
                    context.drawImage(surface, sx, sy, source.width, source.height, x, y, source.width, source.height);
                } else if (draw.mode === 'tile') {
                    const w = Math.floor(destination.width);
                    const h = Math.floor(destination.height);

                    for (let ty = 0; ty < h; ty += source.height)
                        for (let tx = 0; tx < w; tx += source.width)
                            context.drawImage(surface, sx, sy, Math.min(source.width, w - tx), Math.min(source.height, h - ty), x + tx, y + ty, Math.min(source.width, w - tx), Math.min(source.height, h - ty));
                } else {
                    context.drawImage(surface, sx, sy, source.width, source.height, x, y, Math.max(1, Math.floor(destination.width)), Math.max(1, Math.floor(destination.height)));
                }
            }
        });

        return () => {
            disposed = true;
        };
    }, [skin, layout, state, atlas, width, height, color, fill]);

    return <canvas ref={canvasRef} aria-hidden="true" className={`native-skin ${className}`.trim()} height={height} style={{ imageRendering: 'pixelated', ...style }} width={width} />;
};
