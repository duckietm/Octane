/** The retained bitmap and the compositing of coverage onto it. */
import type {
    BytePixels,
    ColorChannels,
    Imp1Glyph,
    LowNormalSetup,
    NormalRasterLine,
    NormalSampleSetup
} from './NativeTextTypes';
import { blendComponent, isArray, isFiniteNumber, isSafeInteger, premultiplyColor } from './NativeTextMath';

var normalSampleOffsets = Object.freeze([0.125, 0.375, 0.625, 0.875]);
export function rasterizeNormalImp1(glyph: Imp1Glyph, { sampleMasks, width, height, originX, baselineY, size, emSquare }: NormalSampleSetup) {
    if (
        (validateRasterArguments(glyph, {
            sampleMasks: sampleMasks,
            width: width,
            height: height,
            originX: originX,
            baselineY: baselineY,
            size: size,
            emSquare: emSquare
        }),
        glyph.pathType !== 0)
    )
        throw new RangeError('exact AIR32 NORMAL rasterization currently supports filled IMP1 paths');
    let scale = (20 * (size / emSquare)) / glyph.normalizationFactor,
        lines = transformLineCommands(glyph, originX, baselineY, scale);
    if (lines.length === 0) return sampleMasks;
    let { firstX: firstX, lastX: lastX, firstY: firstY, lastY: lastY } = rasterBounds(lines, width, height);
    for (let row = firstY; row < lastY; row++)
        for (let column = firstX; column < lastX; column++) {
            let mask = 0,
                bit = 1;
            for (let sampleY of normalSampleOffsets) {
                let y = row + sampleY;
                for (let sampleX of normalSampleOffsets) hasNonZeroWinding(lines, column + sampleX, y) && (mask |= bit), (bit <<= 1);
            }
            sampleMasks[row * width + column]! |= mask;
        }
    return sampleMasks;
}
export function rasterizeAirLowNormalImp1(glyph: Imp1Glyph, { coverage, width, height, originX, baselineY, size, emSquare }: LowNormalSetup) {
    validateLowRasterArguments(glyph, {
        coverage: coverage,
        width: width,
        height: height,
        originX: originX,
        baselineY: baselineY,
        size: size,
        emSquare: emSquare
    }),
        validateLineOnlyImp1(glyph);
    let scale = (20 * (size / emSquare)) / glyph.normalizationFactor,
        lines = transformLineCommands(glyph, originX, baselineY, scale);
    if (lines.length === 0) return coverage;
    let { firstX: firstX, lastX: lastX, firstY: firstY, lastY: lastY } = rasterBounds(lines, width, height);
    for (let row = firstY; row < lastY; row++) {
        let y = row + 0.5;
        for (let column = firstX; column < lastX; column++) hasNonZeroWinding(lines, column + 0.5, y) && (coverage[row * width + column]! = 255);
    }
    return coverage;
}
export function normalSampleMaskCount(mask: number) {
    if (!isSafeInteger(mask) || mask < 0 || mask > 65535) throw new RangeError('NORMAL sample mask must be an unsigned 16-bit integer');
    let count = mask;
    return (
        (count = count - ((count >>> 1) & 21845)),
        (count = (count & 13107) + ((count >>> 2) & 13107)),
        (count = (count + (count >>> 4)) & 3855),
        (count + (count >>> 8)) & 31
    );
}
export function transformLineCommands(glyph: Imp1Glyph, originX: number, baselineY: number, scale: number) {
    let lines = [],
        previous = null;
    for (let command of glyph.commands) {
        let point = { x: originX + (command.x - glyph.referenceX) * scale, y: baselineY + (glyph.referenceY - command.y) * scale };
        if (command.opcode === 0) {
            previous = point;
            continue;
        }
        if (command.opcode === 2) throw new RangeError('exact AIR32 NORMAL rasterization currently requires line-only IMP1 outlines');
        if (command.opcode !== 1) throw new RangeError(`unsupported IMP1 opcode ${command.opcode}`);
        if (previous === null) throw new Error('IMP1 line command precedes its move command');
        lines.push({ fromX: previous.x, fromY: previous.y, toX: point.x, toY: point.y }), (previous = point);
    }
    return lines;
}
export function rasterBounds(lines: NormalRasterLine[], width: number, height: number) {
    let minX = 1 / 0,
        maxX = -1 / 0,
        minY = 1 / 0,
        maxY = -1 / 0;
    for (let line of lines)
        (minX = Math.min(minX, line.fromX, line.toX)),
            (maxX = Math.max(maxX, line.fromX, line.toX)),
            (minY = Math.min(minY, line.fromY, line.toY)),
            (maxY = Math.max(maxY, line.fromY, line.toY));
    return {
        firstX: Math.max(0, Math.floor(minX) - 1),
        lastX: Math.min(width, Math.ceil(maxX) + 1),
        firstY: Math.max(0, Math.floor(minY) - 1),
        lastY: Math.min(height, Math.ceil(maxY) + 1)
    };
}
export function hasNonZeroWinding(lines: NormalRasterLine[], x: number, y: number) {
    let winding = 0;
    for (let line of lines) {
        let dx = line.toX - line.fromX,
            dy = line.toY - line.fromY,
            crossProduct = dx * (y - line.fromY) - (x - line.fromX) * dy;
        line.fromY <= y ? line.toY > y && crossProduct > 0 && winding++ : line.toY <= y && crossProduct < 0 && winding--;
    }
    return winding !== 0;
}
export function validateRasterArguments(glyph: Imp1Glyph, setup: NormalSampleSetup) {
    if (
        !glyph ||
        !isArray(glyph.commands) ||
        !isFiniteNumber(glyph.normalizationFactor) ||
        glyph.normalizationFactor === 0 ||
        !isFiniteNumber(glyph.referenceX) ||
        !isFiniteNumber(glyph.referenceY)
    )
        throw new TypeError('imp1 must be a parsed, normalized IMP1 glyph');
    let { sampleMasks: r, width: t, height: i } = setup;
    if (!(r instanceof Uint16Array) || !isSafeInteger(t) || t <= 0 || !isSafeInteger(i) || i <= 0 || r.length !== t * i)
        throw new TypeError('sampleMasks must be a width-by-height Uint16Array');
    for (let s of ['originX', 'baselineY', 'size', 'emSquare'] as const) if (!isFiniteNumber(setup[s]!)) throw new TypeError(`${s} must be finite`);
    if (setup.size <= 0 || setup.emSquare <= 0) throw new RangeError('size and emSquare must be positive');
}
export function validateLowRasterArguments(glyph: Imp1Glyph, setup: LowNormalSetup) {
    if (
        !glyph ||
        !isArray(glyph.commands) ||
        !isFiniteNumber(glyph.normalizationFactor) ||
        glyph.normalizationFactor === 0 ||
        !isFiniteNumber(glyph.referenceX) ||
        !isFiniteNumber(glyph.referenceY)
    )
        throw new TypeError('imp1 must be a parsed, normalized IMP1 glyph');
    let { coverage: r, width: t, height: i } = setup;
    if (!(r instanceof Uint8Array) || !isSafeInteger(t) || t <= 0 || !isSafeInteger(i) || i <= 0 || r.length !== t * i)
        throw new TypeError('coverage must be a width-by-height Uint8Array');
    for (let s of ['originX', 'baselineY', 'size', 'emSquare'] as const) if (!isFiniteNumber(setup[s]!)) throw new TypeError(`${s} must be finite`);
    if (setup.size <= 0 || setup.emSquare <= 0) throw new RangeError('size and emSquare must be positive');
}
export function validateLineOnlyImp1(glyph: Imp1Glyph) {
    if (glyph.pathType !== 0) throw new RangeError('exact AIR LOW NORMAL rasterization currently supports filled IMP1 paths');
}
export function createRetainedBitmap(width: number, height: number) {
    if (!isSafeInteger(width) || width < 1 || !isSafeInteger(height) || height < 1)
        throw new RangeError('retained bitmap dimensions must be positive integers');
    return new Uint8ClampedArray(width * height * 4);
}
export function compositeRetainedCoverage(destination: BytePixels, offset: number, color: ColorChannels, coverage: number) {
    if (!(destination instanceof Uint8Array || destination instanceof Uint8ClampedArray)) throw new TypeError('destination must be an 8-bit typed array');
    if (!isSafeInteger(offset) || offset < 0 || offset + 3 >= destination.length) throw new RangeError('retained destination offset is out of bounds');
    if (!Number.isInteger(coverage) || coverage < 0 || coverage > 255) throw new RangeError('coverage must be an 8-bit integer');
    if (coverage === 0) return;
    let premultiplied = premultiplyColor(color),
        alpha = premultiplied[3]!;
    for (let channel = 0; channel < 3; channel++)
        destination[offset + channel]! = blendComponent(destination[offset + channel]!, premultiplied[channel]!, alpha, coverage);
    destination[offset + 3]! = blendComponent(destination[offset + 3]!, alpha, alpha, coverage);
}
export function setNormalRetainedCoverage(destination: BytePixels, offset: number, color: ColorChannels, coverage: number) {
    if (!(destination instanceof Uint8Array || destination instanceof Uint8ClampedArray)) throw new TypeError('destination must be an 8-bit typed array');
    if (!isSafeInteger(offset) || offset < 0 || offset + 3 >= destination.length) throw new RangeError('retained destination offset is out of bounds');
    if (!Number.isInteger(coverage) || coverage < 0 || coverage > 255) throw new RangeError('coverage must be an 8-bit integer');
    if (coverage === 0) return;
    let foreground = normalizeOpaqueForeground(color);
    (destination[offset]! = (foreground[0]! * (coverage + 1)) >> 8),
        (destination[offset + 1]! = (foreground[1]! * (coverage + 1)) >> 8),
        (destination[offset + 2]! = (foreground[2]! * (coverage + 1)) >> 8),
        (destination[offset + 3]! = coverage);
}
export function compositeRetainedToOpaque(retained: BytePixels, background: ColorChannels) {
    if (!(retained instanceof Uint8Array || retained instanceof Uint8ClampedArray) || retained.length % 4 !== 0)
        throw new TypeError('retained must contain premultiplied RGBA bytes');
    let channels = normalizeOpaqueBackground(background),
        pixels = new Uint8ClampedArray(retained.length);
    for (let offset = 0; offset < retained.length; offset += 4) {
        let inverseAlpha = 256 - retained[offset + 3]!;
        for (let channel = 0; channel < 3; channel++)
            pixels[offset + channel]! = Math.min(255, retained[offset + channel]! + ((channels[channel]! * inverseAlpha) >> 8));
        pixels[offset + 3]! = 255;
    }
    return pixels;
}
export function normalizeOpaqueForeground(color: ColorChannels) {
    if ((!isArray(color) && !ArrayBuffer.isView(color)) || color.length !== 4 || [...color].some((e) => !Number.isInteger(e) || e < 0 || e > 255))
        throw new RangeError('foreground must contain RGBA bytes');
    if (color[3]! !== 255) throw new RangeError('exact AIR32 NORMAL retained rendering requires opaque text');
    return color;
}
export function normalizeOpaqueBackground(color: ColorChannels) {
    if ((!isArray(color) && !ArrayBuffer.isView(color)) || color.length !== 4 || [...color].some((e) => !Number.isInteger(e) || e < 0 || e > 255))
        throw new RangeError('background must contain RGBA bytes');
    if (color[3]! !== 255) throw new RangeError('retained destination background must be opaque');
    return color;
}
