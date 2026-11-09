import { describe, expect, it, vi } from 'vitest';

const translations: Record<string, string> = {};

vi.mock('../../../../api', () => ({
    localizeWithFallback: (key: string, fallback: string) => translations[key] ?? fallback
}));

import { localizeWiredVariableOperation, WIRED_VARIABLE_OPERATIONS, WIRED_VARIABLE_UNARY_OPERATIONS } from './WiredVariableOperations';

describe('wired variable operations', () => {
    it('lists the official operator menu in the official order', () => {
        expect(WIRED_VARIABLE_OPERATIONS).toEqual([
            0, 1, 2, 3, 4, 5, 6, 40, 41, 50, 60, 100, 101, 102, 103, 104, 105, 110, 115, 116, 117, 118, 111, 112, 113, 114, 119, 120, 121, 122
        ]);
    });

    it('knows which operations take no operand', () => {
        expect(WIRED_VARIABLE_UNARY_OPERATIONS).toEqual([60, 103, 110]);
    });

    it('never shows a raw key when the hotel has no text for an operation', () => {
        expect(localizeWiredVariableOperation(110)).toBe('Bit count');
        expect(localizeWiredVariableOperation(115)).toBe('Get Bit');
        expect(localizeWiredVariableOperation(111)).toBe('Next Low Bit (Inclusive)');
        expect(localizeWiredVariableOperation(122)).toBe('Previous High Bit (Exclusive)');
    });

    it('prefers the hotel text when it exists', () => {
        translations['wiredfurni.params.variables.operation.0'] = 'Assegna';

        expect(localizeWiredVariableOperation(0)).toBe('Assegna');
    });

    it('has an English fallback for every listed operation', () => {
        for (const operation of WIRED_VARIABLE_OPERATIONS) {
            expect(localizeWiredVariableOperation(operation)).not.toBe(String(operation));
            expect(localizeWiredVariableOperation(operation)).not.toContain('wiredfurni.');
        }
    });
});
