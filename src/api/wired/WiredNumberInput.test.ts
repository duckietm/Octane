import { describe, expect, it, vi } from 'vitest';

vi.mock('../utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

import { restrictWiredNumberInput, validateWiredNumberInput, wiredNumberInputMessage } from './WiredNumberInput';

const pulses = { min: 1, max: 120, toDisplay: (value: number) => value / 2, fromDisplay: (seconds: number) => Math.round(seconds * 2) };

describe('validateWiredNumberInput', () => {
    it('gives the stored value of a valid number', () => {
        expect(validateWiredNumberInput('7', { min: 0, max: 10 })).toEqual({ valid: true, value: 7 });
        expect(validateWiredNumberInput('2.5', pulses)).toEqual({ valid: true, value: 5 });
        expect(validateWiredNumberInput('2,5', pulses)).toEqual({ valid: true, value: 5 });
    });

    it('refuses what is not a number, as AIR does', () => {
        for (const text of ['', '-', 'abc', '1.2.3', '1e3']) {
            expect(validateWiredNumberInput(text, { min: 0, max: 10 })).toEqual({ valid: false, error: { kind: 'invalid' } });
        }
    });

    it('refuses a number between two steps instead of rounding it', () => {
        expect(validateWiredNumberInput('2.3', pulses)).toEqual({ valid: false, error: { kind: 'invalid' } });
        expect(validateWiredNumberInput('7', { min: 0, max: 100, step: 5 })).toEqual({ valid: false, error: { kind: 'invalid' } });
    });

    it('refuses a number outside the range instead of clamping it, in shown units', () => {
        expect(validateWiredNumberInput('11', { min: 0, max: 10 })).toEqual({ valid: false, error: { kind: 'between', min: '0', max: '10' } });
        expect(validateWiredNumberInput('0', pulses)).toEqual({ valid: false, error: { kind: 'between', min: '0.5', max: '60' } });
    });
});

describe('restrictWiredNumberInput', () => {
    it('keeps digits, and a minus or a decimal point only when the range can use them', () => {
        expect(restrictWiredNumberInput('1a-2.5', { min: 0, max: 10 })).toBe('125');
        expect(restrictWiredNumberInput('-2.5', { min: -10, max: 10 })).toBe('-25');
        expect(restrictWiredNumberInput('2,5x', pulses)).toBe('2,5');
    });
});

describe('wiredNumberInputMessage', () => {
    it('uses the official keys with English fallbacks', () => {
        expect(wiredNumberInputMessage({ kind: 'invalid' })).toBe('Number is invalid');
        expect(wiredNumberInputMessage({ kind: 'between', min: '0', max: '10' })).toBe('Number needs to be between 0 and 10');
    });
});
