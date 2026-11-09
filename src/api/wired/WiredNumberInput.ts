import { localizeWithFallback } from '../utils/localizeWithFallback';

/** The range and units of a wired number input: the stored value against what the field shows. */
export interface WiredNumberInputRange {
    /** Smallest and largest stored value. */
    min: number;
    max: number;
    /** The stored value's step; a typed number between two steps is not valid. */
    step?: number;
    /** The stored value as the field shows it (pulses as seconds, steps as ms...). */
    toDisplay?: (value: number) => number;
    /** A shown number back to a stored value. */
    fromDisplay?: (shown: number) => number;
}

/** Why a typed number was refused, as the official NumberInputPreset words it. */
export type WiredNumberInputError = { kind: 'invalid' } | { kind: 'between'; min: string; max: string };

export type WiredNumberInputResult = { valid: true; value: number } | { valid: false; error: WiredNumberInputError };

const identity = (value: number) => value;
const DECIMAL_PATTERN = /^-?(\d+\.?\d*|\.\d+)$/;
const EPSILON = 1e-6;

/** The number the field shows, without float noise ("0.30000000000000004" is "0.3"). */
export const formatWiredNumber = (value: number): string => String(Math.round(value * 1e6) / 1e6);

/**
 * Official NumberInputPreset restrict: digits, a minus only when the range goes below zero, and a
 * decimal point only when the shown values can have one.
 */
export const restrictWiredNumberInput = (text: string, range: WiredNumberInputRange): string => {
    const { min, step = 1, toDisplay = identity } = range;
    const allowsMinus = toDisplay(min) < 0;
    const allowsDecimals = !Number.isInteger(Math.round(toDisplay(step) * 1e6) / 1e6) || !Number.isInteger(toDisplay(min));

    return (text ?? '')
        .split('')
        .filter((char) => /[0-9]/.test(char) || (allowsMinus && char === '-') || (allowsDecimals && (char === '.' || char === ',')))
        .join('');
};

/**
 * Official NumberInputPreset validation: a text that is not a number, or falls between two steps
 * (a half-second field typed as 2.3), is invalid; a number outside the range says between which
 * values it must be. A valid text gives the stored value.
 */
export const validateWiredNumberInput = (text: string, range: WiredNumberInputRange): WiredNumberInputResult => {
    const { min, max, step = 1, toDisplay = identity, fromDisplay = identity } = range;
    const normalized = (text ?? '').trim().replace(',', '.');

    if (!DECIMAL_PATTERN.test(normalized)) return { valid: false, error: { kind: 'invalid' } };

    const shown = Number(normalized);
    const raw = fromDisplay(shown);
    const steps = raw / step;

    if (!Number.isFinite(raw) || Math.abs(steps - Math.round(steps)) > EPSILON) return { valid: false, error: { kind: 'invalid' } };

    const value = Math.round(steps) * step;

    // A converter that rounds (seconds to pulses) must give back the number typed: 2.3 s is no pulse count.
    if (Math.abs(toDisplay(value) - shown) > EPSILON) return { valid: false, error: { kind: 'invalid' } };

    if (value < min || value > max) return { valid: false, error: { kind: 'between', min: formatWiredNumber(toDisplay(min)), max: formatWiredNumber(toDisplay(max)) } };

    return { valid: true, value };
};

/** The warning bubble's text: `wiredfurni.params.number_input.invalid` or `.between`. */
export const wiredNumberInputMessage = (error: WiredNumberInputError): string =>
    error.kind === 'between'
        ? localizeWithFallback('wiredfurni.params.number_input.between', `Number needs to be between ${error.min} and ${error.max}`, ['min', 'max'], [error.min, error.max])
        : localizeWithFallback('wiredfurni.params.number_input.invalid', 'Number is invalid');
