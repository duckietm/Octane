/** Laying a string out in glyphs: options, line metrics and the zoned layouts. */
import type {
    NativeFont,
    NativeTextLayout,
    SwfFont
} from './NativeTextTypes';
import { isSafeInteger, roundTiesEven } from './NativeTextMath';
import { assertSafeRun, floorToTwips, roundToQuarterPixel, swfGlyphHasInk } from './NativeTextRuns';

export var zonedLayoutCaches = new WeakMap<NativeFont, Map<string, number[]>>();
export function layoutNormalText(font: NativeFont, text: string, size: number, useKerning = true): NativeTextLayout {
    if (!isSafeInteger(size) || size <= 0) throw new RangeError('the exact native layout currently requires integer size');
    if (typeof useKerning != 'boolean') throw new TypeError('useKerning must be boolean');
    let { emSquare: emSquare } = font.swfFont,
        penTwips = 0,
        scaledWidth = 0,
        placements = [];
    for (let stringIndex = 0; stringIndex < text.length; stringIndex++) {
        let codepoint = text.charCodeAt(stringIndex),
            glyph = font.swfGlyphs.get(codepoint);
        if (!glyph || glyph.advance == null) throw new RangeError(`DefineFont3 has no mapped glyph for U+${codepoint.toString(16).padStart(4, '0')}`);
        placements.push({
            codepoint: codepoint,
            stringIndex: stringIndex,
            penTwips: penTwips,
            penX: penTwips / 20,
            maskPenX: roundToQuarterPixel(penTwips / 20),
            hasInk: swfGlyphHasInk(font, glyph, codepoint)
        });
        let advance = glyph.advance;
        if (useKerning && stringIndex + 1 < text.length) {
            let nextCodepoint = text.charCodeAt(stringIndex + 1);
            advance += font.kerning.get(`${codepoint},${nextCodepoint}`) ?? 0;
        }
        let scaledTwipAdvance = advance * size * 20,
            scaledAdvance = advance * size;
        assertSafeRun(scaledTwipAdvance),
            assertSafeRun(scaledAdvance),
            (penTwips += Math.floor(scaledTwipAdvance / emSquare)),
            (scaledWidth += scaledAdvance),
            assertSafeRun(penTwips),
            assertSafeRun(scaledWidth);
    }
    let textWidth = penTwips / 20;
    return { placements: placements, rawTextWidth: scaledWidth / emSquare, textWidth: textWidth, fieldWidth: textWidth + 4 };
}
export function resolveLineMetrics(font: SwfFont, size: number, normal = false, quality = 'high') {
    let ascent = floorToTwips((font.metrics.ascent * size) / font.emSquare),
        descent = floorToTwips((font.metrics.descent * size) / font.emSquare),
        textHeight = ascent + descent;
    return {
        size: size,
        ascent: ascent,
        descent: descent,
        leading: 0,
        textHeight: textHeight,
        fieldHeight: textHeight + 4,
        baseline: normal ? (quality === 'low' ? roundTiesEven(ascent + 2) : roundToQuarterPixel(ascent + 2)) : roundTiesEven(ascent + 2)
    };
}
