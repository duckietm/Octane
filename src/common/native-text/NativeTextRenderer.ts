/** Exact retained AIR32 glyph parser, layout, rasterization and renderer graph. */
import type {
    BytePixels,
    ColorChannels,
    CoverageRaster,
    CsmCutoffs,
    NativeBundle,
    NativeFont,
    NativeLineMetrics,
    NativeProfile,
    NativeRenderOptions,
    NativeTextLayout,
    RasterCache,
    RasterPoint,
    RawNativeProfile,
    SwfFont
} from './NativeTextTypes';
import { isArray, isFiniteNumber, isSafeInteger, premultiplyColor, quantizeAlphaMultiplier, roundRationalTiesEven, roundTiesEven } from './NativeTextMath';
import type { NativeContext2D } from './NativeTextMath';
import { resolveTextFieldCsm } from './NativeTextCsm';
import { air32ColorType, air32GlyphRasterKey, deriveAdvancedPixelSetup, prepareNativeProfile } from './NativeTextGlyph';
import { compositeRetainedToOpaque, createRetainedBitmap, rasterizeAirLowNormalImp1, rasterizeNormalImp1 } from './NativeTextCompose';
import { air51AdvancedItalicOverhang, assertSafeRun, compositeLowNormalCoverage, compositeLowNormalRetainedCoverage, compositeNativeGlyph, compositeNormalCoverage, compositeNormalRetainedCoverage, compositeRetainedNativeGlyph, compositeRetainedUnderline, fillOpaque, finiteNumber, glyphRunCacheKey, lowNormalItalicOverhang, normalizeArgbColor, normalizeOpaqueColor, normalizeTextColor, prepareOccurrence, prepareRetainedOccurrence, rasterizeOccurrence, rasterizeRetainedOccurrence, requireNativeGlyph, swfGlyphHasInk } from './NativeTextRuns';
import type { CachedGlyphRaster } from './NativeTextRuns';
import { layoutNormalText, resolveLineMetrics, zonedLayoutCaches } from './NativeTextLayout';
export type { TextPixelTarget, TextRenderStyle } from './NativeTextTypes';

export { roundTiesEven, roundRationalTiesEven, quantizeAlphaMultiplier, premultiplyColor, blendComponent, buildComponentMaskInverse, clampByte, normalizeColor, air32DistanceToMask, normalSampleCountToDensity, assertFinite, roundTiesEvenInteger } from './NativeTextMath';
export { interpolateCsmTable, applyTextFieldControlsToCutoffs, resolveTextFieldCsm } from './NativeTextCsm';
export { rasterizeAdfDistances, rasterizeGrayscaleAdfDistances, rasterizeAdfDistancesAtScale, rasterizeLineRectangle, makeEdge, rasterizePolygonRows, rasterizeEndpoint, rasterizeAxisLine, applyWindingSigns, rasterizeWindingLine, biasScanY, validate } from './NativeTextRaster';
export { reduceLcdColor, air32ColorType, normalizeRgb, float32Bits, air32TransformAndFlattenImp1, air32FlattenedPathToLines, rasterizeImp1, transformAndFlattenImp1, flattenQuadratic, quadraticFlatness, midpoint, pointLineSquaredDistance, validateSetup, deriveAdvancedPixelSetup, deriveAdvancedRetainedSetup, decodeStandardAlignmentZones, fitStandardAlignmentZoneScale, setupStandardAlignmentZoneAxis, float32FromBits, air32GlyphRasterKey, setupAxis, finitePositive, parseImp1, asUint8Array, prepareNativeProfile, decodeBase64 } from './NativeTextGlyph';
export { rasterizeNormalImp1, rasterizeAirLowNormalImp1, normalSampleMaskCount, transformLineCommands, rasterBounds, hasNonZeroWinding, validateRasterArguments, validateLowRasterArguments, validateLineOnlyImp1, createRetainedBitmap, compositeRetainedCoverage, setNormalRetainedCoverage, compositeRetainedToOpaque, normalizeOpaqueForeground, normalizeOpaqueBackground } from './NativeTextCompose';
export { compositeNormalCoverage, compositeNormalRetainedCoverage, compositeLowNormalCoverage, compositeLowNormalRetainedCoverage, requireOpaqueNormalForeground, lowNormalItalicOverhang, air51AdvancedItalicOverhang, blendNormalOpaqueComponent, requireNativeGlyph, swfGlyphHasInk, prepareOccurrence, prepareRetainedOccurrence, rasterizeOccurrence, rasterizeRetainedOccurrence, compositeRetainedUnderline, glyphRunCacheKey, compositeNativeGlyph, compositeRetainedNativeGlyph, normalizeTextColor, normalizeArgbColor, fillOpaque, normalizeOpaqueColor, floorToTwips, roundToQuarterPixel, finiteNumber, assertSafeRun } from './NativeTextRuns';
export { layoutNormalText, resolveLineMetrics } from './NativeTextLayout';

type ResolvedNativeOptions = ReturnType<typeof resolveOptions>;
var defaultOptions = Object.freeze({
        antiAliasType: 'advanced',
        gridFitType: 'pixel',
        thickness: 0,
        sharpness: 0,
        kerning: !0,
        stageQuality: 'high',
        renderingPipeline: 'direct',
        color: Object.freeze([0, 0, 0, 255]),
        background: Object.freeze([255, 255, 255, 255]),
        padding: 0
    }),
    etchingOffsets: Readonly<Record<string, RasterPoint>> = Object.freeze({
        'top-left': Object.freeze({ x: -1, y: -1 }),
        top: Object.freeze({ x: 0, y: -1 }),
        'top-right': Object.freeze({ x: 1, y: -1 }),
        left: Object.freeze({ x: -1, y: 0 }),
        right: Object.freeze({ x: 1, y: 0 }),
        'bottom-left': Object.freeze({ x: -1, y: 1 }),
        bottom: Object.freeze({ x: 0, y: 1 }),
        'bottom-right': Object.freeze({ x: 1, y: 1 })
    }),
    maxRasterCacheEntries = 8192,
    maxRasterCacheBytes = 2 * 1024 * 1024,
    maxZonedLayoutCacheEntries = 8192,
    fontRasterCaches = new WeakMap<NativeFont, RasterCache<CoverageRaster>>();
export function prepareNativeFont(profile: RawNativeProfile | NativeProfile, swfFont: SwfFont) {
    let preparedProfile = profile?.glyphs instanceof Map ? (profile as NativeProfile) : prepareNativeProfile(profile as RawNativeProfile);
    if (!swfFont || !isSafeInteger(swfFont.emSquare) || !isArray(swfFont.glyphs) || !isArray(swfFont.kerning))
        throw new TypeError('swfFont must contain DefineFont3 emSquare, glyphs, and kerning');
    let swfGlyphs = new Map(swfFont.glyphs.map((s) => [s.code, s])),
        kerning = new Map(swfFont.kerning.map((s) => [`${s.leftCode},${s.rightCode}`, s.adjustment]));
    return { profile: preparedProfile, swfFont: swfFont, swfGlyphs: swfGlyphs, kerning: kerning };
}
export class NativeTextRenderer {
    declare font: NativeFont;
    declare glyphRunCache: Map<string, CachedGlyphRaster>;
    constructor(font: NativeFont) {
        if (!font?.profile?.glyphs || !font?.swfGlyphs) throw new TypeError('nativeFont must be returned by prepareNativeFont');
        (this.font = font), (this.glyphRunCache = new Map());
    }
    clearGlyphRunCache() {
        this.glyphRunCache.clear();
    }
    render(text: unknown, options: NativeRenderOptions = {}) {
        let resolved = resolveOptions(options),
            content = String(text),
            size = resolved.size,
            normal = resolved.antiAliasType === 'normal',
            metrics = resolveLineMetrics(this.font.swfFont, size, normal, resolved.stageQuality),
            layout = normal ? layoutNormalText(this.font, content, size, resolved.kerning) : layoutNativeText(this.font, content, size, resolved.kerning);
        !normal &&
            this.font.swfFont.alignmentZones != null &&
            resolved.fontStyle === 'italic' &&
            (layout = { ...layout, fieldWidth: Math.round((layout.fieldWidth + air51AdvancedItalicOverhang(size)) * 20) / 20 }),
            normal &&
                resolved.stageQuality === 'low' &&
                resolved.fontStyle === 'italic' &&
                !this.font.swfFont.flags?.italic &&
                (layout = { ...layout, fieldWidth: layout.fieldWidth + lowNormalItalicOverhang(size) });
        let width = resolved.target?.width ?? Math.max(1, Math.ceil(layout.fieldWidth) + resolved.padding * 2),
            height = resolved.target?.height ?? Math.max(1, Math.ceil(metrics.fieldHeight) + resolved.padding * 2),
            retainedPipeline = resolved.renderingPipeline === 'habbo-retained',
            retained = retainedPipeline ? (resolved.target?.pixels ?? createRetainedBitmap(width, height)) : null,
            pixels = resolved.target?.pixels ?? new Uint8ClampedArray(width * height * 4);
        if ((retainedPipeline || fillOpaque(pixels, resolved.background), normal))
            if (resolved.stageQuality === 'low') {
                let coverage = rasterizeLowNormalRun(this.font, layout, metrics, resolved, width, height);
                retainedPipeline
                    ? compositeLowNormalRetainedCoverage(coverage, retained!, resolved.color)
                    : compositeLowNormalCoverage(coverage, pixels, resolved.color);
            } else {
                let coverage = rasterizeNormalRun(this.font, layout, metrics, resolved, width, height);
                retainedPipeline
                    ? compositeNormalRetainedCoverage(coverage, retained!, resolved.color)
                    : compositeNormalCoverage(coverage, pixels, resolved.color);
            }
        else {
            let colorType = air32ColorType(resolved.color, resolved.color[3]!),
                cutoffs = resolveTextFieldCsm(
                    size,
                    resolved.thickness,
                    resolved.sharpness,
                    colorType,
                    this.font.swfFont.alignmentZones?.csmTableHint ?? 0
                );
            if (retainedPipeline)
                resolved.etching &&
                    renderAdvancedRetainedPass(
                        this.font,
                        layout,
                        metrics,
                        resolved,
                        width,
                        height,
                        retained!,
                        cutoffs,
                        resolved.etching.glyphColor,
                        resolved.etching.offset.x,
                        resolved.etching.offset.y,
                        resolved.underline ? resolved.etching.lineColor : null
                    ),
                    renderAdvancedRetainedPass(
                        this.font,
                        layout,
                        metrics,
                        resolved,
                        width,
                        height,
                        retained!,
                        cutoffs,
                        resolved.transformedGlyphColor ?? resolved.color,
                        resolved.target?.offsetX ?? 0,
                        resolved.target?.offsetY ?? 0,
                        resolved.underline ? (resolved.transformedLineColor ?? resolved.color) : null
                    );
            else {
                if (this.font.swfFont.alignmentZones != null)
                    for (let placementIndex = layout.placements.length - 1; placementIndex >= 0; placementIndex--) {
                        let placement = layout.placements[placementIndex]!;
                        if (!placement.hasInk) continue;
                        let glyph = requireNativeGlyph(this.font, placement.codepoint),
                            prepared = prepareOccurrence(glyph, placement, metrics, resolved.padding),
                            key = glyphRunCacheKey(placement.codepoint, placement.phaseIndex, prepared.setup, cutoffs);
                        if (this.glyphRunCache.has(key)) continue;
                        let raster = rasterizeOccurrence(glyph, prepared.setup, cutoffs);
                        this.glyphRunCache.set(key, {
                            ...raster,
                            originOffsetX: raster.originX - prepared.deviceAnchorX,
                            originOffsetY: raster.originY - prepared.deviceAnchorY
                        });
                    }
                for (const placement of layout.placements) {
                    if (!placement.hasInk) continue;
                    const glyph = requireNativeGlyph(this.font, placement.codepoint);
                    const prepared = prepareOccurrence(glyph, placement, metrics, resolved.padding);
                    const key = glyphRunCacheKey(placement.codepoint, placement.phaseIndex, prepared.setup, cutoffs);
                    let cached = this.glyphRunCache.get(key);
                    if (!cached) {
                        const raster = rasterizeOccurrence(glyph, prepared.setup, cutoffs);
                        cached = {
                            ...raster,
                            originOffsetX: raster.originX - prepared.deviceAnchorX,
                            originOffsetY: raster.originY - prepared.deviceAnchorY
                        };
                        this.glyphRunCache.set(key, cached);
                    }
                    const originX = prepared.deviceAnchorX + cached.originOffsetX;
                    const originY = prepared.deviceAnchorY + cached.originOffsetY;
                    compositeNativeGlyph(cached, pixels, width, height, originX, originY, resolved.color);
                }
            }
        }
        return (
            retainedPipeline && !resolved.target && (pixels = compositeRetainedToOpaque(retained!, resolved.background)),
            { ...layout, ...metrics, width: width, height: height, pixels: pixels, ...(retainedPipeline ? { retainedPixels: retained } : {}) }
        );
    }
    put(context: NativeContext2D, text: unknown, x = 0, y = 0, options: NativeRenderOptions = {}) {
        if (!context?.createImageData || !context?.putImageData) throw new TypeError('context must be a Canvas 2D rendering context');
        let rendered = this.render(text, options),
            image = context.createImageData(rendered.width, rendered.height);
        return image.data.set(rendered.pixels), context.putImageData(image, x, y), rendered;
    }
}
export function layoutNativeText(font: NativeFont, text: string, size: number, useKerning = true): NativeTextLayout {
    if (!isSafeInteger(size) || size <= 0) throw new RangeError('the exact native layout currently requires integer size');
    if (typeof useKerning != 'boolean') throw new TypeError('useKerning must be boolean');
    if (font.swfFont.alignmentZones != null) return layoutZonedNativeText(font, text, size, useKerning);
    let { emSquare: emSquare } = font.swfFont,
        penUnits = 0,
        previousCodepoint = null,
        placements = [];
    for (let stringIndex = 0; stringIndex < text.length; stringIndex++) {
        let codepoint = text.charCodeAt(stringIndex),
            glyph = font.swfGlyphs.get(codepoint);
        if (!glyph || glyph.advance == null) throw new RangeError(`DefineFont3 has no mapped glyph for U+${codepoint.toString(16).padStart(4, '0')}`);
        useKerning && previousCodepoint !== null && (penUnits += font.kerning.get(`${previousCodepoint},${codepoint}`) ?? 0);
        let scaledPen = penUnits * size;
        assertSafeRun(scaledPen);
        let integerPen = Math.floor(scaledPen / emSquare),
            remainder = scaledPen - integerPen * emSquare,
            roundedPhase = roundRationalTiesEven(remainder * 8, emSquare),
            phaseIndex = roundedPhase & 7,
            anchorX = integerPen + (roundedPhase >= 4 ? 1 : 0);
        placements.push({
            codepoint: codepoint,
            stringIndex: stringIndex,
            penUnits: penUnits,
            penX: scaledPen / emSquare,
            phaseIndex: phaseIndex,
            roundedPhase: roundedPhase,
            anchorX: anchorX,
            maskPenX: integerPen + roundedPhase / 8,
            hasInk: swfGlyphHasInk(font, glyph, codepoint)
        }),
            (penUnits += glyph.advance),
            (previousCodepoint = codepoint);
    }
    let scaledWidth = penUnits * size;
    assertSafeRun(scaledWidth);
    let rawTextWidth = scaledWidth / emSquare,
        textWidth = Math.floor((scaledWidth * 20) / emSquare) / 20;
    return { placements: placements, rawTextWidth: rawTextWidth, textWidth: textWidth, fieldWidth: textWidth + 4 };
}
export function layoutZonedNativeText(font: NativeFont, text: string, size: number, useKerning = true): NativeTextLayout {
    if (!isSafeInteger(size) || size <= 0) throw new RangeError('the exact native layout currently requires integer size');
    if (typeof useKerning != 'boolean') throw new TypeError('useKerning must be boolean');
    let cache = zonedLayoutCaches.get(font);
    cache || ((cache = new Map()), zonedLayoutCaches.set(font, cache));
    let penX = 0,
        placements = [];
    for (let stringIndex = 0; stringIndex < text.length; stringIndex++) {
        let codepoint = text.charCodeAt(stringIndex),
            glyph = font.swfGlyphs.get(codepoint);
        if (!glyph || glyph.advance == null) throw new RangeError(`DefineFont3 has no mapped glyph for U+${codepoint.toString(16).padStart(4, '0')}`);
        let integerPen = Math.floor(penX),
            roundedPhase = roundTiesEven((penX - integerPen) * 8),
            phaseIndex = roundedPhase & 7,
            maskPenX = integerPen + roundedPhase / 8,
            anchorX = integerPen + (roundedPhase >= 4 ? 1 : 0),
            hasInk = swfGlyphHasInk(font, glyph, codepoint);
        placements.push({
            codepoint: codepoint,
            stringIndex: stringIndex,
            penX: penX,
            phaseIndex: phaseIndex,
            roundedPhase: roundedPhase,
            anchorX: anchorX,
            maskPenX: maskPenX,
            hasInk: hasInk
        });
        let scale = size / 1024,
            residual = 0;
        if (hasInk) {
            let cacheKey = `${codepoint}:${size}:${maskPenX}`,
                cachedScale = cache.get(cacheKey);
            if (cachedScale) cache.delete(cacheKey);
            else {
                let nativeGlyph = requireNativeGlyph(font, codepoint),
                    setup = deriveAdvancedPixelSetup(nativeGlyph.imp1, { pointSize: size, fittedPenX: maskPenX + 0.5, fittedPenY: 0 });
                cachedScale = [setup.normalizedScaleX, setup.residualX];
            }
            cache.set(cacheKey, cachedScale),
                cache.size > maxZonedLayoutCacheEntries && cache.delete(cache.keys().next().value!),
                (scale = cachedScale[0]!),
                (residual = cachedScale[1]!);
        }
        let advance = glyph.advance;
        if (useKerning && stringIndex + 1 < text.length) {
            let cacheKey = text.charCodeAt(stringIndex + 1);
            advance += font.kerning.get(`${codepoint},${cacheKey}`) ?? 0;
        }
        penX += (advance / 20) * scale + residual;
    }
    let rawTextWidth = penX,
        textWidth = Math.floor(rawTextWidth * 20) / 20;
    return { placements: placements, rawTextWidth: rawTextWidth, textWidth: textWidth, fieldWidth: textWidth + 4 };
}
export function resolveOptions(options: NativeRenderOptions) {
    let antiAliasType = options.antiAliasType ?? defaultOptions.antiAliasType,
        gridFitType = options.gridFitType ?? defaultOptions.gridFitType;
    if (
        !(antiAliasType === 'normal'
            ? gridFitType === 'none' || gridFitType === 'pixel' || gridFitType === 'subpixel'
            : antiAliasType === 'advanced' && gridFitType === 'pixel')
    )
        throw new RangeError(`unsupported AIR mode ${antiAliasType} + ${gridFitType}; the native path supports advanced + pixel and line-only normal text`);
    if ((options.letterSpacing ?? 0) !== 0) throw new RangeError('native letterSpacing is not implemented yet');
    let size = options.size;
    if (!isFiniteNumber(size)) throw new TypeError('configuration.size is required');
    let renderingPipeline = options.renderingPipeline ?? defaultOptions.renderingPipeline;
    if (renderingPipeline !== 'direct' && renderingPipeline !== 'habbo-retained') throw new RangeError('renderingPipeline must be direct or habbo-retained');
    let stageQuality = options.stageQuality ?? defaultOptions.stageQuality;
    if (stageQuality !== 'high' && stageQuality !== 'low') throw new RangeError('stageQuality must be high or low');
    let fontStyle = options.fontStyle ?? 'normal';
    if (fontStyle !== 'normal' && fontStyle !== 'italic') throw new RangeError('fontStyle must be normal or italic');
    let kerning = options.kerning ?? defaultOptions.kerning;
    if (typeof kerning != 'boolean') throw new TypeError('kerning must be boolean');
    let padding = options.padding ?? defaultOptions.padding;
    if (!isSafeInteger(padding) || padding < 0) throw new RangeError('padding must be a non-negative integer');
    let color = normalizeTextColor(options.color ?? defaultOptions.color, options.alpha),
        colorTransform = options.colorTransform,
        transformedGlyphColor,
        transformedLineColor;
    if (colorTransform) {
        let clamp = (value: number) => Math.max(0, Math.min(255, Math.trunc(value)));
        (transformedLineColor = [
            clamp(color[0]! * colorTransform.redMultiplier + colorTransform.redOffset),
            clamp(color[1]! * colorTransform.greenMultiplier + colorTransform.greenOffset),
            clamp(color[2]! * colorTransform.blueMultiplier + colorTransform.blueOffset),
            clamp(color[3]! * colorTransform.alphaMultiplier + colorTransform.alphaOffset)
        ]),
            (transformedGlyphColor = [...transformedLineColor]),
            (transformedGlyphColor[3]! = quantizeAlphaMultiplier(transformedLineColor[3]! / 255));
    }
    if ((options.backgroundAlpha ?? 1) !== 1) throw new RangeError('native translucent backgrounds require an AIR grayscale alpha-mask plane');
    let background = normalizeOpaqueColor(options.background ?? defaultOptions.background, 'background'),
        decoration = options.textDecoration ?? null;
    if (decoration !== null && decoration !== 'underline') throw new RangeError('textDecoration must be underline or null');
    let underline = decoration === 'underline',
        etching = resolveHabboEtching(options.etchingColor, options.etchingPosition);
    if ((underline || etching) && renderingPipeline !== 'habbo-retained')
        throw new RangeError('textDecoration and etching require renderingPipeline=habbo-retained');
    if ((underline || etching) && antiAliasType !== 'advanced') throw new RangeError('Habbo skin effects are currently exact for ADVANCED text only');
    return {
        antiAliasType: antiAliasType,
        gridFitType: gridFitType,
        thickness: finiteNumber(options.thickness ?? 0, 'thickness'),
        sharpness: finiteNumber(options.sharpness ?? 0, 'sharpness'),
        kerning: kerning,
        stageQuality: stageQuality,
        fontStyle: fontStyle,
        renderingPipeline: renderingPipeline,
        size: size,
        padding: padding,
        color: color,
        background: background,
        transformedGlyphColor: transformedGlyphColor,
        transformedLineColor: transformedLineColor,
        target: options.target,
        rasterCache: options.rasterCache,
        underline: underline,
        etching: etching
    };
}
export function resolveHabboEtching(color: number | string | null | undefined, position: string | null | undefined) {
    if (color == null) {
        if (position != null) throw new RangeError('etchingPosition requires etchingColor');
        return null;
    }
    let argb = normalizeArgbColor(color, 'etchingColor'),
        alpha = argb >>> 24;
    if (alpha === 0) return null;
    let resolvedPosition = position ?? 'bottom',
        offset = etchingOffsets[resolvedPosition]!;
    if (!offset) throw new RangeError(`unsupported etchingPosition ${JSON.stringify(resolvedPosition)}`);
    let red = (argb >>> 16) & 255,
        green = (argb >>> 8) & 255,
        blue = argb & 255;
    return {
        argb: argb,
        position: resolvedPosition,
        offset: offset,
        glyphColor: [red, green, blue, quantizeAlphaMultiplier(alpha / 255)],
        lineColor: [red, green, blue, alpha]
    };
}
export function rasterizeNormalRun(
    font: NativeFont,
    layout: NativeTextLayout,
    metrics: NativeLineMetrics,
    options: ResolvedNativeOptions,
    width: number,
    height: number
) {
    let sampleMasks = new Uint16Array(width * height),
        baselineY = options.padding + metrics.baseline;
    for (let placement of layout.placements) {
        if (!placement.hasInk) continue;
        let glyph = requireNativeGlyph(font, placement.codepoint);
        rasterizeNormalImp1(glyph.imp1, {
            sampleMasks: sampleMasks,
            width: width,
            height: height,
            originX: options.padding + 2 + placement.maskPenX,
            baselineY: baselineY,
            size: metrics.size,
            emSquare: font.swfFont.emSquare
        });
    }
    return sampleMasks;
}
export function rasterizeLowNormalRun(
    font: NativeFont,
    layout: NativeTextLayout,
    metrics: NativeLineMetrics,
    options: ResolvedNativeOptions,
    width: number,
    height: number
) {
    let coverage = new Uint8Array(width * height),
        baselineY = options.padding + metrics.baseline;
    for (let placement of layout.placements) {
        if (!placement.hasInk) continue;
        let glyph = requireNativeGlyph(font, placement.codepoint);
        rasterizeAirLowNormalImp1(glyph.imp1, {
            coverage: coverage,
            width: width,
            height: height,
            originX: options.padding + 2 + roundTiesEven(placement.penX),
            baselineY: baselineY,
            size: metrics.size,
            emSquare: font.swfFont.emSquare
        });
    }
    return coverage;
}
export function renderAdvancedRetainedPass(
    font: NativeFont,
    layout: NativeTextLayout,
    metrics: NativeLineMetrics,
    options: ResolvedNativeOptions,
    width: number,
    height: number,
    pixels: BytePixels,
    cutoffs: CsmCutoffs,
    color: ColorChannels,
    offsetX: number,
    offsetY: number,
    lineColor: ColorChannels | null
) {
    let premultiplied = premultiplyColor(color);
    lineColor &&
        compositeRetainedUnderline(
            pixels,
            width,
            height,
            options.padding + 2 + offsetX,
            options.padding + metrics.baseline + 1 + offsetY,
            font.swfFont.alignmentZones == null ? Math.floor(layout.rawTextWidth * 4) / 4 : Math.ceil(layout.rawTextWidth),
            lineColor
        );
    for (let placement of layout.placements) {
        if (!placement.hasInk) continue;
        let rasterCache = options.rasterCache,
            occurrenceKey = rasterCache
                ? JSON.stringify([placement.codepoint, metrics.size, metrics.baseline, options.padding, placement.maskPenX, cutoffs.outside, cutoffs.inside])
                : null,
            occurrence = rasterCache?.entries.get(occurrenceKey);
        if (occurrence) rasterCache!.entries.delete(occurrenceKey), rasterCache!.entries.set(occurrenceKey, occurrence);
        else {
            let glyph = requireNativeGlyph(font, placement.codepoint),
                prepared = prepareRetainedOccurrence(glyph, placement, metrics, options.padding),
                fontCache = rasterCache ? fontRasterCaches.get(font) : null;
            rasterCache && !fontCache && ((fontCache = { entries: new Map(), bytes: 0 }), fontRasterCaches.set(font, fontCache));
            let glyphKey = fontCache
                    ? air32GlyphRasterKey(placement.codepoint, prepared.setup, [Math.fround(cutoffs.outside), Math.fround(cutoffs.inside)])
                    : null,
                cachedRaster = fontCache?.entries.get(glyphKey);
            if (cachedRaster) fontCache!.entries.delete(glyphKey), fontCache!.entries.set(glyphKey, cachedRaster);
            else {
                let raster = rasterizeRetainedOccurrence(glyph, prepared.setup, cutoffs);
                if (
                    ((cachedRaster = { width: raster.width, height: raster.height, coverage: raster.coverage }),
                    fontCache && cachedRaster.coverage.byteLength <= 512 * 1024)
                )
                    for (
                        fontCache!.entries.set(glyphKey, cachedRaster), fontCache!.bytes += cachedRaster.coverage.byteLength;
                        fontCache!.entries.size > 4096 || fontCache!.bytes > 512 * 1024;
                    ) {
                        let [oldKey, oldRaster] = fontCache!.entries.entries().next().value!;
                        fontCache!.entries.delete(oldKey), (fontCache!.bytes -= oldRaster.coverage.byteLength);
                    }
            }
            if (
                ((occurrence = { ...cachedRaster, originX: prepared.setup.originX, originY: prepared.setup.originY }),
                rasterCache && occurrence.coverage.byteLength <= maxRasterCacheBytes)
            )
                for (
                    rasterCache!.entries.set(occurrenceKey, occurrence), rasterCache!.bytes += occurrence.coverage.byteLength;
                    rasterCache!.entries.size > maxRasterCacheEntries || rasterCache!.bytes > maxRasterCacheBytes;
                ) {
                    let [oldKey, oldRaster] = rasterCache!.entries.entries().next().value!;
                    rasterCache!.entries.delete(oldKey), (rasterCache!.bytes -= oldRaster.coverage.byteLength);
                }
        }
        compositeRetainedNativeGlyph(occurrence, pixels, width, height, occurrence.originX + offsetX, occurrence.originY + offsetY, premultiplied);
    }
}
var nativeBundleFormat = 'air32-native-font-bundle-v1';
export function prepareNativeBundle(bundle: NativeBundle) {
    if (!bundle || bundle.schemaVersion !== 1 || bundle.format !== nativeBundleFormat) throw new TypeError(`native bundle must use ${nativeBundleFormat}`);
    if (typeof bundle.fontKey != 'string' || bundle.fontKey.length === 0) throw new TypeError('native bundle fontKey must be a non-empty string');
    if (!bundle.nativeProfile || !isArray(bundle.nativeProfile.glyphs) || !bundle.swfFont || !isArray(bundle.swfFont.glyphs))
        throw new TypeError('native bundle must contain nativeProfile and swfFont glyphs');
    if (bundle.fontSha256 != null && bundle.nativeProfile.fontSha256 != null && bundle.fontSha256 !== bundle.nativeProfile.fontSha256)
        throw new Error('native bundle font hash does not match its IMP1 profile');
    let codepoints = new Set<number>();
    for (let glyph of bundle.nativeProfile.glyphs) {
        if (!isSafeInteger(glyph.codepoint) || codepoints.has(glyph.codepoint)) throw new Error('native bundle contains an invalid or duplicate codepoint');
        codepoints.add(glyph.codepoint);
    }
    let metricCodepoints = new Set(bundle.swfFont.glyphs.map((glyph) => glyph.code)),
        missing = [...codepoints].filter((glyph) => !metricCodepoints.has(glyph));
    if (missing.length) throw new Error(`DefineFont3 metrics are missing U+${missing[0]!.toString(16).toUpperCase()}`);
    if (bundle.coverage?.codepointCount != null && bundle.coverage.codepointCount !== codepoints.size)
        throw new Error('native bundle coverage count does not match its glyphs');
    if (bundle.coverage?.imp1GlyphCount != null && bundle.coverage.imp1GlyphCount !== codepoints.size)
        throw new Error('native bundle IMP1 count does not match its glyphs');
    if (bundle.coverage?.metricGlyphCount != null && bundle.coverage.metricGlyphCount !== metricCodepoints.size)
        throw new Error('native bundle metric count does not match its glyphs');
    return {
        ...prepareNativeFont(bundle.nativeProfile, bundle.swfFont),
        fontKey: bundle.fontKey,
        bundleMetadata: Object.freeze({
            schemaVersion: bundle.schemaVersion,
            format: bundle.format,
            fontKey: bundle.fontKey,
            fontSha256: bundle.fontSha256 ?? null,
            runtime: bundle.runtime ?? bundle.nativeProfile.runtime ?? null,
            coverage: bundle.coverage == null ? null : { ...bundle.coverage }
        })
    };
}
