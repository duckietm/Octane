interface ColorTransform {
    redMultiplier: number;
    greenMultiplier: number;
    blueMultiplier: number;
    alphaMultiplier: number;
    redOffset: number;
    greenOffset: number;
    blueOffset: number;
    alphaOffset: number;
}

export type BytePixels = Uint8Array | Uint8ClampedArray;
export type ColorChannels = readonly number[] | Uint8Array | Uint8ClampedArray;
export type TextColor = number | ColorChannels;
export interface TextRenderStyle {
    fontFamily: string;
    fontSize: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    color: number;
    antiAliasType: string;
    gridFitType: string;
    thickness: number;
    sharpness: number;
    kerning: boolean;
    stageQuality: string;
    leading: number;
    letterSpacing: number;
    colorTransform?: ColorTransform | undefined;
}
export interface TextPixelTarget {
    pixels: Uint8ClampedArray;
    width: number;
    height: number;
    offsetX?: number | undefined;
    offsetY?: number | undefined;
}
export interface RasterPoint {
    x: number;
    y: number;
}
export interface RasterLine {
    from: RasterPoint;
    to: RasterPoint;
}
export interface RasterEdgePoint {
    x: number;
    distance: number;
}
export interface RasterVertex extends RasterPoint {
    distance: number;
}
export interface RasterGrid {
    width: number;
    height: number;
    stepX: number;
    stepY: number;
    inverseX: number;
    inverseY: number;
    values: Float32Array;
}
export interface DistanceSetup {
    width: number;
    height: number;
    outsideCutoff: number;
    insideCutoff: number;
}
export interface Imp1RasterSetup extends DistanceSetup {
    matrix: readonly number[];
    rowStride?: number | undefined;
    quadraticFlatness?: number | undefined;
    flatnessMode?: string | undefined;
    useColorReduction?: boolean | undefined;
    colorReductionAmount?: number | undefined;
}
export interface CsmCutoffs {
    outside: number;
    inside: number;
    gamma?: number | undefined;
}
export interface CsmRecord extends CsmCutoffs {
    pixelSize: number;
    gamma: number;
}
export interface Imp1Command {
    opcode: number;
    type: string | undefined;
    x: number;
    y: number;
    controlX: number;
    controlY: number;
}
export interface Imp1Glyph {
    magic: string;
    totalBytes: number;
    headerBytes: number;
    commandCount: number;
    userId: number;
    normalizationFactor: number;
    normalizedEm: number;
    pathType: number;
    strokeWidth: number;
    referenceX: number;
    referenceY: number;
    bounds: GlyphBounds;
    encodedSaz: number[];
    sazMask: number;
    commands: Imp1Command[];
}
export interface FlattenedCommand {
    opcode: number;
    type: string;
    x: number;
    y: number;
}
export interface FlattenedPath {
    pathType: number;
    strokeWidth: number;
    commandCount: number;
    commands: FlattenedCommand[];
}
export interface GlyphBounds {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
}
export interface AdvancedSetupOptions {
    pointSize: number;
    dpi?: number | undefined;
    scaleX?: number | undefined;
    scaleY?: number | undefined;
    fittedPenX: number;
    fittedPenY: number;
}
export interface AlignmentZoneAxis {
    pen: number;
    scale: number;
    normalizedEm: number;
    reference: number;
    emCoordinate: number;
    lcd: boolean;
}
export interface RawNativeRender {
    rawImageBase64?: string | undefined;
    rowStride: number;
    imageHeight: number;
    [field: string]: unknown;
}
export interface RawNativeGlyph {
    codepoint: number;
    imp1Base64: string;
    renders?: RawNativeRender[] | undefined;
    [field: string]: unknown;
}
export interface RawNativeProfile {
    glyphs: RawNativeGlyph[];
    schemaVersion?: number | undefined;
    runtime?: unknown;
    fontSha256?: string | null | undefined;
    [field: string]: unknown;
}
export interface NativeGlyph extends RawNativeGlyph {
    imp1: Imp1Glyph;
    renders: (RawNativeRender & { rawImage: Uint8Array | null })[];
}
export interface NativeProfile {
    schemaVersion: number | undefined;
    runtime: unknown;
    fontSha256: string | null | undefined;
    glyphs: Map<number, NativeGlyph>;
    source: RawNativeProfile;
}
export interface SwfGlyph {
    code: number;
    advance?: number | null | undefined;
    hasInk?: boolean | undefined;
    shape?: { contours?: unknown[] | undefined } | undefined;
    bounds?: GlyphBounds | undefined;
}
export interface SwfFont {
    emSquare: number;
    glyphs: SwfGlyph[];
    kerning: { leftCode: number; rightCode: number; adjustment: number }[];
    metrics: { ascent: number; descent: number };
    flags?: { italic?: boolean | undefined } | undefined;
    alignmentZones?: { csmTableHint?: number | undefined } | null | undefined;
}
export interface NativeFont {
    profile: NativeProfile;
    swfFont: SwfFont;
    swfGlyphs: Map<number, SwfGlyph>;
    kerning: Map<string, number>;
}
export interface NativeBundle {
    schemaVersion: number;
    format: string;
    fontKey: string;
    fontSha256?: string | null | undefined;
    runtime?: unknown;
    nativeProfile: RawNativeProfile;
    swfFont: SwfFont;
    coverage?: { codepointCount?: number; imp1GlyphCount?: number; metricGlyphCount?: number } | null | undefined;
}
export interface NormalRasterSetup {
    width: number;
    height: number;
    originX: number;
    baselineY: number;
    size: number;
    emSquare: number;
}
export interface NormalSampleSetup extends NormalRasterSetup {
    sampleMasks: Uint16Array;
}
export interface LowNormalSetup extends NormalRasterSetup {
    coverage: Uint8Array;
}
export interface NormalRasterLine {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
}
export interface GlyphPlacement {
    codepoint: number;
    stringIndex: number;
    penX: number;
    maskPenX: number;
    hasInk: boolean;
    penUnits?: number | undefined;
    penTwips?: number | undefined;
    phaseIndex?: number | undefined;
    roundedPhase?: number | undefined;
    anchorX?: number | undefined;
}
export interface NativeTextLayout {
    placements: GlyphPlacement[];
    rawTextWidth: number;
    textWidth: number;
    fieldWidth: number;
}
export interface NativeLineMetrics {
    size: number;
    ascent: number;
    descent: number;
    leading: number;
    textHeight: number;
    fieldHeight: number;
    baseline: number;
}
export interface CoverageRaster {
    width: number;
    height: number;
    coverage: Uint8Array;
}
export interface PositionedCoverageRaster extends CoverageRaster {
    originX: number;
    originY: number;
}
export interface RasterCache<T = PositionedCoverageRaster> {
    entries: Map<string | null, T>;
    bytes: number;
}
export interface NativeRenderOptions {
    size?: number | undefined;
    antiAliasType?: string | undefined;
    gridFitType?: string | undefined;
    thickness?: number | undefined;
    sharpness?: number | undefined;
    kerning?: boolean | undefined;
    stageQuality?: string | undefined;
    fontStyle?: string | undefined;
    renderingPipeline?: string | undefined;
    letterSpacing?: number | undefined;
    padding?: number | undefined;
    color?: TextColor | undefined;
    alpha?: number | undefined;
    background?: TextColor | undefined;
    backgroundAlpha?: number | undefined;
    colorTransform?: ColorTransform | undefined;
    textDecoration?: string | null | undefined;
    etchingColor?: number | string | null | undefined;
    etchingPosition?: string | null | undefined;
    target?: TextPixelTarget | undefined;
    rasterCache?: RasterCache | undefined;
}
