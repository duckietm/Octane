/** Reading a glyph (imp1), flattening its outline and deriving the pixel setup it is drawn with. */
import type {
    AdvancedSetupOptions,
    AlignmentZoneAxis,
    DistanceSetup,
    FlattenedPath,
    Imp1Glyph,
    Imp1RasterSetup,
    NativeGlyph,
    RasterLine,
    RasterPoint,
    RawNativeProfile,
    TextColor
} from './NativeTextTypes';
import { air32DistanceToMask, isArray, isFiniteNumber, isSafeInteger, roundTiesEven } from './NativeTextMath';
import { rasterizeAdfDistances } from './NativeTextRaster';


export type AdvancedPixelSetup = ReturnType<typeof deriveAdvancedPixelSetup>;
export function reduceLcdColor(red: number, green: number, blue: number, amount = 0.5) {
    for (let [channel, value] of Object.entries({ red: red, green: green, blue: blue }))
        if (!Number.isInteger(value) || value < 0 || value > 255) throw new RangeError(`${channel} must be an 8-bit integer`);
    if (!isFiniteNumber(amount)) throw new TypeError('amount must be finite');
    let threshold = Math.trunc((1 - amount) * 64),
        luminance = Math.floor(red * 0.299) + Math.floor(green * 0.587) + Math.floor(blue * 0.114),
        distance = Math.abs(red - luminance) + Math.abs(green - luminance) + Math.abs(blue - luminance);
    return distance <= threshold
        ? [red, green, blue]
        : [red, green, blue].map((channel) => luminance + Math.trunc(((channel - luminance) * threshold) / distance));
}
export function air32ColorType(color: TextColor, globalAlpha = 255) {
    let [red, green, blue] = normalizeRgb(color);
    if (!Number.isInteger(globalAlpha) || globalAlpha < 0 || globalAlpha > 255) throw new RangeError('globalAlpha must be an 8-bit integer');
    let alphaScale = globalAlpha + 1,
        scaledRed = Math.floor((red * alphaScale) / 256),
        scaledGreen = Math.floor((green * alphaScale) / 256),
        scaledBlue = Math.floor((blue * alphaScale) / 256);
    return 30 * scaledRed + 59 * scaledGreen + 11 * scaledBlue > 2e4 ? 'light' : 'dark';
}
export function normalizeRgb(color: TextColor): [number, number, number] {
    if (isSafeInteger(color) && color >= 0 && color <= 16777215) return [color >>> 16, (color >>> 8) & 255, color & 255];
    if ((isArray(color) || ArrayBuffer.isView(color)) && color.length >= 3 && [...color.slice(0, 3)].every((e) => Number.isInteger(e) && e >= 0 && e <= 255))
        return [color[0]!, color[1]!, color[2]!];
    throw new RangeError('color must be a 24-bit integer or RGB byte array');
}
var float32BitsView = new DataView(new ArrayBuffer(4));
export function float32Bits(value: number) {
    if (!isFiniteNumber(value)) throw new TypeError('value must be finite');
    return float32BitsView.setFloat32(0, value, !0), float32BitsView.getUint32(0, !0);
}
export function air32TransformAndFlattenImp1(glyph: Imp1Glyph, matrix: readonly number[]) {
    if (!glyph || !isArray(glyph.commands)) throw new TypeError('imp1 must be a parsed IMP1 glyph');
    if (glyph.pathType !== 0) throw new RangeError('only filled IMP1 paths are currently supported');
    if (!isArray(matrix) || matrix.length < 6 || matrix.slice(0, 6).some((command) => !isFiniteNumber(command)))
        throw new TypeError('matrix must contain six finite affine components');
    let fround = Math.fround,
        [scaleX, skewX, translateX, skewY, scaleY, translateY] = matrix as readonly [number, number, number, number, number, number],
        transform = (command: number, point: number) => ({
            x: fround(command * scaleX + point * skewX + translateX),
            y: fround(command * skewY + point * scaleY + translateY)
        }),
        commands = [],
        previous = { x: 0, y: 0 };
    for (let command of glyph.commands) {
        let point = transform(command.x, command.y);
        if (command.opcode === 0) {
            commands.push({ opcode: 0, type: 'move', ...point }), (previous = point);
            continue;
        }
        if (command.opcode === 1) {
            commands.push({ opcode: 1, type: 'line', ...point }), (previous = point);
            continue;
        }
        if (command.opcode !== 2) throw new RangeError(`unsupported IMP1 opcode ${command.opcode}`);
        let control = transform(command.controlX, command.controlY),
            dx = fround(control.x - (point.x + previous.x) * 0.5),
            dy = fround(control.y - (point.y + previous.y) * 0.5),
            distance = fround(Math.sqrt(dx * dx + dy * dy)),
            segments = Math.trunc(Math.sqrt(distance * 5)) + 1,
            step = fround(1 / segments),
            progress = step;
        for (let segment = 1; segment < segments; ++segment) {
            let inverse = fround(1 - progress),
                startWeight = fround(inverse * inverse),
                controlWeight = fround((progress + progress) * inverse),
                endWeight = fround(progress * progress);
            commands.push({
                opcode: 1,
                type: 'line',
                x: fround(previous.x * startWeight + control.x * controlWeight + point.x * endWeight),
                y: fround(previous.y * startWeight + control.y * controlWeight + point.y * endWeight)
            }),
                (progress = fround(progress + step));
        }
        commands.push({ opcode: 1, type: 'line', ...point }), (previous = point);
    }
    return { pathType: glyph.pathType, strokeWidth: 0, commandCount: commands.length, commands: commands };
}
export function air32FlattenedPathToLines(path: FlattenedPath) {
    if (!path || !isArray(path.commands)) throw new TypeError('path must contain flattened commands');
    let lines = [],
        previous = null;
    for (let command of path.commands) {
        let point = { x: command.x, y: command.y };
        if (command.opcode === 0) previous = point;
        else if (command.opcode === 1) {
            if (previous === null) throw new Error('line command precedes a move');
            lines.push({ from: previous, to: point }), (previous = point);
        } else throw new RangeError(`flattened path retained opcode ${command.opcode}`);
    }
    return lines;
}
var defaultQuadraticFlatness = 0.4,
    defaultFlatnessMode = 'second-euclidean',
    lcdSampleOffsets = Object.freeze([-1 / 3, 0, 1 / 3]),
    lcdSampleWidth = Math.fround(1 / 3);
export function rasterizeImp1(glyph: Imp1Glyph, setup: Imp1RasterSetup) {
    validateSetup(setup);
    let lines =
            setup.quadraticFlatness === void 0 && setup.flatnessMode === void 0
                ? air32FlattenedPathToLines(air32TransformAndFlattenImp1(glyph, setup.matrix))
                : transformAndFlattenImp1(glyph, setup.matrix, setup.quadraticFlatness ?? defaultQuadraticFlatness, setup.flatnessMode ?? defaultFlatnessMode),
        rowStride = setup.rowStride ?? setup.width * 4;
    if (!isSafeInteger(rowStride) || rowStride < setup.width * 4) throw new RangeError('rowStride is too small for BGRA8 output');
    let distances = rasterizeAdfDistances(lines, setup),
        pixels = new Uint8Array(rowStride * setup.height);
    for (let row = 0; row < setup.height; row++)
        for (let column = 0; column < setup.width; column++) {
            let masks = lcdSampleOffsets.map((l, _) => {
                    let h = column * 3 + _ - 1,
                        p = h < 0 ? -1e3 : distances.values[row * distances.width + h]!;
                    return air32DistanceToMask(p, setup.outsideCutoff, setup.insideCutoff);
                }),
                channels = setup.useColorReduction === !1 ? masks : reduceLcdColor(masks[0]!, masks[1]!, masks[2]!, setup.colorReductionAmount ?? 0.5),
                offset = row * rowStride + column * 4;
            (pixels[offset]! = channels[2]!),
                (pixels[offset + 1]! = channels[1]!),
                (pixels[offset + 2]! = channels[0]!),
                (pixels[offset + 3]! = channels[0]! || channels[1]! || channels[2]! ? 255 : 0);
        }
    return { width: setup.width, height: setup.height, rowStride: rowStride, pixels: pixels, lines: lines, distances: distances.values };
}
export function transformAndFlattenImp1(glyph: Imp1Glyph, matrix: readonly number[], tolerance = defaultQuadraticFlatness, flatnessMode = 'perpendicular') {
    if (!glyph || !isArray(glyph.commands)) throw new TypeError('imp1.commands must be an array');
    if (!isArray(matrix) || matrix.length < 6 || matrix.slice(0, 6).some((command) => !isFiniteNumber(command)))
        throw new TypeError('matrix must contain six finite affine values');
    if (!isFiniteNumber(tolerance) || tolerance <= 0) throw new RangeError('quadratic tolerance must be positive');
    if (!['perpendicular', 'second-euclidean', 'second-max', 'second-manhattan'].includes(flatnessMode))
        throw new RangeError('unsupported quadratic flatness mode');
    let [scaleX, skewX, translateX, skewY, scaleY, translateY] = matrix as readonly [number, number, number, number, number, number],
        fround = Math.fround,
        transform = (command: number, point: number) => ({
            x: fround(fround(fround(scaleX * command) + fround(skewX * point)) + translateX),
            y: fround(fround(fround(skewY * command) + fround(scaleY * point)) + translateY)
        }),
        lines = [],
        previous = null;
    for (let command of glyph.commands) {
        let point = transform(command.x, command.y);
        if (command.opcode === 0) previous = point;
        else if (command.opcode === 1) {
            if (!previous) throw new Error('IMP1 line occurs before a move');
            lines.push({ from: previous, to: point }), (previous = point);
        } else if (command.opcode === 2) {
            if (!previous) throw new Error('IMP1 quadratic occurs before a move');
            let control = transform(command.controlX, command.controlY);
            flattenQuadratic(lines, previous, control, point, tolerance, flatnessMode, 0), (previous = point);
        } else throw new Error(`unsupported IMP1 opcode ${command.opcode}`);
    }
    return lines;
}
export function flattenQuadratic(
    lines: RasterLine[],
    from: RasterPoint,
    control: RasterPoint,
    to: RasterPoint,
    tolerance: number,
    mode: string,
    depth: number
) {
    if (depth >= 16 || quadraticFlatness(from, control, to, mode) <= tolerance) {
        lines.push({ from: from, to: to });
        return;
    }
    let leftMidpoint = midpoint(from, control),
        rightMidpoint = midpoint(control, to),
        center = midpoint(leftMidpoint, rightMidpoint);
    flattenQuadratic(lines, from, leftMidpoint, center, tolerance, mode, depth + 1),
        flattenQuadratic(lines, center, rightMidpoint, to, tolerance, mode, depth + 1);
}
export function quadraticFlatness(from: RasterPoint, control: RasterPoint, to: RasterPoint, mode: string) {
    if (mode === 'perpendicular') return Math.sqrt(pointLineSquaredDistance(control.x, control.y, from, to));
    let dx = from.x - 2 * control.x + to.x,
        dy = from.y - 2 * control.y + to.y;
    return mode === 'second-euclidean' ? Math.hypot(dx, dy) : mode === 'second-max' ? Math.max(Math.abs(dx), Math.abs(dy)) : Math.abs(dx) + Math.abs(dy);
}
export function midpoint(from: RasterPoint, to: RasterPoint) {
    return { x: Math.fround(Math.fround(from.x + to.x) * 0.5), y: Math.fround(Math.fround(from.y + to.y) * 0.5) };
}
export function pointLineSquaredDistance(x: number, y: number, from: RasterPoint, to: RasterPoint) {
    let dx = to.x - from.x,
        dy = to.y - from.y,
        lengthSquared = dx * dx + dy * dy,
        projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - from.x) * dx + (y - from.y) * dy) / lengthSquared)),
        nearestX = from.x + projection * dx,
        nearestY = from.y + projection * dy;
    return (x - nearestX) ** 2 + (y - nearestY) ** 2;
}
export function validateSetup(setup: DistanceSetup) {
    if (!setup || !isSafeInteger(setup.width) || setup.width < 1 || !isSafeInteger(setup.height) || setup.height < 1)
        throw new TypeError('setup must contain positive integer width and height');
    for (let e of ['outsideCutoff', 'insideCutoff'] as const) if (!isFiniteNumber(setup[e]!)) throw new TypeError(`setup.${e} must be finite`);
}
var lcdAxisBias = 1 / 3,
    lcdImagePadding = 5 / 3,
    verticalZoneRoundingBias = 0.800000011920929,
    lcdZoneOffsetBias = 0.1666666716337204;
export function deriveAdvancedPixelSetup(glyph: Imp1Glyph, options: AdvancedSetupOptions) {
    if (
        !glyph ||
        !isFiniteNumber(glyph.normalizedEm) ||
        !isFiniteNumber(glyph.normalizationFactor) ||
        !isFiniteNumber(glyph.referenceX) ||
        !isFiniteNumber(glyph.referenceY)
    )
        throw new TypeError('imp1 must contain the parsed native ADF attributes');
    if (glyph.pathType !== 0 || ((glyph.sazMask ?? 0) & -4) !== 0) throw new RangeError('the exact setup currently covers filled glyphs');
    let pointSize = Math.fround(finitePositive(options?.pointSize, 'pointSize')),
        dpi = options?.dpi ?? 72;
    if (!isSafeInteger(dpi) || dpi <= 0) throw new RangeError('dpi must be a positive integer');
    let displayScaleX = Math.fround(options?.scaleX ?? 1),
        displayScaleY = Math.fround(options?.scaleY ?? 1);
    if (displayScaleX !== 1 || displayScaleY !== 1) throw new RangeError('only an identity display scale is currently exact');
    let penX = options?.fittedPenX,
        penY = options?.fittedPenY;
    if (!isFiniteNumber(penX) || !isFiniteNumber(penY)) throw new TypeError('fittedPenX and fittedPenY must be finite');
    let fround = Math.fround,
        pixelSize = dpi === 72 ? pointSize : fround((pointSize * dpi) / 72),
        scale = fround(pixelSize / glyph.normalizedEm),
        zones = decodeStandardAlignmentZones(glyph),
        fittedScaleX = fitStandardAlignmentZoneScale(scale, glyph.normalizedEm, zones.xSpan, 0.5),
        fittedScaleY = fitStandardAlignmentZoneScale(scale, glyph.normalizedEm, zones.ySpan, verticalZoneRoundingBias),
        xAxis =
            (zones.mask & 1) === 0
                ? { ...setupAxis(fround(penX), fittedScaleX, glyph.referenceX, !0), residual: 0, zoneCoordinate: null }
                : setupStandardAlignmentZoneAxis({
                      pen: fround(penX),
                      scale: fittedScaleX,
                      normalizedEm: glyph.normalizedEm,
                      reference: glyph.referenceX,
                      emCoordinate: zones.xCoordinate,
                      lcd: !0
                  }),
        yAxis =
            (zones.mask & 2) === 0
                ? { ...setupAxis(fround(penY), fittedScaleY, glyph.referenceY, !1), residual: 0, zoneCoordinate: null }
                : setupStandardAlignmentZoneAxis({
                      pen: fround(penY),
                      scale: fittedScaleY,
                      normalizedEm: glyph.normalizedEm,
                      reference: glyph.referenceY,
                      emCoordinate: zones.yCoordinate,
                      lcd: !1
                  }),
        width = Math.trunc(fittedScaleX + lcdImagePadding),
        height = Math.trunc(fittedScaleY + 1);
    if (width < 1 || height < 1 || width > 65535 || height > 65535) throw new RangeError('derived native glyph image is outside uint16 bounds');
    let normalizedPixelScale = fround(scale * glyph.normalizationFactor),
        normalizedScaleX = fround(fittedScaleX * glyph.normalizationFactor),
        normalizedScaleY = fround(fittedScaleY * glyph.normalizationFactor),
        matrix = Object.freeze([fittedScaleX, 0, xAxis.translation, 0, fittedScaleY, yAxis.translation, 0, 0, 1]),
        nativeKeyWords = new Uint32Array([
            3,
            0,
            0,
            float32Bits(glyph.referenceX),
            float32Bits(glyph.referenceY),
            float32Bits(fittedScaleX),
            float32Bits(fittedScaleY),
            float32Bits(scale),
            float32Bits(normalizedPixelScale),
            float32Bits(normalizedPixelScale),
            float32Bits(normalizedScaleX),
            float32Bits(normalizedScaleY)
        ]);
    return {
        pointSize: pointSize,
        dpi: dpi,
        pixelSize: pixelSize,
        fittedPenX: fround(penX),
        fittedPenY: fround(penY),
        scale: scale,
        scaleX: fittedScaleX,
        scaleY: fittedScaleY,
        normalizedScaleX: normalizedScaleX,
        normalizedScaleY: normalizedScaleY,
        residualX: xAxis.residual,
        residualY: yAxis.residual,
        standardAlignmentZones: zones,
        matrix: matrix,
        matrixBits: matrix.map(float32Bits),
        width: width,
        height: height,
        rowStride: width * 4,
        imageType: 1,
        lcdPhase: 1,
        offsetX: xAxis.offset,
        offsetY: yAxis.offset,
        originX: xAxis.offset,
        originY: -(height + yAxis.offset),
        normalizedPixelScale: normalizedPixelScale,
        nativeKeyWords: nativeKeyWords
    };
}
export function deriveAdvancedRetainedSetup(glyph: Imp1Glyph, options: AdvancedSetupOptions) {
    let setup = deriveAdvancedPixelSetup(glyph, options),
        xAxis =
            (setup.standardAlignmentZones.mask & 1) === 0
                ? setupAxis(Math.fround(options.fittedPenX), setup.scaleX, glyph.referenceX, !1)
                : setupStandardAlignmentZoneAxis({
                      pen: Math.fround(options.fittedPenX),
                      scale: setup.scaleX,
                      normalizedEm: glyph.normalizedEm,
                      reference: glyph.referenceX,
                      emCoordinate: setup.standardAlignmentZones.xCoordinate,
                      lcd: !1
                  }),
        width = Math.trunc(setup.scaleX + 1);
    if (width < 1 || width > 65535) throw new RangeError('derived retained glyph image is outside uint16 bounds');
    let matrix = Object.freeze([setup.scaleX, 0, xAxis.translation, 0, setup.scaleY, setup.matrix[5]!, 0, 0, 1]);
    return {
        ...setup,
        matrix: matrix,
        matrixBits: matrix.map(float32Bits),
        width: width,
        rowStride: width,
        imageType: 0,
        lcdPhase: 0,
        offsetX: xAxis.offset,
        originX: xAxis.offset,
        residualX: xAxis.residual ?? 0
    };
}
export function decodeStandardAlignmentZones(glyph: Imp1Glyph) {
    if (!isArray(glyph?.encodedSaz) || glyph.encodedSaz.length !== 4) throw new TypeError('imp1 must contain four encoded SAZ words');
    let zones = glyph.encodedSaz.map(float32FromBits),
        mask = glyph.sazMask ?? 0;
    return Object.freeze({
        mask: mask,
        xCoordinate: (mask & 1) === 0 ? 0 : zones[0]!,
        yCoordinate: (mask & 2) === 0 ? 0 : zones[1]!,
        xSpan: (mask & 1) === 0 ? 0 : zones[2]!,
        ySpan: (mask & 2) === 0 ? 0 : zones[3]!
    });
}
export function fitStandardAlignmentZoneScale(scale: number, normalizedEm: number, span: number, bias: number) {
    let fround = Math.fround;
    if (span === 0) return fround(scale);
    let zoneSpan = fround(normalizedEm * span),
        pixelSpan = fround(fround(scale) * zoneSpan),
        fittedSpan = bias === 0.5 ? roundTiesEven(pixelSpan) : Math.trunc(pixelSpan + bias);
    return fittedSpan <= 0 ? fround(scale) : fround(fround(scale) * (fittedSpan / pixelSpan));
}
export function setupStandardAlignmentZoneAxis({ pen, scale, normalizedEm, reference, emCoordinate, lcd }: AlignmentZoneAxis) {
    let fround = Math.fround,
        zoneCoordinate = fround(reference + normalizedEm * emCoordinate),
        scaledReference = fround(scale * reference),
        centeredPen = fround(fround(pen - scaledReference) - 0.5),
        centeredAnchor = fround(centeredPen + scale * zoneCoordinate),
        residual = fround(Math.floor(centeredAnchor) + 0.5 - centeredAnchor),
        adjustedPen = fround(centeredPen + residual),
        offset = Math.floor(adjustedPen + (lcd ? lcdZoneOffsetBias : 0.5)),
        translation = fround(adjustedPen - offset);
    return {
        scaledReference: scaledReference,
        biasedPen: fround(adjustedPen + 0.5),
        centeredPen: adjustedPen,
        centeredAnchor: centeredAnchor,
        zoneCoordinate: zoneCoordinate,
        residual: residual,
        offset: offset,
        translation: translation
    };
}
var float32ValueView = new DataView(new ArrayBuffer(4));
export function float32FromBits(bits: number) {
    return float32ValueView.setUint32(0, bits >>> 0, !0), float32ValueView.getFloat32(0, !0);
}
export function air32GlyphRasterKey(glyphId: number, setup: AdvancedPixelSetup, extra: number[] = []) {
    if (!isSafeInteger(glyphId)) throw new TypeError('glyphId must be a safe integer');
    return [glyphId, ...setup.matrixBits, setup.width, setup.height, ...extra].join(':');
}
export function setupAxis(
    pen: number,
    scale: number,
    reference: number,
    lcd: boolean
): { scaledReference: number; biasedPen: number; offset: number; translation: number; residual?: number } {
    let fround = Math.fround,
        scaledReference = fround(scale * reference),
        biasedPen = fround(pen - scaledReference),
        offset = Math.floor(biasedPen - (lcd ? lcdAxisBias : 0)),
        translation = fround(fround(biasedPen - 0.5) - offset);
    return { scaledReference: scaledReference, biasedPen: biasedPen, offset: offset, translation: translation };
}
export function finitePositive(value: number, name: string) {
    if (!isFiniteNumber(value) || value <= 0) throw new RangeError(`${name} must be positive and finite`);
    return value;
}
export function parseImp1(input: ArrayBuffer | ArrayBufferView) {
    let bytes = asUint8Array(input);
    if (bytes.byteLength < 80) throw new RangeError('IMP1 block is shorter than its 0x50-byte header');
    let view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(0, !0) !== 1229803569) throw new Error('invalid IMP1 magic');
    let totalBytes = view.getUint32(4, !0),
        headerBytes = view.getUint32(8, !0),
        commandCount = view.getUint32(12, !0);
    if (headerBytes !== 80) throw new Error(`unsupported IMP1 header size ${headerBytes}`);
    let expectedBytes = headerBytes + commandCount * 20;
    if (totalBytes !== expectedBytes || totalBytes > bytes.byteLength)
        throw new Error(`inconsistent IMP1 size: header declares ${totalBytes}, commands require ${expectedBytes}`);
    let glyph: Imp1Glyph = {
        magic: 'IMP1',
        totalBytes: totalBytes,
        headerBytes: headerBytes,
        commandCount: commandCount,
        userId: view.getUint32(16, !0),
        normalizationFactor: view.getFloat32(20, !0),
        normalizedEm: view.getFloat32(24, !0),
        pathType: view.getUint32(28, !0),
        strokeWidth: view.getFloat32(32, !0),
        referenceX: view.getFloat32(36, !0),
        referenceY: view.getFloat32(40, !0),
        bounds: {
            xMin: view.getFloat32(44, !0),
            yMin: view.getFloat32(48, !0),
            xMax: view.getFloat32(52, !0),
            yMax: view.getFloat32(56, !0)
        },
        encodedSaz: [view.getUint32(60, !0), view.getUint32(64, !0), view.getUint32(68, !0), view.getUint32(72, !0)],
        sazMask: view.getUint32(76, !0),
        commands: []
    };
    if (glyph.pathType !== 0 && glyph.pathType !== 1) throw new Error(`unsupported IMP1 path type ${glyph.pathType}`);
    for (let index = 0; index < commandCount; index++) {
        let offset = headerBytes + index * 20,
            opcode = view.getUint32(offset, !0);
        if (opcode > 2) throw new Error(`unsupported IMP1 opcode ${opcode}`);
        glyph.commands.push({
            opcode: opcode,
            type: ['move', 'line', 'quadratic'][opcode]!,
            x: view.getFloat32(offset + 4, !0),
            y: view.getFloat32(offset + 8, !0),
            controlX: view.getFloat32(offset + 12, !0),
            controlY: view.getFloat32(offset + 16, !0)
        });
    }
    return glyph;
}
export function asUint8Array(input: ArrayBuffer | ArrayBufferView) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError('IMP1 input must be an ArrayBuffer or typed array');
}
export function prepareNativeProfile(profile: RawNativeProfile) {
    if (!profile || !isArray(profile.glyphs)) throw new TypeError('native profile must contain a glyphs array');
    let glyphs = new Map<number, NativeGlyph>();
    for (let record of profile.glyphs) {
        if (!isSafeInteger(record.codepoint) || typeof record.imp1Base64 != 'string')
            throw new TypeError('native glyph records require codepoint and imp1Base64');
        let imp1 = parseImp1(decodeBase64(record.imp1Base64));
        if (imp1.userId !== record.codepoint) throw new Error(`IMP1 user id does not match U+${record.codepoint.toString(16)}`);
        let renders = (record.renders ?? []).map((render) => {
            let rawImage = render.rawImageBase64 ? decodeBase64(render.rawImageBase64) : null;
            if (rawImage && rawImage.length !== render.rowStride * render.imageHeight)
                throw new Error(`raw mapper image has an invalid size for U+${record.codepoint.toString(16)}`);
            return { ...render, rawImage: rawImage };
        });
        glyphs.set(record.codepoint, { ...record, imp1: imp1, renders: renders });
    }
    return { schemaVersion: profile.schemaVersion, runtime: profile.runtime, fontSha256: profile.fontSha256, glyphs: glyphs, source: profile };
}
export function decodeBase64(text: string) {
    if (typeof globalThis.atob == 'function') {
        let binary = globalThis.atob(text),
            bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) bytes[index]! = binary.charCodeAt(index);
        return bytes;
    }
    throw new Error('a standards-compatible atob implementation is required');
}
