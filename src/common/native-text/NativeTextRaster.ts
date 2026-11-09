/** Distance-field and polygon rasterization of glyph outlines. */
import type {
    DistanceSetup,
    RasterEdgePoint,
    RasterGrid,
    RasterLine,
    RasterPoint,
    RasterVertex
} from './NativeTextTypes';
import { isArray, isFiniteNumber } from './NativeTextMath';

var float32 = Math.fround,
    outsideDistanceSentinel = -1e3,
    scanlineBias = 0.0010000000474974513,
    scanlineEpsilon = float32(1e-8);
export function rasterizeAdfDistances(lines: RasterLine[], setup: DistanceSetup) {
    return rasterizeAdfDistancesAtScale(lines, setup, 3);
}
export function rasterizeGrayscaleAdfDistances(lines: RasterLine[], setup: DistanceSetup) {
    return rasterizeAdfDistancesAtScale(lines, setup, 1);
}
export function rasterizeAdfDistancesAtScale(lines: RasterLine[], setup: DistanceSetup, scale: number) {
    validate(lines, setup);
    let width = setup.width * scale,
        height = setup.height,
        stepX = float32(1 / scale),
        stepY = 1,
        inverseX = scale,
        inverseY = 1,
        cutoff = float32(Math.max(Math.abs(float32(setup.outsideCutoff)), Math.abs(float32(setup.insideCutoff)))),
        values = new Float32Array(width * height);
    values.fill(outsideDistanceSentinel);
    let grid = { width: width, height: height, stepX: stepX, stepY: stepY, inverseX: inverseX, inverseY: inverseY, values: values };
    if (cutoff !== 0) {
        for (let line of lines) rasterizeLineRectangle(line, cutoff, grid);
        for (let line of lines) rasterizeEndpoint(line.to, cutoff, grid);
    }
    return applyWindingSigns(lines, grid), { width: width, height: height, values: values };
}
export function rasterizeLineRectangle(line: RasterLine, cutoff: number, grid: RasterGrid) {
    let { from: from, to: to } = line,
        dx = float32(to.x - from.x),
        dy = float32(to.y - from.y),
        length = float32(Math.sqrt(dx * dx + dy * dy));
    if (!(length > 0)) return;
    let inverseLength = float32(1 / length),
        normalX = float32(dy * inverseLength),
        normalY = float32(-dx * inverseLength);
    if (normalX === 0 || normalY === 0) {
        rasterizeAxisLine(line, cutoff, normalX, normalY, grid);
        return;
    }
    let offsetX = float32(cutoff * normalX),
        offsetY = float32(cutoff * normalY),
        vertex = (S: number, z: number, K: number) => ({ x: float32(S * grid.inverseX), y: float32(z * grid.inverseY), distance: K }),
        fromOutside = vertex(from.x - offsetX, from.y - offsetY, -cutoff),
        fromInside = vertex(from.x + offsetX, from.y + offsetY, cutoff),
        toOutside = vertex(to.x - offsetX, to.y - offsetY, -cutoff),
        toInside = vertex(to.x + offsetX, to.y + offsetY, cutoff),
        lineSlope = float32(((to.x - from.x) * grid.inverseX) / ((to.y - from.y) * grid.inverseY)),
        cutoffSlope = float32((normalX * grid.inverseX) / (normalY * grid.inverseY)),
        distanceStep = float32(grid.stepY / normalY),
        edges = [
            makeEdge(fromOutside, toOutside, lineSlope, 0),
            makeEdge(fromInside, toInside, lineSlope, 0),
            makeEdge(fromOutside, fromInside, cutoffSlope, distanceStep),
            makeEdge(toOutside, toInside, cutoffSlope, distanceStep)
        ],
        xDistanceStep = float32(normalX * grid.stepX);
    rasterizePolygonRows(edges, xDistanceStep, grid);
}
export function makeEdge(from: RasterVertex, to: RasterVertex, slope: number, distanceStep: number) {
    let top = from.y <= to.y ? from : to,
        bottom = top === from ? to : from,
        firstRow = Math.max(0, Math.ceil(top.y)),
        lastRow = Math.floor(bottom.y),
        rowOffset = float32(firstRow - top.y),
        x = float32(rowOffset * slope + top.x),
        distance = float32(rowOffset * distanceStep + top.distance),
        edge = new Map<number, RasterEdgePoint>();
    for (let row = firstRow; row <= lastRow; row++)
        edge.set(row, { x: x, distance: distance }), (x = float32(x + slope)), (distance = float32(distance + distanceStep));
    return edge;
}
export function rasterizePolygonRows(edges: Map<number, RasterEdgePoint>[], step: number, grid: RasterGrid) {
    for (let row = 0; row < grid.height; row++) {
        let intersections = [];
        for (let edge of edges) {
            let intersection = edge.get(row);
            intersection && intersections.push(intersection);
        }
        if (intersections.length < 2) continue;
        intersections.sort((edge, intersection) => edge.x - intersection.x);
        let left = intersections[0]!,
            right = intersections.at(-1)!,
            firstX = Math.max(0, Math.ceil(left.x)),
            lastX = Math.min(grid.width - 1, Math.ceil(right.x) - 1);
        if (firstX > lastX) continue;
        let distance = float32((firstX - left.x) * step + left.distance),
            index = row * grid.width + firstX;
        for (let edge = firstX; edge <= lastX; edge++, index++) {
            let intersection = -Math.abs(distance);
            Math.abs(intersection) <= Math.abs(grid.values[index]!) && (grid.values[index]! = intersection), (distance = float32(distance + step));
        }
    }
}
export function rasterizeEndpoint(point: RasterPoint, cutoff: number, grid: RasterGrid) {
    let firstX = Math.max(0, Math.ceil((point.x - cutoff) * grid.inverseX)),
        lastX = Math.min(grid.width - 1, Math.ceil((point.x + cutoff) * grid.inverseX) - 1),
        firstY = Math.max(0, Math.ceil((point.y - cutoff) * grid.inverseY)),
        lastY = Math.min(grid.height - 1, Math.ceil((point.y + cutoff) * grid.inverseY) - 1);
    if (firstX > lastX || firstY > lastY) return;
    let xOffsets = new Float32Array(lastX - firstX + 1),
        dx = float32(firstX * grid.stepX - point.x);
    for (let row = 0; row < xOffsets.length; row++) (xOffsets[row]! = dx), (dx = float32(dx + grid.stepX));
    let dy = float32(firstY * grid.stepY - point.y);
    for (let row = firstY; row <= lastY; row++) {
        let index = row * grid.width + firstX;
        for (let column = firstX; column <= lastX; column++, index++) {
            let xOffset = xOffsets[column - firstX]!,
                distanceSquared = float32(xOffset * xOffset + dy * dy);
            grid.values[index]! * grid.values[index]! >= distanceSquared && (grid.values[index]! = -float32(Math.sqrt(distanceSquared)));
        }
        dy = float32(dy + grid.stepY);
    }
}
export function rasterizeAxisLine(line: RasterLine, cutoff: number, normalX: number, normalY: number, grid: RasterGrid) {
    let s = normalX !== 0,
        o = float32((s ? line.from.x - cutoff : Math.min(line.from.x, line.to.x)) * grid.inverseX),
        d = float32((s ? line.from.x + cutoff : Math.max(line.from.x, line.to.x)) * grid.inverseX),
        c = float32((s ? Math.min(line.from.y, line.to.y) : line.from.y - cutoff) * grid.inverseY),
        f = float32((s ? Math.max(line.from.y, line.to.y) : line.from.y + cutoff) * grid.inverseY),
        b = Math.max(0, Math.ceil(o)),
        l = Math.min(grid.width - 1, Math.ceil(d) - 1),
        _ = Math.max(0, Math.ceil(c)),
        h = Math.min(grid.height - 1, Math.ceil(f) - 1);
    if (!(b > l || _ > h))
        if (s) {
            let p = float32(line.from.x - b * grid.stepX);
            for (let m = _; m <= h; m++) {
                let v = p,
                    w = m * grid.width + b;
                for (let I = b; I <= l; I++, w++) {
                    let C = -Math.abs(v);
                    Math.abs(C) <= Math.abs(grid.values[w]!) && (grid.values[w]! = C), (v = float32(v - grid.stepX));
                }
            }
        } else {
            let p = float32(line.from.y - _ * grid.stepY);
            for (let m = _; m <= h; m++) {
                let v = -Math.abs(p),
                    w = m * grid.width + b;
                for (let I = b; I <= l; I++, w++) Math.abs(v) <= Math.abs(grid.values[w]!) && (grid.values[w]! = v);
                p = float32(p - grid.stepY);
            }
        }
}
export function applyWindingSigns(lines: RasterLine[], grid: RasterGrid) {
    let windings = new Int8Array(grid.width * grid.height);
    for (let row of lines) rasterizeWindingLine(row, windings, grid);
    for (let row = 0; row < grid.height; row++) {
        let winding = 0,
            index = row * grid.width;
        for (let column = 0; column < grid.width; column++, index++)
            (winding = (winding + windings[index]!) & 255), winding !== 0 && (grid.values[index]! = -grid.values[index]!);
    }
}
export function rasterizeWindingLine(line: RasterLine, windings: Int8Array, grid: RasterGrid) {
    let t = float32(line.from.x * grid.inverseX),
        i = float32(line.to.x * grid.inverseX),
        s = biasScanY(float32(line.from.y * grid.inverseY)),
        o = biasScanY(float32(line.to.y * grid.inverseY)),
        d = Math.trunc(s),
        c = Math.trunc(o);
    if (d === c || (s < 0 && o < 0)) return;
    let f = o > s,
        l = (f ? s : o) >= 0 ? (f ? d : c) + 1 : 0,
        _ = f ? c : d;
    if (((_ = Math.min(grid.height - 1, _)), l > _)) return;
    let h = float32(i - t),
        p = float32(1 / (o - s)),
        m = float32((l - s) * p),
        v = float32(h * p),
        w = float32(h * m + t + 1),
        I = f ? 1 : -1,
        C = l * grid.width;
    for (let W = l; W <= _; W++, C += grid.width) {
        let R = Math.trunc(w);
        R >= 0 && R < grid.width && (windings[C + R]! += I), (w = float32(w + v));
    }
}
export function biasScanY(value: number) {
    let integer = Math.trunc(value),
        difference = integer - value;
    return difference < 0 && (difference = -integer - value), float32(difference) <= scanlineEpsilon ? float32(value - scanlineBias) : value;
}
export function validate(lines: RasterLine[], setup: DistanceSetup) {
    if (
        !isArray(lines) ||
        lines.some((r) => !r?.from || !r?.to || !isFiniteNumber(r.from.x) || !isFiniteNumber(r.from.y) || !isFiniteNumber(r.to.x) || !isFiniteNumber(r.to.y))
    )
        throw new TypeError('lines must contain finite from/to points');
    if (
        !setup ||
        !Number.isInteger(setup.width) ||
        setup.width < 1 ||
        !Number.isInteger(setup.height) ||
        setup.height < 1 ||
        !isFiniteNumber(setup.outsideCutoff) ||
        !isFiniteNumber(setup.insideCutoff)
    )
        throw new TypeError('setup must contain dimensions and finite cutoffs');
}
