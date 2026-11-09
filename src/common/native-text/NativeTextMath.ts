/** Number, colour and run-argument helpers shared by the native text modules. */
import type {
    ColorChannels
} from './NativeTextTypes';

export type NativeContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export function roundTiesEven(value: number) {
    if (!isFiniteNumber(value)) throw new TypeError('value must be finite');
    let floor = Math.floor(value),
        fraction = value - floor;
    return fraction < 0.5 ? floor : fraction > 0.5 ? floor + 1 : floor % 2 === 0 ? floor : floor + 1;
}
export function roundRationalTiesEven(numerator: number, denominator: number) {
    if (!isSafeInteger(numerator) || !isSafeInteger(denominator) || numerator < 0 || denominator <= 0)
        throw new RangeError('roundRationalTiesEven requires safe non-negative integers');
    let quotient = Math.floor(numerator / denominator),
        doubledRemainder = (numerator - quotient * denominator) * 2 - denominator;
    return doubledRemainder < 0 ? quotient : doubledRemainder > 0 ? quotient + 1 : quotient % 2 === 0 ? quotient : quotient + 1;
}
export function quantizeAlphaMultiplier(alphaMultiplier: number) {
    if (!isFiniteNumber(alphaMultiplier)) throw new TypeError('alphaMultiplier must be finite');
    let quantized = Math.max(0, Math.min(256, Math.floor(Math.max(0, Math.min(1, alphaMultiplier)) * 256)));
    return Math.max(0, quantized - 1);
}
export function premultiplyColor(color: ColorChannels) {
    let channels = normalizeColor(color),
        alpha = channels[3]!,
        alphaScale = alpha + 1;
    return [Math.floor((channels[0]! * alphaScale) / 256), Math.floor((channels[1]! * alphaScale) / 256), Math.floor((channels[2]! * alphaScale) / 256), alpha];
}
export function blendComponent(destination: number, foregroundPremultiplied: number, globalAlpha: number, mask: number) {
    for (let [name, value] of [
        ['destination', destination],
        ['foregroundPremultiplied', foregroundPremultiplied],
        ['globalAlpha', globalAlpha],
        ['mask', mask]
    ] as const)
        if (!Number.isInteger(value) || value < 0 || value > 255) throw new RangeError(`${name} must be an integer from 0 through 255`);
    let scaledDestination = Math.floor((destination * globalAlpha) / 256),
        difference = foregroundPremultiplied - scaledDestination;
    return clampByte(destination + Math.floor((difference * mask) / 256));
}
var componentMaskInverse = buildComponentMaskInverse();
export function buildComponentMaskInverse() {
    let inverse = new Uint8Array(256);
    inverse[0]! = 255;
    for (let coverage = 0; coverage <= 255; coverage++) {
        let component = coverage === 0 ? 255 : 255 - Math.ceil((254 * coverage) / 256);
        inverse[component]! === 0 && component !== 255 && (inverse[component]! = coverage);
    }
    return inverse;
}
export function clampByte(value: number) {
    return Math.max(0, Math.min(255, value));
}
export function normalizeColor(color: ColorChannels) {
    if (!isArray(color) && !ArrayBuffer.isView(color)) throw new TypeError('color must be an RGBA array');
    if (color.length !== 4 || [...color].some((e) => !Number.isInteger(e) || e < 0 || e > 255))
        throw new RangeError('RGBA channels must be integers from 0 through 255');
    return color;
}
export function air32DistanceToMask(distance: number, outside: number, inside: number) {
    if ((assertFinite('distance', distance), assertFinite('outside', outside), assertFinite('inside', inside), outside > inside))
        throw new RangeError('outside cutoff must be <= inside cutoff');
    if (distance < outside) return 0;
    if (distance >= inside || outside === inside) return 255;
    let fround = Math.fround,
        scale = fround(1 / (inside - outside)),
        offset = fround(-outside * scale),
        normalized = fround(fround(distance * scale) + offset);
    return roundTiesEvenInteger(fround(normalized * 255));
}
export function normalSampleCountToDensity(coveredSamples: number) {
    if (!Number.isInteger(coveredSamples) || coveredSamples < 0 || coveredSamples > 16)
        throw new RangeError('coveredSamples must be an integer from 0 through 16');
    return coveredSamples === 0 ? 0 : coveredSamples * 16 - 1;
}
export function assertFinite(name: string, value: number) {
    if (!isFiniteNumber(value)) throw new TypeError(`${name} must be a finite number`);
}
export function roundTiesEvenInteger(value: number) {
    let floor = Math.floor(value),
        fraction = value - floor;
    return fraction < 0.5 ? floor : fraction > 0.5 ? floor + 1 : floor % 2 === 0 ? floor : floor + 1;
}
/** Typed forms of the original numeric predicates; no coercion or added validation. */
export function isSafeInteger(value: unknown): value is number {
    return Number.isSafeInteger(value);
}
export function isFiniteNumber(value: unknown): value is number {
    return Number.isFinite(value);
}

/** Boolean check keeps declared element types instead of widening them at Array.isArray. */
export function isArray<T>(value: T): value is Extract<T, readonly unknown[]> {
    return Array.isArray(value);
}
