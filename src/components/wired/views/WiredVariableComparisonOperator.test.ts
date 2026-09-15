import { describe, expect, it } from 'vitest';
import {
    WIRED_CMP_EQUAL,
    WIRED_CMP_GREATER,
    WIRED_CMP_GREATER_EQUAL,
    WIRED_CMP_LESS,
    WIRED_CMP_LESS_EQUAL,
    WIRED_CMP_NOT_EQUAL,
} from './WiredComparisonOperator';
import {
    normalizeWiredVariableComparison,
    WIRED_VAR_CMP_DEFAULT,
    WIRED_VAR_CMP_EQUAL,
    WIRED_VAR_CMP_GREATER,
    WIRED_VAR_CMP_GREATER_EQUAL,
    WIRED_VAR_CMP_LESS,
    WIRED_VAR_CMP_LESS_EQUAL,
    WIRED_VAR_CMP_NOT_EQUAL,
    WIRED_VAR_CMP_OPTIONS,
} from './WiredVariableComparisonOperator';

describe('wired variable comparison operators', () => {
    // These six numbers are read by value in WiredConditionUserLevel.java,
    // WiredConditionVariableValueMatch.java and WiredEffectVariableSelectorBase.java.
    it('matches the encoding the variable boxes use on the server', () => {
        expect(WIRED_VAR_CMP_GREATER).toBe(0);
        expect(WIRED_VAR_CMP_GREATER_EQUAL).toBe(1);
        expect(WIRED_VAR_CMP_EQUAL).toBe(2);
        expect(WIRED_VAR_CMP_LESS_EQUAL).toBe(3);
        expect(WIRED_VAR_CMP_LESS).toBe(4);
        expect(WIRED_VAR_CMP_NOT_EQUAL).toBe(5);
    });

    // The user-level condition used to render the chest widget, so five of its six
    // operators saved a number that meant something else on the server.
    it('is not interchangeable with the chest encoding', () => {
        expect(WIRED_CMP_GREATER).not.toBe(WIRED_VAR_CMP_GREATER);
        expect(WIRED_CMP_GREATER_EQUAL).not.toBe(WIRED_VAR_CMP_GREATER_EQUAL);
        expect(WIRED_CMP_EQUAL).not.toBe(WIRED_VAR_CMP_EQUAL);
        expect(WIRED_CMP_LESS).not.toBe(WIRED_VAR_CMP_LESS);
        expect(WIRED_CMP_NOT_EQUAL).not.toBe(WIRED_VAR_CMP_NOT_EQUAL);
        // The one operator the two encodings happen to agree on.
        expect(WIRED_CMP_LESS_EQUAL).toBe(WIRED_VAR_CMP_LESS_EQUAL);
    });

    it('offers every operator exactly once, in the official display order', () => {
        expect(WIRED_VAR_CMP_OPTIONS.map((option) => option.value)).toEqual([0, 1, 2, 3, 4, 5]);
        expect(WIRED_VAR_CMP_OPTIONS.map((option) => option.symbol)).toEqual(['>', '≥', '=', '≤', '<', '≠']);
    });

    // Mirrors WiredConditionUserLevel.normalizeComparison, fallback included.
    it('keeps every valid value and falls back on the rest', () => {
        for (const option of WIRED_VAR_CMP_OPTIONS) {
            expect(normalizeWiredVariableComparison(option.value)).toBe(option.value);
        }

        expect(normalizeWiredVariableComparison(-1)).toBe(WIRED_VAR_CMP_DEFAULT);
        expect(normalizeWiredVariableComparison(6)).toBe(WIRED_VAR_CMP_DEFAULT);
        expect(normalizeWiredVariableComparison(-1, WIRED_VAR_CMP_EQUAL)).toBe(WIRED_VAR_CMP_EQUAL);
    });
});
