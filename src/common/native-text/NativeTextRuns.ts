/** Rasterizing a run of glyphs, normal and advanced, and compositing the glyphs of a line. */
import type {
    BytePixels,
    ColorChannels,
    CoverageRaster,
    CsmCutoffs,
    GlyphPlacement,
    NativeFont,
    NativeGlyph,
    NativeLineMetrics,
    SwfGlyph,
    TextColor
} from './NativeTextTypes';
import { blendComponent, isArray, isFiniteNumber, isSafeInteger, normalSampleCountToDensity, premultiplyColor, quantizeAlphaMultiplier } from './NativeTextMath';
import { rasterizeGrayscaleAdfDistances } from './NativeTextRaster';
import { air32FlattenedPathToLines, air32TransformAndFlattenImp1, deriveAdvancedPixelSetup, deriveAdvancedRetainedSetup, float32Bits, rasterizeImp1 } from './NativeTextGlyph';
import type { AdvancedPixelSetup } from './NativeTextGlyph';
import { compositeRetainedCoverage, normalSampleMaskCount, setNormalRetainedCoverage } from './NativeTextCompose';

type NativeGlyphRaster = ReturnType<typeof rasterizeOccurrence>;
export type CachedGlyphRaster = NativeGlyphRaster & { originOffsetX: number; originOffsetY: number };
export function compositeNormalCoverage(masks: Uint16Array, pixels: BytePixels, color: ColorChannels) {
    if (color[3]! !== 255) throw new RangeError('exact AIR32 NORMAL compositing currently requires opaque text');
    for (let index = 0; index < masks.length; index++) {
        let mask = masks[index]!;
        if (mask === 0) continue;
        let density = normalSampleCountToDensity(normalSampleMaskCount(mask)),
            offset = index * 4;
        for (let channel = 0; channel < 3; channel++)
            pixels[offset + channel]! = blendNormalOpaqueComponent(pixels[offset + channel]!, color[channel]!, density);
    }
}
export function compositeNormalRetainedCoverage(masks: Uint16Array, pixels: BytePixels, color: ColorChannels) {
    if (color[3]! !== 255) throw new RangeError('exact AIR32 NORMAL retained rendering requires opaque text');
    for (let index = 0; index < masks.length; index++) {
        let mask = masks[index]!;
        if (mask === 0) continue;
        let density = normalSampleCountToDensity(normalSampleMaskCount(mask));
        setNormalRetainedCoverage(pixels, index * 4, color, density);
    }
}
export function compositeLowNormalCoverage(coverage: Uint8Array, pixels: BytePixels, color: ColorChannels) {
    requireOpaqueNormalForeground(color, 'LOW NORMAL');
    for (let index = 0; index < coverage.length; index++) {
        if (coverage[index]! === 0) continue;
        let offset = index * 4;
        (pixels[offset]! = color[0]!), (pixels[offset + 1]! = color[1]!), (pixels[offset + 2]! = color[2]!);
    }
}
export function compositeLowNormalRetainedCoverage(coverage: Uint8Array, pixels: BytePixels, color: ColorChannels) {
    requireOpaqueNormalForeground(color, 'LOW NORMAL retained');
    for (let index = 0; index < coverage.length; index++) coverage[index]! !== 0 && setNormalRetainedCoverage(pixels, index * 4, color, 255);
}
export function requireOpaqueNormalForeground(color: ColorChannels, mode: string) {
    if (color[3]! !== 255) throw new RangeError(`exact AIR ${mode} rendering requires opaque text`);
}
export function lowNormalItalicOverhang(size: number) {
    return Math.floor(size * 0.8) / 2;
}
export function air51AdvancedItalicOverhang(size: number) {
    let overhang = size * Math.fround(0.28) + Math.fround(1.04);
    return Math.floor(overhang * 20) / 20;
}
export function blendNormalOpaqueComponent(destination: number, foreground: number, coverage: number) {
    if (coverage === 255) return foreground;
    let difference = foreground - destination,
        scaledDifference = (Math.abs(difference) * coverage) / 256;
    return destination + Math.sign(difference) * Math.ceil(scaledDifference);
}
export function requireNativeGlyph(font: NativeFont, codepoint: number) {
    let glyph = font.profile.glyphs.get(codepoint);
    if (!glyph) throw new RangeError(`native profile has no rendered IMP1 glyph for U+${codepoint.toString(16).padStart(4, '0')}`);
    return glyph;
}
export function swfGlyphHasInk(font: NativeFont, glyph: SwfGlyph, codepoint: number) {
    return (
        glyph.hasInk ??
        (font.profile.glyphs.has(codepoint) ||
            glyph.shape?.contours?.length! > 0 ||
            glyph.bounds?.xMin !== glyph.bounds?.xMax ||
            glyph.bounds?.yMin !== glyph.bounds?.yMax)
    );
}
export function prepareOccurrence(glyph: NativeGlyph, placement: GlyphPlacement, metrics: NativeLineMetrics, padding: number) {
    let penX = padding + 2 + placement.maskPenX + 0.5,
        penY = -(padding + metrics.baseline);
    return {
        setup: deriveAdvancedPixelSetup(glyph.imp1, { pointSize: metrics.size, fittedPenX: penX, fittedPenY: penY }),
        deviceAnchorX: padding + 2 + placement.anchorX!,
        deviceAnchorY: padding + metrics.baseline
    };
}
export function prepareRetainedOccurrence(glyph: NativeGlyph, placement: GlyphPlacement, metrics: NativeLineMetrics, padding: number) {
    let penX = padding + 2 + placement.maskPenX + 0.5,
        penY = -(padding + metrics.baseline);
    return {
        setup: deriveAdvancedRetainedSetup(glyph.imp1, { pointSize: metrics.size, fittedPenX: penX, fittedPenY: penY }),
        deviceAnchorX: padding + 2 + placement.anchorX!,
        deviceAnchorY: padding + metrics.baseline
    };
}
export function rasterizeOccurrence(glyph: NativeGlyph, setup: AdvancedPixelSetup, cutoffs: CsmCutoffs) {
    let fround = Math.fround;
    return {
        ...rasterizeImp1(glyph.imp1, {
            width: setup.width,
            height: setup.height,
            rowStride: setup.rowStride,
            matrix: setup.matrix,
            outsideCutoff: fround(cutoffs.outside),
            insideCutoff: fround(cutoffs.inside),
            useColorReduction: !0,
            colorReductionAmount: 0.5
        }),
        originX: setup.originX,
        originY: setup.originY,
        matrix: setup.matrix,
        setup: setup
    };
}
export function rasterizeRetainedOccurrence(glyph: NativeGlyph, setup: AdvancedPixelSetup, cutoffs: CsmCutoffs) {
    let outside = Math.fround(cutoffs.outside),
        inside = Math.fround(cutoffs.inside),
        lines = air32FlattenedPathToLines(air32TransformAndFlattenImp1(glyph.imp1, setup.matrix)),
        distances = rasterizeGrayscaleAdfDistances(lines, { width: setup.width, height: setup.height, outsideCutoff: outside, insideCutoff: inside }),
        coverage = new Uint8Array(distances.values.length);
    for (let index = 0; index < coverage.length; index++) {
        let distance = distances.values[index]!;
        coverage[index]! =
            distance < outside ? 0 : distance >= inside || outside === inside ? 255 : Math.trunc((255 * (distance - outside)) / (inside - outside));
    }
    return { width: setup.width, height: setup.height, coverage: coverage, originX: setup.originX, originY: setup.originY };
}
export function compositeRetainedUnderline(pixels: BytePixels, width: number, height: number, x: number, y: number, length: number, color: ColorChannels) {
    if (y < 0 || y >= height || length <= 0) return;
    let wholePixels = Math.floor(length);
    for (let index = 0; index < wholePixels; index++) {
        let pixelX = x + index;
        if (pixelX < 0 || pixelX >= width) continue;
        let offset = (y * width + pixelX) * 4;
        color[3]! === 255
            ? ((pixels[offset]! = color[0]!), (pixels[offset + 1]! = color[1]!), (pixels[offset + 2]! = color[2]!), (pixels[offset + 3]! = 255))
            : compositeRetainedCoverage(pixels, offset, color, 255);
    }
    let fraction = length - wholePixels;
    if (fraction <= 0) return;
    let lastX = x + wholePixels;
    if (lastX < 0 || lastX >= width) return;
    let coverage = Math.round(fraction * 256);
    compositeRetainedCoverage(pixels, (y * width + lastX) * 4, color, coverage);
}
export function glyphRunCacheKey(codepoint: number, phase: number | undefined, setup: AdvancedPixelSetup, cutoffs: CsmCutoffs) {
    return [codepoint, phase, ...setup.nativeKeyWords, float32Bits(Math.fround(cutoffs.outside)), float32Bits(Math.fround(cutoffs.inside))].join(':');
}
export function compositeNativeGlyph(glyph: NativeGlyphRaster, pixels: BytePixels, width: number, height: number, x: number, y: number, color: ColorChannels) {
    let premultiplied = premultiplyColor(color),
        alpha = premultiplied[3]!;
    for (let row = 0; row < glyph.height; row++) {
        let targetY = y + row;
        if (targetY < 0 || targetY >= height) continue;
        let sourceRow = glyph.height - 1 - row;
        for (let column = 0; column < glyph.width; column++) {
            let targetX = x + column;
            if (targetX < 0 || targetX >= width) continue;
            let sourceOffset = sourceRow * glyph.rowStride + column * 4,
                coverage = [glyph.pixels[sourceOffset + 2]!, glyph.pixels[sourceOffset + 1]!, glyph.pixels[sourceOffset]!];
            if ((coverage[0]! | coverage[1]! | coverage[2]!) === 0) continue;
            let targetOffset = (targetY * width + targetX) * 4;
            for (let channel = 0; channel < 3; channel++)
                pixels[targetOffset + channel]! = blendComponent(pixels[targetOffset + channel]!, premultiplied[channel]!, alpha, coverage[channel]!);
        }
    }
}
export function compositeRetainedNativeGlyph(
    glyph: CoverageRaster,
    pixels: BytePixels,
    width: number,
    height: number,
    x: number,
    y: number,
    premultipliedColor: ColorChannels
) {
    let red = premultipliedColor[0]!,
        green = premultipliedColor[1]!,
        blue = premultipliedColor[2]!,
        alpha = premultipliedColor[3]!,
        firstX = Math.max(0, -x),
        lastX = Math.min(glyph.width, width - x),
        firstY = Math.max(0, -y),
        lastY = Math.min(glyph.height, height - y);
    for (let row = firstY; row < lastY; row++) {
        let targetY = y + row,
            sourceOffset = (glyph.height - 1 - row) * glyph.width + firstX,
            targetOffset = (targetY * width + x + firstX) * 4;
        for (let column = firstX; column < lastX; column++, sourceOffset++, targetOffset += 4) {
            let coverage = glyph.coverage[sourceOffset]!;
            if (coverage === 0) continue;
            let destinationRed = pixels[targetOffset]!,
                destinationGreen = pixels[targetOffset + 1]!,
                destinationBlue = pixels[targetOffset + 2]!,
                destinationAlpha = pixels[targetOffset + 3]!;
            (pixels[targetOffset]! = destinationRed + (((red - ((destinationRed * alpha) >> 8)) * coverage) >> 8)),
                (pixels[targetOffset + 1]! = destinationGreen + (((green - ((destinationGreen * alpha) >> 8)) * coverage) >> 8)),
                (pixels[targetOffset + 2]! = destinationBlue + (((blue - ((destinationBlue * alpha) >> 8)) * coverage) >> 8)),
                (pixels[targetOffset + 3]! = destinationAlpha + (((alpha - ((destinationAlpha * alpha) >> 8)) * coverage) >> 8));
        }
    }
}
export function normalizeTextColor(color: TextColor, alpha: number | undefined) {
    let channels;
    if (isSafeInteger(color) && color >= 0 && color <= 16777215) channels = [color >>> 16, (color >>> 8) & 255, color & 255, 255];
    else if (
        (isArray(color) || ArrayBuffer.isView(color)) &&
        color.length === 4 &&
        [...color].every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255)
    )
        channels = [...color];
    else throw new RangeError('color must be a 24-bit integer or RGBA bytes');
    if (alpha !== void 0) {
        if (!isFiniteNumber(alpha) || alpha < 0 || alpha > 1) throw new RangeError('alpha must be from 0 through 1');
        channels[3]! = quantizeAlphaMultiplier(alpha);
    }
    return channels;
}
export function normalizeArgbColor(color: number | string, name: string) {
    let argb = color;
    if (typeof argb == 'string') {
        let match = /^#?([0-9a-f]{8})$/i.exec(argb);
        if (!match) throw new RangeError(`${name} must be an 8-digit ARGB color`);
        argb = Number.parseInt(match[1]!, 16);
    }
    if (!isSafeInteger(argb) || argb < 0 || argb > 4294967295) throw new RangeError(`${name} must be an unsigned 32-bit ARGB color`);
    return argb >>> 0;
}
export function fillOpaque(pixels: BytePixels, color: ColorChannels) {
    for (let offset = 0; offset < pixels.length; offset += 4)
        (pixels[offset]! = color[0]!), (pixels[offset + 1]! = color[1]!), (pixels[offset + 2]! = color[2]!), (pixels[offset + 3]! = 255);
}
export function normalizeOpaqueColor(color: TextColor, name: string) {
    if (isSafeInteger(color) && color >= 0 && color <= 16777215) return [color >>> 16, (color >>> 8) & 255, color & 255, 255];
    if ((!isArray(color) && !ArrayBuffer.isView(color)) || color.length !== 4 || [...color].some((r) => !Number.isInteger(r) || r < 0 || r > 255))
        throw new RangeError(`${name} must be a 24-bit integer or RGBA bytes`);
    if (color[3]! !== 255) throw new RangeError(`${name} must be opaque in the current native profile`);
    return [...color];
}
export function floorToTwips(value: number) {
    return Math.floor(value * 20) / 20;
}
export function roundToQuarterPixel(value: number) {
    return Math.round(value * 4) / 4;
}
export function finiteNumber(value: number, name: string) {
    if (!isFiniteNumber(value)) throw new TypeError(`${name} must be finite`);
    return value;
}
export function assertSafeRun(value: number) {
    if (!isSafeInteger(value)) throw new RangeError('text run is too long for exact DefineFont3 layout');
}
