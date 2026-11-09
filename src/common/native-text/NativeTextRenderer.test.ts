import { describe, expect, it } from 'vitest';
import {
    air32DistanceToMask,
    applyTextFieldControlsToCutoffs,
    blendComponent,
    clampByte,
    compositeRetainedCoverage,
    compositeRetainedToOpaque,
    createRetainedBitmap,
    decodeBase64,
    finiteNumber,
    flattenQuadratic,
    float32Bits,
    float32FromBits,
    floorToTwips,
    interpolateCsmTable,
    midpoint,
    normalizeArgbColor,
    normalizeColor,
    normalizeOpaqueColor,
    normalizeTextColor,
    normalSampleCountToDensity,
    pointLineSquaredDistance,
    premultiplyColor,
    quantizeAlphaMultiplier,
    reduceLcdColor,
    resolveTextFieldCsm,
    roundRationalTiesEven,
    roundTiesEven,
    roundTiesEvenInteger,
    roundToQuarterPixel,
    setNormalRetainedCoverage
} from './NativeTextRenderer';

/**
 * The pure helpers of the native text renderer, called with a spread of inputs (the edges of each range included) and
 * pinned as snapshots. The renderer is spread over several modules; these outputs must not move when the code does.
 */

const attempt = (call: () => unknown) =>
{
    try
    {
        return call();
    }
    catch(error)
    {
        return `${(error as Error).constructor.name}: ${(error as Error).message}`;
    }
};

const round = (value: unknown): unknown => (typeof value === 'number' ? Math.round(value * 1e9) / 1e9 : Array.isArray(value) ? value.map(round) : value);

const table = <T,>(inputs: T[], call: (input: T) => unknown) => inputs.map((input) => [ JSON.stringify(input), round(attempt(() => call(input))) ]);

describe('native text numbers and colours', () =>
{
    it('rounds ties to even', () =>
    {
        expect(table([ -2.5, -1.5, -0.5, 0, 0.4, 0.5, 1.5, 2.5, 3.5, 2.4999, 1e9 + 0.5 ], (value) => [ roundTiesEven(value), roundTiesEvenInteger(value) ])).toMatchSnapshot();
        expect(table([ [ 1, 2 ], [ 3, 2 ], [ 5, 2 ], [ 7, 4 ], [ -5, 2 ], [ 1, 3 ] ] as [ number, number ][], ([ n, d ]) => roundRationalTiesEven(n, d))).toMatchSnapshot();
    });

    it('quantizes and blends alpha', () =>
    {
        expect(table([ 0, 0.001, 0.25, 0.5, 0.999, 1, -1, 2 ], (alpha) => quantizeAlphaMultiplier(alpha))).toMatchSnapshot();
        expect(table([ [ 0, 255, 255, 255 ], [ 255, 0, 255, 128 ], [ 100, 200, 128, 64 ], [ 10, 20, 255, 1 ] ] as number[][], ([ d, f, a, m ]) => blendComponent(d, f, a, m))).toMatchSnapshot();
        expect(table([ [ 0, 0, 0, 255 ], [ 255, 255, 255, 255 ], [ 255, 128, 0, 128 ], [ 10, 20, 30, 0 ] ] as number[][], (color) => premultiplyColor(color as never))).toMatchSnapshot();
        expect(table([ -3, 0, 127.5, 255, 300 ], (value) => clampByte(value))).toMatchSnapshot();
    });

    it('normalizes colours', () =>
    {
        expect(table([ 0, 0xffffff, 0x123456, 0x1000000, -1, 1.5, [ 1, 2, 3 ], [ 1, 2 ], [ 256, 0, 0 ] ] as unknown[], (color) => normalizeColor(color as never))).toMatchSnapshot();
        expect(table([ [ 0xff0000, undefined ], [ 0xff0000, 0.5 ], [ [ 1, 2, 3, 4 ], undefined ], [ [ 1, 2, 3, 4 ], 1 ], [ 0xff0000, 2 ], [ [ 1, 2, 3 ], undefined ], [ -1, undefined ] ] as unknown[][], ([ color, alpha ]) => normalizeTextColor(color as never, alpha as never))).toMatchSnapshot();
        expect(table([ 0xff112233, '#ff112233', 'ff112233', '#12345', 4294967296, -1, 1.5 ] as unknown[], (color) => normalizeArgbColor(color as never, 'background'))).toMatchSnapshot();
        expect(table([ 0xabcdef, [ 9, 8, 7, 255 ], [ 9, 8, 7, 128 ], [ 9, 8, 7 ], 0x1000000 ] as unknown[], (color) => normalizeOpaqueColor(color as never, 'foreground'))).toMatchSnapshot();
        expect(table([ 0, 1.5, Number.NaN, Number.POSITIVE_INFINITY, -2 ], (value) => finiteNumber(value, 'size'))).toMatchSnapshot();
        expect(table([ 0, 1, 7.75, -3.2, 100.125, 0.1 ], (value) => [ floorToTwips(value), roundToQuarterPixel(value) ])).toMatchSnapshot();
        expect(table([ [ 255, 0, 0, 0.5 ], [ 0, 255, 0, 1 ], [ 12, 200, 99 ], [ 0, 0, 0, 0 ] ] as number[][], ([ r, g, b, amount ]) => reduceLcdColor(r, g, b, amount))).toMatchSnapshot();
    });

    it('converts float32 values to bits and back', () =>
    {
        const values = [ 0, 1, -1, 0.1, 3.4028234663852886e38, 1e-45, Math.PI ];

        expect(table(values, (value) => float32Bits(value))).toMatchSnapshot();
        expect(table(values, (value) => float32FromBits(float32Bits(value)))).toMatchSnapshot();
        expect(attempt(() => float32Bits(Number.NaN))).toMatchSnapshot();
        expect(table([ 'AAEC', 'AQID', '', 'AA==', '!!', 'AB' ], (text) => Array.from(decodeBase64(text) as ArrayLike<number>))).toMatchSnapshot();
    });
});

describe('native text csm, density and geometry', () =>
{
    it('interpolates the csm table and applies the field controls', () =>
    {
        expect(table([ 4, 8, 11, 12.5, 24, 48, 100 ], (size) => interpolateCsmTable(size) as unknown)).toMatchSnapshot();
        expect(table([ [ 12, 0, 0, 'dark', 0 ], [ 12, 100, 0, 'dark', 0 ], [ 12, -100, 100, 'dark', 0 ], [ 24, 50, 50, 'light', 0 ], [ 9, 0, 0, 'dark', 3 ], [ 12, 400, -400, 'dark', 0 ] ] as unknown[][], ([ size, thickness, sharpness, type, hint ]) => resolveTextFieldCsm(size as number, thickness as number, sharpness as number, type as string, hint as number))).toMatchSnapshot();
        expect(attempt(() => applyTextFieldControlsToCutoffs(interpolateCsmTable(12) as never, 12, 0, 0))).toMatchSnapshot();
        expect(attempt(() => applyTextFieldControlsToCutoffs(interpolateCsmTable(12) as never, 12, 60, -40))).toMatchSnapshot();
    });

    it('turns distances and sample counts into coverage', () =>
    {
        expect(table([ [ 0, 0.5, 0.5 ], [ 0.5, 0.5, 0.5 ], [ -0.3, 0.2, 0.9 ], [ 2, 0.2, 0.9 ], [ 1, 0.1, 0.1 ] ] as number[][], ([ d, outside, inside ]) => air32DistanceToMask(d, outside, inside))).toMatchSnapshot();
        expect(table([ 0, 1, 2, 5, 8, 9, 16, 64 ], (count) => attempt(() => normalSampleCountToDensity(count)))).toMatchSnapshot();
    });

    it('measures points and flattens a quadratic curve', () =>
    {
        expect(midpoint({ x: 1, y: 2 }, { x: 4, y: 8 })).toMatchSnapshot();
        expect(table([ [ 0, 0 ], [ 5, 5 ], [ -3, 4 ], [ 10, 0 ] ] as number[][], ([ x, y ]) => pointLineSquaredDistance(x, y, { x: 0, y: 0 }, { x: 10, y: 0 }))).toMatchSnapshot();
        expect(pointLineSquaredDistance(3, 4, { x: 1, y: 1 }, { x: 1, y: 1 })).toMatchSnapshot();

        for(const mode of [ 'perpendicular', 'second-euclidean', 'second-max', 'second-sum' ])
        {
            const lines: { from: { x: number; y: number }; to: { x: number; y: number } }[] = [];

            flattenQuadratic(lines, { x: 0, y: 0 }, { x: 5, y: 10 }, { x: 10, y: 0 }, 0.25, mode, 0);

            expect([ mode, lines.length, lines.slice(0, 4).map((line) => [ round(line.from.x), round(line.from.y), round(line.to.x), round(line.to.y) ]) ]).toMatchSnapshot();
        }
    });
});

describe('native text retained bitmap', () =>
{
    it('composites coverage onto a retained bitmap and onto an opaque background', () =>
    {
        const retained = createRetainedBitmap(3, 2);

        expect(retained.length).toBe(3 * 2 * 4);

        compositeRetainedCoverage(retained, 0, [ 255, 0, 0, 255 ], 255);
        compositeRetainedCoverage(retained, 4, [ 0, 255, 0, 200 ], 128);
        compositeRetainedCoverage(retained, 8, [ 0, 0, 255, 255 ], 40);
        compositeRetainedCoverage(retained, 8, [ 255, 255, 255, 255 ], 100);
        setNormalRetainedCoverage(retained, 12, [ 10, 20, 30, 255 ], 77);
        setNormalRetainedCoverage(retained, 16, [ 200, 100, 50, 255 ], 255);
        expect(attempt(() => setNormalRetainedCoverage(retained, 20, [ 200, 100, 50, 128 ], 255))).toMatchSnapshot("translucent");

        expect(Array.from(retained)).toMatchSnapshot('retained');
        expect(Array.from(compositeRetainedToOpaque(retained, [ 255, 255, 255, 255 ]))).toMatchSnapshot('on white');
        expect(Array.from(compositeRetainedToOpaque(retained, [ 0, 0, 0, 255 ]))).toMatchSnapshot('on black');
        expect(attempt(() => compositeRetainedToOpaque(new Uint8Array(5), [ 0, 0, 0, 255 ]))).toMatchSnapshot('not rgba');
    });
});
