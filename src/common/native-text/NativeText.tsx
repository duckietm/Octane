import { CSSProperties, FC, useLayoutEffect, useRef, useState } from 'react';
import { compositeRetainedToOpaque, resolveLineMetrics } from './NativeTextRenderer';
import { renderCanvasSpacedText, supportsCanvasSpacedText } from './CanvasSpacedText';
import { loadNativeFont, measureNativeText, NativeFontStyle, peekNativeFont, supportsNativeText, unpremultiplyPixels } from './NativeFont';
import { useNativeTextSampling, useNativeTextScale } from './NativeTextScale';
import { nativeTextRasterCache } from './NativeTextRasterCache';
import { NativeTextStyleName, nativeTextStyles } from './NativeTextStyles';

/** A drawn raster handed to `onRaster`: the 1x or display-scale canvas, the text it shows and the surface colour it was composited against (null: transparent). */
export interface NativeTextRaster {
    canvas: HTMLCanvasElement;
    text: string;
    background: number | null;
}

export interface NativeTextProps {
    text: string;
    textStyle: NativeTextStyleName;
    /**
     * Native retained glyphs are composited against the actual surface colour. Null keeps the raster transparent and lets the browser blend
     * it over whatever is below (a skinned tab, a hover highlight); that lands within one colour level of the opaque composite.
     */
    background: number | null;
    maxWidth?: number;
    leading?: number;
    /** Line pitch in CSS pixels (the CSS line-height): each line is centred in it. Replaces `leading`. */
    lineHeight?: number;
    align?: 'left' | 'center' | 'right';
    overrides?: Partial<NativeFontStyle>;
    className?: string;
    style?: CSSProperties;
    /**
     * Draw the raster at the client's own resolution: always 1x, enlarged by the browser like the native stage (without smoothing on an integer
     * device pixel ratio, smoothed on a fractional one). The default keeps the sharper raster at the next whole display scale.
     */
    nativeResolution?: boolean;
    /** Told when a raster is drawn and, with null, when it is dropped (text change, fallback). Default texts pass nothing. */
    onRaster?: (raster: NativeTextRaster | null) => void;
}

// TextField.wrapText preserves whitespace and splits a long token only when a
// whole empty line cannot hold it. Widths come from DefineFont3, never DOM text.
function wrapNativeParagraph(text: string, width: number, measure: (text: string) => number): string[] {
    if (!text) return [''];
    const lines: string[] = [];
    let line = '';
    const fitCharacters = (prefix: string, suffix: string) => {
        let lower = 0,
            upper = suffix.length;
        while (lower < upper) {
            const middle = Math.floor((lower + upper + 1) / 2);
            if (measure(prefix + suffix.slice(0, middle)) <= width) lower = middle;
            else upper = middle - 1;
        }
        return lower;
    };
    for (const token of text.split(/(\s+)/).filter(Boolean)) {
        let remaining = token;
        while (remaining) {
            if (measure(line + remaining) <= width) {
                line += remaining;
                break;
            }
            if (line) {
                if (/^\s+$/.test(token)) {
                    const count = fitCharacters(line, remaining);
                    line += remaining.slice(0, count);
                    remaining = remaining.slice(count);
                }
                lines.push(line);
                line = '';
                continue;
            }
            const count = Math.max(1, fitCharacters('', remaining));
            lines.push(remaining.slice(0, count));
            remaining = remaining.slice(count);
        }
    }
    if (line || !lines.length) lines.push(line);
    return lines;
}

/** A v75 TextField raster, retaining its 2px gutter and accessible DOM text. */
export const NativeText: FC<NativeTextProps> = ({
    text,
    textStyle,
    background,
    maxWidth,
    leading = 0,
    lineHeight: cssLineHeight,
    align,
    overrides,
    className,
    style,
    nativeResolution = false,
    onRaster
}) =>
{
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [size, setSize] = useState<{ width: number; height: number }>(null);
    const fontStyle = { ...nativeTextStyles[textStyle], ...overrides, background: background ?? undefined };
    const styleKey = JSON.stringify(fontStyle);
    const displayScale = useNativeTextScale();
    const sampling = useNativeTextSampling(nativeResolution);
    const scale = nativeResolution ? 1 : displayScale;
    const onRasterRef = useRef(onRaster);

    // Refreshed before the render effect below runs (declared first, so it runs first), like the other callback refs of the code base.
    useLayoutEffect(() =>
    {
        onRasterRef.current = onRaster;
    });

    useLayoutEffect(() => {
        let disposed = false;
        setSize(null);
        onRasterRef.current?.(null);
        const render = async () => {
            // Bound work before tokenisation or native layout. Oversized messages
            // retain the existing DOM text rather than being truncated.
            if (text.length > 8192 || !Number.isInteger(fontStyle.size) || fontStyle.size < 1 || fontStyle.size > 256) return;

            // An explicit letter spacing is drawn like the official client does it (its glyph renderer refuses spacing): the browser canvas, squeezed to the laid-out width.
            // Only the proven combination takes this branch (see supportsCanvasSpacedText); everything else keeps the native renderer below, spacing ignored as before.
            const spacedStyle = {
                family: fontStyle.family,
                size: fontStyle.size,
                bold: fontStyle.bold,
                italic: fontStyle.italic,
                color: fontStyle.color,
                letterSpacing: fontStyle.letterSpacing ?? 0
            };

            if (
                fontStyle.letterSpacing &&
                supportsCanvasSpacedText(spacedStyle, {
                    background,
                    maxWidth,
                    leading,
                    underline: fontStyle.underline,
                    etched: fontStyle.etchingColor !== undefined || fontStyle.etchingPosition !== undefined
                })
            ) {
                const spaced = await renderCanvasSpacedText(text, spacedStyle, scale).catch(() => null);

                if (disposed || !canvasRef.current) return;

                if (spaced) {
                    const canvas = canvasRef.current;

                    canvas.width = spaced.canvas.width;
                    canvas.height = spaced.canvas.height;
                    canvas.getContext('2d').drawImage(spaced.canvas as CanvasImageSource, 0, 0);
                    setSize({ width: spaced.width, height: spaced.height });
                    onRasterRef.current?.({ canvas, text, background });

                    return;
                }
            }

            // The same label drawn before (every "0" of a list, a window opened again) is copied, not rasterised again.
            const cacheKey = `${styleKey}|${background}|${maxWidth}|${leading}|${cssLineHeight}|${align}|${scale}|${text}`;
            const cached = nativeTextRasterCache.get(cacheKey);

            if (cached) {
                const canvas = canvasRef.current;

                if (!canvas) return;

                canvas.width = cached.image.width;
                canvas.height = cached.image.height;
                canvas.getContext('2d').putImageData(cached.image, 0, 0);
                setSize({ width: cached.width, height: cached.height });
                onRasterRef.current?.({ canvas, text, background });

                return;
            }

            // An already loaded font draws without awaiting, inside this layout effect, so a remounted label never shows a frame of browser text.
            const loaded = peekNativeFont(fontStyle) ?? (await loadNativeFont(fontStyle));
            if (disposed || !supportsNativeText(loaded.font, text.replace(/[\r\n]/g, ''))) return;
            const measure = (value: string) => measureNativeText(loaded.font, value, fontStyle);
            const width = maxWidth === undefined ? Infinity : Math.max(1, maxWidth - 4);
            const lines = text.split(/\r\n|\r|\n/).flatMap((paragraph) => wrapNativeParagraph(paragraph, width, measure));
            const metrics = resolveLineMetrics(loaded.font.swfFont, fontStyle.size, fontStyle.antiAliasType === 'normal');
            const lineHeight = cssLineHeight ? Math.max(cssLineHeight, metrics.textHeight) : metrics.textHeight + leading;
            const lineOffset = cssLineHeight ? Math.floor((lineHeight - metrics.textHeight) / 2) : 0;
            let textWidth = 0;
            for (const line of lines) textWidth = Math.max(textWidth, measure(line));
            const fieldWidth = Math.ceil(textWidth) + 4;
            const fieldHeight = Math.ceil(lines.length * lineHeight) + 4;
            // Keep the native text fallback for unsupported or excessively large fields.
            if (fieldWidth * fieldHeight > 2 * 1024 * 1024) return;
            // Layout stays in CSS pixels; the raster is drawn at the display scale (see NativeTextScale),
            // as wide as the lines measure at that size.
            const scaledStyle = { ...fontStyle, size: fontStyle.size * scale };
            const pixelWidth = Math.max(fieldWidth * scale, ...lines.map((line) => Math.ceil(measureNativeText(loaded.font, line, scaledStyle)) + 4 * scale));
            const pixelHeight = fieldHeight * scale;
            const pixels = new Uint8ClampedArray(pixelWidth * pixelHeight * 4);
            lines.forEach((line, index) =>
                loaded.renderer.render(line, {
                    size: fontStyle.size * scale,
                    color: fontStyle.color ?? 0,
                    antiAliasType: fontStyle.antiAliasType ?? 'advanced',
                    gridFitType: 'pixel',
                    thickness: fontStyle.thickness ?? 0,
                    sharpness: fontStyle.sharpness ?? 0,
                    kerning: fontStyle.kerning ?? true,
                    fontStyle: fontStyle.italic ? 'italic' : 'normal',
                    stageQuality: 'high',
                    renderingPipeline: 'habbo-retained',
                    rasterCache: loaded.rasterCache,
                    etchingColor: fontStyle.etchingColor,
                    etchingPosition: fontStyle.etchingPosition,
                    textDecoration: fontStyle.underline ? 'underline' : null,
                    // Each line gets a local surface view: the native renderer's
                    // etching pass is relative to that surface, not target.offsetY.
                    target: {
                        pixels: pixels.subarray((Math.round(index * lineHeight) + lineOffset) * scale * pixelWidth * 4),
                        width: pixelWidth,
                        height: pixelHeight - (Math.round(index * lineHeight) + lineOffset) * scale,
                        offsetX:
                            align === 'center'
                                ? Math.round((pixelWidth - 4 * scale - measureNativeText(loaded.font, line, scaledStyle)) / 2)
                                : align === 'right'
                                    ? Math.round(pixelWidth - 4 * scale - measureNativeText(loaded.font, line, scaledStyle))
                                    : 0
                    }
                })
            );
            if (disposed || !canvasRef.current) return;
            const canvas = canvasRef.current;
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
            const composited =
                background === null
                    ? unpremultiplyPixels(pixels)
                    : compositeRetainedToOpaque(pixels, [(background >>> 16) & 255, (background >>> 8) & 255, background & 255, 255]);
            const image = new ImageData(composited, pixelWidth, pixelHeight);
            canvas.getContext('2d').putImageData(image, 0, 0);
            nativeTextRasterCache.set(cacheKey, { image, width: pixelWidth / scale, height: fieldHeight });
            setSize({ width: pixelWidth / scale, height: fieldHeight });
            onRasterRef.current?.({ canvas, text, background });
        };
        render().catch((error) => {
            if (!disposed) console.warn('Native text rendering failed', error);
        });
        return () => {
            disposed = true;
        };
    }, [text, textStyle, styleKey, maxWidth, leading, cssLineHeight, align, scale]);

    return (
        <span
            className={className}
            data-native-text={size ? textStyle : 'fallback'}
            style={{ display: 'inline-block', verticalAlign: 'top', position: 'relative', ...size, ...(align ? { textAlign: align } : {}), ...style }}
        >
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                style={{ display: size ? 'block' : 'none', width: size?.width, height: size?.height, imageRendering: nativeResolution ? sampling : scale > 1 ? 'auto' : 'pixelated' }}
            />
            <span
                style={
                    size
                        ? { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'pre' }
                        : { font: 'inherit', color: 'inherit', lineHeight: 'normal', whiteSpace: 'pre-wrap' }
                }
            >
                {text}
            </span>
        </span>
    );
};
