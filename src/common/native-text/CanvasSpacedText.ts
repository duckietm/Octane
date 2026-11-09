// Text with an explicit letter spacing, drawn like the official classic-js v75 client does it. Its AIR32 glyph renderer refuses a non-zero
// letterSpacing (Wc.supports), so the client falls back to the browser canvas: the whole string is one fillText whose maxWidth is the laid-out
// width (glyphs are squeezed, never spaced), drawn on a 2x canvas with a per-font vertical scale found by a calibration search, then downscaled
// with smoothing "high". Measuring, field size, baseline and the calibration below follow the client's TextField (HabboAirLauncher.app.js:
// _r121392d1d01cef, _r64aca03d869337, _r7b5b881a01c0c8, _rdfb691d66bce08, _ref22c5ac98e5b8) and its vertical calibrator (class uZ).
// The pixels come from the browser's own text rasteriser, so they match the client only in the same browser and platform. Real AIR output is not proven.
//
// Options the client's canvas fallback ignores on purpose, so they are ignored here too (changing the raster for them would diverge from the client):
// sharpness, thickness, kerning (the canvas kerns with fontKerning "auto"; the layout's kerning=false only parametrises its AIR32 renderer), antiAliasType and
// gridFitType. Options it does not draw this way (underline, etching, leading, italic, another colour or surface) are declined by supportsCanvasSpacedText.

const FONT_URLS = {
    regular: new URL('../../assets/webfonts/Ubuntu.ttf', import.meta.url).href,
    bold: new URL('../../assets/webfonts/Ubuntu-b.ttf', import.meta.url).href,
    italic: new URL('../../assets/webfonts/Ubuntu-i.ttf', import.meta.url).href,
    boldItalic: new URL('../../assets/webfonts/Ubuntu-ib.ttf', import.meta.url).href
};

const GUTTER = 2;
const RIGHT_MARGIN = 1;
const BOTTOM_MARGIN = 1;
const TOP_MARGIN = 2;
const SUPERSAMPLE = 2;
const HIGH_RESOLUTION = 6;

export interface CanvasSpacedTextStyle {
    family: string;
    size: number;
    bold?: boolean;
    italic?: boolean;
    color?: number;
    letterSpacing: number;
}

export interface CanvasSpacedTextRaster {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    /** Field size in layout pixels; the canvas is `scale` times larger. */
    width: number;
    height: number;
}

interface VerticalMetrics {
    ascent: number;
    descent: number;
    lineHeight: number;
}

type Canvas = HTMLCanvasElement | OffscreenCanvas;
type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** The native text renderer's own field limit (NativeText skips a field above 2 MP); every canvas here, large or probe, is held to it before it is created. */
const MAX_CANVAS_PIXELS = 2 * 1024 * 1024;
const MAX_CANVAS_SIDE = 16384;
const MAX_FONT_SIZE = 256;
const MAX_LETTER_SPACING = 64;
const MAX_SCALE = 4;

const createCanvas = (width: number, height: number): Canvas | null => {
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;

    const w = Math.max(1, Math.ceil(width));
    const h = Math.max(1, Math.ceil(height));

    if (w > MAX_CANVAS_SIDE || h > MAX_CANVAS_SIDE || w * h > MAX_CANVAS_PIXELS) return null;

    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);

    if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');

        canvas.width = w;
        canvas.height = h;

        return canvas;
    }

    return null;
};

const contextOf = (canvas: Canvas | null): Context | null => (canvas?.getContext('2d', { willReadFrequently: true }) as Context) ?? null;

const fontString = (style: Pick<CanvasSpacedTextStyle, 'size' | 'bold' | 'italic' | 'family'>) =>
    `${style.italic ? 'italic ' : ''}${style.bold ? 'bold ' : ''}${style.size}px ${style.family}`;

const fontUrl = (style: Pick<CanvasSpacedTextStyle, 'bold' | 'italic'>) =>
    style.bold ? (style.italic ? FONT_URLS.boldItalic : FONT_URLS.bold) : style.italic ? FONT_URLS.italic : FONT_URLS.regular;

let measureContext: Context | null | undefined;

const getMeasureContext = () => {
    if (measureContext === undefined) measureContext = contextOf(createCanvas(1, 1));

    return measureContext;
};

export interface CanvasSpacedTextSurface {
    /** The surface colour NativeText was asked to composite against. */
    background: number;
    maxWidth?: number;
    leading?: number;
    underline?: boolean;
    etched?: boolean;
}

/**
 * The only combination proven against the client: white text on a black surface (the promo's screen-blended composition), one line, no
 * underline/etching/leading/italic, a finite integer size and a finite spacing. Anything else keeps the existing native renderer.
 */
export const supportsCanvasSpacedText = (style: CanvasSpacedTextStyle, surface: CanvasSpacedTextSurface): boolean =>
    style.family === 'Ubuntu' &&
    Number.isInteger(style.size) &&
    style.size >= 1 &&
    style.size <= MAX_FONT_SIZE &&
    Number.isFinite(style.letterSpacing) &&
    style.letterSpacing !== 0 &&
    Math.abs(style.letterSpacing) <= MAX_LETTER_SPACING &&
    !style.italic &&
    (style.color ?? 0) === 0xffffff &&
    surface.background === 0x000000 &&
    surface.maxWidth === undefined &&
    !surface.leading &&
    !surface.underline &&
    !surface.etched;

/** The client measures a line with the 2D context (kerning auto) and adds the spacing between UTF-16 units: ceil(width + letterSpacing * (length - 1)). */
export const measureCanvasSpacedText = (text: string, style: CanvasSpacedTextStyle): number | null => {
    if (text.length === 0) return 0;

    const context = getMeasureContext();

    if (!context) return null;

    context.font = fontString(style);

    const spacing = style.letterSpacing !== 0 && text.length > 1 ? style.letterSpacing * (text.length - 1) : 0;
    const width = Math.max(0, Math.ceil(context.measureText(text).width + spacing));

    return Number.isFinite(width) ? width : null;
};

// Ascender / descender / line gap of the font file: OS/2 typo values when USE_TYPO_METRICS is set, else hhea with a line gap of 0 (the client's H0r).
const readVerticalMetrics = (buffer: ArrayBuffer) => {
    const view = new DataView(buffer);
    const count = view.getUint16(4);
    const tables = new Map<string, number>();

    for (let index = 0; index < count; index++) {
        const offset = 12 + index * 16;
        let tag = '';

        for (let character = 0; character < 4; character++) tag += String.fromCharCode(view.getUint8(offset + character));

        tables.set(tag, view.getUint32(offset + 8));
    }

    const head = tables.get('head');
    const hhea = tables.get('hhea');
    const os2 = tables.get('OS/2');

    if (head === undefined || hhea === undefined) return null;

    const unitsPerEm = Math.max(1, view.getUint16(head + 18));
    const hheaAscender = view.getInt16(hhea + 4);
    const hheaDescender = view.getInt16(hhea + 6);

    if (os2 !== undefined && (view.getUint16(os2 + 62) & 128) !== 0) {
        return { unitsPerEm, ascender: view.getInt16(os2 + 68), descender: view.getInt16(os2 + 70), lineGap: view.getInt16(os2 + 72) };
    }

    return { unitsPerEm, ascender: hheaAscender, descender: hheaDescender, lineGap: 0 };
};

const metricsCache = new Map<string, Promise<ReturnType<typeof readVerticalMetrics>>>();

const loadVerticalMetrics = (style: Pick<CanvasSpacedTextStyle, 'bold' | 'italic'>) => {
    const url = fontUrl(style);
    let cached = metricsCache.get(url);

    if (!cached) {
        cached = fetch(url).then(async (response) => {
            if (!response.ok) throw new Error(`Ubuntu font ${url}: HTTP ${response.status}`);

            return readVerticalMetrics(await response.arrayBuffer());
        });
        metricsCache.set(url, cached);
        cached.catch(() => metricsCache.delete(url));
    }

    return cached;
};

const scaleMetrics = (raw: NonNullable<ReturnType<typeof readVerticalMetrics>>, size: number): VerticalMetrics => {
    const factor = size / Math.max(1, raw.unitsPerEm);
    const ascent = raw.ascender * factor;
    const descent = Math.abs(raw.descender) * factor;

    return { ascent, descent, lineHeight: ascent + descent + raw.lineGap * factor };
};

// ---- the client's vertical calibration (class uZ): the glyph "o" is drawn on a 6x canvas, reduced to 2x and to 1x at a vertical scale, and the
// scale whose top and bottom ink rows are most solid wins; the search narrows a 12 point grid four times.

interface CalibrationSpec {
    key: string;
    font: string;
    size: number;
    resolution: number;
    highResolution: number;
}

interface InkProbe {
    top: number;
    bottom: number;
    centre: number;
    topScore: number;
    bottomScore: number;
}

const CALIBRATION_GLYPH = 'o';
const CALIBRATION_EXPLORATION = 1.2;
const CALIBRATION_SAMPLES = 12;
const CALIBRATION_ITERATIONS = 4;
const INK_ROW_THRESHOLD = 8;
const INK_COLUMN_THRESHOLD = 4;

const luminance = (data: Uint8ClampedArray, width: number, x: number, y: number) => {
    const index = (y * width + x) * 4;

    return 0.2126 * (data[index] ?? 0) + 0.7152 * (data[index + 1] ?? 0) + 0.0722 * (data[index + 2] ?? 0);
};

const strongestRun = (image: ImageData, row: number, threshold: number) => {
    let best: { start: number; end: number; strength: number } | null = null;
    let start = -1;
    let strength = 0;

    for (let x = 0; x < image.width; x++) {
        const value = luminance(image.data, image.width, x, row);

        if (value > threshold) {
            if (start < 0) {
                start = x;
                strength = 0;
            }

            strength += value;
            continue;
        }

        if (start >= 0) {
            const run = { start, end: x - 1, strength };

            if (best === null || run.strength > best.strength) best = run;

            start = -1;
            strength = 0;
        }
    }

    if (start >= 0) {
        const run = { start, end: image.width - 1, strength };

        if (best === null || run.strength > best.strength) best = run;
    }

    return best;
};

const scanColumn = (image: ImageData, x: number, from: number, step: number, threshold: number) => {
    for (let y = from; y >= 0 && y < image.height; y += step) if (luminance(image.data, image.width, x, y) > threshold) return y;

    return -1;
};

const probeInk = (image: ImageData): InkProbe | null => {
    let bottomRow = -1;

    for (let y = image.height - 1; y >= 0; y--) {
        if (strongestRun(image, y, INK_ROW_THRESHOLD) !== null) {
            bottomRow = y;
            break;
        }
    }

    if (bottomRow < 0) return null;

    const run = strongestRun(image, bottomRow, INK_ROW_THRESHOLD);

    if (run === null) return null;

    const column = Math.trunc((run.start + run.end) / 2);
    const bottom = scanColumn(image, column, image.height - 1, -1, INK_ROW_THRESHOLD);
    const top = scanColumn(image, column, 0, 1, INK_COLUMN_THRESHOLD);

    if (bottom < 0 || top < 0 || top >= bottom) return null;

    const half = Math.floor((bottom - top + 1) / 2);

    if (half <= 0) return null;

    const upperEnd = top + half - 1;
    const lowerStart = bottom - half + 1;
    let upperSum = 0;
    let lowerSum = 0;

    for (let offset = 0; offset < half; offset++) {
        const upper = luminance(image.data, image.width, column, top + offset);
        const lower = luminance(image.data, image.width, column, bottom - offset);

        upperSum += upper * upper;
        lowerSum += lower * lower;
    }

    const topScore = upperSum / half;
    const bottomScore = lowerSum / half;

    return { top, bottom, centre: (upperEnd + lowerStart) / 2, topScore, bottomScore };
};

const measureGlyph = (font: string) => {
    const context = getMeasureContext();

    if (!context) return { width: 12, ascent: 9, descent: 3 };

    context.font = font;

    const metrics = context.measureText(CALIBRATION_GLYPH);

    return {
        width: Math.max(1, metrics.width),
        ascent: Math.max(1, metrics.actualBoundingBoxAscent ?? metrics.fontBoundingBoxAscent ?? 9),
        descent: Math.max(1, metrics.actualBoundingBoxDescent ?? metrics.fontBoundingBoxDescent ?? 3)
    };
};

const marginX = (size: number) => Math.max(8, Math.ceil(size));
const marginY = (size: number) => Math.max(16, Math.ceil(size * 2));

const drawProbe = (spec: CalibrationSpec, scale: number, baselineOffset: number | null, storedOffset: number): ImageData | null => {
    const glyph = measureGlyph(spec.font);
    const sideMargin = marginX(spec.size);
    const verticalMargin = marginY(spec.size);
    const width = Math.max(16, Math.ceil(glyph.width) + sideMargin * 2);
    const height = Math.max(16, Math.ceil(glyph.ascent + glyph.descent) + verticalMargin * 2);
    const base = Math.max(1, spec.resolution);
    const high = Math.max(base, spec.highResolution);
    const highCanvas = createCanvas(width * high, height * high);
    const mediumCanvas = createCanvas(width * base, height * base);
    const finalCanvas = createCanvas(width, height);
    const highContext = contextOf(highCanvas);
    const mediumContext = contextOf(mediumCanvas);
    const finalContext = contextOf(finalCanvas);

    if (!highCanvas || !mediumCanvas || !finalCanvas || !highContext || !mediumContext || !finalContext) return null;

    const x = Math.max(sideMargin, Math.round((width - glyph.width) / 2));
    const baseline = verticalMargin + glyph.ascent;
    const offset = Math.max(0, baselineOffset ?? storedOffset);
    const lift = Math.max(0, baseline - offset);
    const drawHeight = mediumCanvas.height * scale;
    const drawTop = lift - lift * base * scale;

    highContext.setTransform(1, 0, 0, 1, 0, 0);
    highContext.clearRect(0, 0, highCanvas.width, highCanvas.height);
    highContext.fillStyle = '#000000';
    highContext.fillRect(0, 0, highCanvas.width, highCanvas.height);
    highContext.setTransform(high, 0, 0, high, 0, 0);
    highContext.textBaseline = 'alphabetic';
    highContext.font = spec.font;
    highContext.fillStyle = '#ffffff';
    highContext.fillText(CALIBRATION_GLYPH, x, baseline);

    mediumContext.setTransform(1, 0, 0, 1, 0, 0);
    mediumContext.clearRect(0, 0, mediumCanvas.width, mediumCanvas.height);
    mediumContext.fillStyle = '#000000';
    mediumContext.fillRect(0, 0, mediumCanvas.width, mediumCanvas.height);
    mediumContext.imageSmoothingEnabled = true;
    mediumContext.imageSmoothingQuality = 'high';
    mediumContext.drawImage(highCanvas as CanvasImageSource, 0, 0, mediumCanvas.width, mediumCanvas.height);

    finalContext.setTransform(1, 0, 0, 1, 0, 0);
    finalContext.clearRect(0, 0, width, height);
    finalContext.fillStyle = '#000000';
    finalContext.fillRect(0, 0, width, height);
    finalContext.imageSmoothingEnabled = true;
    finalContext.imageSmoothingQuality = 'high';
    finalContext.drawImage(mediumCanvas as CanvasImageSource, 0, drawTop, width, drawHeight);

    return finalContext.getImageData(0, 0, width, height);
};

const roundScale = (value: number) => Math.round(value * 1e12) / 1e12;

const gridBetween = (a: number, b: number, count: number) => {
    const low = Math.min(a, b);
    const high = Math.max(a, b);

    if (count <= 1 || Math.abs(high - low) <= Number.EPSILON) return [low];

    const step = (high - low) / (count - 1);

    return Array.from({ length: count }, (_, index) => low + step * index);
};

const neighbours = (values: number[], index: number) => {
    if (values.length <= 1 || index < 0 || index >= values.length) return null;

    let start = Math.max(0, index - 1);
    let end = Math.min(values.length - 1, index + 1);

    if (start === end) {
        if (end < values.length - 1) end++;
        else if (start > 0) start--;
    }

    return { start: values[start], end: values[end] };
};

const searchScale = (base: number, limit: number, evaluate: (scale: number) => InkProbe | null, pick: (probe: InkProbe) => number) => {
    let winner: number | null = null;
    let best = Number.NEGATIVE_INFINITY;
    let low = base;
    let high = limit;

    for (let iteration = 0; iteration < CALIBRATION_ITERATIONS; iteration++) {
        const grid = gridBetween(low, high, CALIBRATION_SAMPLES);
        let roundBest: number | null = null;
        let roundScore = Number.NEGATIVE_INFINITY;
        let roundIndex = -1;

        for (let index = 0; index < grid.length; index++) {
            const candidate = grid[index];
            const probe = evaluate(candidate);

            if (probe === null) continue;

            const score = pick(probe);

            if (!Number.isFinite(score)) continue;

            if (score > best) {
                best = score;
                winner = candidate;
            }

            if (score > roundScore) {
                roundScore = score;
                roundBest = candidate;
                roundIndex = index;
            }
        }

        if (roundBest === null || roundIndex < 0 || grid.length <= 1) break;

        const next = neighbours(grid, roundIndex);

        if (next === null) break;

        low = next.start;
        high = next.end;
    }

    return winner;
};

const baselineOffsetFor = (spec: CalibrationSpec, probe: InkProbe | null) => {
    if (probe === null) return 0;

    const glyph = measureGlyph(spec.font);

    return Math.max(0, marginY(spec.size) + glyph.ascent - probe.centre);
};

interface Calibration {
    scaleY: number;
    baselineOffset: number;
}

const calibrations = new Map<string, Calibration>();

/** The client's per-font vertical scale (1 / resolution when nothing better is found) and the baseline offset the draw subtracts. */
const calibrate = (spec: CalibrationSpec): Calibration | null => {
    const cached = calibrations.get(spec.key);

    if (cached) return cached;

    const base = 1 / Math.max(1, spec.resolution);
    const probeAt = (scale: number, offset: number | null) => {
        const image = drawProbe(spec, scale, offset, 0);

        return image === null ? null : probeInk(image);
    };
    const initial = probeAt(base, 0);

    // Without a probe (an allocation above the limit, an unreadable canvas) there is nothing to calibrate against: decline instead of drawing uncalibrated.
    if (initial === null) return null;

    const baselineOffset = baselineOffsetFor(spec, initial);
    const memo = new Map<number, InkProbe | null>();
    const evaluate = (scale: number) => {
        const key = roundScale(scale);

        if (memo.has(key)) return memo.get(key) ?? null;

        const probe = key === roundScale(base) ? initial : probeAt(scale, baselineOffset);

        memo.set(key, probe);

        return probe;
    };
    const start = Math.max(Number.EPSILON, base);
    const first = evaluate(start);
    const inkHeight = first === null ? 0 : Math.max(0, first.bottom - first.top + 1);
    const limit = inkHeight <= 0 ? start * CALIBRATION_EXPLORATION : start * ((inkHeight + 1) / inkHeight);
    const top = searchScale(start, limit, evaluate, (probe) => probe.topScore);
    const bottom = searchScale(start, limit, evaluate, (probe) => probe.bottomScore);
    const scaleY = top === null && bottom === null ? start : top === null ? (bottom ?? start) : bottom === null ? top : (top + bottom) / 2;
    const result = { scaleY, baselineOffset };

    calibrations.set(spec.key, result);

    return result;
};

/** The supersampled canvas and the downscale to layout pixels (times `scale`); null when the browser cannot draw it. */
export const renderCanvasSpacedText = async (text: string, style: CanvasSpacedTextStyle, scale = 1): Promise<CanvasSpacedTextRaster | null> => {
    if (!supportsCanvasSpacedText(style, { background: 0x000000 })) return null;

    if (text.length === 0 || /[\r\n]/.test(text) || typeof document === 'undefined' || !document.fonts) return null;

    if (!Number.isInteger(scale) || scale < 1 || scale > MAX_SCALE) return null;

    const font = fontString(style);

    await document.fonts.load(font, text);

    if (!document.fonts.check(font, text)) return null;

    const raw = await loadVerticalMetrics(style);

    if (!raw) return null;

    const textWidth = measureCanvasSpacedText(text, style);

    if (textWidth === null) return null;

    const vertical = scaleMetrics(raw, style.size);
    const width = Math.ceil(textWidth + GUTTER + RIGHT_MARGIN);
    const height = Math.ceil(vertical.lineHeight + TOP_MARGIN + BOTTOM_MARGIN);
    const resolution = SUPERSAMPLE * Math.max(1, scale);
    const spec: CalibrationSpec = { key: `${font}|${resolution}`, font, size: style.size, resolution, highResolution: Math.max(resolution, HIGH_RESOLUTION) };
    const calibration = calibrate(spec);

    if (calibration === null) return null;

    const { scaleY, baselineOffset } = calibration;
    const largeCanvas = createCanvas(width * resolution, height * resolution);
    const largeContext = contextOf(largeCanvas);
    const outputCanvas = createCanvas(width * scale, height * scale);
    const outputContext = contextOf(outputCanvas);

    if (!largeCanvas || !largeContext || !outputCanvas || !outputContext) return null;

    // The line's baseline: the gutter-less line top (2) plus the font's ascent, rounded, then lifted by the calibration offset.
    const baseline = Math.round(TOP_MARGIN + vertical.ascent);
    const lift = Math.max(0, baseline - baselineOffset);
    const maxWidth = Math.max(1, width - (GUTTER + RIGHT_MARGIN));
    const colour = ((style.color ?? 0) >>> 0) & 0xffffff;

    largeContext.setTransform(1, 0, 0, 1, 0, 0);
    largeContext.clearRect(0, 0, largeCanvas.width, largeCanvas.height);
    largeContext.imageSmoothingEnabled = false;
    largeContext.setTransform(resolution, 0, 0, resolution, 0, 0);
    largeContext.textBaseline = 'alphabetic';
    largeContext.font = font;
    largeContext.fillStyle = `#${colour.toString(16).padStart(6, '0')}`;

    if (Number.isFinite(scaleY) && Math.abs(scaleY - 1) > Number.EPSILON) {
        const o = Math.max(1, resolution);

        largeContext.setTransform(o, 0, 0, o * o * scaleY, 0, o * lift * (1 - o * scaleY));
    }

    largeContext.fillText(text, GUTTER, baseline, maxWidth);

    outputContext.setTransform(1, 0, 0, 1, 0, 0);
    outputContext.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    outputContext.imageSmoothingEnabled = true;
    outputContext.imageSmoothingQuality = 'high';
    outputContext.drawImage(largeCanvas as CanvasImageSource, 0, 0, outputCanvas.width, outputCanvas.height);

    return { canvas: outputCanvas, width, height };
};
